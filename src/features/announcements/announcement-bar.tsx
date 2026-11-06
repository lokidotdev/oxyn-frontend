import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { getJson } from '#/shared/lib/api'
import { ArrowUpRightIcon } from '#/shared/ui/icons'

interface Banner {
  message: string
  href: string | null
}

export const bannerQuery = queryOptions({
  queryKey: ['banner'],
  queryFn: () => getJson<{ banner: Banner | null }>('/banners/current', { banner: null }).then((r) => r.banner),
})

export function useBanner() {
  return useSuspenseQuery(bannerQuery).data
}

export function AnnouncementBar() {
  const banner = useBanner()
  if (!banner) return null
  const text = <span className="truncate">{banner.message}</span>
  return (
    <div className="border-b border-line bg-surface font-mono text-xs text-muted">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-center px-4 sm:px-6">
        {banner.href ? (
          <a href={banner.href} className="press group flex min-w-0 items-center gap-1.5 transition-colors hover:text-fg">
            {text}
            <ArrowUpRightIcon />
          </a>
        ) : (
          text
        )}
      </div>
    </div>
  )
}
