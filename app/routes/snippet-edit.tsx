import { data, Link, redirect } from "react-router"
import type { Route } from "./+types/snippet-edit"
import { SnippetEditor } from "~/components/snippet-editor"
import { Button } from "~/components/ui/button"
import { requireUserOrNotFound } from "~/lib/auth.server"
import { notFound } from "~/lib/http.server"
import {
  canManageSnippet,
  getSnippetBySlug,
  updateSnippet
} from "~/lib/snippets.server"
import { parseSnippetForm } from "~/lib/validation"

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    {
      title: `编辑 ${loaderData?.snippet.title ?? loaderData?.snippet.slug ?? ""} · unpaste`
    }
  ]
}

export async function loader({ params, context }: Route.LoaderArgs) {
  // 未登录、非作者、非管理员一律 404 —— 不暴露 slug 是否存在。
  const user = requireUserOrNotFound(context)

  const snippet = await getSnippetBySlug(params.slug)
  if (!snippet || !canManageSnippet(snippet, user)) notFound()

  return {
    snippet: {
      slug: snippet.slug,
      title: snippet.title ?? "",
      visibility: snippet.visibility
    },
    files: snippet.files.map((file) => ({
      filename: file.filename,
      content: file.content
    }))
  }
}

export async function action({ params, context, request }: Route.ActionArgs) {
  const user = requireUserOrNotFound(context)

  const snippet = await getSnippetBySlug(params.slug)
  if (!snippet || !canManageSnippet(snippet, user)) notFound()

  const parsed = parseSnippetForm(await request.formData())
  if (!parsed.ok) {
    return data({ errors: parsed.errors }, { status: 400 })
  }

  await updateSnippet(snippet.id, parsed.value)
  return redirect(`/s/${snippet.slug}`)
}

export default function EditSnippet({
  loaderData,
  actionData
}: Route.ComponentProps) {
  const { snippet, files } = loaderData

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-semibold text-xl tracking-tight">编辑 snippet</h1>
          <p className="mt-1 font-mono text-muted-foreground text-xs">
            /s/{snippet.slug}
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link to={`/s/${snippet.slug}`} />}
          size="sm"
          variant="outline"
        >
          取消
        </Button>
      </div>

      <SnippetEditor
        errors={actionData?.errors}
        initial={{
          title: snippet.title,
          visibility: snippet.visibility,
          files
        }}
        submitLabel="保存修改"
      />
    </div>
  )
}
