import { eq } from "drizzle-orm"
import { getDb } from "./db.server"
import type { GithubProfile } from "./github.server"
import { users } from "./schema.server"

export type UserRow = {
  id: string
  login: string
  name: string | null
  avatarUrl: string | null
}

/** 登录成功后把 GitHub 资料同步到 users 表（id 用 GitHub 数字 ID）。 */
export async function upsertGithubUser(profile: GithubProfile): Promise<void> {
  await getDb()
    .insert(users)
    .values({
      id: profile.id,
      login: profile.login,
      name: profile.name,
      avatarUrl: profile.avatarUrl
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        login: profile.login,
        name: profile.name,
        avatarUrl: profile.avatarUrl,
        updatedAt: new Date()
      }
    })
    .run()
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const row = await getDb()
    .select({
      id: users.id,
      login: users.login,
      name: users.name,
      avatarUrl: users.avatarUrl
    })
    .from(users)
    .where(eq(users.id, id))
    .get()
  return row ?? null
}
