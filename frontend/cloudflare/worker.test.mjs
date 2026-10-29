import test from 'node:test'
import assert from 'node:assert/strict'
import worker from './worker.js'

const secret = 'acad-test-only-secret-never-use-in-production'
const initial = {
  rafael: { id: 'rafael', name: 'Meu perfil', state_json: '{}', revision: 0, updated_at: '' },
  mae: { id: 'mae', name: 'Perfil da minha mãe', state_json: '{}', revision: 0, updated_at: '' },
}
function fixture(hasToken = true) {
  const rows = structuredClone(initial)
  let queries = 0
  const env = {
    ASSETS: { fetch: async () => new Response('site') },
    ...(hasToken ? { ACAD_API_TOKEN: secret } : {}),
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async first() {
                queries++
                assert.match(sql, /^SELECT /)
                return structuredClone(rows[args[0]] || null)
              },
              async run() {
                queries++
                assert.match(sql, /^UPDATE /)
                const [state, id, expected] = args
                if (!rows[id] || rows[id].revision !== expected) return { meta: { changes: 0 } }
                rows[id].state_json = state
                rows[id].revision++
                return { meta: { changes: 1 } }
              },
            }
          },
        }
      },
    },
  }
  const fetch = (path, method = 'GET', payload, authorized = true) => {
    const headers = authorized ? { Authorization: 'Bearer ' + secret } : {}
    if (payload !== undefined) headers['Content-Type'] = 'application/json'
    return worker.fetch(new Request('https://example.test' + path, {
      method, headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    }), env)
  }
  return { fetch, rows, queries: () => queries }
}

test('static site continues to load', async () => {
  const f = fixture()
  const res = await f.fetch('/')
  assert.equal(res.status, 200)
  assert.equal(await res.text(), 'site')
})
test('read and write reject missing authorization without touching D1', async () => {
  const f = fixture()
  assert.equal((await f.fetch('/acad-api/profiles/rafael', 'GET', undefined, false)).status, 401)
  assert.equal((await f.fetch('/acad-api/profiles/mae', 'PUT', { baseRevision: 0, state: {} }, false)).status, 401)
  assert.equal(f.queries(), 0)
})
test('missing server secret fails closed', async () => {
  const f = fixture(false)
  assert.equal((await f.fetch('/acad-api/profiles/rafael')).status, 401)
  assert.equal(f.queries(), 0)
})
test('profiles read and write independently with increasing revisions', async () => {
  const f = fixture()
  const before = await (await f.fetch('/acad-api/profiles/rafael')).json()
  assert.equal(before.revision, 0)
  const saved = await f.fetch('/acad-api/profiles/rafael', 'PUT',
    { baseRevision: 0, state: { workouts: [{ id: 'test-workout' }] } })
  assert.equal(saved.status, 200)
  assert.equal((await saved.json()).revision, 1)
  const after = await (await f.fetch('/acad-api/profiles/rafael')).json()
  assert.equal(after.state.workouts[0].id, 'test-workout')
  assert.equal(after.revision, 1)
  const other = await (await f.fetch('/acad-api/profiles/mae')).json()
  assert.deepEqual(other.state, {})
  assert.equal(other.revision, 0)
})
test('rejects stale writes instead of overwriting', async () => {
  const f = fixture()
  assert.equal((await f.fetch('/acad-api/profiles/rafael', 'PUT',
    { baseRevision: 0, state: { workouts: [1] } })).status, 200)
  const stale = await f.fetch('/acad-api/profiles/rafael', 'PUT',
    { baseRevision: 0, state: { workouts: [2] } })
  assert.equal(stale.status, 409)
  assert.deepEqual(JSON.parse(f.rows.rafael.state_json).workouts, [1])
})
test('unknown profiles cannot be accessed', async () => {
  const f = fixture()
  assert.equal((await f.fetch('/acad-api/profiles/terceiro')).status, 404)
})
