import test from 'node:test'
import assert from 'node:assert/strict'
import { createAcadSync } from './acad-sync-engine.js'

test('loads the complete server document without dropping original openGym fields', async () => {
  const engine = createAcadSync({
    readProfile: async id => ({ revision: 7, state: { workouts: [{ id: id + '-one' }], routines: [{ id: 'A' }], lang: 'pt-BR' } }),
    writeProfile: async () => ({ revision: 8 }),
  })
  const state = await engine.activate('rafael')
  assert.equal(state.workouts[0].id, 'rafael-one')
  assert.equal(state.routines[0].id, 'A')
  assert.equal(state.lang, 'pt-BR')
  assert.deepEqual(engine.status(), { profileId: 'rafael', revision: 7, blocked: false })
})
test('serializes writes using increasing D1 revisions', async () => {
  const writes = []
  const engine = createAcadSync({
    readProfile: async () => ({ revision: 2, state: {} }),
    writeProfile: async (id, state, revision) => {
      writes.push({ id, state, revision })
      await Promise.resolve()
      return { revision: revision + 1 }
    },
  })
  await engine.activate('mae')
  await Promise.all([engine.save({ workouts: [1] }), engine.save({ workouts: [1, 2] })])
  assert.deepEqual(writes.map(x => x.revision), [2, 3])
  assert.ok(writes.every(x => x.id === 'mae'))
})
test('never overwrites after a revision conflict', async () => {
  let writes = 0
  const engine = createAcadSync({
    readProfile: async () => ({ revision: 0, state: {} }),
    writeProfile: async () => { writes++; throw Object.assign(new Error('conflict'), { status: 409 }) },
  })
  await engine.activate('rafael')
  await assert.rejects(engine.save({ workouts: [1] }))
  assert.equal(engine.status().blocked, true)
  await assert.rejects(engine.save({ workouts: [2] }))
  assert.equal(writes, 1)
})
test('rejects saving before profile activation', async () => {
  const engine = createAcadSync({ readProfile: async () => {}, writeProfile: async () => {} })
  await assert.rejects(engine.save({}), /Selecione um perfil/)
})
