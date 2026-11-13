import type { Register } from 'claude-code'

const LIMIT = 99 // percent of a window treated as "full"; lower it for a safety margin
const KEY = 'pausedUntil'

export const register: Register = on => {
  const until = async ($: any): Promise<number> => {
    const t = Number((await $.store.get(KEY)) ?? 0)
    return Number.isFinite(t) && t > (await $.clock.now()) ? t : 0
  }

  const show = ($: any, t: number) =>
    $.ui.status(t ? `⏸ usage full, resumes ${new Date(t).toLocaleTimeString()}` : undefined)

  // Every response reports the windows; a full one arms the pause until its reset.
  on('session.measure', async ($, e, next) => {
    const full = e.rateLimits.filter(r => r.percentUsed >= LIMIT && r.resetsAt)
    if (full.length) {
      const ts = full.map(r => Date.parse(r.resetsAt!)).filter(Number.isFinite)
      // unparseable reset time: fail closed, pause an hour and re-check
      const t = ts.length ? Math.max(...ts) : (await $.clock.now()) + 3_600_000
      await $.store.set(KEY, t)
      show($, t)
      $.ui.toast(`Usage full: agents paused until ${new Date(t).toLocaleTimeString()}`)
    }
    return next(e)
  })

  // The gate: no model request leaves while paused, so nothing is billed.
  on('http.fetch', async ($, e, next) => {
    // only the engine's own model requests are gated (gateways keep the /v1/messages path)
    let path = ''
    try { path = new URL(e.url).pathname } catch { /* unparseable: not a model URL */ }
    if (next.origin.plugin !== 'engine' || !path.includes('/v1/messages')) return next(e)
    const t = await until($)
    show($, t)
    return t ? { deny: `usage-pause: usage window full until ${new Date(t).toLocaleString()}` } : next(e)
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'usage-pause: gate error, blocking to avoid spend' }))
}
