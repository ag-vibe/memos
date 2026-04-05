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

interface MemoCardProps {
  memo: MemoSummary;
  contentOverride?: SerializedEditorState | null;
  onArchive?: (id: string) => Promise<void>;
  onUnarchive?: (id: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onUpdate?: (id: string, draft: MemoDraft) => Promise<void>;
  onTagClick?: (tag: string) => void;
  onClick?: (id: string) => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MemoCard({
  memo,
  contentOverride,
  onArchive,
  onUnarchive,
  onDelete,
  onUpdate,
  onTagClick,
  onClick,
}: MemoCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isActing, setIsActing] = useState(false);

  // Fetch full content to avoid excerpt newline stripping
  const fullContentQuery = useQuery({
    queryKey: ["memo", memo.id],
    queryFn: () => getMemo({ path: { id: memo.id } }).then((r) => r.data?.content ?? null),
    enabled: !contentOverride,
    staleTime: 5 * 60 * 1000,
  });

  const displayContent = contentOverride ?? coerceEditorState(fullContentQuery.data);

  const isArchived = memo.state === "archived";

  async function handleAction(fn: () => Promise<void>) {
    setIsActing(true);
    try {
      await fn();
    } finally {
      setIsActing(false);
    }
  }

  return (
    <>
      <Card
        variant={isArchived ? "secondary" : "default"}
        data-testid="memo-card"
        className={[
          "group transition-all duration-150",
          isArchived ? "opacity-50" : "",
          onClick ? "cursor-pointer" : "",
        ].join(" ")}
        onClick={() => onClick?.(memo.id)}
      >
        <Card.Content className="px-3.5 py-2.5">
          {/* Content */}
          {displayContent ? <MemoContent content={displayContent} clamp /> : null}

          {/* Footer row: tags + meta + actions */}
          <div className="flex items-center gap-2 mt-2">
            {/* Tags */}
            {(memo.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                {(memo.tags ?? []).map((tag) => (
                  <button
                    key={tag}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(tag);
                    }}
                    className="text-xs px-1.5 py-px rounded bg-accent/8 text-accent/70 hover:bg-accent/15 hover:text-accent transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="flex items-center gap-1.5 text-xs text-foreground/30 shrink-0 ml-auto">
              <time dateTime={memo.createdAt}>{formatDate(memo.createdAt)}</time>
              {memo.updatedAt !== memo.createdAt && <span>· edited</span>}
              {isArchived && <span className="px-1 rounded bg-foreground/6">archived</span>}
            </div>

            {/* Actions */}
            <div
              className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              {onUpdate && (
                <Button
                  variant="ghost"
                  isIconOnly
                  size="sm"
                  onPress={() => setEditOpen(true)}
                  aria-label="Edit memo"
                  className="w-6 h-6 text-foreground/40 hover:text-foreground"
                >
                  <Edit3 className="w-3 h-3" />
                </Button>
              )}
              <Dropdown>
                <Button
                  variant="ghost"
                  isIconOnly
                  size="sm"
                  aria-label="More options"
                  className="w-6 h-6 text-foreground/40 hover:text-foreground"
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
                <Dropdown.Popover>
                  <Dropdown.Menu
                    onAction={(key) => {
                      if (key === "archive" && onArchive)
                        void handleAction(() => onArchive(memo.id));
                      if (key === "unarchive" && onUnarchive)
                        void handleAction(() => onUnarchive(memo.id));
                      if (key === "delete") setDeleteConfirmOpen(true);
                    }}
                  >
                    <Dropdown.Item id="share" textValue="Share" onPress={() => setShareOpen(true)}>
                      <Share className="w-4 h-4 mr-2 inline" />
                      <Label>Share</Label>
                    </Dropdown.Item>
                    {isArchived ? (
                      <Dropdown.Item id="unarchive" textValue="Restore">
                        <ArchiveRestore className="w-4 h-4 mr-2 inline" />
                        <Label>Restore</Label>
                      </Dropdown.Item>
                    ) : (
                      <Dropdown.Item id="archive" textValue="Archive">
                        <Archive className="w-4 h-4 mr-2 inline" />
                        <Label>Archive</Label>
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item id="delete" textValue="Delete" variant="danger">
                      <Trash2 className="w-4 h-4 mr-2 inline" />
                      <Label>Delete</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Edit Modal */}
      {onUpdate && (
        <Modal isOpen={editOpen} onOpenChange={setEditOpen}>
          <Modal.Backdrop isDismissable>
            <Modal.Container placement="center" size="lg">
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>Edit memo</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <MemoEditor
                    initialContent={displayContent}
                    onSubmit={async (draft) => {
                      await onUpdate(memo.id, draft);
                      setEditOpen(false);
                    }}
                    autoFocus
                    compact
                  />
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      <Modal isOpen={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container placement="center" size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Delete memo?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  This action cannot be undone. The memo will be permanently deleted.
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close">
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isPending={isActing}
                  onPress={() => {
                    if (onDelete)
                      void handleAction(() => onDelete(memo.id)).then(() =>
                        setDeleteConfirmOpen(false),
                      );
                  }}
                >
                  Delete
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      <ShareDialog
        memo={memo}
        content={displayContent}
        isOpen={shareOpen}
        onOpenChange={setShareOpen}
      />
    </>
  );
}
