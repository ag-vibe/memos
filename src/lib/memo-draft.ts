import { extractTextContent } from "@haklex/rich-editor/static";
import type { SerializedEditorState } from "lexical";

const EXCERPT_LIMIT = 140;

export type MemoDraft = {
  content: SerializedEditorState;
  plainText: string;
  excerpt: string;
  tags: string[];
};

export function deriveMemoDraft(content: SerializedEditorState): MemoDraft {
  const plainText = normalizePlainText(extractTextContent(content));
  return {
    content,
    plainText,
    excerpt: buildExcerpt(plainText),
    tags: extractTags(plainText),
  };
}

export function coerceEditorState(value: unknown): SerializedEditorState | null {
  if (!value || typeof value !== "object") return null;
  if (!("root" in value)) return null;
  return value as SerializedEditorState;
}

function normalizePlainText(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

function buildExcerpt(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  const runes = Array.from(compact);
  if (runes.length <= EXCERPT_LIMIT) return compact;
  return runes.slice(0, EXCERPT_LIMIT).join("");
}

function extractTags(content: string): string[] {
  const runes = Array.from(content);
  const seen = new Set<string>();
  const tags: string[] = [];

  for (let i = 0; i < runes.length; i += 1) {
    if (runes[i] !== "#") continue;
    if (i > 0 && isTagBodyRune(runes[i - 1])) continue;

    let j = i + 1;
    let segmentStart = j;
    while (j < runes.length && isTagAtomRune(runes[j])) j += 1;
    if (j === segmentStart) continue;

    while (j < runes.length && runes[j] === "/") {
      const next = j + 1;
      segmentStart = next;
      while (j + 1 < runes.length && isTagAtomRune(runes[j + 1])) j += 1;
      if (j + 1 === segmentStart) break;
      j += 1;
    }

    const raw = runes.slice(i + 1, j).join("");
    const tag = canonicalizeTag(raw);
    if (!tag || seen.has(tag)) {
      i = j - 1;
      continue;
    }
    seen.add(tag);
    tags.push(tag);
    i = j - 1;
  }

  tags.sort();
  return tags;
}

function canonicalizeTag(raw: string): string {
  const trimmed = raw.trim().replace(/^#/, "");
  if (!trimmed) return "";
  const parts = trimmed.split("/");
  const clean: string[] = [];
  for (const part of parts) {
    const segment = part.trim();
    if (!segment) return "";
    clean.push(segment.toLowerCase());
  }
  return clean.join("/");
}

function isTagAtomRune(value: string): boolean {
  return /[\p{L}\p{N}_-]/u.test(value);
}

function isTagBodyRune(value: string): boolean {
  return isTagAtomRune(value) || value === "/";
}
