import { addMilliseconds, isBefore } from "date-fns"
import { eq, lt } from "drizzle-orm"
import { createCookie, createSessionStorage } from "react-router"
import { SESSION_COOKIE_NAME, SESSION_TTL_MS } from "~/config"
import { getDb } from "./db.server"
import { randomId } from "./ids"
import { sessions, users } from "./schema.server"

/**
 * 会话数据。cookie 里只放随机的会话 ID，业务数据全部落在 D1 的 sessions 表。
 * 这里附带用户展示信息，是为了让读取会话只需要一次 SQL join。
 */
export type SessionData = {
  userId: string
  login: string
  name: string | null
  avatarUrl: string | null
}

/**
 * 注意：cookie 未签名。这在这里是安全的——cookie 的内容是高熵随机 ID，
 * 只作为 D1 主键的查找键，攻击者无法伪造出一个存在的 ID。因此无需额外
 * 维护一个签名密钥（React Router 会为此打印一次 dev 警告，可忽略）。
 */
const storage = createSessionStorage<SessionData>({
  cookie: {
    name: SESSION_COOKIE_NAME,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    secure: true
  },

  async createData(data, expires) {
    const { userId } = data
    if (!userId) {
      throw new Error("无法创建会话：缺少 userId（登录流程未写入会话数据）")
    }
    const id = randomId()
    await getDb()
      .insert(sessions)
      .values({
        id,
        userId,
        createdAt: new Date(),
        expiresAt: expires ?? addMilliseconds(new Date(), SESSION_TTL_MS)
      })
      .run()
    return id
  },

  async readData(id) {
    const row = await getDb()
      .select({
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
        login: users.login,
        name: users.name,
        avatarUrl: users.avatarUrl
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, id))
      .get()

    if (!row) return null
    if (isBefore(row.expiresAt, new Date())) {
      await getDb().delete(sessions).where(eq(sessions.id, id)).run()
      return null
    }
    return {
      userId: row.userId,
      login: row.login,
      name: row.name,
      avatarUrl: row.avatarUrl
    }
  },

  async updateData(id, data, expires) {
    await getDb()
      .update(sessions)
      .set({
        userId: data.userId,
        expiresAt: expires ?? addMilliseconds(new Date(), SESSION_TTL_MS)
      })
      .where(eq(sessions.id, id))
      .run()
  },

  async deleteData(id) {
    await getDb().delete(sessions).where(eq(sessions.id, id)).run()
  }
})

export const getSession = storage.getSession

/**
 * OAuth 期间的 state cookie：只存本次授权的随机 state，用于把回调绑定到
 * 发起授权的那个浏览器（同时实现 PKCE verifier 的服务端保管）。
 */
const oauthStateCookie = createCookie("unpaste_oauth_state", {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 600
})

export function readOAuthStateCookie(request: Request): Promise<string | null> {
  return oauthStateCookie.parse(request.headers.get("Cookie"))
}

export function serializeOAuthStateCookie(
  request: Request,
  state: string
): Promise<string> {
  return oauthStateCookie.serialize(state, { secure: isSecureRequest(request) })
}

export function clearOAuthStateCookie(request: Request): Promise<string> {
  return oauthStateCookie.serialize("", {
    maxAge: 0,
    secure: isSecureRequest(request)
  })
}

/** 本地 http 调试时不能带 Secure，否则浏览器会丢弃 cookie。 */
export function isSecureRequest(request: Request): boolean {
  return new URL(request.url).protocol === "https:"
}

/** 下发会话 cookie（登录、续期）。 */
export async function commitSession(
  request: Request,
  session: Awaited<ReturnType<typeof getSession>>
) {
  return storage.commitSession(session, {
    maxAge: SESSION_TTL_MS / 1000,
    secure: isSecureRequest(request)
  })
}

/** 清除会话 cookie，isSecureRequest 决定 Secure 属性。 */
export async function destroySession(
  request: Request,
  session: Awaited<ReturnType<typeof getSession>>
) {
  return storage.destroySession(session, { secure: isSecureRequest(request) })
}

/** 清理过期会话（登录时顺手做一次，避免表无限增长）。 */
export async function deleteExpiredSessions(): Promise<void> {
  await getDb().delete(sessions).where(lt(sessions.expiresAt, new Date())).run()
}
