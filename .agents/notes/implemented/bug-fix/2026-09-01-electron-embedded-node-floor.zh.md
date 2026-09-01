# Agent Note: Electron 桌面壳使用符合 harness 下限的嵌入式 Node

Status: implemented

[English](2026-09-01-electron-embedded-node-floor.md) | 中文

## 问题

打包后的桌面应用用 Electron 自己的 `process.execPath` 加上 `ELECTRON_RUN_AS_NODE=1` 启动 `dsh web`。子进程继承的是 Electron 嵌入的 Node，而不是打包时用的 Node。Electron 35 自带 Node 22.14，其 `node:zlib` 不导出 `createZstdDecompress`。`@deepseek-ai/dsh-session-persistence-jsonl` 在加载时导入该 API，因此子进程在打印 `dsh web: http://…` 之前就退出，窗口不会打开。

打包阶段还有第二类失败。pnpm 11 拒绝低于 22.13 的 Node，而 harness 的 `engines.node` 下限是 `^22.19.0 || >=24.0.0`（[Node 引擎下限](../process/2026-07-06-node-engine-floor.zh.md)）。对 `dsh-electron-runtime-closure` 执行 `pnpm deploy --legacy` 时，hoister 会把部分工作区包装在部署源旁边而不是目标里，因此 `extraResources/harness` 可能缺少 `@deepseek-ai/dsh-web-frontend` 以及其他内置 bundle。

## 决策

`@deepseek-ai/dsh-electron` 依赖 `electron@^44.1.0`，其 44.1.0 发行版嵌入 Node 24.19.0。主进程在 spawn `dsh web` 之前断言同一 `engines.node` 下限，并前置 `--expose-internals` 以便 Cordis HMR 访问 Node 的 ESM loader；启动失败时调用 `dialog.showErrorBox`，避免双击应用时无提示退出。

lockfile 只记录包完整性，不再钉住 `tarball:` 主机。pnpm 11 会把这些主机与当前 registry 的 metadata 比较：若先前安装写入了 npmmirror URL，而 `~/.npmrc` 指向 registry.npmjs.org，就会以 `ERR_PNPM_TARBALL_URL_MISMATCH` 失败，表现为 `pnpm deploy` 像缺依赖一样装不上。

`apps/electron/scripts/prepare-resources.mjs` 在低于该下限的 Node 上拒绝暂存。在 `pnpm --filter dsh-electron-runtime-closure deploy --legacy --prod` 之后，它把 `vendor/`、`packages/`、`apps/cli`、`apps/web` 与 `native/landlock-run/packages` 中的工作区包覆盖进暂存的 `node_modules`（与 Python 可执行文件恢复 legacy hoist 遗漏包的方式相同），并要求存在 `@deepseek-ai/dsh/lib/bin.js`、`@deepseek-ai/dsh-web-app`、`@deepseek-ai/dsh-base` 与 `@deepseek-ai/dsh-web-frontend/dist/index.html`。闭包 manifest 将这三个包列为直接 `workspace:` 依赖，使 deploy 明确包含 web 栈。`prune-harness.mjs` 保留 `koffi/src`，因为 koffi 从该目录加载原生源文件。Electron 壳 asar 没有生产态原生插件；`dsh web` 在 `ELECTRON_RUN_AS_NODE` 下从 `extraResources/harness` 加载 `node-pty` 和 `koffi`，必须保持 Node 的 N-API ABI。`"npmRebuild": false` 跳过 `@electron/rebuild`，否则它会遍历工作区 pnpm store（并在 `@types/yauzl` 这类悬空 hoist 上失败），还会把这些插件编成 Electron ABI。

## 考虑过的替代方案

**改用系统 `node` 而不是 Electron 二进制。** 打包应用就会要求 `PATH` 上有匹配的 Node，这不是桌面安装约定。

**在 `extraResources` 中再放一份 Node 二进制。** 这会重复运行时、仍然要钉版本，而且真正干活的子进程用不到 Electron 的 Node。

**停留在 Electron 35 并停止导入 Node zstd。** 会话持久化会脱离 harness 下限，也与其他 launcher 分叉。

**像 `dsh-python-runtime-closure` 那样在 `dsh-electron-runtime-closure` 上列出每个工作区包。** 那是 `--config.auto-install-peers=false` 下完整的 peer 闭包。桌面壳只需要 web 组合加上从源码覆盖的恢复；扩到 Python 清单会复制第二份完整 manifest，且不改变 Electron 的 Node 下限。

**继续在 lockfile 里钉住 npmmirror 的 `tarball:`。** 那会要求每次安装和 `pnpm deploy` 都使用与 lockfile 相同的 registry 主机。去掉主机后，完整性哈希才是真源，npmjs.org 与 npmmirror 都可以解析。

**保留 `npmRebuild` 并修掉悬空的 pnpm hoist。** 那样仍会把 harness 原生插件编成 Electron ABI。在 `ELECTRON_RUN_AS_NODE` 下它们必须匹配 Node，而不是 Electron。

## 后果

打包必须在 Node 22.19+ 或 24+ 下运行。`scripts/package-electron-local.sh` 在检测到 nvm Node 24.12 时会把它前置到 `PATH`，设置 `ELECTRON_MIRROR` 为 npmmirror，并在残留 lockfile tarball 主机仍是 npmmirror 时传入 `--registry`。主进程会前置 `--expose-internals`，以便 Cordis HMR 在 Electron-as-Node 下访问 Node 的 ESM loader。Electron 44 相对 35 是 Chromium 152 / Node 24 的跃迁。原生 N-API 插件（`node-pty`、`koffi`）在 Electron 的 Node 24 下加载。验证方式是用 `ELECTRON_RUN_AS_NODE=1 --expose-internals` 对着暂存 harness 启动 `dsh web`，观察到 URL 行且随后不再出现 HMR 或 zlib 失败；Electron 35 的 Node 22.14 会在 `createZstdDecompress` 处失败。
