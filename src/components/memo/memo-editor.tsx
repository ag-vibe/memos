import { useState, useRef, useEffect } from "react";
import { Button, TextArea } from "@heroui/react";
import { Send, Hash, Bold, Italic, Code } from "lucide-react";

interface MemoEditorProps {
  onSubmit: (content: string) => Promise<void>;
  initialContent?: string;
  placeholder?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

export function MemoEditor({
  onSubmit,
  initialContent = "",
  placeholder = "What's on your mind? Use #tags to organize...",
  autoFocus = false,
  compact = false,
}: MemoEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isPending, setIsPending] = useState(false);
  const [focused, setFocused] = useState(autoFocus);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  async function handleSubmit() {
    if (!content.trim()) return;
    setIsPending(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setIsPending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  function insertMarkdown(prefix: string, suffix = prefix) {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    const newContent = content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(newContent);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }

  const charCount = content.length;
  const lineCount = content.split("\n").length;

  return (
    <div
      className={[
        "rounded-xl border transition-colors bg-background",
        focused
          ? "border-accent/50 shadow-sm shadow-accent/10"
          : "border-foreground/12 hover:border-foreground/20",
      ].join(" ")}
    >
      <TextArea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        rows={compact ? 3 : 4}
        fullWidth
        className="border-none shadow-none focus:ring-0 resize-none px-4 pt-3 pb-1 text-sm"
        aria-label="Memo content"
      />

      <div className="flex items-center justify-between px-3 pb-3 pt-1">
        {/* Formatting toolbar */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={() => insertMarkdown("**")}
            aria-label="Bold"
            className="text-foreground/50 hover:text-foreground w-7 h-7"
          >
            <Bold className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={() => insertMarkdown("_")}
            aria-label="Italic"
            className="text-foreground/50 hover:text-foreground w-7 h-7"
          >
            <Italic className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={() => insertMarkdown("`")}
            aria-label="Code"
            className="text-foreground/50 hover:text-foreground w-7 h-7"
          >
            <Code className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            isIconOnly
            size="sm"
            onPress={() => {
              const ta = textareaRef.current;
              if (!ta) return;
              const pos = ta.selectionStart;
              const before = content.slice(0, pos);
              const after = content.slice(pos);
              const newContent = before + "#" + after;
              setContent(newContent);
              setTimeout(() => {
                ta.focus();
                ta.setSelectionRange(pos + 1, pos + 1);
              }, 0);
            }}
            aria-label="Insert tag"
            className="text-foreground/50 hover:text-foreground w-7 h-7"
          >
            <Hash className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span className="text-xs text-foreground/30">
              {charCount} chars · {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            onPress={handleSubmit}
            isPending={isPending}
            isDisabled={!content.trim()}
            className="gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
