import { useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../state';

export function SettingsPage() {
  const { user, refresh } = useAuth();
  const [responseTimeMs, setRt] = useState(user?.settings.responseTimeMs ?? 1000);
  const [maxPlayTimeMs, setMt] = useState(user?.settings.maxPlayTimeMs ?? 10000);
  const [defaultManches, setDm] = useState(user?.settings.defaultManches ?? 2);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await apiFetch('/settings', { method: 'PUT', body: JSON.stringify({ responseTimeMs, maxPlayTimeMs, defaultManches }) });
    await refresh();
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <h1>Paramètres</h1>
      <div className="card grid">
        <div className="field">
          <label>Temps de réponse d'un robot (ms) — défaut 1000</label>
          <input type="number" min={100} step={100} value={responseTimeMs} onChange={(e) => setRt(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Temps maximum de jeu (ms) — défaut 10000</label>
          <input type="number" min={1000} step={500} value={maxPlayTimeMs} onChange={(e) => setMt(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Nombre de manches par défaut</label>
          <select value={defaultManches} onChange={(e) => setDm(Number(e.target.value))}>
            <option value={1}>1 manche</option>
            <option value={2}>2 manches</option>
            <option value={4}>4 manches</option>
          </select>
        </div>
        <div className="row">
          <button className="primary" onClick={save}>Enregistrer</button>
          {saved && <span className="muted">Enregistré ✓</span>}
          <span className="muted" style={{ marginLeft: 'auto' }}>Points récompense : <b>{user?.rewardPoints ?? 0}</b></span>
        </div>
      </div>
    </div>
  );
}
