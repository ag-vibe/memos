import { useState } from "react";
import { Button, Modal } from "@heroui/react";
import { Copy, FileText, Link as LinkIcon, Check } from "lucide-react";
import type { MemoSummary } from "@/api-gen/types.gen";
import type { SerializedEditorState } from "lexical";
import { $convertToMarkdownString, TRANSFORMERS } from "@lexical/markdown";
import { createEditor } from "lexical";

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
    const markdown = await new Promise<string>((resolve) => {
      editor.update(
        () => {
          resolve($convertToMarkdownString(TRANSFORMERS));
        },
        { discrete: true },
      );
    });
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

              <div className="flex flex-col gap-2">
                <CopyButton
                  label="Copy as Markdown"
                  icon={<Copy className="w-4 h-4" />}
                  onClick={handleCopyMarkdown}
                  isCopied={copiedMode === "markdown"}
                />
                <CopyButton
                  label="Copy as Plain Text"
                  icon={<FileText className="w-4 h-4" />}
                  onClick={handleCopyPlainText}
                  isCopied={copiedMode === "plaintext"}
                />
                <CopyButton
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
  label,
  icon,
  onClick,
  isCopied,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  isCopied: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onPress={onClick}
      className="justify-start gap-2 text-sm"
      aria-label={label}
    >
      {isCopied ? <Check className="w-4 h-4 text-green-500" /> : icon}
      <span>{isCopied ? "Copied!" : label}</span>
    </Button>
  );
}
