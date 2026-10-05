import { sql } from "drizzle-orm"
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core"

/**
 * 用户表：只保存 GitHub 账户，不维护自有账户体系。
 * 主键直接使用 GitHub 的数字 ID（字符串形式），因此同一个 GitHub 账号
 * 无论改名多少次都只会对应一行记录。
 */
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  login: text("login").notNull(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
})

/**
 * 会话表：cookie 里只放随机的会话 ID，真正的凭据（userId）落在 D1。
 * 撤销会话 = 删掉这一行。
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_expires_at_idx").on(table.expiresAt)
  ]
)

/**
 * GitHub OAuth 的短期 state 记录（CSRF / 授权码注入防护）。
 * 这些行同时充当 PKCE code_verifier 的存放处，用完即删。
 */
export const oauthStates = sqliteTable(
  "oauth_states",
  {
    id: text("id").primaryKey(),
    codeVerifier: text("code_verifier").notNull(),
    redirectTo: text("redirect_to"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [index("oauth_states_expires_at_idx").on(table.expiresAt)]
)

/**
 * Snippet：一条粘贴记录，可包含多个文件。
 * 与隐私相关的字段是 visibility：'public' 对所有人可见，'private' 只有
 * 作者本人和管理员可见。
 */
export const snippets = sqliteTable(
  "snippets",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title"),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    visibility: text("visibility", { enum: ["public", "private"] })
      .notNull()
      .default("public"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull()
  },
  (table) => [
    uniqueIndex("snippets_slug_unique").on(table.slug),
    index("snippets_owner_created_idx").on(table.ownerId, table.createdAt),
    index("snippets_visibility_created_idx").on(
      table.visibility,
      table.createdAt
    )
  ]
)

/**
 * Snippet 的分文件内容。position 决定展示顺序（同一 snippet 内唯一语义，
 * 由写入方保证连续）。
 */
export const snippetFiles = sqliteTable(
  "snippet_files",
  {
    id: text("id").primaryKey(),
    snippetId: text("snippet_id")
      .notNull()
      .references(() => snippets.id, { onDelete: "cascade" }),
    filename: text("filename").notNull(),
    content: text("content").notNull(),
    language: text("language").notNull().default("text"),
    position: integer("position").notNull()
  },
  (table) => [
    index("snippet_files_snippet_position_idx").on(
      table.snippetId,
      table.position
    )
  ]
)

export type User = typeof users.$inferSelect
export type Session = typeof sessions.$inferSelect
export type Snippet = typeof snippets.$inferSelect
export type SnippetFile = typeof snippetFiles.$inferSelect
export type SnippetVisibility = Snippet["visibility"]
