import {
  CodeIcon,
  HouseIcon,
  PlusIcon,
  ShieldCheckIcon,
  SignOutIcon,
  UserIcon
} from "@phosphor-icons/react"
import { Link } from "react-router"
import { SiteMenu, useLogout } from "~/components/site-menu"
import { ThemeToggle } from "~/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/components/ui/dropdown-menu"
import type { SessionUser } from "~/context"

/**
 * 顶部导航。用户数据来自 root loader（服务端已经从 D1 会话里解析过）。
 *
 * md 以上把导航、主题、账号菜单平铺在 header 里；md 以下（手机）header 只留
 * logo，其余元素收进右侧 Sheet（见 site-menu.tsx）——屏幕窄的时候平铺按钮既挤又难点。
 */
export function SiteHeader({ user }: { user: SessionUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-2 px-4">
        <Link
          className="flex items-center gap-2 font-semibold tracking-tight"
          to="/"
        >
          <CodeIcon className="size-5" weight="bold" />
          <span className="font-mono">unpaste</span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <Button
            nativeButton={false}
            render={<Link to="/" />}
            size="sm"
            variant="ghost"
          >
            <HouseIcon data-icon="inline-start" />
            首页
          </Button>

          {user ? (
            <>
              <Button
                nativeButton={false}
                render={<Link to="/new" />}
                size="sm"
                variant="ghost"
              >
                <PlusIcon data-icon="inline-start" />
                新建
              </Button>
              <Button
                nativeButton={false}
                render={<Link to="/my" />}
                size="sm"
                variant="ghost"
              >
                我的
              </Button>
              {user.isAdmin && (
                <Button
                  nativeButton={false}
                  render={<Link to="/admin" />}
                  size="sm"
                  variant="ghost"
                >
                  <ShieldCheckIcon data-icon="inline-start" />
                  管理
                </Button>
              )}
            </>
          ) : (
            <Button
              nativeButton={false}
              render={<Link to="/login" />}
              size="sm"
            >
              登录
            </Button>
          )}

          <ThemeToggle />
          {user && <UserMenu user={user} />}
        </nav>

        <SiteMenu user={user} />
      </div>
    </header>
  )
}

function UserMenu({ user }: { user: SessionUser }) {
  const logout = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button aria-label="账号菜单" size="icon-sm" variant="ghost" />}
      >
        <Avatar size="sm">
          {user.avatarUrl && (
            <AvatarImage alt={user.login} src={user.avatarUrl} />
          )}
          <AvatarFallback>
            {user.login.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Base UI 的 GroupLabel 必须挂在 Group 里（Radix 的 Label 可以自由摆放）。 */}
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="font-medium">{user.name ?? user.login}</span>
            <span className="text-muted-foreground text-xs">@{user.login}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link to="/my" />}>
            <UserIcon data-icon="inline-start" />
            我的 snippet
          </DropdownMenuItem>
          {user.isAdmin && (
            <DropdownMenuItem render={<Link to="/admin" />}>
              <ShieldCheckIcon data-icon="inline-start" />
              全局管理
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <SignOutIcon data-icon="inline-start" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
