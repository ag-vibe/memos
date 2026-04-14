import { ShiroRenderer } from "@haklex/rich-kit-shiro";
import { useMemo } from "react";
import type { SerializedEditorState } from "lexical";

interface MemoContentProps {
  content: SerializedEditorState;
  clamp?: boolean;
}

export function MemoContent({ content, clamp = false }: MemoContentProps) {
  const theme = useMemo<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  }, []);

  return (
    <div className={clamp ? "memo-rich-note line-clamp-6" : "memo-rich-note"}>
      <ShiroRenderer
        className="memo-content-surface"
        value={content}
        variant="article"
        theme={theme}
      />
    </div>
  );
}
