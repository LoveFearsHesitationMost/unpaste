import {
  ArrowSquareOutIcon,
  PencilSimpleIcon,
  TrashIcon
} from "@phosphor-icons/react"
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

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
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
            <Button asChild size="sm" variant="outline">
              <a
                href={`/s/${snippet.slug}/raw`}
                rel="noreferrer"
                target="_blank"
              >
                <ArrowSquareOutIcon data-icon="inline-start" />
                原文
              </a>
            </Button>
            {canManage && (
              <>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/s/${snippet.slug}/edit`}>
                    <PencilSimpleIcon data-icon="inline-start" />
                    编辑
                  </Link>
                </Button>
                <DeleteSnippetButton slug={snippet.slug} />
              </>
            )}
          </div>
        </div>
      </header>

      <SnippetViewer files={files} />
    </div>
  )
}

function DeleteSnippetButton({ slug }: { slug: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="destructive">
          <TrashIcon data-icon="inline-start" />
          删除
        </Button>
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
