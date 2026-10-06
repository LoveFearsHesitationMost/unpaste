import {
  ArrowSquareOutIcon,
  PencilSimpleIcon,
  TrashIcon
} from "@phosphor-icons/react"
import { useState } from "react"
import { Form, Link } from "react-router"
import type { Route } from "./+types/snippet"
import { CopyLinkButton } from "~/components/copy-link-button"
import { VisibilityBadge } from "~/components/snippet-card"
import { SnippetViewer, type ViewerFile } from "~/components/snippet-viewer"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "~/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { getCurrentUser } from "~/lib/auth.server"
import { formatBytes, formatTimestamp } from "~/lib/format"
import { MAX_HIGHLIGHT_LENGTH, highlightToHtml } from "~/lib/highlight.server"
import { notFound } from "~/lib/http.server"
import { FALLBACK_LANGUAGE, isMarkdownFile } from "~/lib/language"
import {
  canManageSnippet,
  canViewSnippet,
  getSnippetBySlug
} from "~/lib/snippets.server"

export function meta({ loaderData }: Route.MetaArgs) {
  const snippet = loaderData?.snippet
  if (!snippet) return [{ title: "snippet · unpaste" }]
  return [
    { title: `${snippet.title ?? `snippet ${snippet.slug}`} · unpaste` },
    { name: "description", content: loaderData.description }
  ]
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const snippet = await getSnippetBySlug(params.slug)
  if (!snippet) notFound()

  const user = getCurrentUser(context)
  // 私密 snippet 对非本人/非管理员同样返回 404，避免被用来枚举爆破。
  if (!canViewSnippet(snippet, user)) notFound()

  const files: ViewerFile[] = await Promise.all(
    snippet.files.map(async (file) => {
      // 超大文件退化成纯文本，避免为了高亮把 Worker 的 CPU 吃满。
      const language =
        file.content.length > MAX_HIGHLIGHT_LENGTH
          ? FALLBACK_LANGUAGE
          : file.language
      return {
        filename: file.filename,
        language,
        code: file.content,
        html: await highlightToHtml(file.content, language),
        isMarkdown: isMarkdownFile(file.filename)
      }
    })
  )

  const firstLine = snippet.files[0]?.content
    .split("\n")
    .find((line) => line.trim() !== "")
    ?.trim()
    .slice(0, 120)

  return {
    snippet: {
      slug: snippet.slug,
      title: snippet.title,
      visibility: snippet.visibility,
      ownerLogin: snippet.owner.login,
      ownerAvatarUrl: snippet.owner.avatarUrl,
      fileCount: snippet.fileCount,
      totalSize: snippet.totalSize,
      createdAtLabel: formatTimestamp(snippet.createdAt),
      updatedAtLabel: formatTimestamp(snippet.updatedAt)
    },
    files,
    canManage: canManageSnippet(snippet, user),
    description: firstLine ?? "共享的代码片段"
  }
}

export default function SnippetPage({ loaderData }: Route.ComponentProps) {
  const { snippet, files, canManage } = loaderData
  const [activeFile, setActiveFile] = useState(files[0])

  // 文件名可能随 loader 数据变化，取不到时回落到第一个文件，避免出现空白，
  // 也保证“原文”链接始终指向当前标签页对应的文件。
  const resolvedFile =
    files.find((file) => file.filename === activeFile?.filename) ?? files[0]
  const rawHref = resolvedFile
    ? `/s/${snippet.slug}/raw?file=${encodeURIComponent(resolvedFile.filename)}`
    : `/s/${snippet.slug}/raw`

  return (
    <div className="flex flex-col gap-5">
      {/* 标题区与操作区只在内容宽度足够时并排：容器查询按可用宽度决定，
          避免 flex-wrap 因标题可无限收缩而永远不换行、把标题挤成一列。 */}
      <header className="@container/snippet-header">
        <div className="flex flex-col gap-3 @4xl/snippet-header:flex-row @4xl/snippet-header:items-start @4xl/snippet-header:justify-between">
          <div className="min-w-0 @4xl/snippet-header:flex-1">
            <h1 className="font-semibold text-xl tracking-tight">
              {snippet.title ?? "未命名 snippet"}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground text-xs">
              <VisibilityBadge visibility={snippet.visibility} />
              <span className="inline-flex items-center gap-1.5">
                <Avatar size="sm">
                  {snippet.ownerAvatarUrl && (
                    <AvatarImage
                      alt={snippet.ownerLogin}
                      src={snippet.ownerAvatarUrl}
                    />
                  )}
                  <AvatarFallback>
                    {snippet.ownerLogin.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                @{snippet.ownerLogin}
              </span>
              <span>
                {snippet.fileCount} 个文件 · {formatBytes(snippet.totalSize)}
              </span>
              <span>创建于 {snippet.createdAtLabel}</span>
              <span>更新于 {snippet.updatedAtLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <CopyLinkButton />
            <Button
              nativeButton={false}
              render={<a href={rawHref} rel="noreferrer" target="_blank" />}
              size="sm"
              variant="outline"
            >
              <ArrowSquareOutIcon data-icon="inline-start" />
              原文
            </Button>
            {canManage && (
              <>
                <Button
                  nativeButton={false}
                  render={<Link to={`/s/${snippet.slug}/edit`} />}
                  size="sm"
                  variant="outline"
                >
                  <PencilSimpleIcon data-icon="inline-start" />
                  编辑
                </Button>
                <DeleteSnippetButton slug={snippet.slug} />
              </>
            )}
          </div>
        </div>
      </header>

      <SnippetViewer
        activeFile={resolvedFile}
        files={files}
        onActiveFileChange={setActiveFile}
      />
    </div>
  )
}

function DeleteSnippetButton({ slug }: { slug: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button size="sm" variant="destructive" />}>
        <TrashIcon data-icon="inline-start" />
        删除
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除这个 snippet？</AlertDialogTitle>
          <AlertDialogDescription>
            删除后无法恢复，链接 /s/{slug} 会立刻失效。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <Form action={`/s/${slug}/delete`} method="post">
            <AlertDialogAction type="submit">确认删除</AlertDialogAction>
          </Form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
