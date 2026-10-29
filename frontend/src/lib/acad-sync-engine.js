// Cloud synchronization coordinator for the *original* openGym document format.
// It does not replace any openGym UI or modify the guest store.
// A caller must explicitly activate a profile and feed saved snapshots.
// Conflicts are never overwritten: the caller must refresh/reconcile.
export function createAcadSync({ readProfile, writeProfile }) {
  let active = null
  let revision = null
  let inflight = Promise.resolve()
  let blocked = false
  let generation = 0
  const valid = id => id === 'rafael' || id === 'mae'

  async function activate(profileId) {
    if (!valid(profileId)) throw new Error('Perfil inválido')
    const gen = ++generation
    active = null
    revision = null
    blocked = false
    const remote = await readProfile(profileId)
    if (generation !== gen) throw new Error('Perfil alterado durante carregamento')
    if (!Number.isSafeInteger(remote.revision) || remote.revision < 0)
      throw new Error('Revisão inesperada do servidor')
    active = profileId
    revision = remote.revision
    // Preserve all original openGym fields. Do not silently migrate demo data.
    return structuredClone(remote.state || {})
  }

  function save(state) {
    if (!active) return Promise.reject(new Error('Selecione um perfil antes de salvar'))
    if (blocked) return Promise.reject(new Error('Sincronização bloqueada; atualize o perfil'))
    const id = active
    const gen = generation
    const snapshot = structuredClone(state)
    // Serialized writes: a second update never races the first with the same revision.
    const job = inflight.catch(() => {}).then(async () => {
      if (generation !== gen || active !== id) throw new Error('Perfil alterado durante gravação')
      if (blocked) throw new Error('Conflito pendente; nenhuma gravação foi realizada')
      try {
        const result = await writeProfile(id, snapshot, revision)
        if (generation !== gen || active !== id) throw new Error('Perfil alterado durante gravação')
        revision = result.revision
        return revision
      } catch (error) {
        if (error.status === 409 && generation === gen) blocked = true
        throw error
      }
    })
    inflight = job
    return job
  }

  function status() {
    return { profileId: active, revision, blocked }
  }
  function deactivate() {
    generation++
    active = null
    revision = null
    blocked = false
  }
  return { activate, save, status, deactivate }
}
