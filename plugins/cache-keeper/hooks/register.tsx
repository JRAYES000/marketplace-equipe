import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { CacheAlert } from '../types'

// Prompt cache lifetime of these sessions (1 h); the alert fires this long before it lapses.
const TTL_MS = 60 * 60 * 1000
const WARN_MS = 5 * 60 * 1000
const TICK_MS = 30 * 1000

const lastAt = atom({ plugin: 'cache-keeper', key: 'lastAt' } as const, 0)
const alert = atom({ plugin: 'cache-keeper', key: 'alert' } as const, null)

// The lastAt an alert was raised for: one alert per warm period, a dismissal stays dismissed.
let warnedFor = -1

const kilo = (tokens: number) => `${Math.round(tokens / 1000)}k`

const WINDOW_LABEL: Record<string, string> = { five_hour: '5 h', seven_day: '7 j' }

const refresh = async ($: EngineInterface) => {
  const usage = await $.session.usage()
  const last = await read($, lastAt)
  const now = await $.clock.now()
  const left = last === 0 ? undefined : TTL_MS - (now - last)
  const tokens = usage.context.tokens ?? 0

  const parts: string[] = []
  if (left !== undefined) parts.push(left > 0 ? `cache ${Math.ceil(left / 60000)} min` : 'cache froid')
  parts.push(`contexte ${kilo(tokens)} (${usage.context.percent ?? 0} %)`)
  for (const limit of usage.rateLimits) {
    parts.push(`${WINDOW_LABEL[limit.kind] ?? limit.kind} ${Math.round(limit.percentUsed)} %`)
  }
  if (usage.cost !== undefined) parts.push(`${usage.cost.usd.toFixed(2).replace('.', ',')} $ API`)
  $.ui.status(parts.join(' · '))

  const isLapsing = left !== undefined && left > 0 && left <= WARN_MS
  const current = await read($, alert)
  if (isLapsing && warnedFor !== last) {
    warnedFor = last
    const next: CacheAlert = { minutesLeft: Math.ceil(left / 60000), tokens }
    await update($, alert, () => next)
    $.ui.toast(`Cache froid dans ${next.minutesLeft} min : ${kilo(tokens)} tokens à réécrire`, { timeoutMs: 10000 })
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
    const current = await read($, alert)
    if (e.props.hasSurvey || e.props.isWorking || current === null) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const below = await next(e)

    return (
      <Box flexDirection="column">
        <Text bold>
          Cache froid dans {current.minutesLeft} min : {kilo(current.tokens)} tokens à réécrire au prochain message.
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
        {below}
      </Box>
    )
  })
}
