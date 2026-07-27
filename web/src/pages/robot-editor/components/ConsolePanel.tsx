import type { LogLine } from '../codegen';

export type ConsoleTab = 'logs' | 'info' | 'error' | 'objet';

export interface ConsoleFnOption { key: string; label: string }

export interface ConsolePanelProps {
  /** Ouvert ou réduit. */
  open: boolean;
  /** Onglet actif. */
  tab: ConsoleTab;
  /** Fonction dont la console est affichée (console PRIVÉE par fonction). */
  fnKey: string;
  /** Liste des fonctions (pour le sélecteur). */
  fns: ConsoleFnOption[];
  /** Logs de la fonction courante. */
  logs: LogLine[];
  /** Dernier résultat de la fonction courante. */
  result: any;
  onTab(tab: ConsoleTab): void;
  onToggle(): void;
  onSelectFn(key: string): void;
  onClear(): void;
}

const TAB_LABEL: Record<ConsoleTab, string> = { logs: 'Logs', info: 'Info', error: 'Erreurs', objet: 'Objet' };

/**
 * ConsolePanel — VUE autonome de la console (style inspecteur).
 * 100% présentationnel : aucun état propre, tout passe par les props.
 */
export function ConsolePanel({ open, tab, fnKey, fns, logs, result, onTab, onToggle, onSelectFn, onClear }: ConsolePanelProps) {
  const fnLabel = fns.find((f) => f.key === fnKey)?.label ?? fnKey;
  const filtered = logs.filter((l) => (tab === 'logs' ? true : tab === 'error' ? l.level === 'error' : l.level === 'info'));

  return (
    <div className={`be-console ${open ? 'open' : 'closed'}`}>
      <div className="be-console__bar">
        <div className="be-console__tabs">
          {(['logs', 'info', 'error', 'objet'] as const).map((tb) => {
            const count = tb === 'objet' ? (result ? 1 : 0)
              : tb === 'logs' ? logs.length
              : logs.filter((l) => l.level === (tb === 'error' ? 'error' : 'info')).length;
            return (
              <button key={tb} className={`be-console__tab ${tab === tb ? 'active' : ''} ${tb}`} onClick={() => onTab(tb)}>
                {TAB_LABEL[tb]}
                {count > 0 && <span className="be-console__count">{count}</span>}
              </button>
            );
          })}
        </div>
        <div className="be-console__actions">
          <span className="be-console__for" title="Console de la fonction">{fnLabel}()</span>
          <select className="be-console__forsel" value={fnKey} onChange={(e) => onSelectFn(e.target.value)}>
            {fns.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <button className="be-iconbtn" title="Vider cette console" onClick={onClear}>🗑</button>
          <button className="be-iconbtn" title={open ? 'Réduire' : 'Ouvrir'} onClick={onToggle}>{open ? '▾' : '▴'}</button>
        </div>
      </div>
      {open && (
        <div className="be-console__body">
          {tab === 'objet' ? (
            <pre className="be-console__obj">{result ? JSON.stringify(result, null, 2) : 'Aucun résultat. Clique ▶ Tester.'}</pre>
          ) : filtered.length === 0 ? (
            <div className="be-console__empty">Aucune entrée pour {fnLabel}().</div>
          ) : (
            filtered.map((l, i) => (
              <div key={i} className={`be-logentry lvl-${l.level}`}>
                <span className="be-logentry__lvl">{l.level}</span>
                <span className="be-logentry__cat">{l.cat}</span>
                <span className="be-logentry__msg">{l.msg}</span>
                {l.data !== undefined && <pre className="be-logentry__data">{JSON.stringify(l.data, null, 2)}</pre>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
