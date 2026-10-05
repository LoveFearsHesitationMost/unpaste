import { redirect } from "react-router"
import type { Route } from "./+types/snippet-delete"
import { requireUserOrNotFound } from "~/lib/auth.server"
import { notFound } from "~/lib/http.server"
import {
  canManageSnippet,
  deleteSnippet,
  getSnippetBySlug
} from "~/lib/snippets.server"

/** GET 不该删东西，直接送回详情页。 */
export function loader({ params }: Route.LoaderArgs) {
  return redirect(`/s/${params.slug}`)
}

export async function action({ params, context }: Route.ActionArgs) {
  const user = requireUserOrNotFound(context)

  const snippet = await getSnippetBySlug(params.slug)
  // 没有管理权限（含未登录、非作者、非管理员）一律 404。
  if (!snippet || !canManageSnippet(snippet, user)) notFound()

  await deleteSnippet(snippet.id)

  // 管理员删别人的 snippet 时回管理页，否则回自己的列表。
  return redirect(snippet.owner.id === user.id ? "/my" : "/admin")
}
