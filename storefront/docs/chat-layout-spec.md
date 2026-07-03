# 需求规格说明书

> Feature: 聊天页面布局结构调整
> Date: 2026-07-03

## 1. 概述

- **功能名称**: 聊天页面布局对齐与固定
- **用户故事**: 作为聊天用户，我希望聊天页面的顶栏不会被消息推走，且"聊天+🏠"的高度与圈子页的"圈子"顶栏保持一致，以便整体视觉统一，消息区内部独立滚动。
- **涉及文件**:
  - `src/app/[countryCode]/social/layout.tsx` — 社交布局（content 区 pb-16 控制）
  - `src/app/[countryCode]/social/chat/[id]/page.tsx` — 聊天页面（顶栏、消息区、输入框）

## 2. 当前状态

### 布局层级

```
social layout
  └─ content 区 (flex-1 flex-col min-h-0)
       └─ chat 容器 (flex flex-col flex-1 min-h-0 max-h-[calc(100dvh-64px)])
            ├─ 顶栏 "聊天+🏠"  (flex-shrink-0, py-3 + pt-[env(safe-area-inset-top)])
            ├─ 好友信息栏      (flex-shrink-0, py-4)
            ├─ 消息滚动区      (flex-1 overflow-y-auto min-h-0)
            └─ 输入框          (flex-shrink-0, py-3)
  └─ 底部导航 (fixed bottom-0 h-14)
```

### 圈子页顶栏（对齐参考）

```
social layout
  └─ top bar (sticky top-0 z-10)
       └─ "圈子" (px-4 py-3 flex items-center, text-lg font-semibold)
           ← 无 safe-area-inset-top
           ← 只有 py-3 (12px top + 12px bottom)
  └─ content 区
  └─ 底部导航
```

### 关键差异

| 项 | 圈子顶栏 | 聊天"聊天+🏠" |
|---|---|---|
| 垂直 padding | `py-3` (12+12=24px) | `py-3` + `pt-[env(safe-area-inset-top)]` (~44px + 12+12=68px) |
| 位置 | layout 内 sticky top-0 | chat 容器内 flex 首位 |
| 额外元素 | 无 | 🏠 图标按钮（w-8 h-8） |
| 字体行高 | `text-lg font-semibold` | `text-lg font-semibold` |

聊天顶栏因为有 `pt-[safe-area-inset-top]` 在 notched 手机上比圈子顶栏高出约 44px（safe-area 高度）。

## 3. 改动方案

### 3.1 统一"聊天+🏠"与"圈子"顶栏高度

**做法**: 将 `pt-[env(safe-area-inset-top)]` 从"聊天+🏠"的容器上移除，改为在 **chat 容器外层**统一使用 safe-area padding。

```
改前:
  <div className="bg-white border-b ... px-4 py-3 flex items-center pt-[env(safe-area-inset-top)]">

改后:
  <div className="bg-white border-b ... px-4 py-3 flex items-center">
  (py-3 与圈子顶栏完全一致)
```

safe-area 保护改为 chat 容器自身加 `pt-[env(safe-area-inset-top)]`：

```
改前:
  <div className="flex flex-col bg-gray-50 flex-1 min-h-0 max-h-[calc(100dvh-64px)]">

改后:
  <div className="flex flex-col bg-gray-50 flex-1 min-h-0 max-h-[calc(100dvh-64px)]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
```

这样 safe-area 保护在容器级别统一处理，不掺入单独顶栏的高度计算。

### 3.2 维持已有改动

- **内容区聊天页无 `pb-16`** — 已改（`layout.tsx` line 57 条件 pb-16）
- **`max-h-[calc(100dvh-64px)]`** — 保持不变，锁定聊天容器高度
- **消息区 flex-1 overflow-y-auto** — 保持不变，内部独立滚动
- **输入框 flex-shrink-0** — 保持不变，永远在底部

## 4. 验收标准

### 功能验收

- [ ] "聊天+🏠"的可见高度与圈子页"圈子"顶栏一致
- [ ] 消息增多时顶栏不被推走（仍固定可见）
- [ ] 输入框紧贴底部导航，无多余空白
- [ ] notched 手机上内容不跑进摄像头区域
- [ ] 其他社交页面（圈子、好友、搜索、我的）布局不受影响

### 边界条件

- [ ] 空消息列表（显示"开始聊天吧"）
- [ ] 长消息列表（消息区正常滚动到底部）
- [ ] iPhone Safari notched 设备
- [ ] 桌面浏览器
- [ ] 聊天页顶栏 safe-area 保护正确（不跑到摄像头后面）
