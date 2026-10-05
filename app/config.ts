/**
 * 全局配置文件（只应被服务端模块导入）。
 *
 * ADMIN_GITHUB_ID 是全站唯一的管理员：用该 GitHub 账号登录后，可以浏览、
 * 编辑、删除所有用户的 snippet，包括别人的私密 snippet。
 *
 * 填写的是 GitHub 的 **数字账号 ID**（不是用户名、不是登录名）：
 *   - 打开 https://api.github.com/users/<你的用户名> ，取 "id" 字段；
 *   - 或在本站登录后，打开「我的 → 账号信息」查看。
 *
 * 留空字符串表示不设管理员，此时任何人都只有普通用户的权限。
 *
 * 显式标注为 `string`：否则常量会被推断成字面量类型，填了具体 ID 之后
 * 判空比较（`ADMIN_GITHUB_ID !== ""`）会因两侧类型无交集而编译失败。
 */
export const ADMIN_GITHUB_ID: string = "41455159"

/** 会话有效期（毫秒），同时决定会话 cookie 的 maxAge。 */
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000

/** 会话 cookie 名。 */
export const SESSION_COOKIE_NAME = "unpaste_session"

/** GitHub OAuth 的回调地址路径（相对本站根路径）。 */
export const OAUTH_CALLBACK_PATH = "/auth/github/callback"

/** 一次授权往返（state + PKCE verifier）的有效期（分钟）。 */
export const OAUTH_STATE_TTL_MINUTES = 10

/**
 * GitHub 的站点地址、API 地址与授权服务器标识（issuer）。
 * 默认指向 github.com / api.github.com；自建 GitHub Enterprise 或本地联调
 * 时可用环境变量覆盖。
 *
 * 注意：GitHub 不是 OIDC Provider（没有 discovery 文档、不签发 id_token），
 * 因此 OAuth 端点由 openid-client 依据这些基地址拼出的元数据来使用。
 *
 * issuer 必须与 GitHub 回调时带回来的 `iss` 参数完全一致：GitHub 自 2026-04
 * 起实现了 RFC 9207，回调 URL 上会附 `iss=https://github.com/login/oauth`，
 * 而 openid-client 会无条件地拿它与元数据里的 issuer 比对，不一致就直接抛
 * `invalid response encountered`（发生在任何 token 请求之前，所以 GitHub 面板上
 * Client secret 会一直显示 "never used"）。GHE 用 GITHUB_ISSUER 覆盖。
 */
export function githubEndpoints(env: Env) {
  const baseUrl =
    env.GITHUB_BASE_URL?.replace(/\/+$/, "") ?? "https://github.com"

  return {
    baseUrl,
    apiBaseUrl:
      env.GITHUB_API_BASE_URL?.replace(/\/+$/, "") ?? "https://api.github.com",
    issuer: env.GITHUB_ISSUER?.replace(/\/+$/, "") ?? `${baseUrl}/login/oauth`
  }
}
