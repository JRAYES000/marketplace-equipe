import type { EngineInterface, Register } from 'claude-code'

// Shared by every session on this machine: a JSON ledger of who edited what.
const WINDOW_MS = 30 * 60 * 1000
const PROCEED = 'Continuer'
const WORKTREE = 'Passer en worktree'
const CANCEL = 'Annuler'

type Entry = { session: string; at: number }
type Ledger = Record<string, Entry>

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

export const register: Register = on => {
  on('tool.call', async ($, e, next) => {
    const path = e.tool === 'NotebookEdit' ? e.notebook_path : e.tool === 'Edit' || e.tool === 'Write' ? e.file_path : undefined
    if (path === undefined) return next(e)

    const key = await keyOf($, path)
    const session = await $.session.id()
    const now = await $.clock.now()
    const other = (await readLedger($))[key]
    const isCollision = other !== undefined && other.session !== session && now - other.at < WINDOW_MS

    if (isCollision && (await $.session.surfaces()).length > 0) {
      const name = path.replace(/\\/g, '/').split('/').at(-1)
      const choice = await $.ui
        .ask(`Une autre session a modifié ${name} ${ago(now - other.at)}. Que faire ?`, {
          header: 'Collision',
          options: [PROCEED, WORKTREE, CANCEL],
        })
        .catch(() => CANCEL)

      if (choice === WORKTREE) {
        return {
          deny: `${$.plugin.name}: ${path} a été modifié par une autre session ${ago(now - other.at)}. L'utilisateur veut isoler ce travail : passe dans un worktree (EnterWorktree), puis refais la modification là-bas.`,
        }
      }
      if (choice === CANCEL) {
        return {
          deny: `${$.plugin.name}: ${path} a été modifié par une autre session ${ago(now - other.at)}. L'utilisateur a annulé cette modification ; demande-lui comment continuer.`,
        }
      }
      if (choice !== PROCEED) {
        return {
          deny: `${$.plugin.name}: ${path} a été modifié par une autre session ${ago(now - other.at)}. Modification suspendue. Consigne de l'utilisateur : ${choice}`,
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
