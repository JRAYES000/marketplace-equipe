export type CacheAlert = { minutesLeft: number; tokens: number } | null

export type CacheMeterLimit = { label: string; percent: number; resetsInMs: number | null }

export type CacheMeter = {
  // Minutes before the prompt cache lapses; null before the first turn, 0 once cold.
  cacheMinutes: number | null
  tokens: number
  contextPercent: number
  limits: CacheMeterLimit[]
} | null

// The prompt cache's lifetime in minutes and where that figure comes from:
// seen on a request after a pause, forced by a quota past 100 % (overage), or assumed.
export type CacheTtl = { minutes: 5 | 60; source: 'observed' | 'overage' | 'assumed' }

// The last handoff's text while it waits for "Clear et reprendre"; `pending` while /handoff runs.
export type CacheHandoff = { status: 'pending' } | { status: 'ready'; text: string } | null

// A prompt held back because sending it would rewrite a large cold cache.
export type CacheHeld = { text: string; tokens: number } | null

declare module 'claude-code' {
  interface PluginState {
    'cache-keeper': {
      lastAt: number
      alert: CacheAlert
      meter: CacheMeter
      ttl: CacheTtl
      handoff: CacheHandoff
      held: CacheHeld
      isCompacting: boolean
    }
  }
}
