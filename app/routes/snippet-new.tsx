import { data, redirect } from "react-router"
import type { Route } from "./+types/snippet-new"
import { SnippetEditor } from "~/components/snippet-editor"
import { requireLogin } from "~/lib/auth.server"
import { createSnippet } from "~/lib/snippets.server"
import { parseSnippetForm } from "~/lib/validation"

export function meta(_: Route.MetaArgs) {
  return [{ title: "新建 snippet · unpaste" }]
}

export async function loader({ context, request }: Route.LoaderArgs) {
  // 应用页不隐藏存在性，但未登录会被引导去登录。
  requireLogin(context, request)
  return null
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = requireLogin(context, request)
  const parsed = parseSnippetForm(await request.formData())
  if (!parsed.ok) {
    return data({ errors: parsed.errors }, { status: 400 })
  }

  const { slug } = await createSnippet(user.id, parsed.value)
  return redirect(`/s/${slug}`)
}

export default function NewSnippet({ actionData }: Route.ComponentProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-semibold text-xl tracking-tight">新建 snippet</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          保存后会生成一个随机 slug 链接。私密 snippet
          只有你自己和管理员能打开。
        </p>
      </div>
      <SnippetEditor errors={actionData?.errors} submitLabel="创建" />
    </div>
  )
}
