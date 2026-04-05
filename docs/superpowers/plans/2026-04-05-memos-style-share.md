# Memos 样式美化与分享功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add share functionality, optimize typography/spacing, and beautify the sidebar in the memos app.

**Architecture:** Three independent feature areas sharing the same component layer. Share dialog is a new modal component integrated into MemoCard and MemosPage. Style changes are distributed across existing components and styles.css.

**Tech Stack:** React 19, HeroUI, Tailwind CSS 4, Lexical, @lexical/markdown, lucide-react, Zustand, TanStack Query

---

## File Structure

| File                                        | Action | Responsibility                                    |
| ------------------------------------------- | ------ | ------------------------------------------------- |
| `src/components/memo/share-dialog.tsx`      | Create | Share modal with copy-to-clipboard functionality  |
| `src/components/memo/memo-card.tsx`         | Modify | Add share menu item, style improvements           |
| `src/components/memo/memos-page.tsx`        | Modify | Share link detection from URL, style improvements |
| `src/components/layout/app-shell.tsx`       | Modify | Sidebar beautification                            |
| `src/styles.css`                            | Modify | Typography and spacing adjustments                |
| `src/components/memo/share-dialog.test.tsx` | Create | Share dialog unit tests                           |
| `src/components/memo/memos-page.test.tsx`   | Modify | Add share link test case                          |

---

### Task 1: Share Dialog Component

**Files:**

- Create: `src/components/memo/share-dialog.tsx`
- Test: `src/components/memo/share-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/memo/share-dialog.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render";
import { ShareDialog } from "./share-dialog";

const mockMemo = {
  id: "test-memo-1",
  excerpt: "This is a test memo excerpt",
  plainText: "This is a test memo excerpt with #tags",
  tags: ["tags"],
  state: "active" as const,
  createdAt: "2026-04-05T10:00:00.000Z",
  updatedAt: "2026-04-05T10:00:00.000Z",
};

const mockContent = {
  root: {
    type: "root",
    version: 1,
    children: [
      {
        type: "paragraph",
        version: 1,
        children: [
          {
            type: "text",
            version: 1,
            text: "This is a test memo excerpt with #tags",
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        textFormat: 0,
        textStyle: "",
      },
    ],
    direction: null,
    format: "",
    indent: 0,
  },
};

const originalClipboard = navigator.clipboard;

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: originalClipboard,
    writable: true,
    configurable: true,
  });
});

describe("ShareDialog", () => {
  it("renders share dialog when open", () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText("Share Memo")).toBeTruthy();
    expect(screen.getByText(mockMemo.excerpt)).toBeTruthy();
  });

  it("does not render when closed", () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog
        memo={mockMemo}
        content={mockContent}
        isOpen={false}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.queryByText("Share Memo")).toBeNull();
  });

  it("copies plain text to clipboard", async () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    const plainTextBtn = screen.getByRole("button", { name: /plain text/i });
    fireEvent.click(plainTextBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMemo.plainText);
    });
  });

  it("copies share link to clipboard", async () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    const linkBtn = screen.getByRole("button", { name: /share link/i });
    fireEvent.click(linkBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("share=test-memo-1"),
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/share-dialog.test.tsx`
Expected: FAIL with "ShareDialog is not defined" or module not found

- [ ] **Step 3: Write the share-dialog component**

```tsx
// src/components/memo/share-dialog.tsx
import { useState } from "react";
import { Button, Label, Modal } from "@heroui/react";
import { Copy, FileText, Link as LinkIcon, Check } from "lucide-react";
import type { MemoSummary } from "@/api-gen/types.gen";
import type { SerializedEditorState } from "lexical";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { createEditor, type LexicalEditor } from "lexical";

interface ShareDialogProps {
  memo: MemoSummary;
  content: SerializedEditorState | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type CopyMode = "markdown" | "plaintext" | "link";

export function ShareDialog({ memo, content, isOpen, onOpenChange }: ShareDialogProps) {
  const [copiedMode, setCopiedMode] = useState<CopyMode | null>(null);

  async function copyToClipboard(text: string, mode: CopyMode) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 1500);
    } catch {
      // Fallback: clipboard API unavailable
      setCopiedMode(null);
    }
  }

  async function handleCopyMarkdown() {
    if (!content) {
      await copyToClipboard(memo.plainText, "markdown");
      return;
    }
    const editor = createEditor();
    const editorState = editor.parseEditorState(JSON.stringify(content));
    editor.setEditorState(editorState);
    let markdown = "";
    editor.update(
      () => {
        markdown = $convertToMarkdownString(TRANSFORMERS);
      },
      { discrete: true },
    );
    await copyToClipboard(markdown || memo.plainText, "markdown");
  }

  async function handleCopyPlainText() {
    await copyToClipboard(memo.plainText, "plaintext");
  }

  async function handleCopyLink() {
    const url = new URL(window.location.href);
    url.searchParams.set("share", memo.id);
    await copyToClipboard(url.toString(), "link");
  }

  const isArchived = memo.state === "archived";

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Share Memo</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {/* Preview */}
              <div className="rounded-lg border border-foreground/10 bg-foreground/[0.02] p-3 mb-4">
                <p className="text-sm text-foreground/70 line-clamp-3 leading-relaxed">
                  {memo.excerpt}
                </p>
                {isArchived && (
                  <span className="inline-block mt-2 text-xs px-1.5 py-0.5 rounded bg-foreground/6 text-foreground/50">
                    archived
                  </span>
                )}
              </div>

              {/* Copy buttons */}
              <div className="flex flex-col gap-2">
                <CopyButton
                  mode="markdown"
                  label="Copy as Markdown"
                  icon={<Copy className="w-4 h-4" />}
                  onClick={handleCopyMarkdown}
                  isCopied={copiedMode === "markdown"}
                />
                <CopyButton
                  mode="plaintext"
                  label="Copy as Plain Text"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={handleCopyPlainText}
                  isCopied={copiedMode === "plaintext"}
                />
                <CopyButton
                  mode="link"
                  label="Copy Share Link"
                  icon={<LinkIcon className="w-4 h-4" />}
                  onClick={handleCopyLink}
                  isCopied={copiedMode === "link"}
                />
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function CopyButton({
  mode,
  label,
  icon,
  onClick,
  isCopied,
}: {
  mode: CopyMode;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isCopied: boolean;
}) {
  return (
    <Button
      variant="bordered"
      size="sm"
      onPress={onClick}
      className="justify-start gap-2 text-sm"
      aria-label={label}
    >
      {isCopied ? <Check className="w-4 h-4 text-green-500" /> : icon}
      <Label>{isCopied ? "Copied!" : label}</Label>
    </Button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/share-dialog.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add src/components/memo/share-dialog.tsx src/components/memo/share-dialog.test.tsx
git commit -m "feat: add share dialog component with clipboard support"
```

---

### Task 2: Integrate Share into MemoCard

**Files:**

- Modify: `src/components/memo/memo-card.tsx`

- [ ] **Step 1: Add Share import and state to memo-card.tsx**

In `src/components/memo/memo-card.tsx`, add imports and state:

```tsx
// Add to imports at top of file:
import { Share } from "lucide-react";
import { ShareDialog } from "./share-dialog";

// Add state inside MemoCard component (after existing useState calls):
const [shareOpen, setShareOpen] = useState(false);
```

- [ ] **Step 2: Add Share menu item to Dropdown**

In the Dropdown.Menu section, add Share item before the archive/unarchive items:

```tsx
<Dropdown.Item id="share" textValue="Share" onPress={() => setShareOpen(true)}>
  <Share className="w-4 h-4 mr-2 inline" />
  <Label>Share</Label>
</Dropdown.Item>
```

- [ ] **Step 3: Render ShareDialog at the bottom of MemoCard**

Add after the existing Delete Confirm Modal (before the closing `</>`):

```tsx
<ShareDialog memo={memo} content={displayContent} isOpen={shareOpen} onOpenChange={setShareOpen} />
```

The full memo-card.tsx after changes should have these imports at the top:

```tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Dropdown, Label, Modal } from "@heroui/react";
import { MoreHorizontal, Archive, ArchiveRestore, Trash2, Edit3, Share } from "lucide-react";
import type { MemoSummary } from "@/api-gen/types.gen";
import type { SerializedEditorState } from "lexical";
import { getMemo } from "@/api-gen/sdk.gen";
import { MemoContent } from "./memo-content";
import { MemoEditor } from "./memo-editor";
import { ShareDialog } from "./share-dialog";
import { coerceEditorState, type MemoDraft } from "@/lib/memo-draft";
```

And the component should include the ShareDialog render before the closing fragment.

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/`
Expected: PASS (existing tests still pass)

- [ ] **Step 5: Commit**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add src/components/memo/memo-card.tsx
git commit -m "feat: add share action to memo card dropdown"
```

---

### Task 3: Share Link Detection in MemosPage

**Files:**

- Modify: `src/components/memo/memos-page.tsx`

- [ ] **Step 1: Add share link detection state and logic**

Add imports and state to `memos-page.tsx`:

```tsx
// Add to existing imports:
import { useEffect, useState } from "react";
import { ShareDialog } from "./share-dialog";
import { coerceEditorState } from "@/lib/memo-draft";

// Add state after existing useState declarations:
const [shareMemoId, setShareMemoId] = useState<string | null>(null);
const [shareMemoData, setShareMemoData] = useState<Memo | null>(null);

// Add effect to detect URL share parameter:
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const shareId = params.get("share");
  if (shareId) {
    setShareMemoId(shareId);
  }
}, []);

// Add query to fetch shared memo:
const shareMemoQuery = useQuery({
  queryKey: ["share-memo", shareMemoId],
  queryFn: () => getMemo({ path: { id: shareMemoId! } }).then((r) => r.data ?? null),
  enabled: !!shareMemoId,
  onSuccess: (data) => {
    if (data) {
      setShareMemoData(data);
      if (data.content) cacheContent(data.id, data.content);
    }
  },
});
```

- [ ] **Step 2: Add ShareDialog render and URL cleanup**

Add after the main content div (before closing `</AppShell>`):

```tsx
{
  shareMemoData && (
    <ShareDialog
      memo={shareMemoData}
      content={coerceEditorState(contentCache[shareMemoData.id] ?? shareMemoData.content)}
      isOpen={!!shareMemoId}
      onOpenChange={(open) => {
        if (!open) {
          setShareMemoId(null);
          setShareMemoData(null);
          const params = new URLSearchParams(window.location.search);
          params.delete("share");
          const newUrl = params.toString()
            ? `${window.location.pathname}?${params.toString()}`
            : window.location.pathname;
          window.history.replaceState({}, "", newUrl);
        }
      }}
    />
  );
}
```

- [ ] **Step 3: Add Memo type import**

Add to the type imports:

```tsx
import type { Memo, MemoSummary } from "@/api-gen/types.gen";
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/memos-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add src/components/memo/memos-page.tsx
git commit -m "feat: detect share link from URL and show share dialog"
```

---

### Task 4: Typography & Spacing Optimization

**Files:**

- Modify: `src/components/memo/memos-page.tsx`
- Modify: `src/components/memo/memo-card.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Update memos-page.tsx title and spacing**

In `memos-page.tsx`, change the header section:

```tsx
// Change the outer container spacing:
<div data-testid="memos-page" className="py-6 lg:py-8 space-y-5">
```

to:

```tsx
<div data-testid="memos-page" className="py-6 lg:py-8 space-y-5">
```

(keep as-is, the spacing is already good)

Change the title:

```tsx
<h1
  data-testid="memo-list-heading"
  className="text-2xl font-semibold text-foreground tracking-tight"
>
  {title}
</h1>
<p className="text-sm text-foreground/40 mt-0.5">
  {memos.length} {memos.length === 1 ? "memo" : "memos"}
  {activeTag ? ` tagged #${activeTag}` : ""}
</p>
```

Change the memo list container:

```tsx
<div className="space-y-3">
  {memos.map((memo) => (
    <MemoCard ... />
  ))}
</div>
```

Change the search input wrapper:

```tsx
<div className="relative max-w-xl">
```

Change the empty state icon size from `w-10` to `w-12` and `max-w-xs` to `max-w-sm`:

```tsx
<div className="w-12 h-12 rounded-2xl bg-accent/8 flex items-center justify-center mb-4">
  <Plus className="w-6 h-6 text-accent/60" />
</div>
```

- [ ] **Step 2: Update memo-card.tsx card styling**

In `memo-card.tsx`, update the Card className:

```tsx
<Card
  variant={isArchived ? "secondary" : "default"}
  data-testid="memo-card"
  className={[
    "group transition-all duration-200",
    isArchived ? "opacity-50" : "",
    onClick ? "cursor-pointer" : "",
    "hover:shadow-md hover:-translate-y-0.5",
  ].join(" ")}
  onClick={() => onClick?.(memo.id)}
>
  <Card.Content className="px-3 py-2.5 sm:px-4 sm:py-3">
```

Update tag styling:

```tsx
<button
  key={tag}
  onClick={(e) => {
    e.stopPropagation();
    onTagClick?.(tag);
  }}
  className="text-xs px-1.5 py-px rounded bg-accent/10 text-accent/80 font-medium hover:bg-accent/15 hover:text-accent transition-colors"
>
  #{tag}
</button>
```

Update timestamp color:

```tsx
<div className="flex items-center gap-1.5 text-xs text-foreground/35 shrink-0 ml-auto">
```

- [ ] **Step 3: Update styles.css for content surface line-height**

In `src/styles.css`, add to `.memo-content-surface`:

```css
.memo-content-surface {
  width: 100%;
  line-height: 1.625;
}
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add src/components/memo/memos-page.tsx src/components/memo/memo-card.tsx src/styles.css
git commit -m "style: optimize typography and spacing across memo components"
```

---

### Task 5: Sidebar Beautification

**Files:**

- Modify: `src/components/layout/app-shell.tsx`

- [ ] **Step 1: Update navigation items with left indicator**

In `SidebarContent`, update the nav button className:

```tsx
<button
  key={item.id}
  onClick={() => {
    onViewChange?.(item.view);
    onTagSelect?.(undefined);
    onClose?.();
  }}
  className={[
    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 w-full text-left",
    activeView === item.view && !activeTag
      ? "border-l-2 border-accent bg-accent/8 pl-1.5 text-foreground"
      : "border-l-2 border-transparent text-foreground/55 hover:text-foreground hover:bg-foreground/5 hover:translate-x-0.5",
  ].join(" ")}
>
  <item.icon className="w-4 h-4 flex-shrink-0" />
  {item.label}
</button>
```

- [ ] **Step 2: Update activity graph container with gradient background**

In `SidebarContent`, wrap the ActivityGraph stats section with a gradient background. The ActivityGraph component itself handles its own stats display. Update the container:

```tsx
<div className="rounded-xl border border-foreground/10 bg-background p-3">
  <ActivityGraph memos={allMemos ?? []} />
</div>
```

Keep as-is — the gradient is applied inside ActivityGraph. Instead, update `activity-graph.tsx` (see Step 4).

- [ ] **Step 3: Update tag list with left indicators and pill badges**

In the tag section, update the "All" button:

```tsx
<button
  onClick={() => {
    onTagSelect?.(undefined);
    onClose?.();
  }}
  data-testid="sidebar-tag-all"
  className={[
    "flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all duration-150 border-l-2",
    !activeTag
      ? "border-l-2 border-accent bg-accent/10 text-accent"
      : "border-l-2 border-transparent text-foreground/60 hover:text-foreground hover:bg-foreground/5 hover:translate-x-0.5",
  ].join(" ")}
>
  <span>All</span>
  <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-xs tabular-nums opacity-60">
    {totalMemosCount}
  </span>
</button>
```

Update individual tag buttons:

```tsx
<button
  key={tag.name}
  onClick={() => {
    onTagSelect?.(activeTag === tag.name ? undefined : tag.name);
    onClose?.();
  }}
  data-testid={`sidebar-tag-${tag.name}`}
  className={[
    "flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all duration-150 border-l-2",
    activeTag === tag.name
      ? "border-l-2 border-accent bg-accent/10 text-accent"
      : "border-l-2 border-transparent text-foreground/60 hover:text-foreground hover:bg-foreground/5 hover:translate-x-0.5",
  ].join(" ")}
>
  <span>#{tag.name}</span>
  <span className="rounded-full bg-foreground/8 px-1.5 py-0.5 text-xs tabular-nums opacity-60">
    {tag.count}
  </span>
</button>
```

- [ ] **Step 4: Update activity-graph.tsx stats and legend styling**

In `src/components/memo/activity-graph.tsx`, update the stats section:

```tsx
{
  /* Stats */
}
<div className="flex items-center gap-5 rounded-lg bg-gradient-to-br from-accent/5 to-accent/[0.02] p-2.5">
  <div>
    <div className="text-2xl font-bold text-foreground">{totalMemos}</div>
    <div className="text-xs text-foreground/50">total memos</div>
  </div>
  <div>
    <div className="text-2xl font-bold text-foreground">{activeDays}</div>
    <div className="text-xs text-foreground/50">active days</div>
  </div>
  <div>
    <div className="text-2xl font-bold text-accent">{todayCount}</div>
    <div className="text-xs text-foreground/50">today</div>
  </div>
</div>;
```

Update the legend colors from `bg-foreground/6` to accent-based:

```tsx
{
  ["bg-accent/10", "bg-accent/20", "bg-accent/45", "bg-accent/75", "bg-accent"].map((c, i) => (
    <div key={i} className={`w-2.5 h-2.5 rounded-sm ${c}`} />
  ));
}
```

- [ ] **Step 5: Run tests**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/memos-page.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add src/components/layout/app-shell.tsx src/components/memo/activity-graph.tsx
git commit -m "style: beautify sidebar with indicators, pill badges, and gradient stats"
```

---

### Task 6: Add Share Link Test to MemosPage Tests

**Files:**

- Modify: `src/components/memo/memos-page.test.tsx`

- [ ] **Step 1: Add share link test case**

Add to the existing `describe("MemosPage")` block in `src/components/memo/memos-page.test.tsx`:

```tsx
it("opens share dialog when URL contains share parameter", async () => {
  const travelMemo = makeMemoSummary("memo-1", "Plan trip #travel", ["travel"]);
  listMemosMock.mockImplementation(({ query }: { query?: { state?: string; tag?: string } }) => {
    if (query?.state === "archived") return Promise.resolve({ data: [] });
    return Promise.resolve({ data: [travelMemo] });
  });
  listTagsMock.mockResolvedValue({ data: [] });
  getMemoMock.mockImplementation(({ path }: { path: { id: string } }) => {
    if (path.id === "memo-1") return Promise.resolve({ data: makeMemo(travelMemo) });
    return Promise.resolve({ data: undefined });
  });

  // Simulate URL with share parameter
  window.history.pushState({}, "", "/?share=memo-1");

  renderWithQueryClient(<MemosPage />);

  // Share dialog should appear with the memo excerpt
  await screen.findByText("Share Memo");
  await screen.findByText("Plan trip #travel");

  // Clean up URL
  window.history.pushState({}, "", "/");
});
```

- [ ] **Step 2: Add ShareDialog mock to test setup**

Add to the existing mock section at the top of the file:

```tsx
vi.mock("./share-dialog", () => ({
  ShareDialog: ({ memo, isOpen }: { memo: { excerpt: string }; isOpen: boolean }) =>
    isOpen ? (
      <div data-testid="share-dialog">
        <div>Share Memo</div>
        <div>{memo.excerpt}</div>
      </div>
    ) : null,
}));
```

- [ ] **Step 3: Run tests**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test src/components/memo/memos-page.test.tsx`
Expected: PASS (all tests including new share test)

- [ ] **Step 4: Commit**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add src/components/memo/memos-page.test.tsx
git commit -m "test: add share link detection test case"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp test`
Expected: All tests pass

- [ ] **Step 2: Run type check**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp check`
Expected: No type errors

- [ ] **Step 3: Run lint**

Run: `cd /Users/wibus/dev/ag-vibe/memos && vp lint`
Expected: No lint errors

- [ ] **Step 4: Final commit if any fixes needed**

```bash
cd /Users/wibus/dev/ag-vibe/memos
git add -A
git commit -m "chore: fix lint and type issues"
```
