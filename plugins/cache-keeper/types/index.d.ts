export type CacheAlert = { minutesLeft: number; tokens: number } | null

export type CacheMeterLimit = { label: string; percent: number; resetsInMs: number | null }

export type CacheMeter = {
  // Minutes before the prompt cache lapses; null before the first turn, 0 once cold.
  cacheMinutes: number | null
  tokens: number
  contextPercent: number
  limits: CacheMeterLimit[]
  usd: number | null
} | null

declare module 'claude-code' {
  interface PluginState {
    'cache-keeper': { lastAt: number; alert: CacheAlert; meter: CacheMeter }
  }
}
