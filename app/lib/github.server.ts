import * as client from "openid-client"
import { githubEndpoints } from "~/config"

/** GitHub 账户的公开信息，仅取本站需要的字段。 */
export type GithubProfile = {
  id: string
  login: string
  name: string | null
  avatarUrl: string | null
}

/** 一次授权请求所需的全部材料：授权地址 + state + PKCE verifier。 */
export type GithubAuthorization = {
  /** 已经拼好 state / PKCE challenge / client_id 的授权地址。 */
  authorizeUrl: string
  /** 回调时用于校验（同时写进 cookie，把回调绑定到发起授权的浏览器）。 */
  state: string
  /** 只存在 D1 里、绝不进入浏览器的 PKCE code_verifier。 */
  codeVerifier: string
}

type GithubUserResponse = {
  id: number
  login: string
  name: string | null
  avatar_url: string | null
}

/**
 * GitHub 侧明确拒绝了一次授权（凭据不对、回调地址不符、授权码过期等）。
 * `githubError` 就是 GitHub 的 error 代码，可直接转达给用户或写进日志。
 */
export class GithubAuthorizationError extends Error {
  /** GitHub 返回的 error 代码，例如 incorrect_client_credentials。 */
  readonly githubError: string

  constructor(githubError: string, description?: string) {
    super(
      `GitHub 拒绝授权：${githubError}${description ? `（${description}）` : ""}`
    )
    this.name = "GithubAuthorizationError"
    this.githubError = githubError
  }
}

/** GitHub token 端点的路径后缀，用于识别需要归一化响应的那次请求。 */
const GITHUB_TOKEN_PATH = "/login/oauth/access_token"

/**
 * GitHub 的 token 端点在**出错时也返回 HTTP 200**，把错误写进 JSON body 的
 * `error` 字段；而 oauth4webapi 只在状态码非 200 时才去解析错误体，于是会把
 * `{"error":"incorrect_client_credentials",...}` 当成「响应里没有
 * access_token」，抛出没有信息量的 "invalid response encountered"。
 *
 * 这里把这类响应改写成标准的 400，好让错误体被正常解析并抛出
 * ResponseBodyError（其 error / error_description 就是 GitHub 的原文）。
 * 返回 undefined 表示这不是错误响应，调用方应原样放行。
 */
function normalizeGithubTokenFailure(
  response: Response,
  body: string
): Response | undefined {
  if (response.status !== 200) return undefined

  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    return undefined
  }
  if (typeof payload !== "object" || payload === null) return undefined

  const record = payload as Record<string, unknown>
  if (typeof record.error === "string") {
    return new Response(body, { status: 400, headers: response.headers })
  }

  // 既没有 access_token 也没有 error：GitHub 的异常响应，原始报文写进日志
  // 供排查（既然没有 access_token，这里不可能泄露令牌）。否则调用方只会看到
  // 无法定位的 "invalid response encountered"。
  if (typeof record.access_token !== "string") {
    console.error(
      `GitHub token 端点返回异常响应：${body.slice(0, 500) || "(空响应体)"}`
    )
  }
  return undefined
}

/**
 * GitHub 不是 OpenID Connect Provider：没有 `.well-known/openid-configuration`，
 * 不签发 id_token，也没有 OIDC 语义的 userinfo。因此这里按 OAuth 2.0 的用法，
 * 手工提供 Authorization Server 元数据交给 openid-client，剩下的流程
 * （授权地址拼装、PKCE、state 校验、token 交换、带 Bearer 的资源请求）
 * 全部交给库本身，不再自行实现。
 *
 * 唯一需要替库擦屁股的地方是错误响应，见 normalizeGithubTokenFailure。
 */
function createConfiguration(env: Env): client.Configuration {
  const { baseUrl, issuer } = githubEndpoints(env)

  const configuration = new client.Configuration(
    {
      // 必须等于 GitHub 回调里的 iss（https://github.com/login/oauth），
      // 否则 openid-client 在解析回调参数时就会失败，见 config.ts 的注释。
      issuer,
      authorization_endpoint: `${baseUrl}/login/oauth/authorize`,
      token_endpoint: `${baseUrl}/login/oauth/access_token`,
      // GitHub 支持 S256 PKCE（元数据里没有声明，这里补上，让库按 PKCE 处理）
      code_challenge_methods_supported: ["S256"],
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      token_endpoint_auth_methods_supported: ["client_secret_post"]
    },
    env.GITHUB_CLIENT_ID,
    undefined,
    // GitHub 的 token 端点要求 client_secret 走请求体
    client.ClientSecretPost(env.GITHUB_CLIENT_SECRET)
  )

  // 归一化 GitHub 那种「200 + error 字段」的错误响应，见函数注释。
  configuration[client.customFetch] = async (url, options) => {
    // openid-client 的 CustomFetchOptions.body 是 FetchBody（可能含 Uint8Array），
    // 不在 Workers 的 BodyInit 类型里，但运行时 fetch 接受；这里只差一个类型断言。
    const response = await fetch(url, options as RequestInit)
    if (!new URL(url).pathname.endsWith(GITHUB_TOKEN_PATH)) return response
    const body = await response.clone().text()
    return normalizeGithubTokenFailure(response, body) ?? response
  }

  // 库默认拒绝明文端点；本地联调或自建 http 实例需要显式放行。
  if (!baseUrl.startsWith("https://"))
    client.allowInsecureRequests(configuration)

  return configuration
}

let cached: { key: string; configuration: client.Configuration } | undefined

/** 每个 isolate 复用一份 Configuration（内部持有 issuer 元数据与客户端密钥）。 */
function getConfiguration(env: Env): client.Configuration {
  const { baseUrl } = githubEndpoints(env)
  const key = `${env.GITHUB_CLIENT_ID}|${baseUrl}`
  if (cached?.key !== key) {
    cached = { key, configuration: createConfiguration(env) }
  }
  return cached.configuration
}

/** 生成一次授权请求：随机 state + PKCE，授权地址由 openid-client 拼装。 */
export async function createGithubAuthorization(
  env: Env,
  redirectUri: string
): Promise<GithubAuthorization> {
  const configuration = getConfiguration(env)

  const codeVerifier = client.randomPKCECodeVerifier()
  const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier)
  const state = client.randomState()

  const authorizeUrl = client.buildAuthorizationUrl(configuration, {
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state
  })

  // 只要公开资料（id / login / 名称 / 头像），不申请任何额外 scope。
  return { authorizeUrl: authorizeUrl.href, state, codeVerifier }
}

/**
 * 处理回调：openid-client 负责校验 state 是否与预期一致、带上 code_verifier
 * 完成 token 交换；随后用同一个 Configuration 发一次带 Bearer 的资源请求
 * 读取账户资料。
 */
export async function completeGithubAuthorization(
  env: Env,
  options: { request: Request; codeVerifier: string; state: string }
): Promise<GithubProfile> {
  const configuration = getConfiguration(env)

  const tokens = await client
    .authorizationCodeGrant(configuration, options.request, {
      pkceCodeVerifier: options.codeVerifier,
      expectedState: options.state
    })
    .catch((error: unknown) => {
      // 归一化之后，GitHub 的拒绝会以 ResponseBodyError 浮上来，原文在 error / error_description。
      if (error instanceof client.ResponseBodyError) {
        throw new GithubAuthorizationError(error.error, error.error_description)
      }
      throw error
    })

  const { apiBaseUrl } = githubEndpoints(env)
  let response: Response
  try {
    response = await client.fetchProtectedResource(
      configuration,
      tokens.access_token,
      new URL(`${apiBaseUrl}/user`),
      "GET",
      undefined,
      new Headers({
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "unpaste"
      })
    )
  } catch (error) {
    throw new Error(
      `GitHub /user 请求失败：${error instanceof Error ? error.message : String(error)}`
    )
  }

  if (!response.ok) {
    throw new Error(`GitHub /user 返回 ${response.status}`)
  }

  const profile = (await response.json()) as GithubUserResponse
  return {
    id: String(profile.id),
    login: profile.login,
    name: profile.name ?? null,
    avatarUrl: profile.avatar_url ?? null
  }
}
