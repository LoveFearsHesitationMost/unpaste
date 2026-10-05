import type { Route } from "./+types/snippet-raw"
import { getCurrentUser } from "~/lib/auth.server"
import { notFound } from "~/lib/http.server"
import { canViewSnippet, getSnippetBySlug } from "~/lib/snippets.server"

/**
 * 纯文本原文：/s/:slug/raw[?file=文件名]
 * 不带 file 参数时返回第一个文件。
 */
export async function loader({ params, request, context }: Route.LoaderArgs) {
  const snippet = await getSnippetBySlug(params.slug)
  if (!snippet) notFound()

  const user = getCurrentUser(context)
  if (!canViewSnippet(snippet, user)) notFound()

  const wanted = new URL(request.url).searchParams.get("file")
  const file = wanted
    ? snippet.files.find((candidate) => candidate.filename === wanted)
    : snippet.files[0]
  if (!file) notFound()

  return new Response(file.content, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      // 粘贴内容可能包含 HTML/JS，绝不能让它被浏览器当成页面执行。
      "x-content-type-options": "nosniff",
      "content-disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "cache-control":
        snippet.visibility === "public"
          ? "public, max-age=60"
          : "private, no-store"
    }
  })
}
