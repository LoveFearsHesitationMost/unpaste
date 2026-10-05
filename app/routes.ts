import { type RouteConfig, index, route } from "@react-router/dev/routes"

export default [
  index("routes/home.tsx"),

  // 账户：GitHub OAuth，只有一种登录方式
  route("login", "routes/login.tsx"),
  route("auth/github", "routes/auth-github.tsx"),
  route("auth/github/callback", "routes/auth-callback.tsx"),
  route("auth/logout", "routes/auth-logout.tsx"),

  // 应用页
  route("new", "routes/snippet-new.tsx"),
  route("my", "routes/my.tsx"),
  route("admin", "routes/admin.tsx"),

  // snippet：详情 / 编辑 / 删除 / 原文
  route("s/:slug", "routes/snippet.tsx"),
  route("s/:slug/edit", "routes/snippet-edit.tsx"),
  route("s/:slug/delete", "routes/snippet-delete.tsx"),
  route("s/:slug/raw", "routes/snippet-raw.tsx")
] satisfies RouteConfig
