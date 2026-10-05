import { GithubLogoIcon, SignInIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { env } from "cloudflare:workers"
import { lazy, Suspense, useEffect, useState } from "react"
import { redirect } from "react-router"
import type { Route } from "./+types/login"
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "~/components/ui/card"
import { getCurrentUser, safeRedirectTo } from "~/lib/auth.server"
import { MAX_FILE_LENGTH, MAX_FILES_PER_SNIPPET } from "~/lib/validation"

/** 回调地址是固定契约，写死在文案里，避免把服务端 config 拖进浏览器包。 */
const CALLBACK_PATH = "/auth/github/callback"

/**
 * 背景动画基于 WebGL，服务端毫无意义：`three` + `postprocessing` 约 600 KB，
 * 走 `.client` 模块 + 动态 import，既不进 Worker 包，也不压登录页首屏 chunk，
 * 等客户端挂载后再拉取。
 */
const PixelBlast = lazy(
  () => import("~/components/reactbits/pixel-blast.client")
)

/** 装饰性背景层：绝对定位铺满 main，卡片以 z-10 压在它上面。 */
function PixelBlastBackground() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <div className="absolute inset-0">
      <Suspense fallback={null}>
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#2c7ee8"
          patternScale={3}
          patternDensity={1.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </Suspense>
    </div>
  )
}

/** OAuth 往返失败时由回调路由带回来的错误码 → 用户可读的提示。 */
const errorMessages: Record<string, string> = {
  oauth_failed: "GitHub 授权失败，请重试。",
  oauth_state: "登录会话已过期，请重新发起登录。"
}

/** GitHub 明确拒绝时的 error 代码 → 可操作的排查提示。 */
const failureReasons: Record<string, string> = {
  incorrect_client_credentials:
    "Worker 里的 GITHUB_CLIENT_SECRET 与 GitHub OAuth App 上的不一致。请重新复制 Secret，执行 wrangler secret put GITHUB_CLIENT_SECRET 后再试。",
  redirect_uri_mismatch:
    "回调地址与 OAuth App 中登记的不一致。请确认本次是用 unpaste.uqs.me 还是 workers.dev 域名访问，并把该域名的 /auth/github/callback 填进 GitHub 的 Redirect URIs。",
  bad_verification_code: "授权码已过期或被重复使用，请重新发起登录。",
  unverified_user_email: "该 GitHub 账号尚未验证主邮箱，GitHub 拒绝了本次登录。"
}

export function meta(_: Route.MetaArgs) {
  return [{ title: "登录 · unpaste" }]
}

export function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const redirectTo = safeRedirectTo(url.searchParams.get("redirectTo"))

  // 已登录时不再展示登录页，直接去原本要访问的页面。
  if (getCurrentUser(context)) throw redirect(redirectTo)

  return {
    redirectTo,
    oauthConfigured: Boolean(env.GITHUB_CLIENT_ID),
    error: url.searchParams.get("error"),
    reason: url.searchParams.get("reason")
  }
}

export default function Login({ loaderData }: Route.ComponentProps) {
  const { redirectTo, oauthConfigured, error, reason } = loaderData
  const unconfigured = !oauthConfigured || error === "oauth_not_configured"
  const errorMessage = error
    ? ((reason ? failureReasons[reason] : undefined) ??
      errorMessages[error] ??
      `登录失败（${error}${reason ? `：${reason}` : ""}）。`)
    : undefined

  return (
    <main className="relative flex min-h-[75vh] items-center justify-center overflow-hidden p-4">
      <PixelBlastBackground />
      <Card className="relative z-10 w-full max-w-sm text-center">
        <CardHeader>
          <SignInIcon className="mx-auto" size={32} />
          <CardTitle className="text-lg font-semibold">登录</CardTitle>
          <CardDescription>
            <ul>
              <li>使用 GitHub 登录来创建和管理自己的 snippet</li>
              <li>单文件上限 {MAX_FILE_LENGTH} 字符</li>
              <li>单 snippet 上限 {MAX_FILES_PER_SNIPPET} 个文件</li>
              <li>请避免滥用、遵守站点所在司法区规则</li>
              <li>不合规 snippet 将被管理员删除</li>
            </ul>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild className="w-full">
            <a
              href={`/auth/github?redirectTo=${encodeURIComponent(redirectTo)}`}
            >
              <GithubLogoIcon data-icon="inline-start" />
              使用 GitHub 登录
            </a>
          </Button>

          {errorMessage ? (
            <Alert variant="destructive">
              <WarningCircleIcon />
              <AlertTitle>无法登录</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {unconfigured ? (
            <Alert variant="destructive">
              <WarningCircleIcon />
              <AlertTitle>尚未配置 GitHub OAuth</AlertTitle>
              <AlertDescription>
                请在 <code>wrangler.jsonc</code> 的{" "}
                <code>vars.GITHUB_CLIENT_ID</code> 中填写 Client ID，并执行{" "}
                <code>wrangler secret put GITHUB_CLIENT_SECRET</code> 设置
                Client Secret。GitHub OAuth App 的回调地址填{" "}
                <code>{`<站点>${CALLBACK_PATH}`}</code>。
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}
