import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { CacheAlert, CacheHandoff, CacheHeld, CacheHistory, CacheMeter, CacheTtl } from '../types'

const MINUTE = 60 * 1000
const TICK_MS = 30 * 1000
// A cold send above this many tokens is held for a choice first.
const GUARD_TOKENS = 150_000
// An observed lifetime is trusted this long: the billing state behind it can change.
const OBSERVED_FOR_MS = 12 * 60 * MINUTE

const lastAt = atom({ plugin: 'cache-keeper', key: 'lastAt' } as const, 0)
const alert = atom({ plugin: 'cache-keeper', key: 'alert' } as const, null)
const meter = atom({ plugin: 'cache-keeper', key: 'meter' } as const, null)
const ttl = atom({ plugin: 'cache-keeper', key: 'ttl' } as const, { minutes: 60, source: 'assumed' })
const handoff = atom({ plugin: 'cache-keeper', key: 'handoff' } as const, null)
const held = atom({ plugin: 'cache-keeper', key: 'held' } as const, null)
const isCompacting = atom({ plugin: 'cache-keeper', key: 'isCompacting' } as const, false)
const history = atom({ plugin: 'cache-keeper', key: 'history' } as const, [])

// Turns the context chart keeps.
const HISTORY = 12

// The lastAt an alert was raised for: one alert per warm period, a dismissal stays dismissed.
let warnedFor = -1
// A compaction rewrites the prefix on purpose: its next request is no surprise rebuild.
let hasCompacted = false
// The held prompt the person chose to send anyway passes the guard once.
let bypassText: string | null = null

// Mid-tone hues that hold contrast on the desktop's light and dark themes alike.
const TONE = { calm: '#2E9E5B', watch: '#C98A0B', act: '#D14B3A', accent: '#D97757' } as const
type Tone = keyof typeof TONE

const WINDOW_LABEL: Record<string, string> = { five_hour: 'Session 5 h', seven_day: 'Semaine' }

const RESUME = 'Reprends le travail à partir de ce document de passation :\n\n'

const kilo = (tokens: number) => `${Math.round(tokens / 1000)}k`

const usageTone = (percent: number): Tone => (percent < 60 ? 'calm' : percent < 85 ? 'watch' : 'act')
const cacheTone = (left: number, life: number): Tone => (left > life / 4 ? 'calm' : left > life / 12 ? 'watch' : 'act')
const warnMs = (life: CacheTtl) => (life.minutes === 5 ? 2 * MINUTE : 5 * MINUTE)

const duration = (ms: number) => {
  const minutes = Math.max(0, Math.round(ms / MINUTE))
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

// The context forecast, after Anthropic's token-weather mod: single-width symbols, not emoji,
// so they line up in a terminal font too.
const weather = (percent: number) =>
  percent < 25 ? { icon: '☀', word: 'dégagé' }
    : percent < 50 ? { icon: '☁', word: 'nuageux' }
    : percent < 75 ? { icon: '☂', word: 'averses' }
    : percent < 90 ? { icon: '☇', word: 'orage' }
    : { icon: '↯', word: 'compacter bientôt' }

// Bars scale to the fullest turn shown, so growth shows at any fill; the latest turn is opaque.
const chart = (readings: CacheHistory, tone: Tone) => {
  const top = Math.max(...readings, 1)
  const bars = readings.map((tokens, index) => {
    const height = Math.max(2, Math.round((tokens / top) * 14))
    const opacity = index === readings.length - 1 ? 1 : 0.5

    return `<rect x="${index * 4}" y="${14 - height}" width="3" height="${height}" rx="1" fill="${TONE[tone]}" fill-opacity="${opacity}"/>`
  })

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${readings.length * 4}" height="14" viewBox="0 0 ${readings.length * 4} 14">${bars.join('')}</svg>`
}

const BLOCKS = '▁▂▃▄▅▆▇█'
const blocks = (readings: CacheHistory) => {
  const top = Math.max(...readings, 1)

  return readings.map(tokens => BLOCKS[Math.min(7, Math.floor((tokens / top) * 7))]).join('')
}

const DIVIDER =`<svg xmlns="http://www.w3.org/2000/svg" width="1" height="16" viewBox="0 0 1 16">\
<rect width="1" height="16" fill="#8A8A8A" fill-opacity="0.35"/></svg>`

// Milliseconds before the cache lapses; undefined before the first request.
const msLeft = async ($: EngineInterface) => {
  const last = await read($, lastAt)
  if (last === 0) return undefined
  const life = await read($, ttl)

  return life.minutes * MINUTE - ((await $.clock.now()) - last)
}

// The lifetime in force: a quota past 100 % means overage credits, billed with a 5-minute cache;
// else what a request after a pause showed; else the subscription's hour.
const resolveTtl = async ($: EngineInterface, isOverage: boolean): Promise<CacheTtl> => {
  if (isOverage) return { minutes: 5, source: 'overage' }
  const seen = (await $.store.get('observedTtl')) as { minutes: 5 | 60; at: number } | undefined
  const isFresh = seen !== undefined && (await $.clock.now()) - seen.at < OBSERVED_FOR_MS

  return isFresh ? { minutes: seen.minutes, source: 'observed' } : { minutes: 60, source: 'assumed' }
}

const refresh = async ($: EngineInterface) => {
  const usage = await $.session.usage()
  const now = await $.clock.now()
  const isOverage = usage.rateLimits.some(limit => limit.percentUsed >= 100)
  const life = await resolveTtl($, isOverage)
  await update($, ttl, () => life)

  const last = await read($, lastAt)
  const left = await msLeft($)
  const tokens = usage.context.tokens ?? 0

  const next: CacheMeter = {
    cacheMinutes: left === undefined ? null : Math.max(0, Math.ceil(left / MINUTE)),
    tokens,
    contextPercent: usage.context.percent ?? 0,
    limits: usage.rateLimits.map(limit => ({
      label: WINDOW_LABEL[limit.kind] ?? limit.kind,
      percent: limit.percentUsed,
      resetsInMs: limit.resetsAt === undefined ? null : Date.parse(limit.resetsAt) - now,
    })),
  }
  await update($, meter, () => next)

  const isLapsing = left !== undefined && left > 0 && left <= warnMs(life)
  const current = await read($, alert)
  if (isLapsing && warnedFor !== last) {
    warnedFor = last
    const raised: CacheAlert = { minutesLeft: Math.ceil(left / MINUTE), tokens }
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

// Compacts through /compact, the command the person would type: a press on $.session.compact()
// did nothing visible in the desktop app (03/10/2026). Says so when it fails; true once compacted.
const compactNow = async ($: EngineInterface) => {
  await update($, alert, () => null)
  await update($, isCompacting, () => true)
  try {
    await $.command.run({ command: 'compact' })

    return true
  } catch (error) {
    $.ui.toast(`Compactage impossible : ${error instanceof Error ? error.message : String(error)}`, { timeoutMs: 10000 })

    return false
  } finally {
    await update($, isCompacting, () => false)
  }
}

// What the first request after a pause says about the cache: read back means it outlived the
// pause, rewritten means it lapsed. A rewrite inside the lifetime is a rebuild worth flagging.
const observe = async ($: EngineInterface, gapMs: number, usage: ModelUsage) => {
  const readBack = usage.cache_read_input_tokens
  const written = usage.cache_creation_input_tokens
  const isRewrite = written > 20_000 && readBack < (readBack + written) / 10

  if (gapMs > 6 * MINUTE && gapMs < 60 * MINUTE) {
    const minutes = readBack > written ? 60 : isRewrite ? 5 : undefined
    if (minutes !== undefined) await $.store.set('observedTtl', { minutes, at: await $.clock.now() })
  }

  const life = await read($, ttl)
  if (isRewrite && !hasCompacted && gapMs < life.minutes * MINUTE) {
    $.ui.toast(`Cache reconstruit : ${kilo(written)} tokens réécrits (modèle, MCP ou mise à jour changés ?)`, {
      timeoutMs: 10000,
    })
  }
  hasCompacted = false
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
    const left = await msLeft($)
    const life = await read($, ttl)
    const tokens = (await $.session.usage()).context.tokens ?? 0
    const source = { observed: 'mesurée', overage: 'quota dépassé', assumed: 'supposée' }[life.source]
    const lifetime = `Durée du cache : ${life.minutes === 60 ? '1 h' : '5 min'} (${source}).`

    if (left === undefined) return { text: `Cache : aucun échange dans cette session. ${lifetime}` }

    return {
      text: left > 0
        ? `Cache chaud encore ${Math.ceil(left / MINUTE)} min. Contexte : ${kilo(tokens)} tokens. ${lifetime}`
        : `Cache froid : le prochain message réécrit ${kilo(tokens)} tokens. ${lifetime}`,
    }
  })

  // Each main-loop request renews the cache; the first after a pause tells its real lifetime.
  on('turn.step', async function* ($, e, next) {
    const before = await read($, lastAt)
    const startedAt = await $.clock.now()
    const result = yield* next(e)

    if (e.agentId === undefined && result.usage !== null) {
      if (e.index === 0 && before !== 0) await observe($, startedAt - before, result.usage).catch(() => undefined)
      await markWarm($)
    }

    return result
  })

  on('session.compact', async ($, e, next) => {
    hasCompacted = true

    return next(e)
  })

  // A typed prompt that would rewrite a large cold cache waits for a choice above the prompt.
  on('prompt.submit', async ($, e, next) => {
    if (bypassText !== null && e.text === bypassText) {
      bypassText = null

      return next(e)
    }
    const isTyped = e.origin.kind === 'composer' || e.origin.kind === 'sdk' || e.origin.kind === 'bridge'
    const left = await msLeft($)
    if (!isTyped || e.attachments !== undefined || e.text.startsWith('/') || left === undefined || left > 0) return next(e)

    const tokens = (await $.session.usage()).context.tokens ?? 0
    if (tokens < GUARD_TOKENS) return next(e)

    const waiting: CacheHeld = { text: e.text, tokens }
    await update($, held, () => waiting)

    return { drop: `Cache froid : ce message réécrirait ${kilo(tokens)} tokens. Choisis au-dessus du prompt.` }
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId !== undefined) return done

    const tokens = (await $.session.usage()).context.tokens ?? 0
    if (tokens > 0) await update($, history, readings => [...readings, tokens].slice(-HISTORY))

    const pending = await read($, handoff)
    if (pending?.status === 'pending') {
      const text = e.answer.trim()
      const ready: CacheHandoff = text === '' || e.isAborted ? null : { status: 'ready', text }
      await update($, handoff, () => ready)
    }

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const figures = await read($, meter)
    const current = await read($, alert)
    const passing = await read($, handoff)
    const waiting = await read($, held)
    const compacting = await read($, isCompacting)
    const life = await read($, ttl)
    const readings = await read($, history)
    if (e.props.hasSurvey || figures === null) return next(e)

    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    // The terminal has no Svg: its gauges fall back to the colored figure alone.
    const Svg = 'Svg' in elements ? elements.Svg : undefined
    const below = await next(e)
    const isIdle = !e.props.isWorking

    const divider = (key: string) =>
      Svg === undefined
        ? <Text key={key} dimColor>|</Text>
        : <Svg key={key} source={DIVIDER} alt="séparateur" width={1} height={16} />

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

    const lifetime = `TTL ${life.minutes === 60 ? '1 h' : '5 min'}${life.source === 'overage' ? ' (quota dépassé)' : ''}`
    const rewrite = `réécrira ${kilo(figures.tokens)}`
    const cache = figures.cacheMinutes === null
      ? metric('cache', 'Cache', 'en attente', 'calm', null, lifetime)
      : figures.cacheMinutes === 0
        ? metric('cache', 'Cache', 'froid', 'act', 0, rewrite)
        : metric(
            'cache',
            'Cache',
            `${figures.cacheMinutes} min`,
            cacheTone(figures.cacheMinutes, life.minutes),
            (figures.cacheMinutes / life.minutes) * 100,
            cacheTone(figures.cacheMinutes, life.minutes) === 'calm' ? lifetime : rewrite,
          )

    // Contexte: the forecast symbol, the gauge, the figure, then the last turns and what the last one added.
    const contextTone = usageTone(figures.contextPercent)
    const forecast = weather(figures.contextPercent)
    const delta = readings.length < 2 ? 0 : readings[readings.length - 1]! - readings[readings.length - 2]!
    const trend = delta > 0 ? `▲ +${kilo(delta)}` : delta < 0 ? `▼ ${kilo(-delta)}` : undefined
    const context = (
      <Box key="context" flexDirection="row" alignItems="center" gap={1}>
        <Text color={TONE[contextTone]} bold>{forecast.icon}</Text>
        <Text dimColor>Contexte</Text>
        {Svg !== undefined && (
          <Svg source={gauge(figures.contextPercent, contextTone)} alt={`Contexte ${figures.contextPercent} %, ${forecast.word}`} width={64} height={6} />
        )}
        <Text bold color={TONE[contextTone]}>{figures.contextPercent} %</Text>
        <Text dimColor>{kilo(figures.tokens)}</Text>
        {readings.length >= 2 && (Svg === undefined
          ? <Text color={TONE[contextTone]}>{blocks(readings)}</Text>
          : <Svg source={chart(readings, contextTone)} alt={`Contexte des ${readings.length} derniers tours`} width={readings.length * 4} height={14} />)}
        {trend !== undefined && <Text dimColor>{trend}</Text>}
      </Box>
    )

    const metrics = [
      cache,
      context,
      ...figures.limits.map(limit =>
        metric(
          `limit-${limit.label}`,
          limit.label,
          `${Math.round(limit.percent)} %`,
          usageTone(limit.percent),
          limit.percent,
          limit.resetsInMs === null ? undefined : `reset ${duration(limit.resetsInMs)}`,
        ),
      ),
    ]

    const actions = (
      <Box key="actions" flexDirection="row" alignItems="center" gap={1}>
        {isIdle && !compacting && (
          <Button
            key="compact-now"
            label="Compact"
            dimColor
            onPress={() => compactNow($)}
          />
        )}
        {isIdle && passing === null && (
          <Button
            key="handoff"
            label="Handoff"
            dimColor
            onPress={async () => {
              await update($, handoff, () => ({ status: 'pending' }))
              await $.command.run({ command: 'handoff' }).catch(async () => {
                await update($, handoff, () => null)
                $.ui.toast('Handoff impossible : la skill /handoff est introuvable.')
              })
            }}
          />
        )}
      </Box>
    )

    const send = async (text: string) => {
      bypassText = text
      await $.prompt.submit({ text })
    }

    return (
      <Box flexDirection="column" gap={1}>
        {compacting && (
          <Text bold color={TONE.accent}>
            Compactage en cours… Sur une longue conversation, ça peut prendre une minute.
          </Text>
        )}
        {waiting !== null && isIdle && (
          <Box flexDirection="column" gap={1}>
            <Text bold color={TONE.act}>
              Cache froid : ce message réécrira {kilo(waiting.tokens)} tokens. Compacter d'abord coûte moins sur la suite.
            </Text>
            <Box flexDirection="row" gap={1}>
              <Button
                key="held-compact"
                label="Compacter puis envoyer"
                variant="primary"
                onPress={async () => {
                  await update($, held, () => null)
                  if (await compactNow($)) await send(waiting.text)
                  else await $.prompt.fill({ text: waiting.text })
                }}
              />
              <Button
                key="held-send"
                label="Envoyer quand même"
                onPress={async () => {
                  await update($, held, () => null)
                  await send(waiting.text)
                }}
              />
              <Button
                key="held-cancel"
                label="Annuler"
                role="dismiss"
                onPress={async () => {
                  await update($, held, () => null)
                  await $.prompt.fill({ text: waiting.text })
                }}
              />
            </Box>
          </Box>
        )}
        {current !== null && isIdle && (
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
                onPress={() => compactNow($)}
              />
              <Button key="dismiss" label="Ignorer" role="dismiss" onPress={() => update($, alert, () => null)} />
            </Box>
          </Box>
        )}
        {passing?.status === 'ready' && isIdle && (
          <Box flexDirection="row" alignItems="center" gap={1}>
            <Text bold color={TONE.accent}>Passation prête.</Text>
            <Text dimColor>Repartir d'une conversation vierge avec ce document ?</Text>
            <Button
              key="resume"
              label="Clear et reprendre"
              variant="primary"
              onPress={async () => {
                const text = passing.text
                await update($, handoff, () => null)
                await $.command.run({ command: 'clear' })
                await update($, lastAt, () => 0)
                await $.prompt.submit({ text: `${RESUME}${text}` })
              }}
            />
            <Button key="keep" label="Rester ici" role="dismiss" onPress={() => update($, handoff, () => null)} />
          </Box>
        )}
        <Box flexDirection="row" flexWrap="wrap" alignItems="center" columnGap={2}>
          {metrics.flatMap((one, index) => (index === 0 ? [one] : [divider(`divider-${index}`), one]))}
          <Box flexGrow={1} />
          {actions}
        </Box>
        {below}
      </Box>
    )
  })
}
