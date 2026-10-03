import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheAlert, CacheMeter } from '../types'

// Prompt cache lifetime of these sessions (1 h); the alert fires this long before it lapses.
const TTL_MS = 60 * 60 * 1000
const WARN_MS = 5 * 60 * 1000
const TICK_MS = 30 * 1000

const lastAt = atom({ plugin: 'cache-keeper', key: 'lastAt' } as const, 0)
const alert = atom({ plugin: 'cache-keeper', key: 'alert' } as const, null)
const meter = atom({ plugin: 'cache-keeper', key: 'meter' } as const, null)

// The lastAt an alert was raised for: one alert per warm period, a dismissal stays dismissed.
let warnedFor = -1

// Mid-tone hues that hold contrast on the desktop's light and dark themes alike.
const TONE = { calm: '#2E9E5B', watch: '#C98A0B', act: '#D14B3A', accent: '#D97757' } as const
type Tone = keyof typeof TONE

const WINDOW_LABEL: Record<string, string> = { five_hour: '5 h', seven_day: 'Semaine' }

const kilo = (tokens: number) => `${Math.round(tokens / 1000)}k`
const money = (usd: number) => usd.toFixed(2).replace('.', ',')

const usageTone = (percent: number): Tone => (percent < 60 ? 'calm' : percent < 85 ? 'watch' : 'act')
const cacheTone = (minutes: number): Tone => (minutes > 15 ? 'calm' : minutes > 5 ? 'watch' : 'act')

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ${String(minutes % 60).padStart(2, '0')}`

  return `${Math.floor(hours / 24)} j ${hours % 24} h`
}

// A thin rounded gauge; the track is translucent so it sits on either theme.
const gauge = (percent: number, tone: Tone) => {
  const width = 64
  const fill = Math.max(3, Math.round((Math.min(100, Math.max(0, percent)) / 100) * width))

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="6" viewBox="0 0 ${width} 6">\
<rect width="${width}" height="6" rx="3" fill="#8A8A8A" fill-opacity="0.22"/>\
<rect width="${fill}" height="6" rx="3" fill="${TONE[tone]}"/></svg>`
}

const refresh = async ($: EngineInterface) => {
  const usage = await $.session.usage()
  const last = await read($, lastAt)
  const now = await $.clock.now()
  const left = last === 0 ? undefined : TTL_MS - (now - last)
  const tokens = usage.context.tokens ?? 0

  const next: CacheMeter = {
    cacheMinutes: left === undefined ? null : Math.max(0, Math.ceil(left / 60000)),
    tokens,
    contextPercent: usage.context.percent ?? 0,
    limits: usage.rateLimits.map(limit => ({
      label: WINDOW_LABEL[limit.kind] ?? limit.kind,
      percent: limit.percentUsed,
      resetsInMs: limit.resetsAt === undefined ? null : Date.parse(limit.resetsAt) - now,
    })),
    usd: usage.cost?.usd ?? null,
  }
  await update($, meter, () => next)

  const isLapsing = left !== undefined && left > 0 && left <= WARN_MS
  const current = await read($, alert)
  if (isLapsing && warnedFor !== last) {
    warnedFor = last
    const raised: CacheAlert = { minutesLeft: Math.ceil(left / 60000), tokens }
    await update($, alert, () => raised)
    $.ui.toast(`Cache froid dans ${raised.minutesLeft} min : ${kilo(tokens)} tokens à réécrire`, { timeoutMs: 10000 })
  }
  if (!isLapsing && current !== null) await update($, alert, () => null)
}

const markWarm = async ($: EngineInterface) => {
  const now = await $.clock.now()
  await update($, lastAt, () => now)
  await update($, alert, () => null)
  await refresh($)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'cache',
      description: "Affiche l'état du cache et du contexte de la session",
    })
    $.ui.status(undefined)
    void refresh($).catch(() => undefined)
    $.clock.every(TICK_MS, () => void refresh($).catch(() => undefined))

    return next(e)
  })

  on('command.run', { command: 'cache' }, async $ => {
    await refresh($)
    const last = await read($, lastAt)
    if (last === 0) return { text: 'Cache : aucun tour terminé dans cette session.' }
    const left = TTL_MS - ((await $.clock.now()) - last)
    const usage = await $.session.usage()

    return {
      text: left > 0
        ? `Cache chaud encore ${Math.ceil(left / 60000)} min. Contexte : ${kilo(usage.context.tokens ?? 0)} tokens.`
        : `Cache froid : le prochain message réécrit ${kilo(usage.context.tokens ?? 0)} tokens.`,
    }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined && e.usage !== undefined) await markWarm($)

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const figures = await read($, meter)
    const current = await read($, alert)
    if (e.props.hasSurvey || figures === null) return next(e)

    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    // The terminal has no Svg: its gauges fall back to the colored figure alone.
    const Svg = 'Svg' in elements ? elements.Svg : undefined
    const below = await next(e)

    const metric = (key: string, label: string, value: string, tone: Tone, percent: number | null, note?: string) => (
      <Box key={key} flexDirection="row" alignItems="center" gap={1}>
        <Text dimColor>{label}</Text>
        {Svg !== undefined && percent !== null && (
          <Svg source={gauge(percent, tone)} alt={`${label} ${value}`} width={64} height={6} />
        )}
        <Text bold color={TONE[tone]}>{value}</Text>
        {note !== undefined && <Text dimColor>{note}</Text>}
      </Box>
    )

    const cache = figures.cacheMinutes === null
      ? metric('cache', 'Cache', 'en attente', 'calm', null)
      : figures.cacheMinutes === 0
        ? metric('cache', 'Cache', 'froid', 'act', 0)
        : metric('cache', 'Cache', `${figures.cacheMinutes} min`, cacheTone(figures.cacheMinutes), (figures.cacheMinutes / 60) * 100)

    return (
      <Box flexDirection="column" gap={1}>
        {current !== null && !e.props.isWorking && (
          <Box flexDirection="column" gap={1}>
            <Text bold color={TONE.act}>
              Le cache expire dans {current.minutesLeft} min. Le prochain message réécrira {kilo(current.tokens)} tokens.
            </Text>
            <Box flexDirection="row" gap={1}>
              <Button
                key="warm"
                label="Garder au chaud"
                variant="primary"
                onPress={async () => {
                  // A one-word fork reads the cached prefix, which renews its lifetime.
                  const reply = await $.model.fork({ prompt: 'Réponds uniquement : OK' })
                  if (reply.isAnswered) await markWarm($)
                  else $.ui.toast(`Relance impossible : ${reply.reason}`)
                }}
              />
              <Button
                key="compact"
                label="Compacter"
                onPress={async () => {
                  await update($, alert, () => null)
                  await $.session.compact()
                }}
              />
              <Button key="dismiss" label="Ignorer" role="dismiss" onPress={() => update($, alert, () => null)} />
            </Box>
          </Box>
        )}
        <Box flexDirection="row" flexWrap="wrap" columnGap={3} rowGap={0}>
          {cache}
          {metric('context', 'Contexte', `${figures.contextPercent} %`, usageTone(figures.contextPercent), figures.contextPercent, kilo(figures.tokens))}
          {figures.limits.map(limit =>
            metric(
              `limit-${limit.label}`,
              limit.label,
              `${Math.round(limit.percent)} %`,
              usageTone(limit.percent),
              limit.percent,
              limit.resetsInMs === null ? undefined : `reset ${duration(limit.resetsInMs)}`,
            ),
          )}
          {figures.usd !== null && (
            <Box key="cost" flexDirection="row" gap={1}>
              <Text dimColor>Coût API</Text>
              <Text bold>{money(figures.usd)} $</Text>
            </Box>
          )}
        </Box>
        {below}
      </Box>
    )
  })
}
