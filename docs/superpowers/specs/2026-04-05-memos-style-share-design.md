# Memos 样式美化与分享功能设计

## 概述

对 memos 应用进行视觉升级并新增分享功能，包含三个部分：

1. 分享功能（复制为 Markdown / 纯文本 / 分享链接）
2. 排版与间距优化
3. 侧边栏美化

---

## 1. 分享功能

### 1.1 分享对话框组件

**文件**：`src/components/memo/share-dialog.tsx`（新增）

**职责**：提供分享预览界面，支持三种复制方式。

**Props**：

- `memo: MemoSummary` — 要分享的备忘录
- `content: SerializedEditorState | null` — 富文本内容
- `isOpen: boolean` — 控制显隐
- `onOpenChange: (open: boolean) => void` — 状态回调

**UI 结构**：

- 顶部：标题 "Share Memo"
- 中部：预览卡片（显示 memo 的 excerpt 纯文本预览，最多 3 行）
- 底部：三个操作按钮
  - "复制为 Markdown" — 调用 `@lexical/markdown` 将内容转为 Markdown 并写入剪贴板
  - "复制为纯文本" — 提取 `plainText` 写入剪贴板
  - "复制分享链接" — 复制当前 URL + `?share=<memo_id>` 参数

**复制反馈**：成功后按钮短暂显示 "已复制!" 文字，1.5s 后恢复。

**依赖**：使用浏览器 `navigator.clipboard.writeText()` API。

### 1.2 MemoCard 集成

**文件**：`src/components/memo/memo-card.tsx`（修改）

**变更**：

- 在 Dropdown 菜单中新增 "分享" 项（图标 `Share` from lucide-react），位于编辑/归档之间
- 新增 `shareOpen` 状态，点击分享菜单项时打开 ShareDialog
- ShareDialog 渲染在 MemoCard 内部，传入 memo 数据和 content

### 1.3 MemosPage 分享链接支持

**文件**：`src/components/memo/memos-page.tsx`（修改）

**变更**：

- 读取 URL query 参数 `share`
- 若存在，通过 `getMemo` API 获取对应 memo 内容
- 自动弹出 ShareDialog 展示分享预览
- 关闭对话框后清除 URL 中的 `share` 参数（使用 `window.history.replaceState`）

### 1.4 数据流

```
用户点击卡片 "..." → 选择"分享" → ShareDialog 打开
  → 点击"复制为 Markdown" → lexical markdown 转换 → clipboard.writeText → 按钮反馈
  → 点击"复制为纯文本" → memo.plainText → clipboard.writeText → 按钮反馈
  → 点击"复制分享链接" → window.location.origin + "?share=" + memo.id → clipboard.writeText → 按钮反馈

用户访问 /?share=xxx → MemosPage 检测参数 → 调用 getMemo → 弹出 ShareDialog
```

### 1.5 错误处理

- 剪贴板 API 不可用（非 HTTPS 或旧浏览器）：显示提示 "请手动复制" 并高亮文本内容
- 分享链接对应的 memo 不存在：显示 "该备忘录不存在或已被删除"
- 分享链接对应的 memo 已归档：正常展示，标注 "已归档"

---

## 2. 排版与间距优化

### 2.1 卡片层级

| 属性       | 当前值                      | 新值                                                                 |
| ---------- | --------------------------- | -------------------------------------------------------------------- |
| 卡片间距   | `space-y-2.5`               | `space-y-3`                                                          |
| 卡片内边距 | `px-3.5 py-2.5`             | `px-4 py-3`（移动端 `px-3 py-2.5 sm:px-4 sm:py-3`）                  |
| hover 效果 | 无                          | `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200` |
| 卡片圆角   | `rounded-xl`（继承自 Card） | 保持                                                                 |

### 2.2 字体层次

| 元素        | 当前值                       | 新值                                             |
| ----------- | ---------------------------- | ------------------------------------------------ |
| 页面标题 h1 | `text-xl font-semibold`      | `text-2xl font-semibold`                         |
| 副标题计数  | `text-xs text-foreground/40` | `text-sm text-foreground/40`                     |
| 标签        | `bg-accent/8 text-accent/70` | `bg-accent/10 text-accent/80 font-medium`        |
| 时间戳      | `text-foreground/30`         | `text-foreground/35`                             |
| 正文行高    | 默认                         | `leading-relaxed`（应用于 memo-content-surface） |

### 2.3 响应式细节

- 搜索框：增加 `max-w-xl` 限制最大宽度
- 空状态图标：从 `w-10` 调整为 `w-12`，增加视觉权重
- 空状态描述文字：`max-w-xs` 调整为 `max-w-sm`

### 2.4 变更文件

- `src/components/memo/memos-page.tsx` — 标题、间距、搜索框
- `src/components/memo/memo-card.tsx` — 卡片内边距、hover 效果、标签样式、时间戳
- `src/styles.css` — 正文行高、`.memo-content-surface` 行高优化

---

## 3. 侧边栏美化

### 3.1 标签列表

**变更**：

- 标签项增加左侧指示条：选中态 `border-l-2 border-accent pl-1.5`，未选中 `border-l-2 border-transparent`
- hover 增加微位移：`hover:translate-x-0.5`
- 计数徽章改为 pill 形状：`rounded-full bg-foreground/8 px-1.5 py-0.5 text-xs tabular-nums`
- "All" 标签始终显示，即使无标签数据

### 3.2 活动图

**变更**：

- 统计数字区域增加背景：`rounded-lg bg-gradient-to-br from-accent/5 to-accent/[0.02] p-2.5`
- 热力图方块增加 hover tooltip：`title` 属性已存在，保持不变
- 图例颜色从 `bg-foreground/6` 改为 `bg-accent/10` → `bg-accent` 渐变
- 统计数字 "today" 保持 accent 色高亮

### 3.3 导航项

**变更**：

- 选中态：从纯 `bg-foreground/8` 改为 `border-l-2 border-accent bg-accent/8 pl-1.5`
- 图标尺寸：`w-3.5` → `w-4`
- hover 增加微位移：`hover:translate-x-0.5`

### 3.4 变更文件

- `src/components/layout/app-shell.tsx` — 导航项、标签列表、活动图容器

---

## 文件变更清单

| 文件                                   | 操作 | 说明                    |
| -------------------------------------- | ---- | ----------------------- |
| `src/components/memo/share-dialog.tsx` | 新增 | 分享对话框组件          |
| `src/components/memo/memo-card.tsx`    | 修改 | 添加分享菜单 + 排版优化 |
| `src/components/memo/memos-page.tsx`   | 修改 | 分享链接检测 + 排版优化 |
| `src/components/layout/app-shell.tsx`  | 修改 | 侧边栏美化              |
| `src/styles.css`                       | 修改 | 行高、卡片样式微调      |
