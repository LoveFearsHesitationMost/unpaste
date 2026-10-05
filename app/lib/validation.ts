/**
 * 表单校验规则：服务端校验和前端提示共用，避免两边不一致。
 */

/** 单条 snippet 允许的文件数量上限。 */
export const MAX_FILES_PER_SNIPPET = 20

/** 单个文件内容长度上限（字符数）。 */
export const MAX_FILE_LENGTH = 200_000

/** 标题长度上限（字符数）。 */
export const MAX_TITLE_LENGTH = 200

/** 文件名字段长度上限（字符数）。 */
export const MAX_FILENAME_LENGTH = 120

/** 列表分页大小。 */
export const PAGE_SIZE = 20

export type SnippetInput = {
  title: string
  visibility: "public" | "private"
  files: { filename: string; content: string }[]
}

export type SnippetInputResult =
  | { ok: true; value: SnippetInput }
  | { ok: false; errors: Record<string, string> }

/** 把 "content-1"、"filename-3" 之类的表单字段聚合成文件列表。 */
export function parseSnippetForm(form: FormData): SnippetInputResult {
  const errors: Record<string, string> = {}

  const rawTitle = String(form.get("title") ?? "").trim()
  if (rawTitle.length > MAX_TITLE_LENGTH) {
    errors.title = `标题最长 ${MAX_TITLE_LENGTH} 个字符`
  }

  const visibility = form.get("visibility") === "private" ? "private" : "public"

  const filenames = form.getAll("filename").map((v) => String(v))
  const contents = form.getAll("content").map((v) => String(v))

  const files: SnippetInput["files"] = []
  for (let i = 0; i < contents.length; i++) {
    const content = contents[i]
    // 完全空白的文件直接丢弃，避免保存一堆空块
    if (content.trim() === "" && filenames.length <= 1) continue
    files.push({ filename: filenames[i] ?? "", content })
  }

  if (files.length === 0) {
    errors.files = "至少需要一个文件的内容"
  }
  if (files.length > MAX_FILES_PER_SNIPPET) {
    errors.files = `最多 ${MAX_FILES_PER_SNIPPET} 个文件`
  }

  files.forEach((file, index) => {
    const name = file.filename.trim()
    if (name === "") {
      errors[`filename-${index}`] = "文件名不能为空"
    } else if (name.length > MAX_FILENAME_LENGTH) {
      errors[`filename-${index}`] = `文件名最长 ${MAX_FILENAME_LENGTH} 个字符`
    } else if (/[\r\n]/.test(name)) {
      errors[`filename-${index}`] = "文件名不能包含换行"
    }
    if (file.content.length > MAX_FILE_LENGTH) {
      errors[`content-${index}`] = `单个文件最长 ${MAX_FILE_LENGTH} 个字符`
    }
  })

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    value: {
      title: rawTitle,
      visibility,
      files: files.map((file) => ({
        filename: file.filename.trim(),
        content: file.content
      }))
    }
  }
}
