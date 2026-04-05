import type { SerializedEditorState } from "lexical";
import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render";
import { ShareDialog } from "./share-dialog";

const mockMemo = {
  id: "test-memo-1",
  excerpt: "This is a test memo excerpt",
  plainText: "This is a test memo excerpt with #tags",
  tags: ["tags"],
  state: "active" as const,
  createdAt: "2026-04-05T10:00:00.000Z",
  updatedAt: "2026-04-05T10:00:00.000Z",
};

const mockContent = {
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
            text: "This is a test memo excerpt with #tags",
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

const mockWriteText = vi.fn().mockResolvedValue(undefined);
const originalClipboard = navigator.clipboard;

beforeEach(() => {
  mockWriteText.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: mockWriteText },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    value: originalClipboard,
    writable: true,
    configurable: true,
  });
});

describe("ShareDialog", () => {
  it("renders share dialog when open", () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    expect(screen.getByText("Share Memo")).toBeTruthy();
    expect(screen.getByText(mockMemo.excerpt)).toBeTruthy();
  });

  it("does not render when closed", () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog
        memo={mockMemo}
        content={mockContent}
        isOpen={false}
        onOpenChange={onOpenChange}
      />,
    );

    expect(screen.queryByText("Share Memo")).toBeNull();
  });

  it("copies plain text to clipboard", async () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    const plainTextBtn = screen.getByRole("button", { name: /plain text/i });
    fireEvent.click(plainTextBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockMemo.plainText);
    });
  });

  it("copies share link to clipboard", async () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    const linkBtn = screen.getByRole("button", { name: /share link/i });
    fireEvent.click(linkBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("share=test-memo-1"));
    });
  });

  it("copies markdown to clipboard when content is provided", async () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={mockContent} isOpen onOpenChange={onOpenChange} />,
    );

    const markdownBtn = screen.getByRole("button", { name: /markdown/i });
    fireEvent.click(markdownBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("test memo excerpt"));
    });
  });

  it("falls back to plainText when content is null", async () => {
    const onOpenChange = vi.fn();
    renderWithQueryClient(
      <ShareDialog memo={mockMemo} content={null} isOpen onOpenChange={onOpenChange} />,
    );

    const markdownBtn = screen.getByRole("button", { name: /markdown/i });
    fireEvent.click(markdownBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(mockMemo.plainText);
    });
  });
});
