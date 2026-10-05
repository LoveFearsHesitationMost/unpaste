import { redirect } from "react-router"
import type { Route } from "./+types/auth-logout"
import { destroySession, getSession } from "~/lib/session.server"

/** 登出：销毁 D1 会话行并清除 cookie。 */
export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"))
  return redirect("/", {
    headers: { "Set-Cookie": await destroySession(request, session) }
  })
}

/** 直接用 GET 访问时回首页，而不是抛 404。 */
export function loader() {
  return redirect("/")
}
