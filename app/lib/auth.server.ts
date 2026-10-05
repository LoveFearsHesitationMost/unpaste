import type { MiddlewareFunction, RouterContextProvider } from "react-router"
import { redirect } from "react-router"
import { ADMIN_GITHUB_ID } from "~/config"
import { userContext, type SessionUser } from "~/context"
import { notFound } from "./http.server"
import { getSession, type SessionData } from "./session.server"

/** 从会话数据（D1 join 结果）构造上下文里的用户对象。 */
function toSessionUser(data: SessionData): SessionUser {
  return {
    id: data.userId,
    login: data.login,
    name: data.name,
    avatarUrl: data.avatarUrl,
    isAdmin: ADMIN_GITHUB_ID !== "" && data.userId === ADMIN_GITHUB_ID
  }
}

/**
 * 读取当前登录用户。cookie 里只有会话 ID，用户信息由 D1 的
 * sessions ⋈ users 一次查询取回。
 */
export async function loadSessionUser(
  request: Request
): Promise<SessionUser | null> {
  const cookie = request.headers.get("Cookie")
  if (!cookie) return null

  const session = await getSession(cookie)
  const data = session.data as Partial<SessionData>
  if (!data.userId || !data.login) return null
  return toSessionUser(data as SessionData)
}

/**
 * root 中间件：把当前用户放进 context，供所有 loader / action 读取。
 * 未登录时不做任何重定向，各路由自行决定是 404 还是引导登录。
 */
export const authMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next
) => {
  context.set(userContext, await loadSessionUser(request))
  return next()
}

export function getCurrentUser(
  context: Readonly<RouterContextProvider>
): SessionUser | null {
  return context.get(userContext)
}

/** 需要登录的“应用页”（新建、我的）：未登录时引导登录，不泄露任何资源。 */
export function requireLogin(
  context: Readonly<RouterContextProvider>,
  request: Request
): SessionUser {
  const user = getCurrentUser(context)
  if (!user) {
    const url = new URL(request.url)
    const redirectTo = url.pathname + url.search
    throw redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
  }
  return user
}

/**
 * 需要登录的资源页（snippet 详情/编辑/删除）：
 * 未登录一律 404，与“slug 不存在”表现完全一致。
 */
export function requireUserOrNotFound(
  context: Readonly<RouterContextProvider>
): SessionUser {
  const user = getCurrentUser(context)
  if (!user) notFound()
  return user
}

/** 管理员专属页面（/admin）：非管理员一律 404。 */
export function requireAdmin(
  context: Readonly<RouterContextProvider>
): SessionUser {
  const user = getCurrentUser(context)
  if (!user?.isAdmin) notFound()
  return user
}

/** 只允许以 "/" 开头的站内路径作为登录后跳转目标。 */
export function safeRedirectTo(value: string | null): string {
  if (!value) return "/"
  if (!value.startsWith("/") || value.startsWith("//")) return "/"
  return value
}
