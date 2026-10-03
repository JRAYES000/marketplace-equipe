import type { EngineInterface, Register } from 'claude-code'

// Shared by every session on this machine: a JSON ledger of who edited what.
const WINDOW_MS = 30 * 60 * 1000
// A file's clock and ours can differ by a hair; a write this close to ours is ours.
const SLACK_MS = 2000
const PROCEED = 'Continuer'
const WORKTREE = 'Passer en worktree'
const CANCEL = 'Annuler'

type Entry = { session: string; at: number }
type Ledger = Record<string, Entry>

// This session's shell runs: a file they touched changes its date without passing Edit or Write.
const shellRuns: { from: number; to: number }[] = []

const ledgerPath = async ($: EngineInterface) => {
  const home = (await $.env.get('USERPROFILE')) ?? (await $.env.get('HOME')) ?? '.'

  return `${home.replace(/\\/g, '/')}/.claude/collision-guard/ledger.json`
}

const readLedger = async ($: EngineInterface): Promise<Ledger> => {
  try {
    return JSON.parse(await $.fs.read(await ledgerPath($))) as Ledger
  } catch {
    return {}
  }
}

const writeEntry = async ($: EngineInterface, key: string, entry: Entry) => {
  const ledger = await readLedger($)
  const fresh: Ledger = {}
  for (const [path, one] of Object.entries(ledger)) {
    if (entry.at - one.at < WINDOW_MS) fresh[path] = one
  }
  fresh[key] = entry
  await $.fs.write(await ledgerPath($), JSON.stringify(fresh))
}

// One spelling per file: resolved when it exists, slashes forward, lowercase (Windows).
const keyOf = async ($: EngineInterface, path: string) => {
  const stat = await $.fs.stat(path, { resolve: true }).catch(() => undefined)

  return (stat?.realPath ?? path).replace(/\\/g, '/').toLowerCase()
}

const ago = (ms: number) => {
  const minutes = Math.floor(ms / 60000)

  return minutes < 1 ? "à l'instant" : `il y a ${minutes} min`
}

// Who changed the file last, when it was not this session: another session through its own
// Edit or Write (the ledger), else anyone through the file's date (a shell, an editor, a person).
const otherChange = async ($: EngineInterface, path: string, key: string, session: string, now: number) => {
  const entry = (await readLedger($))[key]
  if (entry !== undefined && entry.session !== session && now - entry.at < WINDOW_MS) {
    return { at: entry.at, by: 'une autre session' }
  }

  const stat = await $.fs.stat(path).catch(() => undefined)
  if (stat === undefined || stat.kind !== 'file' || now - stat.mtimeMs >= WINDOW_MS) return undefined
  const isOurEdit = entry !== undefined && entry.session === session && stat.mtimeMs <= entry.at + SLACK_MS
  const isOurShell = shellRuns.some(run => stat.mtimeMs >= run.from - SLACK_MS && stat.mtimeMs <= run.to + SLACK_MS)

  return isOurEdit || isOurShell ? undefined : { at: stat.mtimeMs, by: 'hors de cette conversation (autre session, commande ou édition à la main)' }
}

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    if (e.tool === 'Bash' || e.tool === 'PowerShell') {
      const from = await $.clock.now()
      const ran = await next(e)
      const to = await $.clock.now()
      shellRuns.push({ from, to })
      while (shellRuns.length > 0 && to - shellRuns[0]!.to > WINDOW_MS) shellRuns.shift()

      return ran
    }

    const target = e.tool === 'NotebookEdit' ? e.notebook_path : e.tool === 'Edit' || e.tool === 'Write' ? e.file_path : undefined
    if (typeof target !== 'string') return next(e)
    const path: string = target

    const key = await keyOf($, path)
    const session = await $.session.id()
    const now = await $.clock.now()
    const other = await otherChange($, path, key, session, now)

    if (other !== undefined && (await $.session.surfaces()).length > 0) {
      const name = path.replace(/\\/g, '/').split('/').at(-1)
      const when = ago(now - other.at)
      const choice = await $.ui
        .ask(`${name} a été modifié ${when}, ${other.by}. Que faire ?`, {
          header: 'Collision',
          options: [PROCEED, WORKTREE, CANCEL],
        })
        .catch(() => CANCEL)

      if (choice === WORKTREE) {
        return {
          deny: `${$.plugin.name}: ${path} a été modifié ${when}, ${other.by}. L'utilisateur veut isoler ce travail : passe dans un worktree (EnterWorktree), puis refais la modification là-bas.`,
        }
      }
      if (choice === CANCEL) {
        return {
          deny: `${$.plugin.name}: ${path} a été modifié ${when}, ${other.by}. L'utilisateur a annulé cette modification ; relis le fichier et demande-lui comment continuer.`,
        }
      }
      if (choice !== PROCEED) {
        return {
          deny: `${$.plugin.name}: ${path} a été modifié ${when}, ${other.by}. Modification suspendue. Consigne de l'utilisateur : ${choice}`,
        }
      }
    }

    const ran = await next(e)
    if (ran.deny === undefined && ran.isError !== true) {
      await writeEntry($, key, { session, at: await $.clock.now() }).catch(() => undefined)
    }

    return ran
  })
}
