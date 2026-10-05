import { createContext } from "react-router"

/**
 * 当前登录用户（由 root 的 authMiddleware 写入），未登录时为 null。
 * 由服务端的 D1 会话表 + cookie 推导得出，不包含任何凭据。
 */
export type SessionUser = {
  /** GitHub 数字 ID（字符串形式）。 */
  id: string
  login: string
  name: string | null
  avatarUrl: string | null
  /** 是否是在 app/config.ts 中指定的全局管理员。 */
  isAdmin: boolean
}

export const userContext = createContext<SessionUser | null>(null)
