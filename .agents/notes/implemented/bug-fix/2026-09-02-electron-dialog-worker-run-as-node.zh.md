# Agent Note: 打包后的 Electron 文件夹对话框 spawn 必须设置 ELECTRON_RUN_AS_NODE

Status: implemented

[English](2026-09-02-electron-dialog-worker-run-as-node.md) | 中文

## 问题

Win32 文件夹选择器会 [把 `process.execPath` spawn 成对话框子进程](../feature/2026-08-02-win32-in-process-folder-dialog.zh.md)，以免模态 `IFileOpenDialog` 阻塞宿主事件循环。在打包后的桌面应用里，该可执行文件就是 `DeepSeek Harness.exe`。Electron 只在 `child_process.fork` 时注入 `ELECTRON_RUN_AS_NODE`，`spawn` 不会。拷贝完整的父进程 `process.env` 不够：Cordis 启动后环境块可能超过 Windows 约 32 KiB 上限，截断靠后的条目并丢掉该标志。子进程会作为第二个 GUI 实例启动，`app.requestSingleInstanceLock` 失败后以退出码 0 结束且无 IPC 结果，界面则报 `directory picker failed: win32 folder dialog worker exited before reporting a result`。

## 决策

`dialogWorkerEnv` 始终设置 `ELECTRON_RUN_AS_NODE=1` 和 `DSH_DIALOG_TITLE`，并只拷贝一份 Windows 进程键白名单（`PATH`、`SYSTEMROOT`、用户配置与临时目录）。普通 Node 忽略该 Electron 变量。在 Electron 下这份小环境块能保住该标志，使打包后的 exe 以 Node 方式加载 `lib/worker.cjs`（或 tsx 源码入口）。`spawnDialogWorker` 使用 `stdio` 为 `ignore`/`pipe`/`ipc` 的 `spawn`，以便在父进程 stdout 已是管道时 Windows 仍能安装 `process.send`。

## 考虑过的替代方案

**拷贝完整父进程 `process.env` 并只追加 `ELECTRON_RUN_AS_NODE`。** 第一次重新打包就是这样做的；已启动的 Cordis 进程仍可能撑爆 Windows 环境块并丢掉该标志。

**改用 `fork()`。** `fork` 会注入该变量，但该子进程已经用 `spawn` 来配合 `windowsHide` 和显式 IPC 通道，从而使对话框成为第一个窗口；白名单环境对现有进程模型的改动更小。

**仅在定义了 `process.versions.electron` 时设置该变量。** 这会漏掉剥掉了 version 字段的父进程，或 `execPath` 仍是应用 exe 的嵌套 spawn。无条件设置在 Node 下是空操作。

**子进程静默退出时回退到 PowerShell。** 已被 [仅 koffi 的 Windows 层](../simplification/2026-08-04-drop-windows-powershell-picker-fallback.zh.md) 否决：打包或 spawn 缺陷必须暴露，不能藏到旧版对话框后面。

## 后果

打包后的 Electron 选择会打开现代文件夹对话框，而不是第二个 GUI 实例。单元测试固定 `ELECTRON_RUN_AS_NODE=1`、白名单，以及静默退出会报告子进程状态和 stderr。在打包构建里打开真实对话框仍是手动 Windows 检查；[koffi 子进程说明](../feature/2026-08-02-win32-in-process-folder-dialog.zh.md) 仍点名该缺口。
