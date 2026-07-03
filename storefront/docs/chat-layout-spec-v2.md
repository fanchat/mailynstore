# 需求规格说明书

> Feature: 聊天页面顶栏高度对齐圈子顶栏
> Date: 2026-07-03

## 1. 概述

- **功能名称**: 聊天页面"聊天+🏠"顶栏高度对齐
- **用户故事**: 作为聊天用户，我希望聊天页面的"聊天+🏠"顶栏在**显示高度**和**垂直位置**上都与圈子页面的"圈子"顶栏一致，以便整体视觉统一。
- **涉及文件**:
  - `src/app/[countryCode]/social/chat/[id]/page.tsx` — 聊天页 🏠 按钮尺寸 + 容器 padding

## 2. 当前状态

### 高度计算对比

| 项 | 圈子顶栏（layout.tsx） | 聊天+🏠 顶栏（page.tsx 修改前） |
|---|---|---|
| 容器 padding | `py-3` = 12+12=24px | `py-3` = 12+12=24px |
| 最高子元素 | h1 文字行高 = 28px (`text-lg` line-height) | 🏠 按钮 `h-8` = **32px** |
| **内容区高度** | **28px** | **32px** |
| **总高度** | **52px** | **56px** |
| Y 轴起始 | sticky top-0，从 viewport 顶部开始 | 受容器 paddingTop 影响，在刘海手机上被推下 44px |

### 根因

**两个因素叠加导致"聊天+🏠"看着比"圈子"高且低：**

1. **🏠 按钮尺寸** — `h-8` (32px) 比 `text-lg` 文字行高 (28px) 多 4px，成为 flex 容器中最高的子元素，撑高顶栏
2. **容器级 safe-area padding** — `paddingTop: env(safe-area-inset-top, 0px)` 在有刘海手机上把整个聊天内容往下推，不仅顶栏偏移起始位置，而且 total 占用空间比圈子顶栏更多

## 3. 改动方案

### 3.1 缩小 🏠 按钮到 28px（与文字行高一致）

```
改前:  <Link className="w-8 h-8 rounded-full ...">  ← 32px
         <svg className="w-7 h-7">                     ← 28px
改后:  <Link className="w-7 h-7 rounded-full ...">  ← 28px ✅
         <svg className="w-6 h-6">                     ← 24px（按钮内 2px 边距）
```

- `h-7` = 28px = `text-lg` 默认行高 → 不再撑高 flex 容器
- 28px 圆按钮仍是可触摸尺寸（iOS 推荐触摸目标 ≥ 44px？但此处是辅助图标按钮，非主要交互）
- SVG 从 28px 缩到 24px，在 28px 圆按钮内居中有 2px 边距

### 3.2 去掉容器级 safe-area padding

```
改前:  <div className="... max-h-[calc(100dvh-64px)]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
改后:  <div className="... max-h-[calc(100dvh-64px)]">  ← 与圈子页一致，不做容器偏移
```

- 圈子顶栏没有 safe-area 处理，聊天页也不做
- 两者都从 viewport 顶部开始，位置对齐
- 在有刘海手机上，顶栏的 `py-3` 内容会与圈子页保持在同一视觉位置

### 3.3 安全区讨论

**本次不改**：当前代码中只有聊天页有 `env(safe-area-inset-top)`，其他所有社交页面（圈子、好友、搜索、我的）都没有。如果未来需要统一加入 safe-area 处理，应该放在社交 layout 的顶层容器上，而不是聊天页单独处理。

## 4. 改动后高度对照

改完后两者高度完全一致：

```
圈子:    12px(pt-3) + 28px(文字行高) + 12px(pb-3) = 52px  ← 参考基准
聊天+🏠: 12px(pt-3) + 28px(🏠按钮)   + 12px(pb-3) = 52px  ✅ 匹配
```

## 5. 验收标准

### 功能验收

- [ ] "聊天+🏠"顶栏总高度与"圈子"顶栏一致（52px）
- [ ] 🏠 按钮 SVG 图标在 24px 下清晰可辨
- [ ] 🏠 按钮点击仍然响应（跳转 social?focus=xxx）
- [ ] 聊天容器 `max-h-[calc(100dvh-64px)]` 仍正常锁定高度
- [ ] 消息区内部独立滚动
- [ ] 输入框紧贴底部导航，无多余空白

### 边界条件

- [ ] 桌面浏览器
- [ ] iPhone Safari notched 设备
- [ ] iPhone Safari 无 notch 设备（SE 系列）
- [ ] Android Chrome
