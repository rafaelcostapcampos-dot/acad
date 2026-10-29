import { useEffect, useState } from 'react'
import { acadProfile, acadSaveProfile } from '../lib/acad-profile-api.js'
const profiles = { rafael: 'Meu perfil', mae: 'Perfil da minha mãe' }
export default function AcadWorkouts({ profileId, onBack }) {
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('')
  const [sets, setSets] = useState('3')
  const [reps, setReps] = useState('10')
  const [weight, setWeight] = useState('')
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'))
  const refresh = async () => {
    setBusy(true)
    try { setRecord(await acadProfile(profileId)); setError('') }
    catch (e) { setError('Erro de leitura: ' + e.message) }
    finally { setBusy(false) }
  }
  useEffect(() => { setRecord(null); refresh() }, [profileId])
  const save = async e => {
    e.preventDefault()
    if (busy || !record) return
    const exercise = name.trim()
    const nSets = Number(sets), nReps = Number(reps), kg = Number(weight)
    if (!exercise || exercise.length > 100 || !Number.isInteger(nSets) || nSets < 1 || nSets > 100 ||
        !Number.isInteger(nReps) || nReps < 1 || nReps > 500 || weight.trim() && (!Number.isFinite(kg) || kg < 0 || kg > 1000) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Confira exercício, data, séries, repetições e carga.'); return }
    const entry = { id: crypto.randomUUID(), date, exercise, sets: nSets, reps: nReps,
      weightKg: weight.trim() ? kg : null, createdAt: new Date().toISOString() }
    const state = record.state || {}
    const records = Array.isArray(state.acadEntries) ? state.acadEntries : []
    const newState = { ...state, acadEntries: [...records, entry] }
    setBusy(true)
    try {
      const saved = await acadSaveProfile(profileId, newState, record.revision)
      setRecord({ ...record, state: newState, revision: saved.revision })
      setName(''); setError('')
    } catch (e) {
      if (e.status === 409) setError('Outro aparelho alterou este perfil. Atualize os dados antes de tentar novamente; nenhum treino foi sobrescrito.')
      else setError('Não foi possível salvar: ' + e.message)
    } finally { setBusy(false) }
  }
  const records = Array.isArray(record?.state?.acadEntries) ? record.state.acadEntries : []
  return <div className="narrow" style={{ padding: '24px 0 80px' }}>
    <button className="btn" onClick={onBack}>Voltar aos perfis</button>
    <h1 style={{ marginTop: 16 }}>Mãe maromba!</h1>
    <h2>{profiles[profileId]}</h2>
    <p className="muted small">Registro inicial na nuvem — não importa automaticamente treinos da demonstração ou do openGym.</p>
    {error && <p role="alert" style={{ color: 'var(--danger, #e35)' }}>{error}</p>}
    {!record ? <p>{busy ? 'Carregando dados do D1...' : 'Não foi possível carregar o perfil.'}</p> : <>
      <form className="card" onSubmit={save} style={{ display: 'grid', gap: 12, padding: 18 }}>
        <h3>Novo exercício</h3>
        <label>Data <input className="input" type="date" required value={date} onChange={e => setDate(e.target.value)} /></label>
        <label>Exercício <input className="input" required maxLength={100} placeholder="Ex.: Supino reto" value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Séries <input className="input" type="number" min="1" max="100" required value={sets} onChange={e => setSets(e.target.value)} /></label>
        <label>Repetições por série <input className="input" type="number" min="1" max="500" required value={reps} onChange={e => setReps(e.target.value)} /></label>
        <label>Carga (kg, opcional) <input className="input" type="number" min="0" max="1000" step="0.5" value={weight} onChange={e => setWeight(e.target.value)} /></label>
        <button className="btn primary" type="submit" disabled={busy}>{busy ? 'Salvando...' : 'Salvar no D1'}</button>
      </form>
      <div className="card" style={{ padding: 18, marginTop: 16 }}>
        <h3>Histórico ({records.length})</h3>
        <button className="btn" onClick={refresh} disabled={busy}>Atualizar do servidor</button>
        {records.length === 0 ? <p className="muted">Nenhum exercício registrado ainda.</p> :
          [...records].reverse().map(e => <p key={e.id} style={{ borderBottom: '1px solid var(--border, #555)', padding: '10px 0' }}>
            <strong>{e.exercise}</strong> — {e.date}<br />
            {e.sets} × {e.reps}{e.weightKg != null ? ' · ' + e.weightKg + ' kg' : ''}
          </p>)}
        <p className="muted small">Revisão do D1: {record.revision}. Em caso de conflito, seus dados antigos são preservados.</p>
      </div>
    </>}
  </div>
}
