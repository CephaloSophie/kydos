import { HashRouter, Navigate, NavLink, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './state';
import { APP_VERSION } from './version';
import { AuthPage } from './pages/Auth';
import { SettingsPage } from './pages/Settings';
import { RobotsPage } from './pages/Robots';
import { TablesPage } from './pages/Tables';
import { CompetitionsPage } from './pages/Competitions';
import { BrainEditorPage } from './pages/robot-editor/BrainEditorPage';
import { StandaloneBeloteTable } from './table';
import { StandalonePixiTable } from './table-pixi';
import { TeamPage } from './pages/Team';
import { TrainingPage } from './pages/Training';
import { TrainingV2Page } from './pages/TrainingV2';
import { ReplayPage } from './pages/Replay';

function Nav() {
  const { user, logout } = useAuth();
  const link = ({ isActive }: { isActive: boolean }) => (isActive ? 'active' : '');
  return (
    <div className="nav">
      <span className="brand">♠ Belote Contrée <span className="version-badge">v{APP_VERSION}</span></span>
      <NavLink to="/" className={link} end>Entraînement</NavLink>
      <NavLink to="/training-v2" className={link}>Entraînement v2</NavLink>
      
      <NavLink to="/tables" className={link}>Tables</NavLink>
      <NavLink to="/competitions" className={link}>Compétition</NavLink>
      <NavLink to="/table-demo" className={link}>Démo table</NavLink>
      <NavLink to="/table-pixi" className={link}>Table Pixi</NavLink>
      <NavLink to="/brain-editor" className={link}>Éditeur cerveau</NavLink>
      <NavLink to="/robots" className={link}>Mes robots</NavLink>
      <NavLink to="/team" className={link}>Équipe</NavLink>
      <NavLink to="/settings" className={link}>Paramètres</NavLink>
      <span style={{ marginLeft: 'auto' }} className="muted">{user?.username} · {user?.rewardPoints ?? 0} pts</span>
      <button onClick={logout}>Déconnexion</button>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="container"><p className="muted">Chargement…</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <><Nav />{children}</>;
}

function Shell() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/" element={<Protected><TrainingPage /></Protected>} />
      <Route path="/training-v2" element={<Protected><TrainingV2Page /></Protected>} />
      <Route path="/lobby" element={<Navigate to="/tables" replace />} />
      <Route path="/tables" element={<Protected><TablesPage /></Protected>} />
      <Route path="/competitions" element={<Protected><CompetitionsPage /></Protected>} />
      <Route path="/brain-editor" element={<BrainEditorPage />} />
      <Route path="/table-demo" element={<div style={{ position:'fixed', inset:0, padding:12 }}><StandaloneBeloteTable /></div>} />
      <Route path="/table-pixi" element={<div style={{ position:'fixed', inset:0 }}><StandalonePixiTable /></div>} />
      <Route path="/table/:id" element={<Navigate to="/tables" replace />} />
      <Route path="/robots" element={<Protected><RobotsPage /></Protected>} />
      <Route path="/team" element={<Protected><TeamPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/replay/:id" element={<Protected><ReplayPage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter><Shell /></HashRouter>
    </AuthProvider>
  );
}
