"use client"

import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"

/**
 * 三态主题切换：浅色 / 深色 / 跟随系统。
 * “跟随系统”不是日夜二选一的中间态，而是把控制权交回操作系统——
 * next-themes 会随 prefers-color-scheme 实时改变实际配色。
 *
 * 结构参考 kibo-ui 的 ButtonGroup 导航模式
 * （patterns/button-group/navigation/button-group-navigation-2）：
 * ButtonGroup 包一组纯图标 Button，选中项靠 variant 区分（default / outline），
 * 用 aria-pressed 保留切换按钮语义，外层 role="group" 提供分组语义。
 *
 * mounted 守卫不可省：next-themes 在浏览器首次渲染时就能同步读出 localStorage
 * 里的主题，而服务端渲染只能得到 undefined。若直接用它决定 variant / aria-pressed，
 * 会触发 hydration 属性不一致（React 会保留服务端属性且不再修正），
 * 所以挂载完成后再显示选中态。
 */
const THEME_OPTIONS = [
  { value: "light", label: "浅色", Icon: SunIcon },
  { value: "dark", label: "深色", Icon: MoonIcon },
  { value: "system", label: "跟随系统", Icon: DesktopIcon }
] as const

/** 与 root.tsx 里 ThemeProvider 的 defaultTheme 保持一致。 */
const DEFAULT_THEME = "system"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return (
    <ButtonGroup aria-label="主题">
      {THEME_OPTIONS.map(({ value, label, Icon }) => {
        // 从未选择过主题时 next-themes 的 theme 是 undefined，
        // 此时实际生效的是 defaultTheme，所以按 system 高亮。
        const selected = mounted && (theme ?? DEFAULT_THEME) === value
        return (
          <Button
            aria-label={label}
            aria-pressed={selected}
            key={value}
            onClick={() => setTheme(value)}
            size="icon-sm"
            title={label}
            variant={selected ? "default" : "outline"}
          >
            <Icon />
          </Button>
        )
      })}
    </ButtonGroup>
  )
}
