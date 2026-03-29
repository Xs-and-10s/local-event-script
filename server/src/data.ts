// ─────────────────────────────────────────────────────────────────────────────
// Feed data model
//
// Each item belongs to one or more filter categories.
// The server uses this to build the SSE patch-elements payload.
// ─────────────────────────────────────────────────────────────────────────────

export interface FeedItem {
  id: string
  text: string
  badge: string | null
  cssClass: string          // extra CSS classes on the .feed-item div
  filters: string[]         // which filter values include this item
}

export const FEED_ITEMS: FeedItem[] = [
  {
    id: '1',
    text: 'Server deployed to production',
    badge: 'new',
    cssClass: 'is-new',
    filters: ['all'],
  },
  {
    id: '2',
    text: 'PR #42 merged by @alice',
    badge: 'updated',
    cssClass: 'is-updated',
    filters: ['all', 'mentions'],
  },
  {
    id: '3',
    text: 'Build pipeline passed (12 tests)',
    badge: null,
    cssClass: '',
    filters: ['all', 'unread'],
  },
  {
    id: '4',
    text: 'Scheduled job completed',
    badge: 'stale',
    cssClass: 'is-stale',
    filters: ['all'],
  },
]

export function getItemsForFilter(filter: string): FeedItem[] {
  const key = filter || 'all'
  return FEED_ITEMS.filter(item => item.filters.includes(key))
}

/** Render a single feed item as an HTML string. */
export function renderItem(item: FeedItem): string {
  const badge = item.badge
    ? `<span class="badge">${item.badge}</span> `
    : ''
  const cls = ['feed-item', item.cssClass].filter(Boolean).join(' ')
  return `<div class="${cls}" data-item-id="${item.id}">${badge}${item.text}</div>`
}
