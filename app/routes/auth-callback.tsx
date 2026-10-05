import { env } from "cloudflare:workers"
import { isBefore } from "date-fns"
import { eq } from "drizzle-orm"
import { redirect } from "react-router"
import type { Route } from "./+types/auth-callback"
import { safeRedirectTo } from "~/lib/auth.server"
import { getDb } from "~/lib/db.server"
import {
  completeGithubAuthorization,
  GithubAuthorizationError
} from "~/lib/github.server"
import { oauthStates } from "~/lib/schema.server"
import {
  clearOAuthStateCookie,
  commitSession,
  deleteExpiredSessions,
  getSession,
  readOAuthStateCookie
} from "~/lib/session.server"
import { upsertGithubUser } from "~/lib/users.server"

/**
 * GitHub 回调：state 必须同时出现在 URL 与 cookie 中，并且能在 D1 里换到
 * 对应的 PKCE verifier。那一行用完（无论成败）立即删除，防止授权码重放。
 * 之后的 state 校验、token 交换、取账户资料全部由 openid-client 完成。
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const cookieState = await readOAuthStateCookie(request)

  if (!code || !state || !cookieState || state !== cookieState) {
    throw redirect("/login?error=oauth_state")
  }

  const db = getDb()
  const row = await db
    .select()
    .from(oauthStates)
    .where(eq(oauthStates.id, state))
    .get()

  if (!row) throw redirect("/login?error=oauth_state")

  // state 一次性使用：先删除再校验有效期，任何失败路径都不会留下可用行。
  await db.delete(oauthStates).where(eq(oauthStates.id, state)).run()

  if (isBefore(row.expiresAt, new Date())) {
    throw redirect("/login?error=oauth_state")
  }

  try {
    const profile = await completeGithubAuthorization(env, {
      request,
      codeVerifier: row.codeVerifier,
      state
    })
    await upsertGithubUser(profile)
    await deleteExpiredSessions()

    const session = await getSession(null)
    session.set("userId", profile.id)

    return redirect(safeRedirectTo(row.redirectTo), {
      headers: [
        ["Set-Cookie", await commitSession(request, session)],
        ["Set-Cookie", await clearOAuthStateCookie(request)]
      ]
    })
  } catch (error) {
    console.error("GitHub OAuth 回调失败：", error)

    // GitHub 明确拒绝时把它的 error 代码带回登录页，好在界面上给出可操作的原因。
    const params = new URLSearchParams({ error: "oauth_failed" })
    if (error instanceof GithubAuthorizationError) {
      params.set("reason", error.githubError)
    }
    throw redirect(`/login?${params}`)
  }
}
