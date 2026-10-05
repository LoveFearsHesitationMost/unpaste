import { env } from "cloudflare:workers"
import { addMinutes } from "date-fns"
import { lt } from "drizzle-orm"
import { redirect } from "react-router"
import type { Route } from "./+types/auth-github"
import { OAUTH_CALLBACK_PATH, OAUTH_STATE_TTL_MINUTES } from "~/config"
import { safeRedirectTo } from "~/lib/auth.server"
import { getDb } from "~/lib/db.server"
import { createGithubAuthorization } from "~/lib/github.server"
import { oauthStates } from "~/lib/schema.server"
import { serializeOAuthStateCookie } from "~/lib/session.server"

/**
 * 发起 GitHub 授权：state 与 PKCE verifier 由 openid-client 生成，verifier 只写进
 * D1（主键就是 state），浏览器只拿到 state cookie；回调时两者必须同时匹配。
 */
export async function loader({ request }: Route.LoaderArgs) {
  if (!env.GITHUB_CLIENT_ID) {
    throw redirect("/login?error=oauth_not_configured")
  }

  const url = new URL(request.url)
  const redirectTo = safeRedirectTo(url.searchParams.get("redirectTo"))
  const authorization = await createGithubAuthorization(
    env,
    `${url.origin}${OAUTH_CALLBACK_PATH}`
  )

  const db = getDb()
  await db
    .insert(oauthStates)
    .values({
      id: authorization.state,
      codeVerifier: authorization.codeVerifier,
      redirectTo,
      createdAt: new Date(),
      expiresAt: addMinutes(new Date(), OAUTH_STATE_TTL_MINUTES)
    })
    .run()

  // 顺手清理过期的 state（失效的登录尝试），避免表随无效请求无限增长。
  await db
    .delete(oauthStates)
    .where(lt(oauthStates.expiresAt, new Date()))
    .run()

  return redirect(authorization.authorizeUrl, {
    headers: {
      "Set-Cookie": await serializeOAuthStateCookie(
        request,
        authorization.state
      )
    }
  })
}
