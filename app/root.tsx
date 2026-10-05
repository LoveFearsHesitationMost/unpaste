import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteError
} from "react-router"
import { ThemeProvider } from "next-themes"
import { WarningCircleIcon } from "@phosphor-icons/react"
import type { Route } from "./+types/root"
import "./app.css"
import { SiteHeader } from "~/components/site-header"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "~/components/ui/empty"
import { userContext } from "~/context"
import { authMiddleware } from "~/lib/auth.server"

/**
 * 所有路由的鉴权入口：把当前用户写进 context，未登录时为 null。
 * 只有 middleware / loader / action 会用到它，因此浏览器包里不会包含
 * 任何服务端代码（React Router 会剥掉这些 export 及其独占的 import）。
 */
export const middleware: Route.MiddlewareFunction[] = [authMiddleware]

export const meta: Route.MetaFunction = () => [
  { title: "unpaste" },
  {
    name: "description",
    content:
      "部署在 Cloudflare Workers 上的极简 pastebin：D1 存储、Shiki 高亮、GitHub 登录。"
  }
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {children}
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export async function loader({ context }: Route.LoaderArgs) {
  return { user: context.get(userContext) }
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <SiteHeader user={loaderData.user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t py-6 text-center text-muted-foreground text-xs">
        unpaste · React Router v8 on Cloudflare Workers · D1 + Drizzle · Shiki
      </footer>
    </div>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  const is404 = isRouteErrorResponse(error) && error.status === 404
  const status = isRouteErrorResponse(error) ? error.status : 500
  const detail = is404
    ? "你要找的内容不存在，或者你没有访问它的权限。"
    : isRouteErrorResponse(error)
      ? error.statusText || "请求处理失败。"
      : "服务器出错了，请稍后再试。"

  return (
    <div className="flex min-h-svh flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
          <Link className="font-semibold tracking-tight" to="/">
            unpaste
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center justify-center px-4 py-16">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningCircleIcon />
            </EmptyMedia>
            <EmptyTitle>
              {is404 ? "404 · 找不到资源" : `${status} · 出错了`}
            </EmptyTitle>
            <EmptyDescription>{detail}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/">回到首页</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </main>
      {!is404 && import.meta.env.DEV && error instanceof Error && (
        <pre className="mx-auto mb-8 w-full max-w-3xl overflow-x-auto rounded-md bg-muted p-4 text-xs">
          <code>{error.stack}</code>
        </pre>
      )}
    </div>
  )
}
