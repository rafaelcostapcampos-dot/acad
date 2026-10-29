// ACAD profile transport, independent of the original openGym store.
// Keeps server revision explicit so the caller can handle HTTP 409 by merging,
// never silently overwrite another device's edits.
const BASE = '/acad-api'
async function jsonResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(payload.error || 'Falha ao acessar o servidor')
    error.status = response.status
    error.code = response.status === 409 ? 'REVISION_CONFLICT' : 'REQUEST_FAILED'
    throw error
  }
  return payload
}
export const acadSession = async () => jsonResponse(await fetch(BASE + '/session', {
  credentials: 'same-origin', cache: 'no-store',
}))
export const acadProfile = async id => {
  if (!['rafael', 'mae'].includes(id)) throw new Error('Perfil inválido')
  return jsonResponse(await fetch(BASE + '/profiles/' + id, {
    credentials: 'same-origin', cache: 'no-store',
  }))
}
export const acadSaveProfile = async (id, state, baseRevision) => {
  if (!['rafael', 'mae'].includes(id)) throw new Error('Perfil inválido')
  if (!Number.isSafeInteger(baseRevision) || baseRevision < 0) throw new Error('Revisão inválida')
  return jsonResponse(await fetch(BASE + '/profiles/' + id, {
    credentials: 'same-origin', method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state, baseRevision }),
  }))
}
