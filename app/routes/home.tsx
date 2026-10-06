import { CodeIcon, PlusIcon } from "@phosphor-icons/react"
import { Link } from "react-router"
import type { Route } from "./+types/home"
import { ListPagination } from "~/components/list-pagination"
import { SnippetCard, toSnippetCardData } from "~/components/snippet-card"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "~/components/ui/empty"
import { listSnippets } from "~/lib/snippets.server"
import { PAGE_SIZE } from "~/lib/validation"

export function meta(_: Route.MetaArgs) {
  return [
    { title: "unpaste — 极简 pastebin" },
    {
      name: "description",
      content:
        "把代码或文本粘成一条随机链接：Cloudflare Workers + D1 存储、Shiki 高亮、GitHub 登录。"
    }
  ]
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const parsedPage = Number.parseInt(url.searchParams.get("page") ?? "1", 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const { items, total } = await listSnippets(
    { visibility: "public" },
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

export default function Home({ loaderData }: Route.ComponentProps) {
  const { items, page, total, pageCount } = loaderData

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3 pt-2">
        <h1 className="font-semibold text-2xl tracking-tight">unpaste</h1>
        <p className="max-w-2xl text-muted-foreground text-sm">
          CloudFlare Workers 原生的 pastebin 服务，简洁、公益、现代。使用
          shadcn/ui、React Router v8、Shiki 构建。
          <br />
          把代码或文本粘成一条带随机 slug 的链接。公开 snippet 任何人可见，私密
          snippet 只有作者本人和管理员能打开——对其他人而言，它和不存在没有区别。
        </p>
        <div className="flex items-center gap-2">
          <Button nativeButton={false} render={<Link to="/new" />}>
            <PlusIcon data-icon="inline-start" />
            新建 snippet
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-sm">最新公开 snippet</h2>
          <span className="text-muted-foreground text-xs">共 {total} 条</span>
        </div>

        {items.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CodeIcon />
              </EmptyMedia>
              <EmptyTitle>还没有公开的 snippet</EmptyTitle>
              <EmptyDescription>成为第一个分享代码的人。</EmptyDescription>
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
              <SnippetCard key={snippet.slug} snippet={snippet} />
            ))}
          </div>
        )}

        <ListPagination basePath="/" page={page} pageCount={pageCount} />
      </section>
    </div>
  )
}
