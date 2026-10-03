export type CacheAlert = { minutesLeft: number; tokens: number } | null

declare module 'claude-code' {
  interface PluginState {
    'cache-keeper': { lastAt: number; alert: CacheAlert }
  }
}
