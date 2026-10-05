import { useState } from "react"
import { CodeIcon, EyeIcon, FileDashedIcon } from "@phosphor-icons/react"
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockCopyButton,
  CodeBlockFilename,
  CodeBlockFiles,
  CodeBlockHeader,
  CodeBlockItem
} from "~/components/kibo-ui/code-block"
import { MarkdownPreview } from "~/components/markdown-preview"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "~/components/ui/empty"
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs"

export type ViewerFile = {
  filename: string
  language: string
  code: string
  /** Shiki 服务端渲染好的高亮 HTML。 */
  html: string
  isMarkdown: boolean
}

type PreviewMode = "preview" | "source"

type SnippetViewerProps = {
  files: ViewerFile[]
}

export function SnippetViewer({ files }: SnippetViewerProps) {
  const [active, setActive] = useState(files[0]?.filename ?? "")
  const [mode, setMode] = useState<PreviewMode>("preview")

  if (files.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileDashedIcon />
          </EmptyMedia>
          <EmptyTitle>没有文件</EmptyTitle>
          <EmptyDescription>该片段不包含任何文件。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  // 文件名可能随 loader 数据变化，取不到时回落到第一个文件，避免出现空白。
  const activeFile = files.find((file) => file.filename === active) ?? files[0]
  const showMarkdownPreview = activeFile.isMarkdown && mode === "preview"

  const handleFileChange = (filename: string) => {
    setActive(filename)
    // 换文件后回到预览态，避免沿用上一个文件留下的“源码”选择。
    setMode("preview")
  }

  return (
    <Tabs value={activeFile.filename} onValueChange={handleFileChange}>
      {files.length > 1 ? (
        <TabsList className="w-full justify-start overflow-x-auto">
          {files.map((file) => (
            <TabsTrigger
              key={file.filename}
              value={file.filename}
              className="flex-none"
            >
              {file.filename}
            </TabsTrigger>
          ))}
        </TabsList>
      ) : null}

      <CodeBlock data={files} value={activeFile.filename}>
        <CodeBlockHeader>
          <CodeBlockFiles>
            {(item) => (
              <CodeBlockFilename value={item.filename}>
                {item.filename}
              </CodeBlockFilename>
            )}
          </CodeBlockFiles>
          <Badge variant="secondary">{activeFile.language}</Badge>
          {activeFile.isMarkdown ? (
            <>
              <Button
                variant={mode === "preview" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode("preview")}
              >
                <EyeIcon data-icon="inline-start" />
                预览
              </Button>
              <Button
                variant={mode === "source" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMode("source")}
              >
                <CodeIcon data-icon="inline-start" />
                源码
              </Button>
            </>
          ) : null}
          <CodeBlockCopyButton />
        </CodeBlockHeader>

        {showMarkdownPreview ? (
          <div className="p-4">
            <MarkdownPreview>{activeFile.code}</MarkdownPreview>
          </div>
        ) : (
          <CodeBlockBody>
            {(item) => (
              <CodeBlockItem value={item.filename}>
                <div dangerouslySetInnerHTML={{ __html: item.html }} />
              </CodeBlockItem>
            )}
          </CodeBlockBody>
        )}
      </CodeBlock>
    </Tabs>
  )
}
