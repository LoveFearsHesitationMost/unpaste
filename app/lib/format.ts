import { UTCDate } from "@date-fns/utc"
import { differenceInDays, format, formatDistanceStrict } from "date-fns"
import { zhCN } from "date-fns/locale/zh-CN"

/**
 * 展示用的时间/体积格式化（date-fns，中文 locale）。
 *
 * 只在服务端（loader）调用：把结果作为字符串放进 loaderData，避免服务端与
 * 浏览器因时区或当前时间不同而产生 hydration 不一致。
 * 绝对时间用 UTCDate 强制按 UTC 呈现，不依赖运行环境的本地时区。
 */
const ABSOLUTE_AFTER_DAYS = 7

/** 一周内给相对时间（“3 分钟前”），更久则给固定格式的 UTC 时间。 */
export function formatTimestamp(date: Date, now: Date = new Date()): string {
  if (differenceInDays(now, date) < ABSOLUTE_AFTER_DAYS) {
    return formatDistanceStrict(date, now, { addSuffix: true, locale: zhCN })
  }
  return `${format(new UTCDate(date), "yyyy-MM-dd HH:mm", { locale: zhCN })} UTC`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
