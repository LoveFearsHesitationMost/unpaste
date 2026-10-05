/**
 * 手写的环境变量声明：wrangler types 只能看到 wrangler.jsonc 里的 vars，
 * 看不到 Secrets，因此这里补齐 GitHub OAuth 的机密项。
 *
 * 同时给 Cloudflare.Env（`import { env } from "cloudflare:workers"` 的类型）
 * 和全局 Env（wrapper 的 ExportedHandler<Env>）打上补丁 —— 生成文件里
 * 全局 Env 只 extends __BaseEnv_Env，并不会自动继承 Cloudflare.Env 的扩充。
 *
 * 注意：本文件不能有顶层 import/export，否则会变成模块，无法与全局类型合并。
 */
declare namespace Cloudflare {
  interface Env {
    /** GitHub OAuth App 的 Client Secret。线上用 `wrangler secret put`，本地写进 .dev.vars。 */
    GITHUB_CLIENT_SECRET: string
    /** 可选：GitHub 站点地址（自建 GitHub Enterprise 或本地联调时覆盖）。 */
    GITHUB_BASE_URL?: string
    /** 可选：GitHub API 地址（自建 GitHub Enterprise 或本地联调时覆盖）。 */
    GITHUB_API_BASE_URL?: string
    /** 可选：授权服务器标识，须与回调里的 iss 一致（GHE 才需要覆盖）。 */
    GITHUB_ISSUER?: string
  }
}

interface Env {
  GITHUB_CLIENT_SECRET: string
  GITHUB_BASE_URL?: string
  GITHUB_API_BASE_URL?: string
  GITHUB_ISSUER?: string
}
