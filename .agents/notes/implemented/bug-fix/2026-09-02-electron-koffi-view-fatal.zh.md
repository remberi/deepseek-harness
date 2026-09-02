# Agent Note: 打包后的 Electron 文件夹对话框不能用 koffi.view 读取路径

Status: implemented

[English](2026-09-02-electron-koffi-view-fatal.md) | 中文

## 问题

对话框子进程在打包后的 Electron 宿主里已经能以 Node 运行时，选中文件夹仍会失败：`IShellItem::GetDisplayName` 成功后，`readUtf16` 对 COM PWSTR 调用 `koffi.view`。Electron 的 Node 以 `Error::New napi_get_last_error_info`（退出码 134）致命退出，因为 `koffi.view` 会创建外部 ArrayBuffer（`napi_create_external_arraybuffer`），而 Electron 不允许。界面则报 `win32 folder dialog worker exited before reporting a result (code 134: FATAL ERROR: ...)`。同一调用在普通 Node 下成功，包括对 38 字节 `CoTaskMem` 字符串的精确长度 view。

## 决策

`readUtf16` 用 `kernel32!lstrcpynW` 把 COM PWSTR 拷进 JS 持有的 Buffer，再用 `lstrlenW` 测量拷贝结果，然后按 UTF-16LE 解码。同一拷贝方式已存在于 Win32 命令行往返测试。容量为含 NUL 在内的 32768 个 UTF-16 码元（Windows 扩展路径上限）。`lstrlenW` 按码元计数，因此 U+XX00 字符不会被当成 NUL（[路径 NUL 扫描](2026-08-23-win32-utf16-nul-truncation.zh.md)）。

## 考虑过的替代方案

**保留 `koffi.view`，但把 `lstrlenW` 得到的精确字节长度传进去。** Electron 对 38 字节的 `CoTaskMem` 字符串做 `koffi.view` 也会致命退出；缺陷不在长度。

**`koffi.decode(addr, 'str16')`。** 仍会把原始 PWSTR 当成指针的指针，在真实 Windows 上崩溃。

**按码元调用 `koffi.decode(addr, offset, 'uint16_t')`。** 在 Electron 下可用，但每个字符一次 FFI；`lstrcpynW` 一次拷进 Node 已持有的内存。

## 后果

打包后的 Electron 选择可以返回选中路径，而不会在 `Show` 之后把 worker 干掉。单元测试通过假 COM 世界固定该拷贝，包括含 U+XX00 的路径。在打包构建里打开真实对话框仍是手动 Windows 检查。
