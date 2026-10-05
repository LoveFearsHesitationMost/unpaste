import { env } from "cloudflare:workers"
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1"

/**
 * D1 是本站唯一的持久化设施：不引入 Redis / 全文检索等外部组件，
 * 搜索、排序一律用 SQL 完成。
 */
let cached: DrizzleD1Database | undefined

/** 取得 Drizzle 客户端。每个 isolate 复用一份，避免重复包装 D1 binding。 */
export function getDb(): DrizzleD1Database {
  if (!cached) cached = drizzle(env.DB)
  return cached
}
