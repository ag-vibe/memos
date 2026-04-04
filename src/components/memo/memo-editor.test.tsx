import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { MemoEditor } from "./memo-editor";

function makeEditorState(text: string) {
  return {
    root: {
      type: "root",
      version: 1,
      direction: null,
      format: "",
      indent: 0,
      children: [
        {
          type: "paragraph",
          version: 1,
          direction: null,
          format: "",
          indent: 0,
          textFormat: 0,
          textStyle: "",
          children: [
            {
              type: "text",
              version: 1,
              text,
              detail: 0,
              format: 0,
              mode: "normal",
              style: "",
            },
          ],
        },
      ],
    },
  };
}

type ShiroEditorProps = {
  onChange: (value: unknown) => void;
  placeholder?: string;
  imageUpload?: (file: File) => Promise<string>;
};

const { shiroEditorMock } = vi.hoisted(() => ({
  shiroEditorMock: vi.fn(({ onChange, placeholder, imageUpload }: ShiroEditorProps) => (
    <div data-testid="shiro-editor-mock">
      <textarea
        aria-label="Memo editor"
        placeholder={placeholder}
        onChange={(event) => onChange(makeEditorState(event.currentTarget.value))}
      />
      <button
        type="button"
        onClick={async () => {
          if (imageUpload) {
            await imageUpload(new File(["hello"], "memo.png", { type: "image/png" }));
          }
          onChange(makeEditorState("Image memo"));
        }}
      >
        Simulate change
      </button>
    </div>
  )),
}));

vi.mock("@haklex/rich-kit-shiro", () => ({
  ShiroEditor: shiroEditorMock,
}));

describe("MemoEditor", () => {
  beforeEach(() => {
    shiroEditorMock.mockClear();
  });

  it("submits a derived draft from rich editor content", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<MemoEditor onSubmit={onSubmit} placeholder="Write memo" />);

    fireEvent.change(screen.getByLabelText("Memo editor"), {
      target: { value: "Ship rich editor #work" },
    });
    fireEvent.click(screen.getByTestId("memo-submit"));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          plainText: "Ship rich editor #work",
          excerpt: "Ship rich editor #work",
          tags: ["work"],
        }),
      );
    });
  });

  it("renders a clean editor shell without the legacy toolbar", () => {
    render(<MemoEditor onSubmit={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.queryByTitle("Bold")).toBeNull();
    expect(screen.getByText("0 chars")).toBeTruthy();
    expect(screen.getByText("Send")).toBeTruthy();
  });

  it("provides an image upload handler to the rich editor", async () => {
    render(<MemoEditor onSubmit={vi.fn().mockResolvedValue(undefined)} />);

    fireEvent.click(screen.getByText("Simulate change"));

    await waitFor(() => {
      expect(shiroEditorMock).toHaveBeenCalledWith(
        expect.objectContaining({ imageUpload: expect.any(Function) }),
        undefined,
      );
    });
  });
});
