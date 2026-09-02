# Agent Note: Packaged Electron folder dialog cannot use koffi.view to read the path

Status: implemented

English | [中文](2026-09-02-electron-koffi-view-fatal.zh.md)

## Problem

Once the dialog child runs as Node under a packaged Electron host, selecting a folder still fails: `IShellItem::GetDisplayName` succeeds, then `readUtf16` calls `koffi.view` on the COM PWSTR. Electron's Node fatals with `Error::New napi_get_last_error_info` (exit 134) because `koffi.view` creates an external ArrayBuffer (`napi_create_external_arraybuffer`), which Electron does not allow. The UI reports `win32 folder dialog worker exited before reporting a result (code 134: FATAL ERROR: ...)`. The same `koffi.view` call succeeds under plain Node, including an exact-size view of a 38-byte `CoTaskMem` string.

## Decision

`readUtf16` copies the COM PWSTR into a JS-owned Buffer with `kernel32!lstrcpynW` and measures the copy with `lstrlenW`, then decodes UTF-16LE. That copy pattern already exists in the Win32 command-line round-trip test. Capacity is 32768 UTF-16 code units including NUL (Windows' extended path limit). `lstrlenW` counts code units, so a U+XX00 character is not treated as NUL ([path NUL scan](2026-08-23-win32-utf16-nul-truncation.md)).

## Alternatives considered

**Keep `koffi.view` but pass the exact byte length from `lstrlenW`.** Electron fatals on `koffi.view` even for a 38-byte `CoTaskMem` string; the length is not the defect.

**`koffi.decode(addr, 'str16')`.** That still treats a raw PWSTR as a pointer-to-pointer and crashes on real Windows.

**Per-code-unit `koffi.decode(addr, offset, 'uint16_t')`.** Works under Electron, but does one FFI call per character; `lstrcpynW` is one copy into memory Node already owns.

## Consequences

A packaged Electron pick can return the selected path instead of aborting the worker after `Show`. Unit tests pin the copy through the fake COM world, including a U+XX00 path. Opening the real dialog inside a packaged build remains a manual Windows check.
