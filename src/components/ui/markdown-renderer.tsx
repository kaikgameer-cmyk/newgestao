import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Estilizar links
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // Estilizar listas
          ul: ({ node, ...props }) => (
            <ul {...props} className="list-disc list-inside space-y-1" />
          ),
          ol: ({ node, ...props }) => (
            <ol {...props} className="list-decimal list-inside space-y-1" />
          ),
          // Estilizar parágrafos
          p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
          // Estilizar negrito
          strong: ({ node, ...props }) => (
            <strong {...props} className="font-semibold" />
          ),
          // Estilizar itálico
          em: ({ node, ...props }) => <em {...props} className="italic" />,
          // Estilizar código inline
          code: ({ node, ...props }) => (
            <code
              {...props}
              className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
