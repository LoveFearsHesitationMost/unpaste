import { useFetcher } from "react-router"

/**
 * 退出登录：桌面 Dropdown（site-header.tsx）与移动端菜单（site-menu.tsx）共用，
 * 免得两处各写一遍 submit。放在独立文件里，避免两个组件互相 import。
 */
export function useLogout() {
  const logout = useFetcher()
  return () => logout.submit(null, { action: "/auth/logout", method: "post" })
}
