import './styles/global.css';
import { initTheme } from './core/theme';
import { api } from './core/api';
import { LoginView } from './views/LoginView';
import { BoardView } from './views/BoardView';
import { toast } from './core/dom';

initTheme();

const root = document.getElementById('app');
if (!root) throw new Error('div #app manquant');

async function router() {
  const hash = location.hash || '#/board';

  // Auth requise pour /board
  if (hash.startsWith('#/board')) {
    if (!api.isAuthenticated()) { location.hash = '#/login'; return; }
    try {
      const me = await api.me();
      BoardView(root!, me.user);
    } catch (e) {
      toast((e as Error).message ?? 'session expirée', 'error');
      location.hash = '#/login';
    }
    return;
  }

  // Login
  LoginView(root!);
}

window.addEventListener('hashchange', router);
router().catch((e) => {
  console.error(e);
  toast('erreur initiale', 'error');
});
