import { RichRenderer } from "@haklex/rich-static-renderer";
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
    <div className={clamp ? "line-clamp-6" : ""}>
      <RichRenderer value={content} variant="note" theme={theme} />
    </div>
  );
}
