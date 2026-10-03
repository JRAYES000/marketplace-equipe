import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const steps = atom({ plugin: 'next-steps', key: 'steps' } as const, [])
const isEnabled = atom({ plugin: 'next-steps', key: 'isEnabled' } as const, true)
const isLoading = atom({ plugin: 'next-steps', key: 'isLoading' } as const, false)

const ACCENT = '#D97757'

// Lucide's corner-down-right, stroked in the accent: reads as "what comes next".
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${ACCENT}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 10 20 15 15 20"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/></svg>`

const ASK = `Propose exactement 3 prochaines étapes concrètes pour faire avancer ce travail, \
formulées comme des consignes que l'utilisateur t'enverrait (en français, 80 caractères maximum chacune). \
Réponds uniquement par un tableau JSON de 3 chaînes, sans aucun autre texte.`

const parse = (text: string): string[] => {
  const match = text.match(/\[[\s\S]*\]/)
  if (match === null) return []
  try {
    const list = JSON.parse(match[0]) as unknown

    return Array.isArray(list) ? list.filter((one): one is string => typeof one === 'string').slice(0, 3) : []
  } catch {
    return []
  }
}

const PICK = /^\s*[1-9](\s*(,|;|\+|&|et)\s*[1-9])*\s*\.?\s*$/i

const pick = (text: string, list: string[]): string[] => {
  if (list.length === 0 || !PICK.test(text)) return []
  const numbers = [...new Set(text.match(/[1-9]/g) ?? [])].map(Number)
  if (numbers.some(n => n > list.length)) return []

  return numbers.map(n => list[n - 1]!)
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'next-steps',
      description: 'Active ou coupe les prochaines étapes proposées (on | off)',
    })
    const stored = await $.store.get('isEnabled')
    if (typeof stored === 'boolean') await update($, isEnabled, () => stored)

    return next(e)
  })

  on('command.run', { command: 'next-steps' }, async ($, e) => {
    const isOn = !/off/i.test(e.args ?? '')
    await update($, isEnabled, () => isOn)
    await $.store.set('isEnabled', isOn)
    if (!isOn) await update($, steps, () => [])

    return { text: isOn ? 'Prochaines étapes activées.' : 'Prochaines étapes coupées.' }
  })

  // "1", "1 et 3", "2, 3" or "1+2" typed while suggestions show sends those suggestions.
  on('prompt.submit', async ($, e, next) => {
    const list = await read($, steps)
    await update($, steps, () => [])
    const picked = pick(e.text, list)
    if (picked.length === 0) return next(e)

    const text = picked.length === 1
      ? picked[0]!
      : `Fais ces étapes dans l'ordre :\n${picked.map((step, index) => `${index + 1}. ${step}`).join('\n')}`

    return next({ ...e, text })
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const isMainAnswer = e.agentId === undefined && !e.isAborted && e.reason === 'answer'
    if (!isMainAnswer || !(await read($, isEnabled))) return done

    // Outside the dispatch, so the turn ends at once.
    $.clock.after(1, async () => {
      await update($, isLoading, () => true)
      try {
        const reply = await $.model.fork({ prompt: ASK })
        if (reply.isAnswered) await update($, steps, () => parse(reply.text))
      } finally {
        await update($, isLoading, () => false)
      }
    })

    return done
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, steps)
    const isThinking = await read($, isLoading)
    if (e.props.hasSurvey || e.props.isWorking || (list.length === 0 && !isThinking)) return next(e)

    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    const Svg = 'Svg' in elements ? elements.Svg : undefined
    const below = await next(e)

    const header = (
      <Box key="header" flexDirection="row" alignItems="center" gap={1}>
        {Svg !== undefined && <Svg source={ICON} alt="Suite" width={14} height={14} />}
        <Text bold color={ACCENT}>
          Prochaines étapes
        </Text>
        <Text dimColor>{isThinking ? 'en préparation…' : 'clic, touche 1 à 3, ou tape « 1 et 2 »'}</Text>
        <Box flexGrow={1} />
        {!isThinking && (
          <Button key="dismiss" label="Ignorer" role="dismiss" dimColor onPress={() => update($, steps, () => [])} />
        )}
      </Box>
    )

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="column">
          {header}
          {list.map((step, index) => (
            <Button
              key={`step-${index}`}
              label={step}
              hotkey={String(index + 1)}
              plain
              onPress={async () => {
                await update($, steps, () => [])
                void $.prompt.submit({ text: step })
              }}
            />
          ))}
        </Box>
        {below}
      </Box>
    )
  })
}
