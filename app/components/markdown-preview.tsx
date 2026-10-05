import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"

type MarkdownPreviewProps = {
  children: string
}

/**
 * 渲染 Markdown 富文本。
 *
 * 刻意不引入 `rehype-raw`：片段内容来自任意用户，保持 react-markdown 默认的
 * “不渲染原始 HTML”行为可以避免 XSS。
 */
export function MarkdownPreview({ children }: MarkdownPreviewProps) {
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, href, ...props }) => {
            const isExternal =
              typeof href === "string" && /^https?:\/\//i.test(href)

            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
                {...props}
              />
            )
          }
        }}
      >
        {children}
      </Markdown>
    </div>
  )
}
