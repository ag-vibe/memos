import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Send } from "lucide-react";
import { ShiroEditor } from "@haklex/rich-kit-shiro";
import type { SerializedEditorState } from "lexical";
import { deriveMemoDraft, type MemoDraft } from "@/lib/memo-draft";

const EMPTY_STATE = {
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
            text: "",
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
} as unknown as SerializedEditorState;

interface MemoEditorProps {
  onSubmit: (draft: MemoDraft) => Promise<void>;
  initialContent?: SerializedEditorState | null;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export function MemoEditor({
  onSubmit,
  initialContent = EMPTY_STATE,
  placeholder = "What's on your mind?",
  autoFocus = false,
  compact = false,
}: MemoEditorProps) {
  const [content, setContent] = useState<SerializedEditorState>(initialContent ?? EMPTY_STATE);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (initialContent) setContent(initialContent);
  }, [initialContent]);

  const draft = useMemo(() => deriveMemoDraft(content), [content]);

  async function handleSubmit() {
    if (!draft.plainText.trim()) return;
    setIsPending(true);
    try {
      await onSubmit(draft);
      setContent(EMPTY_STATE);
    } finally {
      setIsPending(false);
    }
  }

  async function handleImageUpload(file: File) {
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      return { src: "", altText: file.name };
    }
    return {
      src: URL.createObjectURL(file),
      altText: file.name,
    };
  }

  const charCount = draft.plainText.length;
  const lineCount = draft.plainText ? draft.plainText.split("\n").length : 0;

  return (
    <div className="memo-editor-shell">
      <ShiroEditor
        variant="note"
        initialValue={content}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(value) => setContent(value as SerializedEditorState)}
        imageUpload={handleImageUpload}
        className="memo-editor-surface memo-rich-note"
        contentClassName={
          compact ? "memo-editor-content memo-editor-content--compact" : "memo-editor-content"
        }
      />

      <div className="memo-editor-footer">
        <div className="memo-editor-meta">
          <span>{charCount} chars</span>
          {lineCount > 0 && (
            <span>
              · {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          onPress={handleSubmit}
          isPending={isPending}
          isDisabled={!draft.plainText.trim()}
          className="gap-1.5"
          data-testid="memo-submit"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}
