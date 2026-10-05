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
 * horizontal（header 里）参考 kibo-ui 的 ButtonGroup 导航模式
 * （patterns/button-group/navigation/button-group-navigation-2）：
 * ButtonGroup 包一组纯图标 Button，选中项靠 variant 区分（default / outline），
 * 用 aria-pressed 保留切换按钮语义，外层 role="group" 提供分组语义。
 *
 * vertical（移动端 Sheet 里）是「列表」而非分段控件：ButtonGroup 的 vertical
 * 变体会把相邻按钮拼起来（去圆角、去边框），和一行一项的语义不符，所以直接
 * 用 flex 列 + 独立 Button（默认 ghost、选中 default），按钮带上文字标签。
 * 尺寸用 lg（h-9）而不是 icon-sm：icon-sm 是固定 size-7，与 w-full 属于不同
 * 的合并组，两个类都会被保留，最终宽度只能听凭 Tailwind 输出顺序。
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

export function ThemeToggle({
  orientation = "horizontal"
}: {
  orientation?: "vertical" | "horizontal"
}) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // 从未选择过主题时 next-themes 的 theme 是 undefined，
  // 此时实际生效的是 defaultTheme，所以按 system 高亮。
  const isSelected = (value: string) =>
    mounted && (theme ?? DEFAULT_THEME) === value

  if (orientation === "vertical") {
    return (
      <div aria-label="主题" className="flex flex-col gap-1" role="group">
        {THEME_OPTIONS.map(({ value, label, Icon }) => (
          <Button
            aria-pressed={isSelected(value)}
            className="w-full justify-start gap-2"
            key={value}
            onClick={() => setTheme(value)}
            size="lg"
            variant={isSelected(value) ? "default" : "ghost"}
          >
            <Icon data-icon="inline-start" />
            {label}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <ButtonGroup aria-label="主题" orientation={orientation}>
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <Button
          aria-label={label}
          aria-pressed={isSelected(value)}
          key={value}
          onClick={() => setTheme(value)}
          size="icon-sm"
          title={label}
          variant={isSelected(value) ? "default" : "outline"}
        >
          <Icon />
        </Button>
      ))}
    </ButtonGroup>
  )
}
