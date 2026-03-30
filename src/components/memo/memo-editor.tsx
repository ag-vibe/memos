import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { Send } from "lucide-react";
import { RichEditor } from "@haklex/rich-editor";
import type { SerializedEditorState } from "lexical";
import { deriveMemoDraft } from "@/lib/memo-draft";

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
  onSubmit: (draft: ReturnType<typeof deriveMemoDraft>) => Promise<void>;
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
  const [isFocused, setIsFocused] = useState(autoFocus);

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

  const charCount = draft.plainText.length;
  const lineCount = draft.plainText ? draft.plainText.split("\n").length : 0;

  return (
    <div
      className={[
        "rounded-xl border transition-colors bg-background",
        isFocused
          ? "border-accent/50 shadow-sm shadow-accent/10"
          : "border-foreground/12 hover:border-foreground/20",
      ].join(" ")}
    >
      <RichEditor
        variant="note"
        initialValue={content}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(value) => setContent(value)}
        onEditorReady={(editor) => {
          if (!editor) return;
          const element = editor.getRootElement();
          if (!element) return;
          const focusIn = () => setIsFocused(true);
          const focusOut = () => setIsFocused(false);
          element.addEventListener("focusin", focusIn);
          element.addEventListener("focusout", focusOut);
        }}
        className="rounded-xl"
        contentClassName={[
          "px-4 pb-2 pt-3 text-sm",
          compact ? "min-h-[96px]" : "min-h-[120px]",
        ].join(" ")}
      />

      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        <div className="flex items-center gap-3">
          {draft.plainText.length > 0 && (
            <span className="text-xs text-foreground/30">
              {charCount} chars · {lineCount} {lineCount === 1 ? "line" : "lines"}
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
          <Send className="w-3.5 h-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}
