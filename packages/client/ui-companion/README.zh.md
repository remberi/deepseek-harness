---
description: "dsh Web 客户端的虚拟 2D 人物鲸鱼娘：可拖动的外壳浮层角色，以及用于显示或隐藏她、选择鼠标互动方式并上传自定义形象的设置页。"
kind: "package-reference"
---

# @deepseek-ai/dsh-client-ui-companion

[English](README.md) | 中文

## 概述

`dsh-client-ui-companion` 加入了**鲸鱼娘**——一位浮在 Web GUI 之上、可拖到页面任意位置的虚拟 2D 人物。**虚拟人物**设置页提供显示或隐藏她的开关、选择她如何回应鼠标的选择器（点击互动、悬停互动、视线跟随或安静陪伴）、用本地图片替换她形象的上传入口，以及让她回到角落的按钮。开关与选择器存放在 `ui-companion` 设置命名空间中，本地提供方默认将其持久化到 `$DSH_HOME/cordis.patch.yml`；形象与拖动位置保存在浏览器的 localStorage 中。在用户打开开关之前她保持隐藏。内置角色是以 data URL 内联的 PNG 加 CSS 动效，因此本包不携带第三方运行时。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

打开设置并选择**虚拟人物**。在已提供设置外壳与应用框架 `shell.overlay` 座位的 Web 组合中挂载 `@deepseek-ai/dsh-client-ui-companion`；该页面注册自己的导航条目，无需配置。

### 显示人物

**显示鲸鱼娘**开关写入 `enabled`。开启时，角色渲染在应用框架之上，初始位于右下角上方，处于所有面板之外；浮层除角色本身之外全部可点透，因此她不会挡住 composer 或侧栏。关闭开关会立刻移除她，下次页面加载时读取的仍是同一个值。

### 选择互动方式

**互动方式**选择器写入 `interaction`，在她隐藏时锁定。`click` 把她渲染为按钮：每次点击都在气泡中显示下一句台词，持续三秒，台词里夹着 agent 开发的梗。`hover` 在鼠标停在她身上时挥手并打招呼，离开后恢复。`follow` 让她朝页面任意位置的鼠标轻轻倾斜。`none` 让她保持待机。页面在各行下方预览当前姿态，因此在显示她之前就能看到所选效果。所有台词与标签都跟随 Web GUI 语言。

### 移动她

按住角色并拖动：鼠标移动超过 4 px 后她跟随鼠标，始终完整留在视口内，而结束拖动的那次松开不会算作点击。松开位置保存在本浏览器中并在下次加载时恢复；设置页上的**回到右下角**会忘掉它。她已在默认角落时该按钮处于禁用状态。

### 自定义形象

**上传图片**接受不超过 1 MB 的 PNG、JPEG、WebP、GIF 或 SVG 文件，并在页面与设置预览中以相同宽度取代内置形象显示；格式不支持、文件过大或读取失败时页面在该行下方给出提示。自定义图片保留待机浮动、挥手摆动和跟随倾斜。**恢复默认形象**回到内置形象。图片以 data URL 形式存放在本浏览器的 localStorage 中，不在浏览器或设备之间共享。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部 — 点击展开</summary>

Host 半边通过其 `Config` schema 发布 `ui-companion` 条目，并把该 fiber 从生成的设置页上拿掉。浏览器半边通过 `ctx.configForms` 读取同一条目，用 `CompanionPolicy` 包装，并贡献两个槽位条目，二者通过各自的 `hooks` 区共享策略的两个快照存储：id 为 `companion` 的 `settings.section` 页面（order 22），以及 id 为 `companion` 的 `shell.overlay` 条目。

### 偏好流转

`CompanionPolicy` 以 `{ enabled: false, interaction: 'click' }` 起始，采纳每个被接受的 Host 分区而不回写，用户做出选择时先发布存储再对该字段调用 `host.set()`，因此浮层在同一 tick 内响应，而写入随后落地。被拒的写入由表单恢复，其重载以新分区到达并被策略采纳。非 loopback 页面通过表单的内存模式把两个值都保留在进程内。

### 浏览器本地状态

`companion-local.ts` 在 localStorage 键 `dsh.ui-companion.local.v1` 下保存形象 data URL 与拖动位置。读取时用 schemastery 校验存储信封（形象为不超过 1 MiB 的字符串、`right`/`bottom` 为数值偏移，或为 null）；无效或无法解析的条目会被移除并采用默认值。`CompanionPolicy.local` 以该读取结果起始，`setArtwork`/`setPosition` 每次变化整体回写一次。storage 缺失或抛错只会禁用持久化，不会让存储失效。

### 角色、互动与拖动

`CompanionArtwork` 始终渲染 `<img>`：内置 PNG data URL，或用户上传的同宽度图片；包装层 transform 在 follow 模式下让她倾斜，CSS 类在悬停时摆动、说话时轻弹。`CompanionOverlay` 拥有姿态。它在 `enabled` 为 false 时返回 null，在模式变化时重置姿态，仅在 `follow` 模式下安装 window `pointermove` 监听，并用 `eyeOffsetToward` 与 `poseTransform` 把鼠标位置换算为受限倾斜。停靠层的 `right`/`bottom` 偏移依次取自进行中的拖动、已保存的位置和 `DEFAULT_POSITION`。角色上的指针处理器从 `pointerdown` 起跟踪一个 pointer id；移动超过 `DRAG_THRESHOLD_PX` 后捕获指针、清除气泡，并用 `clampPosition` 按角色盒与视口约束停靠层；`pointerup` 持久化受限后的偏移并设置一个标志，吞掉浏览器在松开后触发的 click。动效位于 CSS 关键帧中并遵循 `prefers-reduced-motion`。

### 源码地图

| 文件 | 职责 |
|---|---|
| [`src/index.ts`](src/index.ts) | Host 插件：注册 `ui-companion` 设置命名空间 |
| [`src/companion-settings.ts`](src/companion-settings.ts) | 命名空间、字段、互动模式、默认值与共享 schema |
| [`src/client/index.ts`](src/client/index.ts) | 浏览器插件：词典、策略、页面与浮层注册 |
| [`src/client/companion-policy.ts`](src/client/companion-policy.ts) | Host 支撑的设置存储，加上浏览器本地的形象与位置存储 |
| [`src/client/companion-local.ts`](src/client/companion-local.ts) | localStorage 信封、校验与视口约束 |
| [`src/client/CompanionSection.tsx`](src/client/CompanionSection.tsx) | 设置页：开关、互动选择器、形象上传、位置重置、静态预览 |
| [`src/client/CompanionOverlay.tsx`](src/client/CompanionOverlay.tsx) | 带气泡与互动处理的可拖动浮动角色 |
| [`src/client/CompanionArtwork.tsx`](src/client/CompanionArtwork.tsx) | 以同一宽度渲染内置或上传图片 |
| [`src/client/default-artwork.ts`](src/client/default-artwork.ts) | 以内联 data URL 存放的内置 PNG |
| [`src/client/eye-offset.ts`](src/client/eye-offset.ts) | 鼠标到姿态的几何换算 |
| [`src/client/locales.ts`](src/client/locales.ts) | 中英文词典，包括她的台词 |

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

这些页面覆盖承载该页面的设置界面、角色占据的浮层座位，以及两个值背后的持久化。

- [ui-settings](../ui-settings/README.zh.md) — 声明 `settings.section` 与命名空间 scope 服务的领域基座。
- [ui-settings-general](../ui-settings-general/README.zh.md) — 渲染导航并挂载分区的设置外壳。
- [ui-layout](../ui-layout/README.zh.md) — 声明可点透 `shell.overlay` 座位的应用框架。
- [Settings](../../settings/settings/README.zh.md) — 持久化该命名空间的 Host 设置服务与提供方。
- [Cookbook：添加设置卡片](../../../docs/cookbook/adding-a-settings-card.zh.md) — 本插件遵循的两半边打包方式。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包是浏览器侧 UI 插件层，不注册任何面向模型的内容。

#### KV Cache 影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制定义了角色目前能做的事；它们是当前的包约束。

- **位置与形象按浏览器保存** — 二者都在 localStorage 中，因此另一浏览器或设备会从默认角落与内置形象开始；为大窗口保存的位置在小窗口上要等下一次拖动才会被约束回视口内。
- **不能缩放** — 她在浮层固定以 152 px 宽度渲染（设置预览为 128 px）；不提供尺寸设置，自定义图片按该宽度缩放。
- **固定台词** — 她的台词是按语言固定的列表并顺序循环，其中夹着 agent 开发的梗；她不读取 Session，因此台词不会反映 agent 正在做什么。
- **静态绘图** — 动效只有待机浮动、悬停摆动、说话轻弹和跟随倾斜；没有 Live2D 或精灵动画。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

设置外壳在 `ui-settings-general` 的 `navIcon` 中把分区 id `companion` 映射到人物图标；重命名该 id 会回落到齿轮图标。

</details>

**运行时不变量：** 未发布配套项。本插件唯一的跨插件关系是它注册并绑定的设置命名空间，该命名空间已由设置服务校验；其两个槽位条目读取它自有的存储。
