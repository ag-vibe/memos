import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@heroui/react";
import { Search, X, Plus } from "lucide-react";
import type { SerializedEditorState } from "lexical";
import { listMemos, createMemo, updateMemo, deleteMemo, getMemo } from "@/api-gen/sdk.gen";
import type { MemoContent } from "@/api-gen/types.gen";
import { listTags } from "@/api-gen/sdk.gen";
import { MemoCard } from "./memo-card";
import { MemoEditor } from "./memo-editor";
import { coerceEditorState, deriveMemoDraft } from "@/lib/memo-draft";
import { AppShell } from "@/components/layout/app-shell";

export function MemosPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | undefined>();
  const [activeView, setActiveView] = useState<"all" | "archived">("all");
  // Cache full content from create/update responses to avoid excerpt newline stripping
  const [contentCache, setContentCache] = useState<Record<string, SerializedEditorState | null>>(
    {},
  );

  const cacheContent = useCallback((id: string, content: unknown) => {
    const state = coerceEditorState(content);
    if (!state) return;
    setContentCache((prev) => ({ ...prev, [id]: state }));
  }, []);

  const memosQuery = useQuery({
    queryKey: ["memos", activeView, activeTag, search],
    queryFn: () =>
      listMemos({
        query: {
          state: activeView === "archived" ? "archived" : "active",
          tag: activeTag,
          q: search || undefined,
          limit: 100,
        },
      }).then((r) => r.data ?? []),
  });

  const allMemosQuery = useQuery({
    queryKey: ["memos", "all-for-graph"],
    queryFn: () => listMemos({ query: { state: "active", limit: 1000 } }).then((r) => r.data ?? []),
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => listTags({}).then((r) => r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (draft: {
      content: MemoContent;
      plainText: string;
      excerpt: string;
      tags: string[];
    }) =>
      createMemo({
        body: {
          content: draft.content,
          plainText: draft.plainText,
          excerpt: draft.excerpt,
          tags: draft.tags,
          references: [],
        },
      }),
    onSuccess: (res) => {
      if (res.data) cacheContent(res.data.id, res.data.content);
      void qc.invalidateQueries({ queryKey: ["memos"] });
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      draft,
    }: {
      id: string;
      draft: { content: MemoContent; plainText: string; excerpt: string; tags: string[] };
    }) =>
      updateMemo({
        path: { id },
        body: {
          content: draft.content,
          plainText: draft.plainText,
          excerpt: draft.excerpt,
          tags: draft.tags,
          references: [],
        },
      }),
    onSuccess: (res) => {
      if (res.data) cacheContent(res.data.id, res.data.content);
      void qc.invalidateQueries({ queryKey: ["memos"] });
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const memo = await getMemo({ path: { id } }).then((r) => r.data);
      if (!memo) throw new Error("Memo not found");
      const state = coerceEditorState(memo.content);
      if (!state) throw new Error("Invalid memo content");
      const draft = deriveMemoDraft(state);
      return updateMemo({
        path: { id },
        body: {
          content: draft.content,
          plainText: draft.plainText,
          excerpt: draft.excerpt,
          tags: draft.tags,
          references: memo.references ?? [],
          state: "archived",
        },
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["memos"] }),
  });

  const unarchiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const memo = await getMemo({ path: { id } }).then((r) => r.data);
      if (!memo) throw new Error("Memo not found");
      const state = coerceEditorState(memo.content);
      if (!state) throw new Error("Invalid memo content");
      const draft = deriveMemoDraft(state);
      return updateMemo({
        path: { id },
        body: {
          content: draft.content,
          plainText: draft.plainText,
          excerpt: draft.excerpt,
          tags: draft.tags,
          references: memo.references ?? [],
          state: "active",
        },
      });
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["memos"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMemo({ path: { id } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["memos"] });
      void qc.invalidateQueries({ queryKey: ["tags"] });
    },
  });

  const memos = memosQuery.data ?? [];
  const allMemos = allMemosQuery.data ?? [];
  const tags = tagsQuery.data ?? [];

  const title = useMemo(() => {
    if (activeTag) return `#${activeTag}`;
    if (activeView === "archived") return "Archived";
    return "All Memos";
  }, [activeTag, activeView]);

  return (
    <AppShell
      tags={tags}
      allMemos={allMemos}
      totalMemosCount={allMemos.length}
      activeTag={activeTag}
      onTagSelect={setActiveTag}
      activeView={activeView}
      onViewChange={(v) => {
        setActiveView(v);
        setActiveTag(undefined);
      }}
    >
      <div data-testid="memos-page" className="py-6 lg:py-8 space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1
              data-testid="memo-list-heading"
              className="text-xl font-semibold text-foreground tracking-tight"
            >
              {title}
            </h1>
            <p className="text-xs text-foreground/40 mt-0.5">
              {memos.length} {memos.length === 1 ? "memo" : "memos"}
              {activeTag ? ` tagged #${activeTag}` : ""}
            </p>
          </div>
          {activeTag && (
            <button
              onClick={() => setActiveTag(undefined)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition-colors shrink-0"
            >
              #{activeTag}
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* New Memo Editor */}
        {activeView === "all" && (
          <div>
            <MemoEditor
              onSubmit={async (draft) => {
                await createMutation.mutateAsync(draft);
              }}
            />
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground/35 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search memos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            fullWidth
            className="pl-9 pr-4 text-sm"
            aria-label="Search memos"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Memo List */}
        {memosQuery.isPending ? (
          <MemoListSkeleton />
        ) : memos.length === 0 ? (
          <EmptyState view={activeView} hasSearch={!!search} hasTag={!!activeTag} />
        ) : (
          <div className="space-y-2.5">
            {memos.map((memo) => (
              <MemoCard
                key={memo.id}
                memo={memo}
                contentOverride={coerceEditorState(contentCache[memo.id])}
                onArchive={async (id) => {
                  await archiveMutation.mutateAsync(id);
                }}
                onUnarchive={async (id) => {
                  await unarchiveMutation.mutateAsync(id);
                }}
                onDelete={async (id) => {
                  await deleteMutation.mutateAsync(id);
                }}
                onUpdate={async (id, draft) => {
                  await updateMutation.mutateAsync({ id, draft });
                }}
                onTagClick={(tag) => setActiveTag(tag)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function MemoListSkeleton() {
  return (
    <div className="space-y-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-foreground/7 bg-background p-4 animate-pulse"
        >
          <div className="space-y-2">
            <div className="h-3 bg-foreground/6 rounded-md w-full" />
            <div className="h-3 bg-foreground/6 rounded-md w-4/5" />
            <div className="h-3 bg-foreground/6 rounded-md w-2/3" />
          </div>
          <div className="mt-3 flex gap-1.5">
            <div className="h-4 w-14 bg-foreground/5 rounded" />
            <div className="h-4 w-10 bg-foreground/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  view,
  hasSearch,
  hasTag,
}: {
  view: string;
  hasSearch: boolean;
  hasTag: boolean;
}) {
  if (hasSearch || hasTag) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="w-10 h-10 text-foreground/20 mb-4" />
        <p className="text-foreground/50 text-sm">No memos match your filter.</p>
      </div>
    );
  }
  if (view === "archived") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-foreground/40 text-sm">No archived memos.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/8 flex items-center justify-center mb-4">
        <Plus className="w-7 h-7 text-accent/60" />
      </div>
      <p className="text-foreground/60 font-medium mb-1">Start writing</p>
      <p className="text-foreground/40 text-sm max-w-xs">
        Capture your thoughts, ideas, and notes. Use #tags to organize.
      </p>
    </div>
  );
}
