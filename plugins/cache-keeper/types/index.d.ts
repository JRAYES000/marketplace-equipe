export type CacheAlert = { minutesLeft: number; tokens: number } | null

export type CacheMeterLimit = { label: string; percent: number; resetsInMs: number | null }

export type CacheMeter = {
  // Minutes before the prompt cache lapses; null before the first turn, 0 once cold.
  cacheMinutes: number | null
  tokens: number
  contextPercent: number
  limits: CacheMeterLimit[]
} | null

// The last handoff's text while it waits for "Clear et reprendre"; `pending` while /handoff runs.
export type CacheHandoff = { status: 'pending' } | { status: 'ready'; text: string } | null

declare module 'claude-code' {
  interface PluginState {
    'cache-keeper': {
      lastAt: number
      alert: CacheAlert
      meter: CacheMeter
      handoff: CacheHandoff
    }
  }
}
