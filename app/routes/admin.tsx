import { PencilSimpleIcon } from "@phosphor-icons/react"
import { Link } from "react-router"
import type { Route } from "./+types/admin"
import { ListPagination } from "~/components/list-pagination"
import { SnippetCard, toSnippetCardData } from "~/components/snippet-card"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import { requireAdmin } from "~/lib/auth.server"
import { listSnippets } from "~/lib/snippets.server"
import { PAGE_SIZE } from "~/lib/validation"

export function meta(_: Route.MetaArgs) {
  return [{ title: "全局管理 · unpaste" }]
}

export async function loader({ context, request }: Route.LoaderArgs) {
  // 非管理员（含未登录）一律 404，与“页面不存在”表现一致。
  requireAdmin(context)

  const url = new URL(request.url)
  const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const { items, total } = await listSnippets(
    {},
    PAGE_SIZE,
    (page - 1) * PAGE_SIZE
  )

  return {
    items: items.map(toSnippetCardData),
    page,
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE))
  }
}

export default function Admin({ loaderData }: Route.ComponentProps) {
  const { items, page, total, pageCount } = loaderData

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-xl tracking-tight">全局管理</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          只有 app/config.ts 中 ADMIN_GITHUB_ID 指定的 GitHub
          账号能看到这个页面。
        </p>
      </div>

      <Alert>
        <AlertTitle>这里是全站视图，共 {total} 条 snippet</AlertTitle>
        <AlertDescription>
          包含所有用户的私密
          snippet。可以打开任意一条进行编辑或删除，操作会直接生效。
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3">
        {items.map((snippet) => (
          <SnippetCard
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link to={`/s/${snippet.slug}/edit`}>
                  <PencilSimpleIcon data-icon="inline-start" />
                  编辑
                </Link>
              </Button>
            }
            key={snippet.slug}
            showOwner
            showVisibility
            snippet={snippet}
          />
        ))}
      </div>

      <ListPagination basePath="/admin" page={page} pageCount={pageCount} />
    </div>
  )
}
