import test from 'node:test'
import assert from 'node:assert/strict'
import worker from './worker.js'

const makeEnv = () => ({
  ASSETS: { fetch: async () => new Response('site') },
  DB: { prepare: () => { throw Error('Database must not be accessed without authorization') } },
})
const call = (path, headers) => worker.fetch(new Request('https://example.test' + path, { headers }), makeEnv())

test('static site still works without API credentials', async () => {
  const response = await call('/')
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'site')
})
test('profile reads fail closed without a configured secret', async () => {
  const response = await call('/acad-api/profiles/rafael')
  assert.equal(response.status, 401)
})
test('profile writes fail closed without a configured secret', async () => {
  const response = await worker.fetch(new Request('https://example.test/acad-api/profiles/mae', {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ baseRevision: 0, state: {} }),
  }), makeEnv())
  assert.equal(response.status, 401)
})
