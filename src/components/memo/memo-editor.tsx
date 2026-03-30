import { useEffect, useEffectEvent, useMemo, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Send,
  Underline,
  Undo2,
} from "lucide-react";
import { RichEditor } from "@haklex/rich-editor";
import { INSERT_HORIZONTAL_RULE_COMMAND } from "@lexical/extension";
import {
  $isListItemNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from "@lexical/list";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
} from "@lexical/rich-text";
import {
  $createParagraphNode,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  SELECTION_CHANGE_COMMAND,
  UNDO_COMMAND,
  mergeRegister,
  type ElementNode,
  type LexicalEditor,
  type SerializedEditorState,
  type TextFormatType,
} from "lexical";
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

type TopLevelBlockKind = "paragraph" | "h1" | "h2" | "quote" | "bullet" | "number";

interface ToolbarState {
  blockType: TopLevelBlockKind;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  code: boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  blockType: "paragraph",
  bold: false,
  italic: false,
  underline: false,
  code: false,
  canUndo: false,
  canRedo: false,
};

function isToolbarStateEqual(a: ToolbarState, b: ToolbarState) {
  return (
    a.blockType === b.blockType &&
    a.bold === b.bold &&
    a.italic === b.italic &&
    a.underline === b.underline &&
    a.code === b.code &&
    a.canUndo === b.canUndo &&
    a.canRedo === b.canRedo
  );
}

function getSelectionBlockType(): TopLevelBlockKind {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return "paragraph";

  const topLevelNode = selection.anchor.getNode().getTopLevelElementOrThrow();
  if ($isListNode(topLevelNode)) {
    return topLevelNode.getListType() === "number" ? "number" : "bullet";
  }

  if ($isListItemNode(topLevelNode)) {
    const listNode = topLevelNode.getParent();
    if ($isListNode(listNode)) {
      return listNode.getListType() === "number" ? "number" : "bullet";
    }
  }

  if ($isHeadingNode(topLevelNode)) {
    const tag = topLevelNode.getTag();
    if (tag === "h1" || tag === "h2") return tag;
  }

  if ($isQuoteNode(topLevelNode)) return "quote";

  return "paragraph";
}

function transformSelectedBlocks(createBlock: () => ElementNode) {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) return;

  const blocks = new Map<string, ElementNode>();

  for (const node of selection.getNodes()) {
    const block = node.getTopLevelElementOrThrow();
    if (!$isElementNode(block)) continue;
    blocks.set(block.getKey(), block);
  }

  if (blocks.size === 0) {
    const anchorBlock = selection.anchor.getNode().getTopLevelElementOrThrow();
    if (!$isElementNode(anchorBlock)) return;
    blocks.set(anchorBlock.getKey(), anchorBlock);
  }

  for (const block of blocks.values()) {
    const replacement = createBlock();
    replacement.setFormat(block.getFormatType());
    replacement.setIndent(block.getIndent());
    block.replace(replacement, true);
  }
}

function ToolbarButton({
  title,
  onClick,
  active = false,
  disabled = false,
  iconOnly = false,
  children,
}: {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  iconOnly?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={[
        "inline-flex h-7 items-center justify-center rounded-md border text-[11px] font-medium transition",
        iconOnly ? "w-7 px-0" : "px-2",
        active
          ? "border-accent/30 bg-accent/10 text-accent"
          : "border-transparent text-foreground/55 hover:border-foreground/10 hover:bg-foreground/5 hover:text-foreground",
        disabled ? "cursor-not-allowed opacity-35" : "",
      ].join(" ")}
    >
      {children}
    </button>
  );
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
  const [editor, setEditor] = useState<LexicalEditor | null>(null);
  const [toolbarState, setToolbarState] = useState<ToolbarState>(DEFAULT_TOOLBAR_STATE);

  useEffect(() => {
    if (initialContent) setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (!editor) return;

    const handleFocusIn = () => setIsFocused(true);
    const handleFocusOut = () => setIsFocused(false);

    return editor.registerRootListener((nextRoot, prevRoot) => {
      prevRoot?.removeEventListener("focusin", handleFocusIn);
      prevRoot?.removeEventListener("focusout", handleFocusOut);

      if (!nextRoot) return;

      nextRoot.addEventListener("focusin", handleFocusIn);
      nextRoot.addEventListener("focusout", handleFocusOut);
      setIsFocused(nextRoot.contains(document.activeElement));
    });
  }, [editor]);

  const syncToolbarState = useEffectEvent((currentEditor: LexicalEditor) => {
    currentEditor.getEditorState().read(() => {
      const selection = $getSelection();
      const nextState = {
        blockType: getSelectionBlockType(),
        bold: $isRangeSelection(selection) ? selection.hasFormat("bold") : false,
        italic: $isRangeSelection(selection) ? selection.hasFormat("italic") : false,
        underline: $isRangeSelection(selection) ? selection.hasFormat("underline") : false,
        code: $isRangeSelection(selection) ? selection.hasFormat("code") : false,
      };

      setToolbarState((current) => {
        const mergedState = { ...current, ...nextState };
        return isToolbarStateEqual(current, mergedState) ? current : mergedState;
      });
    });
  });

  useEffect(() => {
    if (!editor) return;

    syncToolbarState(editor);

    return mergeRegister(
      editor.registerUpdateListener(() => {
        syncToolbarState(editor);
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          syncToolbarState(editor);
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (canUndo) => {
          setToolbarState((current) =>
            current.canUndo === canUndo ? current : { ...current, canUndo },
          );
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (canRedo) => {
          setToolbarState((current) =>
            current.canRedo === canRedo ? current : { ...current, canRedo },
          );
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, syncToolbarState]);

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

  function runEditorAction(action: () => void) {
    if (!editor) return;
    editor.focus();
    action();
  }

  function formatText(format: TextFormatType) {
    runEditorAction(() => {
      editor?.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    });
  }

  function toggleList(type: "bullet" | "number") {
    runEditorAction(() => {
      const isActive = toolbarState.blockType === type;
      if (isActive) {
        editor?.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        return;
      }

      editor?.dispatchCommand(
        type === "bullet" ? INSERT_UNORDERED_LIST_COMMAND : INSERT_ORDERED_LIST_COMMAND,
        undefined,
      );
    });
  }

  function setBlockType(type: Exclude<TopLevelBlockKind, "bullet" | "number">) {
    runEditorAction(() => {
      if (!editor) return;

      if (type === toolbarState.blockType) {
        if (type === "paragraph") return;
        editor.update(() => transformSelectedBlocks(() => $createParagraphNode()));
        return;
      }

      const applyBlockTransform = () => {
        editor.update(() => {
          if (type === "paragraph") {
            transformSelectedBlocks(() => $createParagraphNode());
            return;
          }

          if (type === "quote") {
            transformSelectedBlocks(() => $createQuoteNode());
            return;
          }

          transformSelectedBlocks(() => $createHeadingNode(type));
        });
      };

      if (toolbarState.blockType === "bullet" || toolbarState.blockType === "number") {
        editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
        if (type !== "paragraph") {
          window.requestAnimationFrame(applyBlockTransform);
        }
        return;
      }

      applyBlockTransform();
    });
  }

  const charCount = draft.plainText.length;
  const lineCount = draft.plainText ? draft.plainText.split("\n").length : 0;

  return (
    <div
      className={[
        "rounded-xl border bg-background transition-colors",
        isFocused
          ? "border-accent/50 shadow-sm shadow-accent/10"
          : "border-foreground/12 hover:border-foreground/20",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-foreground/8 px-2.5 py-1.5">
        <div className="flex items-center gap-1">
          <ToolbarButton
            title="Undo"
            iconOnly
            disabled={!toolbarState.canUndo}
            onClick={() => runEditorAction(() => editor?.dispatchCommand(UNDO_COMMAND, undefined))}
          >
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            iconOnly
            disabled={!toolbarState.canRedo}
            onClick={() => runEditorAction(() => editor?.dispatchCommand(REDO_COMMAND, undefined))}
          >
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            title="Paragraph"
            active={toolbarState.blockType === "paragraph"}
            onClick={() => setBlockType("paragraph")}
          >
            <Pilcrow className="mr-1 h-3.5 w-3.5" />P
          </ToolbarButton>
          <ToolbarButton
            title="Heading 1"
            active={toolbarState.blockType === "h1"}
            onClick={() => setBlockType("h1")}
          >
            <Heading1 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Heading 2"
            active={toolbarState.blockType === "h2"}
            onClick={() => setBlockType("h2")}
          >
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Quote"
            active={toolbarState.blockType === "quote"}
            onClick={() => setBlockType("quote")}
          >
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton title="Bold" active={toolbarState.bold} onClick={() => formatText("bold")}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Italic"
            active={toolbarState.italic}
            onClick={() => formatText("italic")}
          >
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Underline"
            active={toolbarState.underline}
            onClick={() => formatText("underline")}
          >
            <Underline className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Inline code"
            active={toolbarState.code}
            onClick={() => formatText("code")}
          >
            <Code className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1">
          <ToolbarButton
            title="Bullet list"
            active={toolbarState.blockType === "bullet"}
            onClick={() => toggleList("bullet")}
          >
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Numbered list"
            active={toolbarState.blockType === "number"}
            onClick={() => toggleList("number")}
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton
            title="Divider"
            onClick={() =>
              runEditorAction(() =>
                editor?.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined),
              )
            }
          >
            <Minus className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>
      </div>

      <RichEditor
        variant="article"
        initialValue={content}
        placeholder={placeholder}
        autoFocus={autoFocus}
        onChange={(value) => setContent(value)}
        onEditorReady={(nextEditor) => setEditor(nextEditor)}
        className="rounded-xl"
        contentClassName={[
          "px-3 pb-2.5 pt-2.5 text-sm",
          compact ? "min-h-[140px]" : "min-h-[220px]",
        ].join(" ")}
      />

      <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1">
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
          <Send className="h-3.5 w-3.5" />
          Send
        </Button>
      </div>
    </div>
  );
}
