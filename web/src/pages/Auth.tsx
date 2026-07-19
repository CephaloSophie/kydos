import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state';

export function AuthPage() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    try {
      if (mode === 'login') await login(username, password);
      else await register(username, password);
      nav('/');
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h1>Belote Contrée</h1>
        <p className="muted">{mode === 'login' ? 'Connexion' : 'Créer un compte'}</p>
        <div className="field"><label>Nom d'utilisateur</label>
          <input value={username} onChange={(e) => setU(e.target.value)} style={{ width: '100%' }} /></div>
        <div className="field"><label>Mot de passe</label>
          <input type="password" value={password} onChange={(e) => setP(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()} style={{ width: '100%' }} /></div>
        {err && <p className="err">{err}</p>}
        <button className="primary" onClick={submit} style={{ width: '100%' }}>
          {mode === 'login' ? 'Se connecter' : "S'inscrire"}
        </button>
        <p className="muted" style={{ marginTop: 12 }}>
          {mode === 'login' ? 'Pas de compte ?' : 'Déjà inscrit ?'}{' '}
          <a onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ cursor: 'pointer' }}>
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </a>
        </p>
      </div>
    </div>
  );
}
