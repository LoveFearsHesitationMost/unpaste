import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"
import { Link } from "react-router"
import { Button } from "~/components/ui/button"

/** 简单的上一页/下一页翻页条，页码通过 ?page= 传递。 */
export function ListPagination({
  basePath,
  page,
  pageCount
}: {
  basePath: string
  page: number
  pageCount: number
}) {
  if (pageCount <= 1) return null

  return (
    <div className="flex items-center justify-between pt-2">
      {page > 1 ? (
        <Button
          nativeButton={false}
          render={<Link to={`${basePath}?page=${page - 1}`} />}
          size="sm"
          variant="outline"
        >
          <CaretLeftIcon data-icon="inline-start" />
          上一页
        </Button>
      ) : (
        <Button disabled size="sm" variant="outline">
          <CaretLeftIcon data-icon="inline-start" />
          上一页
        </Button>
      )}

      <span className="text-muted-foreground text-xs">
        第 {page} / {pageCount} 页
      </span>

      {page < pageCount ? (
        <Button
          nativeButton={false}
          render={<Link to={`${basePath}?page=${page + 1}`} />}
          size="sm"
          variant="outline"
        >
          下一页
          <CaretRightIcon data-icon="inline-end" />
        </Button>
      ) : (
        <Button disabled size="sm" variant="outline">
          下一页
          <CaretRightIcon data-icon="inline-end" />
        </Button>
      )}
    </div>
  )
}
