import { CheckIcon, CopyIcon } from "@phosphor-icons/react"
import { useState } from "react"
import { useLocation } from "react-router"
import { Button } from "~/components/ui/button"

/** 复制当前页面链接（snippet 的分享方式就是把 URL 发出去）。 */
export function CopyLinkButton({ label = "复制链接" }: { label?: string }) {
  const location = useLocation()
  const [copied, setCopied] = useState(false)

  return (
    <Button
      onClick={() => {
        const url = `${window.location.origin}${location.pathname}`
        navigator.clipboard.writeText(url).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }}
      size="sm"
      variant="outline"
    >
      {copied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      {copied ? "已复制" : label}
    </Button>
  )
}
