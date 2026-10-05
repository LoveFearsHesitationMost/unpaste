import { defineConfig } from "drizzle-kit"

/**
 * 迁移文件输出到 ./drizzle，由 wrangler 执行：
 *   npm run db:generate        # 依据 schema 生成 SQL 迁移
 *   npm run db:migrate:local   # 应用到本地 D1（.wrangler/state）
 *   npm run db:migrate:remote  # 应用到线上 D1
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./app/lib/schema.server.ts",
  out: "./drizzle"
})
