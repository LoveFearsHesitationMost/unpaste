import {
  PencilSimpleIcon,
  PlusIcon,
  ShieldCheckIcon
} from "@phosphor-icons/react"
import { Link } from "react-router"
import type { Route } from "./+types/my"
import { ListPagination } from "~/components/list-pagination"
import { SnippetCard, toSnippetCardData } from "~/components/snippet-card"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "~/components/ui/empty"
import { requireLogin } from "~/lib/auth.server"
import { listSnippets } from "~/lib/snippets.server"
import { PAGE_SIZE } from "~/lib/validation"

export function meta(_: Route.MetaArgs) {
  return [{ title: "我的 snippet · unpaste" }]
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const user = requireLogin(context, request)

  const url = new URL(request.url)
  const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  // 这里展示自己的全部 snippet，包括私密的。
  const { items, total } = await listSnippets(
    { ownerId: user.id },
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE
  )

  return {
    user,
    items: items.map(toSnippetCardData),
    page,
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE))
  }
}

export default function MySnippets({ loaderData }: Route.ComponentProps) {
  const { user, items, page, total, pageCount } = loaderData

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-5">
          <Avatar size="lg">
            {user.avatarUrl && (
              <AvatarImage alt={user.login} src={user.avatarUrl} />
            )}
            <AvatarFallback>
              {user.login.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{user.name ?? user.login}</span>
              <span className="text-muted-foreground text-sm">
                @{user.login}
              </span>
              {user.isAdmin && (
                <Badge variant="secondary">
                  <ShieldCheckIcon />
                  管理员
                </Badge>
              )}
            </div>
            <div className="mt-1 text-muted-foreground text-xs">
              GitHub ID {user.id} · 共 {total} 条 snippet
            </div>
          </div>
          <Button nativeButton={false} render={<Link to="/new" />} size="sm">
            <PlusIcon data-icon="inline-start" />
            新建
          </Button>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium text-sm">我创建的 snippet</h2>

        {items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <PencilSimpleIcon />
              </EmptyMedia>
              <EmptyTitle>还没有创建过 snippet</EmptyTitle>
              <EmptyDescription>
                粘贴第一段代码，生成一条只属于你的链接。
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                nativeButton={false}
                render={<Link to="/new" />}
                size="sm"
                variant="outline"
              >
                新建 snippet
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((snippet) => (
              <SnippetCard
                actions={
                  <Button
                    nativeButton={false}
                    render={<Link to={`/s/${snippet.slug}/edit`} />}
                    size="sm"
                    variant="ghost"
                  >
                    <PencilSimpleIcon data-icon="inline-start" />
                    编辑
                  </Button>
                }
                key={snippet.slug}
                showOwner={false}
                showVisibility
                snippet={snippet}
              />
            ))}
          </div>
        )}

        <ListPagination basePath="/my" page={page} pageCount={pageCount} />
      </section>
    </div>
  )
}
