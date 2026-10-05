import { and, desc, eq, sql } from "drizzle-orm"
import type { SessionUser } from "~/context"
import { getDb } from "./db.server"
import { randomSlug } from "./ids"
import { detectLanguage } from "./language"
import { snippetFiles, snippets, users } from "./schema.server"
import type { SnippetInput } from "./validation"

export type SnippetOwner = {
  id: string
  login: string
  name: string | null
  avatarUrl: string | null
}

export type SnippetSummary = {
  id: string
  slug: string
  title: string | null
  visibility: "public" | "private"
  createdAt: Date
  updatedAt: Date
  owner: SnippetOwner
  fileCount: number
  totalSize: number
}

export type SnippetFileContent = {
  id: string
  filename: string
  language: string
  content: string
}

export type SnippetDetail = SnippetSummary & { files: SnippetFileContent[] }

type SnippetSummaryRow = {
  id: string
  slug: string
  title: string | null
  visibility: "public" | "private"
  createdAt: Date
  updatedAt: Date
  ownerId: string
  ownerLogin: string
  ownerName: string | null
  ownerAvatarUrl: string | null
  fileCount: number
  totalSize: number
}

/** 文件数量与总字节数用相关子查询一次取回，避免 N+1。 */
const summaryColumns = {
  id: snippets.id,
  slug: snippets.slug,
  title: snippets.title,
  visibility: snippets.visibility,
  createdAt: snippets.createdAt,
  updatedAt: snippets.updatedAt,
  ownerId: users.id,
  ownerLogin: users.login,
  ownerName: users.name,
  ownerAvatarUrl: users.avatarUrl,
  fileCount: sql<number>`(select count(*) from ${snippetFiles} where ${snippetFiles.snippetId} = ${snippets.id})`,
  totalSize: sql<number>`(select coalesce(sum(length(${snippetFiles.content})), 0) from ${snippetFiles} where ${snippetFiles.snippetId} = ${snippets.id})`
}

function toSummary(row: SnippetSummaryRow): SnippetSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner: {
      id: row.ownerId,
      login: row.ownerLogin,
      name: row.ownerName,
      avatarUrl: row.ownerAvatarUrl
    },
    fileCount: row.fileCount,
    totalSize: row.totalSize
  }
}

/** 列表筛选条件：公开列表只看 public，我的列表按作者，管理后台不筛选。 */
export type SnippetListScope = {
  visibility?: "public"
  ownerId?: string
}

export async function listSnippets(
  scope: SnippetListScope,
  limit: number,
  offset: number
): Promise<{ items: SnippetSummary[]; total: number }> {
  const conditions = []
  if (scope.visibility)
    conditions.push(eq(snippets.visibility, scope.visibility))
  if (scope.ownerId) conditions.push(eq(snippets.ownerId, scope.ownerId))
  const where = conditions.length > 0 ? and(...conditions) : undefined

  const [rows, totalRow] = await Promise.all([
    getDb()
      .select(summaryColumns)
      .from(snippets)
      .innerJoin(users, eq(snippets.ownerId, users.id))
      .where(where)
      .orderBy(desc(snippets.createdAt))
      .limit(limit)
      .offset(offset),
    getDb()
      .select({ count: sql<number>`count(*)` })
      .from(snippets)
      .where(where)
      .get()
  ])

  return { items: rows.map(toSummary), total: totalRow?.count ?? 0 }
}

export async function getSnippetBySlug(
  slug: string
): Promise<SnippetDetail | null> {
  const row = await getDb()
    .select(summaryColumns)
    .from(snippets)
    .innerJoin(users, eq(snippets.ownerId, users.id))
    .where(eq(snippets.slug, slug))
    .get()

  if (!row) return null

  const files = await getDb()
    .select({
      id: snippetFiles.id,
      filename: snippetFiles.filename,
      language: snippetFiles.language,
      content: snippetFiles.content
    })
    .from(snippetFiles)
    .where(eq(snippetFiles.snippetId, row.id))
    .orderBy(snippetFiles.position)

  return { ...toSummary(row), files }
}

function toFileRows(snippetId: string, files: SnippetInput["files"]) {
  return files.map((file, index) => ({
    id: crypto.randomUUID(),
    snippetId,
    filename: file.filename,
    content: file.content,
    language: detectLanguage(file.filename),
    position: index
  }))
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Error && /UNIQUE constraint failed/i.test(error.message)
  )
}

/**
 * 新建 snippet。slug 随机生成，撞车（唯一索引冲突）时重试，
 * 与标题、作者无关，无法被枚举或预测。
 */
export async function createSnippet(
  ownerId: string,
  input: SnippetInput
): Promise<{ id: string; slug: string }> {
  const db = getDb()
  const id = crypto.randomUUID()
  const now = new Date()

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = randomSlug()
    const taken = await db
      .select({ id: snippets.id })
      .from(snippets)
      .where(eq(snippets.slug, slug))
      .get()
    if (taken) continue

    try {
      await db.batch([
        db.insert(snippets).values({
          id,
          slug,
          title: input.title === "" ? null : input.title,
          ownerId,
          visibility: input.visibility,
          createdAt: now,
          updatedAt: now
        }),
        db.insert(snippetFiles).values(toFileRows(id, input.files))
      ])
      return { id, slug }
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error
    }
  }

  throw new Error("生成唯一 slug 失败，请重试")
}

/** 更新：文件整体替换（先删后插），与元数据一起放进同一个 batch 事务。 */
export async function updateSnippet(
  snippetId: string,
  input: SnippetInput
): Promise<void> {
  const db = getDb()
  await db.batch([
    db
      .update(snippets)
      .set({
        title: input.title === "" ? null : input.title,
        visibility: input.visibility,
        updatedAt: new Date()
      })
      .where(eq(snippets.id, snippetId)),
    db.delete(snippetFiles).where(eq(snippetFiles.snippetId, snippetId)),
    db.insert(snippetFiles).values(toFileRows(snippetId, input.files))
  ])
}

export async function deleteSnippet(snippetId: string): Promise<void> {
  const db = getDb()
  await db.batch([
    db.delete(snippetFiles).where(eq(snippetFiles.snippetId, snippetId)),
    db.delete(snippets).where(eq(snippets.id, snippetId))
  ])
}

type SnippetAccess = { visibility: "public" | "private"; owner: { id: string } }

/** 可见性：公开的谁都能看；私密的只有作者本人和全局管理员。 */
export function canViewSnippet(
  snippet: SnippetAccess,
  user: SessionUser | null
): boolean {
  if (snippet.visibility === "public") return true
  return user !== null && (user.id === snippet.owner.id || user.isAdmin)
}

/** 编辑/删除权限：作者本人或全局管理员。 */
export function canManageSnippet(
  snippet: SnippetAccess,
  user: SessionUser | null
): boolean {
  return user !== null && (user.id === snippet.owner.id || user.isAdmin)
}
