import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { Memo, MemoSummary, TagSummary } from "@/api-gen/types.gen";
import { renderWithQueryClient } from "@/test/render";
import { MemosPage } from "./memos-page";

const { listMemosMock, listTagsMock, createMemoMock, updateMemoMock, deleteMemoMock, getMemoMock } =
  vi.hoisted(() => ({
    listMemosMock: vi.fn(),
    listTagsMock: vi.fn(),
    createMemoMock: vi.fn(),
    updateMemoMock: vi.fn(),
    deleteMemoMock: vi.fn(),
    getMemoMock: vi.fn(),
  }));

vi.mock("@/api-gen/sdk.gen", () => ({
  listMemos: listMemosMock,
  listTags: listTagsMock,
  createMemo: createMemoMock,
  updateMemo: updateMemoMock,
  deleteMemo: deleteMemoMock,
  getMemo: getMemoMock,
}));

vi.mock("@/lib/auth-store", () => ({
  useIsAuthenticated: () => true,
  useSession: () => ({
    accessToken: "smoke-session-token",
  }),
  signOut: vi.fn(),
}));

function makeMemoSummary(id: string, excerpt: string, tags: string[]): MemoSummary {
  return {
    id,
    excerpt,
    plainText: excerpt,
    tags,
    state: "active",
    createdAt: "2026-03-30T10:00:00.000Z",
    updatedAt: "2026-03-30T10:00:00.000Z",
  };
}

function makeMemo(summary: MemoSummary): Memo {
  return {
    ...summary,
    content: {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: "normal",
                style: "",
                text: summary.excerpt,
                type: "text",
                version: 1,
              },
            ],
            direction: null,
            format: "",
            indent: 0,
            type: "paragraph",
            version: 1,
            textFormat: 0,
            textStyle: "",
          },
        ],
        direction: null,
        format: "",
        indent: 0,
        type: "root",
        version: 1,
      },
    },
    references: [],
  };
}

describe("MemosPage", () => {
  beforeEach(() => {
    listMemosMock.mockReset();
    listTagsMock.mockReset();
    createMemoMock.mockReset();
    updateMemoMock.mockReset();
    deleteMemoMock.mockReset();
    getMemoMock.mockReset();
  });

  it("renders active memos and sidebar tags", async () => {
    const travelMemo = makeMemoSummary("memo-1", "Plan trip #travel", ["travel"]);
    const workMemo = makeMemoSummary("memo-2", "Ship feature #work", ["work"]);
    const allMemos = [travelMemo, workMemo];
    const tags: TagSummary[] = [
      { name: "travel", count: 1 },
      { name: "work", count: 1 },
    ];

    listMemosMock.mockImplementation(({ query }: { query?: { state?: string; tag?: string } }) => {
      if (query?.state === "archived") return Promise.resolve({ data: [] });
      if (query?.tag === "travel") return Promise.resolve({ data: [travelMemo] });
      return Promise.resolve({ data: allMemos });
    });
    listTagsMock.mockResolvedValue({ data: tags });
    getMemoMock.mockImplementation(({ path }: { path: { id: string } }) => {
      const memo = allMemos.find((item) => item.id === path.id);
      return Promise.resolve({ data: memo ? makeMemo(memo) : undefined });
    });

    renderWithQueryClient(<MemosPage />);

    expect(await screen.findByRole("heading", { name: "All Memos" })).toBeTruthy();
    expect(await screen.findByText("Plan trip #travel")).toBeTruthy();
    expect(await screen.findByText("Ship feature #work")).toBeTruthy();
    expect(screen.getAllByTestId("sidebar-tag-travel").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("sidebar-tag-work").length).toBeGreaterThan(0);
  });

  it("updates the memo list when a sidebar tag is selected", async () => {
    const travelMemo = makeMemoSummary("memo-1", "Plan trip #travel", ["travel"]);
    const workMemo = makeMemoSummary("memo-2", "Ship feature #work", ["work"]);

    listMemosMock.mockImplementation(({ query }: { query?: { state?: string; tag?: string } }) => {
      if (query?.state === "archived") return Promise.resolve({ data: [] });
      if (query?.tag === "travel") return Promise.resolve({ data: [travelMemo] });
      return Promise.resolve({ data: [travelMemo, workMemo] });
    });
    listTagsMock.mockResolvedValue({
      data: [
        { name: "travel", count: 1 },
        { name: "work", count: 1 },
      ] satisfies TagSummary[],
    });
    getMemoMock.mockImplementation(({ path }: { path: { id: string } }) => {
      const memo = path.id === "memo-1" ? travelMemo : workMemo;
      return Promise.resolve({ data: makeMemo(memo) });
    });

    renderWithQueryClient(<MemosPage />);

    await screen.findByText("Plan trip #travel");
    await screen.findByText("Ship feature #work");

    fireEvent.click(screen.getAllByTestId("sidebar-tag-travel")[0]);

    await waitFor(() => {
      expect(screen.getByTestId("memo-list-heading").textContent).toContain("#travel");
    });
    await waitFor(() => {
      expect(listMemosMock).toHaveBeenCalledWith({
        query: {
          state: "active",
          tag: "travel",
          q: undefined,
          limit: 100,
        },
      });
    });
    expect(screen.getAllByTestId("memo-card")).toHaveLength(1);
  });
});
