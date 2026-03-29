import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), "className"],
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
};

function LazyImage({ src, alt }: { src?: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) return null;

  return (
    <span className="inline-block relative rounded-lg overflow-hidden">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={[
          "rounded-lg max-h-64 object-cover transition-opacity duration-300",
          loaded ? "opacity-100" : "opacity-0",
        ].join(" ")}
      />
      {!loaded && (
        <span className="absolute inset-0 animate-pulse bg-foreground/8 rounded-lg min-w-24 min-h-16" />
      )}
    </span>
  );
}

interface MemoContentProps {
  content: string;
  onTagClick?: (tag: string) => void;
  clamp?: boolean;
}

export function MemoContent({ content, onTagClick, clamp = false }: MemoContentProps) {
  // Replace #tag with a placeholder we can intercept in components
  const processed = content.replace(/(^|\s)(#[\w\u4e00-\u9fa5]+)/g, (_, pre, tag) => {
    return `${pre}[${tag}](tag://${tag.slice(1)})`;
  });

  return (
    <div
      className={[
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-p:my-1 prose-p:leading-relaxed",
        "prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1",
        "prose-code:text-accent prose-code:bg-accent/8 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none",
        "prose-pre:bg-foreground/5 prose-pre:border prose-pre:border-foreground/8 prose-pre:rounded-lg prose-pre:text-xs",
        "prose-blockquote:border-l-accent/40 prose-blockquote:text-foreground/60 prose-blockquote:not-italic",
        "prose-a:text-accent prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
        "prose-img:rounded-lg prose-img:my-2",
        "prose-hr:border-foreground/10",
        "prose-table:text-xs",
        clamp ? "line-clamp-6" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeSanitize, sanitizeSchema], rehypeHighlight]}
        components={{
          a({ href, children }) {
            // Handle tag:// links
            if (href?.startsWith("tag://")) {
              const tag = href.slice(6);
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick?.(tag);
                  }}
                  className="text-accent font-medium hover:underline cursor-pointer bg-transparent border-none p-0"
                >
                  #{tag}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            return <LazyImage src={src} alt={alt ?? ""} />;
          },
        }}
      >
        {processed}
      </ReactMarkdown>
    </div>
  );
}
