import { FileCodeIcon, GlobeIcon, LockIcon } from "@phosphor-icons/react"
import type { ReactNode } from "react"
import { Link } from "react-router"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { formatBytes, formatTimestamp } from "~/lib/format"
import type { SnippetSummary } from "~/lib/snippets.server"

/**
 * 列表里展示一条 snippet 所需的全部数据。
 * 时间与体积在 loader 里就格式化成字符串，避免服务端/浏览器渲染不一致。
 */
export type SnippetCardData = {
  slug: string
  title: string | null
  visibility: "public" | "private"
  ownerLogin: string
  ownerAvatarUrl: string | null
  fileCount: number
  totalSize: number
  createdAtLabel: string
  updatedAtLabel: string
}

export function toSnippetCardData(snippet: SnippetSummary): SnippetCardData {
  return {
    slug: snippet.slug,
    title: snippet.title,
    visibility: snippet.visibility,
    ownerLogin: snippet.owner.login,
    ownerAvatarUrl: snippet.owner.avatarUrl,
    fileCount: snippet.fileCount,
    totalSize: snippet.totalSize,
    createdAtLabel: formatTimestamp(snippet.createdAt),
    updatedAtLabel: formatTimestamp(snippet.updatedAt)
  }
}

export function VisibilityBadge({
  visibility
}: {
  visibility: "public" | "private"
}) {
  if (visibility === "private") {
    return (
      <Badge variant="secondary">
        <LockIcon />
        私密
      </Badge>
    )
  }
  return (
    <Badge variant="default">
      <GlobeIcon />
      公开
    </Badge>
  )
}

export type SnippetCardProps = {
  snippet: SnippetCardData
  showOwner?: boolean
  showVisibility?: boolean
  /** 额外的操作按钮（编辑/删除等）。 */
  actions?: ReactNode
}

export function SnippetCard({
  snippet,
  showOwner = true,
  showVisibility = false,
  actions
}: SnippetCardProps) {
  return (
    <Card className="gap-0 py-0 transition-colors hover:border-ring/60">
      <CardHeader className="gap-2 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link
              className="line-clamp-1 font-medium text-base hover:underline"
              to={`/s/${snippet.slug}`}
            >
              {snippet.title ?? "未命名 snippet"}
            </Link>
            <div className="mt-1 line-clamp-1 font-mono text-muted-foreground text-xs">
              /s/{snippet.slug}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-4 text-muted-foreground text-xs">
        {showVisibility && <VisibilityBadge visibility={snippet.visibility} />}
        <span className="inline-flex items-center gap-1">
          <FileCodeIcon className="size-3.5" />
          {snippet.fileCount} 个文件
        </span>
        <span>{formatBytes(snippet.totalSize)}</span>
        <span>更新于 {snippet.updatedAtLabel}</span>
        {showOwner && (
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
        )}
      </CardContent>
    </Card>
  )
}
