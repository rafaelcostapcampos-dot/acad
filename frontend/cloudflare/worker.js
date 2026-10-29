// ACAD D1 API (experimental, server-to-server only).
// DO NOT expose API credentials to browser JavaScript. Browser sync requires a
// separate authentication strategy before this API can be used by the frontend.
const response = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
})
const encoder = new TextEncoder()
const equalTokens = (actual, expected) => {
  const a = encoder.encode(actual)
  const b = encoder.encode(expected)
  let diff = a.length ^ b.length
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] || 0) ^ (b[i] || 0)
  return diff === 0
}
const allowed = (req, env) => {
  const secret = env.ACAD_API_TOKEN
  const auth = req.headers.get('authorization') || ''
  return typeof secret === 'string' && secret.length >= 32 &&
    auth.startsWith('Bearer ') && equalTokens(auth.slice(7), secret)
}
// A device pairs once with a private access phrase. Cookies are signed server-side;
// the phrase and signing key must be configured as Worker secrets, never in source.
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromBase64url = input => Uint8Array.from(atob(input.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
async function hmac(message, secret) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))))
}
const cookie = (req, name) => (req.headers.get('cookie') || '').split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1)
const sessionKey = env => typeof env.ACAD_SESSION_KEY === 'string' && env.ACAD_SESSION_KEY.length >= 32 ? env.ACAD_SESSION_KEY : null
async function sessionValid(request, env) {
  const key = sessionKey(env)
  const value = cookie(request, 'acad_session')
  if (!key || !value) return false
  const [expires, signature, ...extra] = value.split('.')
  if (extra.length || !/^\d{10,13}$/.test(expires) || Number(expires) <= Date.now()) return false
  const expected = await hmac('acad-session-v1.' + expires, key)
  return equalTokens(signature || '', expected)
}
const isSameOrigin = req => req.headers.get('origin') === new URL(req.url).origin
async function sessionApi(request, env) {
  if (request.method === 'GET') return response({ authorized: await sessionValid(request, env) })
  if (request.method !== 'POST' || !isSameOrigin(request)) return response({ error: 'Forbidden' }, 403)
  if (!sessionKey(env) || typeof env.ACAD_ACCESS_CODE !== 'string' || env.ACAD_ACCESS_CODE.length < 16)
    return response({ error: 'Pairing not configured' }, 503)
  // Access phrase should be long and random. Do not use 4- or 6-digit PINs.
  let input
  try { input = await request.json() } catch { return response({ error: 'Invalid JSON' }, 400) }
  if (typeof input?.code !== 'string' || !equalTokens(input.code, env.ACAD_ACCESS_CODE))
    return response({ error: 'Invalid access phrase' }, 401)
  const expires = String(Date.now() + 30 * 24 * 60 * 60 * 1000)
  const signature = await hmac('acad-session-v1.' + expires, sessionKey(env))
  return response({ authorized: true }, 200, { 'set-cookie': 'acad_session=' + expires + '.' + signature + '; Path=/acad-api; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict' })
}

const endpoint = /^\/acad-api\/profiles\/(rafael|mae)$/
async function profileApi(request, env, pathname) {
  // Both reads and writes fail closed until a secure credential is provisioned.
  if (!allowed(request, env) && !(await sessionValid(request, env))) return response({ error: 'Unauthorized' }, 401)
  if (request.method === 'PUT' && !allowed(request, env) && !isSameOrigin(request)) return response({ error: 'Forbidden' }, 403)
  if (!env.DB) return response({ error: 'Database unavailable' }, 503)
  const match = pathname.match(endpoint)
  if (!match) return response({ error: 'Unknown endpoint' }, 404)
  const id = match[1]
  if (request.method === 'GET') {
    const row = await env.DB.prepare(
      'SELECT id, name, state_json, revision, updated_at FROM profiles WHERE id = ?'
    ).bind(id).first()
    if (!row) return response({ error: 'Profile not found' }, 404)
    return response({ id: row.id, name: row.name, state: JSON.parse(row.state_json),
      revision: row.revision, updatedAt: row.updated_at })
  }
  if (request.method !== 'PUT') return response({ error: 'Method not allowed' }, 405, { allow: 'GET, PUT' })
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return response({ error: 'JSON required' }, 415)
  const length = Number(request.headers.get('content-length') || 0)
  if (length > 500000) return response({ error: 'Document too large' }, 413)
  let body
  try { body = await request.json() } catch { return response({ error: 'Invalid JSON' }, 400) }
  if (!body || !Number.isSafeInteger(body.baseRevision) || body.baseRevision < 0 ||
    !body.state || typeof body.state !== 'object' || Array.isArray(body.state))
    return response({ error: 'Invalid revision or state' }, 400)
  const state = JSON.stringify(body.state)
  if (encoder.encode(state).length > 500000) return response({ error: 'Document too large' }, 413)
  const result = await env.DB.prepare(
    'UPDATE profiles SET state_json = ?, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND revision = ?'
  ).bind(state, id, body.baseRevision).run()
  if (result.meta.changes !== 1) return response({ error: 'Revision conflict' }, 409)
  return response({ ok: true, revision: body.baseRevision + 1 })
}
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname
    if (!pathname.startsWith('/acad-api/')) return env.ASSETS.fetch(request)
    try {
      if (pathname === '/acad-api/session') return await sessionApi(request, env)
      return await profileApi(request, env, pathname)
    }
    catch (e) {
      console.error('ACAD API failure', e?.message || 'unknown')
      return response({ error: 'Internal error' }, 500)
    }
  },
}
