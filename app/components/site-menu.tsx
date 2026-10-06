import {
  HouseIcon,
  ListIcon,
  PlusIcon,
  ShieldCheckIcon,
  SignInIcon,
  SignOutIcon,
  UserIcon,
  type Icon
} from "@phosphor-icons/react"
import { Link, useFetcher } from "react-router"
import { ThemeToggle } from "~/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { Separator } from "~/components/ui/separator"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "~/components/ui/sheet"
import type { SessionUser } from "~/context"

/** 退出登录：桌面 Dropdown（site-header.tsx）与这里的移动端菜单共用，免得两处各写一遍 submit。 */
export function useLogout() {
  const logout = useFetcher()
  return () => logout.submit(null, { action: "/auth/logout", method: "post" })
}

/**
 * 移动端菜单：md 以下 header 只留 logo，导航、主题切换与账号操作全部收进右侧 Sheet。
 * 桌面端 UserMenu（site-header.tsx 里的 Dropdown）的条目并入这里，两端展示同一份信息：
 * 导航（首页 / 新建 / 我的 / 全局管理）、主题切换、账号（退出登录）。
 * 登录入口在未登录时作为主要动作置顶。
 */
export function SiteMenu({ user }: { user: SessionUser | null }) {
  const logout = useLogout()

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            aria-label="打开菜单"
            className="ml-auto md:hidden"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <ListIcon />
      </SheetTrigger>
      <SheetContent side="right">
        {/* 可见标题与右上角关闭按钮同排，正文才不会被关闭按钮压住。 */}
        <SheetHeader>
          <SheetTitle className="sr-only">菜单</SheetTitle>
          <SheetDescription className="sr-only">
            站点导航、主题与账号操作
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Avatar>
                {user.avatarUrl && (
                  <AvatarImage alt={user.login} src={user.avatarUrl} />
                )}
                <AvatarFallback>
                  {user.login.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {user.name ?? user.login}
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  @{user.login}
                </span>
              </div>
            </div>
          ) : (
            <div className="px-1">
              <div className="text-lg font-medium font-mono">unpaste</div>
              <p>CloudFlare Workers 原生的 pastebin 服务，简洁、公益、现代</p>
            </div>
          )}

          <Separator />

          <nav aria-label="站点导航" className="flex flex-col gap-1">
            <MenuGroupLabel>导航</MenuGroupLabel>
            <MenuLink Icon={HouseIcon} to="/">
              首页
            </MenuLink>
            {user ? (
              <>
                <MenuLink Icon={PlusIcon} to="/new">
                  新建
                </MenuLink>
                <MenuLink Icon={UserIcon} to="/my">
                  我的 snippet
                </MenuLink>
                {user.isAdmin && (
                  <MenuLink Icon={ShieldCheckIcon} to="/admin">
                    全局管理
                  </MenuLink>
                )}
              </>
            ) : (
              <MenuLink Icon={SignInIcon} to="/login">
                登录
              </MenuLink>
            )}
          </nav>

          <Separator />

          <div className="flex flex-col gap-2">
            <MenuGroupLabel>主题</MenuGroupLabel>
            <ThemeToggle orientation="vertical" />
          </div>

          {user && (
            <>
              <Separator />
              <nav aria-label="账号" className="flex flex-col gap-1">
                <MenuGroupLabel>账号</MenuGroupLabel>
                <SheetClose
                  render={
                    <Button
                      className="w-full justify-start gap-2"
                      onClick={logout}
                      size="lg"
                      variant="ghost"
                    />
                  }
                >
                  <SignOutIcon data-icon="inline-start" />
                  退出登录
                </SheetClose>
              </nav>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** 分组标题，对应参考稿里 “Account / Support” 那种小字标签。 */
function MenuGroupLabel({ children }: { children: string }) {
  return (
    <span className="text-muted-foreground px-2 text-xs font-medium">
      {children}
    </span>
  )
}

/** Sheet 里的一行导航：点击后由 SheetClose 关掉菜单。 */
function MenuLink({
  children,
  Icon,
  to
}: {
  children: string
  Icon: Icon
  to: string
}) {
  return (
    <SheetClose
      nativeButton={false}
      render={
        <Button
          className="w-full justify-start gap-2"
          nativeButton={false}
          render={<Link to={to} />}
          size="lg"
          variant="ghost"
        />
      }
    >
      <Icon data-icon="inline-start" />
      {children}
    </SheetClose>
  )
}
