import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { BRAIN_FNS, CONTEXT_REFERENCE, HELPERS_REFERENCE, SNIPPETS } from './brainDefs';
import { generateBrainCode, runFunctionPreview, type BrainModel, type CustomFn, type LogLine } from './codegen';
import { THEMES, type ThemeKey } from './themes';
import { ConsolePanel } from './components/ConsolePanel';
import { useBrainProjects } from './useBrainProjects';
import { modelToFunctions, functionsToModel, type BrainVersion } from './brainStore';
import {
  RANKS, SUITS, SUIT_SYM, SUIT_RED, dealHand, defaultSettings, buildPreviewContext,
  contextToJson, applyContextJson,
  type CtxSettings, type DCard,
} from './previewContext';

const RET_COLOR: Record<string, string> = { BidDecision: '#E8714A', CardDecision: '#2DD4A0', boolean: '#3D8EE8', any: '#8B5CF6', number: '#8B5CF6' };
const CONTRACT_KEYS = BRAIN_FNS.map((f) => f.key);
const SYNC_LABEL: Record<string, string> = { local: '● local', saving: '⏳ sauvegarde…', saved: '✓ serveur', error: '⚠ hors-ligne' };

interface FnMeta { key: string; label: string; returns: string; signature: string; doc: string; custom?: boolean; params?: string }

export function BrainEditorPage() {
  const [name, setName] = useState('MonCerveau');
  const [theme, setTheme] = useState<ThemeKey>('noir');
  const [view, setView] = useState<'edit' | 'generated'>('edit');

  // Fonctions = les 4 du contrat + les custom
  const [customFns, setCustomFns] = useState<CustomFn[]>([]);
  const allFns: FnMeta[] = useMemo(() => [
    ...BRAIN_FNS.map((f) => ({ key: f.key, label: f.label, returns: f.returns, signature: f.signature, doc: f.doc })),
    ...customFns.map((c) => ({ key: c.key, label: c.key, returns: c.returns, signature: `${c.key}(${c.params}): ${c.returns}`, doc: 'Fonction personnalisée.', custom: true, params: c.params })),
  ], [customFns]);

  const [bodies, setBodies] = useState<Record<string, string>>(
    () => Object.fromEntries(BRAIN_FNS.map((f) => [f.key, f.defaultBody])),
  );

  // Split : deux panneaux. right = principal (reçoit les insertions).
  const [leftFn, setLeftFn] = useState<string | null>(null);
  const [rightFn, setRightFn] = useState<string>(BRAIN_FNS[0].key);
  const [splitOn, setSplitOn] = useState(false);

  // Contexte éditable
  const [ctx, setCtx] = useState<CtxSettings>(() => defaultSettings());

  // Console
  // Console — PRIVÉE à chaque fonction (logs/result indexés par clé), minimisée par défaut.
  const [logsByFn, setLogsByFn] = useState<Record<string, LogLine[]>>({});
  const [resultByFn, setResultByFn] = useState<Record<string, any>>({});
  const [consoleFor, setConsoleFor] = useState<string>(BRAIN_FNS[0].key);
  const [consoleTab, setConsoleTab] = useState<'logs' | 'info' | 'error' | 'objet'>('logs');
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [search, setSearch] = useState('');
  const logs = logsByFn[consoleFor] ?? [];
  const lastResult = resultByFn[consoleFor];

  // Éditeur JSON du contexte complet (AlgoSpec inclus)
  const [showJson, setShowJson] = useState(false);
  const [jsonDraft, setJsonDraft] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const setBody = useCallback((key: string, code: string) => setBodies((b) => ({ ...b, [key]: code })), []);
  // Insertion AU CURSEUR du panneau principal (fallback : fin du corps).
  const mainViewRef = useRef<any>(null);
  const insert = useCallback((code: string) => {
    const view = mainViewRef.current;
    if (view?.state) {
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: code },
        selection: { anchor: sel.from + code.length },
      });
      view.focus(); // le onChange de CodeMirror synchronise l'état React
      return;
    }
    setBodies((b) => ({ ...b, [rightFn]: (b[rightFn] ?? '') + (b[rightFn] ? '\n' : '') + code }));
  }, [rightFn]);
  const patch = useCallback((p: Partial<CtxSettings>) => setCtx((c) => ({ ...c, ...p })), []);

  const model: BrainModel = useMemo(() => ({ name, bodies, custom: customFns }), [name, bodies, customFns]);
  const generated = useMemo(() => generateBrainCode(model), [model]);

  // --- Persistance : projets + versions (local + serveur) ---
  const proj = useBrainProjects();
  const loadedKey = useRef<string>('');
  const bootstrapped = useRef(false);

  // Au montage : garantir au moins un projet (sinon en créer un depuis les défauts).
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (!proj.current) {
      proj.newProject('Cerveau 1', {
        brainName: name,
        functions: modelToFunctions({ brainName: name, bodies, customFns, previewSettings: ctx }, CONTRACT_KEYS),
        generatedCode: generated,
        previewSettings: ctx,
      });
    }
  }, [proj, name, bodies, customFns, ctx, generated]);

  // Charger la version active dans l'éditeur quand on change de projet / version.
  useEffect(() => {
    const v = proj.activeVersion;
    if (!v || !proj.current) return;
    const key = `${proj.current.id}:${v.label}`;
    if (key === loadedKey.current) return; // déjà chargée — éviter d'écraser la saisie
    loadedKey.current = key;
    const m = functionsToModel(v);
    setName(m.brainName);
    setBodies(m.bodies);
    setCustomFns(m.customFns);
    if (m.previewSettings) setCtx(m.previewSettings);
    setRightFn(BRAIN_FNS[0].key);
  }, [proj.current, proj.activeVersion]);

  // Autosave (local) de la version courante, débounce léger.
  useEffect(() => {
    if (!proj.current) return;
    const t = setTimeout(() => {
      const version: BrainVersion = {
        label: proj.activeVersion?.label ?? 'V-1.0.0',
        brainName: name,
        functions: modelToFunctions({ brainName: name, bodies, customFns, previewSettings: ctx }, CONTRACT_KEYS),
        generatedCode: generated,
        previewSettings: ctx,
      };
      proj.saveVersion(version);
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, bodies, customFns, ctx, generated]);

  const currentVersionForSave = (): BrainVersion => ({
    label: proj.activeVersion?.label ?? 'V-1.0.0', brainName: name,
    functions: modelToFunctions({ brainName: name, bodies, customFns, previewSettings: ctx }, CONTRACT_KEYS),
    generatedCode: generated, previewSettings: ctx,
  });

  const othersMap = useMemo(() => {
    const m: Record<string, { params: string; body: string }> = {};
    for (const f of allFns) m[f.key] = { params: f.params ?? 'ctx', body: bodies[f.key] ?? '' };
    return m;
  }, [allFns, bodies]);

  const runTest = (key: string) => {
    const res = runFunctionPreview(key, bodies[key] ?? '', buildPreviewContext(ctx), [], othersMap);
    setLogsByFn((m) => ({ ...m, [key]: res.logs }));
    setResultByFn((m) => ({ ...m, [key]: res.ok ? res.result : { erreur: res.error } }));
    setConsoleFor(key);
    setConsoleOpen(true);
    setConsoleTab(res.ok ? (res.logs.length ? 'logs' : 'objet') : 'error');
  };

  // Éditeur JSON : ouvrir = sérialiser le contexte courant ; appliquer = répercuter partout.
  const openJson = () => { setJsonDraft(contextToJson(ctx)); setJsonError(null); setShowJson(true); };
  const applyJson = () => {
    const r = applyContextJson(jsonDraft, ctx);
    if (r.ok && r.settings) { setCtx(r.settings); setJsonError(null); }
    else setJsonError(r.error ?? 'JSON invalide');
  };
  const resetJsonToDefault = () => { const d = defaultSettings(); d.hand = ctx.hand; setCtx(d); setJsonDraft(contextToJson(d)); setJsonError(null); };

  const redeal = () => { patch({ hand: dealHand() }); };
  const cycleCard = (idx: number, field: 'rank' | 'suit', dir = 1) => {
    const list: readonly string[] = field === 'rank' ? RANKS : SUITS;
    setCtx((c) => {
      const hand = c.hand.slice();
      const cur = (hand[idx] as any)[field] as string;
      const ni = (list.indexOf(cur) + dir + list.length) % list.length;
      hand[idx] = { ...hand[idx], [field]: list[ni] } as DCard;
      return { ...c, hand };
    });
  };

  const addFunction = () => {
    const base = 'maFonction';
    let i = 1, key = base;
    const taken = new Set(allFns.map((f) => f.key));
    while (taken.has(key)) key = `${base}${i++}`;
    setCustomFns((cs) => [...cs, { key, params: 'ctx', returns: 'any' }]);
    setBodies((b) => ({ ...b, [key]: `// Fonction personnalisée ${key}\n// Appelable depuis une autre fonction : this.${key}(ctx)\nreturn null;` }));
    setRightFn(key);
  };
  const removeFunction = (key: string) => {
    setCustomFns((cs) => cs.filter((c) => c.key !== key));
    if (rightFn === key) setRightFn(BRAIN_FNS[0].key);
    if (leftFn === key) setLeftFn(null);
  };

  // Édition inline d'une fonction custom (nom + paramètres + type de retour)
  const [editingFn, setEditingFn] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ key: string; params: string; returns: string }>({ key: '', params: '', returns: '' });
  const startEdit = (c: CustomFn) => { setEditingFn(c.key); setEditDraft({ key: c.key, params: c.params, returns: c.returns }); };
  const commitEdit = (oldKey: string) => {
    const taken = new Set(allFns.filter((f) => f.key !== oldKey).map((f) => f.key));
    let newKey = (editDraft.key || oldKey).replace(/[^A-Za-z0-9_]/g, '') || oldKey;
    while (taken.has(newKey)) newKey += '_';
    setCustomFns((cs) => cs.map((c) => (c.key === oldKey ? { key: newKey, params: editDraft.params || 'ctx', returns: editDraft.returns || 'any' } : c)));
    if (newKey !== oldKey) {
      setBodies((b) => { const nb = { ...b }; nb[newKey] = nb[oldKey] ?? ''; delete nb[oldKey]; return nb; });
      if (rightFn === oldKey) setRightFn(newKey);
      if (leftFn === oldKey) setLeftFn(newKey);
    }
    setEditingFn(null);
  };
  const swapSides = () => { setLeftFn(rightFn); setRightFn(leftFn ?? rightFn); };

  const download = () => {
    const blob = new Blob([generated], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${name.replace(/[^A-Za-z0-9]/g, '') || 'MonCerveau'}.ts`; a.click();
    URL.revokeObjectURL(url);
  };

  const fnMeta = (key: string) => allFns.find((f) => f.key === key)!;
  const themeExt = THEMES[theme].ext;

  // Filtrage recherche (contexte + helpers + snippets)
  const q = search.trim().toLowerCase();
  const ctxFiltered = CONTEXT_REFERENCE.map((g) => ({ ...g, entries: g.entries.filter((e) => !q || e.path.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q)) })).filter((g) => g.entries.length);

  const renderEditor = (key: string, isMain: boolean) => {
    const f = fnMeta(key);
    const col = RET_COLOR[f.returns] ?? 'var(--accent)';
    return (
      <div className={`be-editor ${isMain ? 'main' : ''}`}>
        <div className="be-editor__head">
          <span className="be-editor__title"><span className="be-dot" style={{ background: col }} />{f.label}({f.params ?? 'ctx'}) {'{'}</span>
          <div className="be-editor__headbtns">
            {isMain && <span className="be-mainbadge">principal ◀ insertions</span>}
            <button className="be-btn run sm" onClick={() => runTest(key)}>▶ Tester</button>
          </div>
        </div>
        <div className="be-editor__cm">
          <CodeMirror value={bodies[key] ?? ''} height="100%" theme={themeExt as any}
            extensions={[javascript({ typescript: true })]} onChange={(v) => setBody(key, v)}
            onCreateEditor={(view) => { if (key === rightFn) mainViewRef.current = view; }}
            onUpdate={(vu) => { if (key === rightFn) mainViewRef.current = vu.view; }}
            basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true, bracketMatching: true, closeBrackets: true }} />
        </div>
        <div className="be-editor__foot">{'}'}{f.doc ? <span className="be-foot-doc">{f.doc}</span> : null}</div>
      </div>
    );
  };

  return (
    <div className="be-page be-theme-noir">
      {/* Barre du haut */}
      <div className="be-top">
        <div className="be-brand">🧠 Éditeur de cerveau</div>
        <label className="be-name">Nom<input value={name} onChange={(e) => setName(e.target.value)} placeholder="MonCerveau" /></label>
        <label className="be-name">Thème
          <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeKey)}>
            {Object.entries(THEMES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <div className="be-top-actions">
          <button className={`be-seg ${!splitOn ? 'on' : ''}`} onClick={() => setSplitOn(false)}>1 panneau</button>
          <button className={`be-seg ${splitOn ? 'on' : ''}`} onClick={() => { setSplitOn(true); if (!leftFn) setLeftFn(BRAIN_FNS[1].key); }}>2 panneaux</button>
          {splitOn && <button className="be-btn sm" onClick={swapSides} title="Échanger gauche/droite">⇄</button>}
          <button className={`be-seg ${view === 'edit' ? 'on' : ''}`} onClick={() => setView('edit')}>Édition</button>
          <button className={`be-seg ${view === 'generated' ? 'on' : ''}`} onClick={() => setView('generated')}>Code généré</button>
          <button className="be-btn primary" onClick={download}>⬇ .ts</button>
        </div>
      </div>

      {/* Barre de projets + versions */}
      <div className="be-projbar">
        <span className="be-projbar__lbl">Projet</span>
        <select className="be-projbar__sel" value={proj.current?.id ?? ''} onChange={(e) => proj.open(e.target.value)}>
          {proj.projects.length === 0 && <option value="">(aucun)</option>}
          {proj.projects.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <button className="be-mini" onClick={() => proj.newProject(`Cerveau ${proj.projects.length + 1}`, currentVersionForSave())}>＋ nouveau</button>
        <button className="be-mini" onClick={() => proj.current?.id && proj.cloneProject(proj.current.id)}>⧉ cloner</button>
        <button className="be-mini" onClick={() => proj.current?.id && proj.removeProject(proj.current.id)}>🗑</button>

        <span className="be-projbar__sep" />

        <span className="be-projbar__lbl">Version</span>
        <select className="be-projbar__sel sm" value={proj.current?.activeVersion ?? 0} onChange={(e) => proj.switchVersion(Number(e.target.value))}>
          {(proj.current?.versions ?? []).map((v, i) => <option key={v.label} value={i}>{v.label}</option>)}
        </select>
        <button className="be-mini" onClick={() => proj.addVersion(currentVersionForSave())} title="Nouvelle version (copie de l'active)">＋ version</button>

        <span className="be-projbar__sep" />

        <button className="be-btn sm" onClick={() => proj.saveToServer()}>💾 Sauvegarder serveur</button>
        <button className="be-mini" onClick={() => proj.loadServerList()}>↻ liste serveur</button>
        {proj.serverList.length > 0 && (
          <select className="be-projbar__sel sm" defaultValue="" onChange={(e) => e.target.value && proj.loadFromServer(e.target.value)}>
            <option value="">charger depuis serveur…</option>
            {proj.serverList.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.versionCount}v)</option>)}
          </select>
        )}
        <span className={`be-sync be-sync--${proj.sync}`}>{SYNC_LABEL[proj.sync]}</span>
      </div>

      {view === 'generated' ? (
        <div className="be-generated"><CodeMirror value={generated} height="100%" theme={themeExt as any} extensions={[javascript({ typescript: true })]} editable={false} /></div>
      ) : (
        <div className="be-shell">
          <div className="be-layout">
            {/* Toolbox gauche : fonctions + contexte + helpers + snippets */}
            <div className="be-side">
              <div className="be-side__sec">
                <div className="be-ctx__head"><h4>Fonctions</h4><button className="be-mini" onClick={addFunction}>＋ ajouter</button></div>
                {allFns.map((f) => {
                  const col = RET_COLOR[f.returns] ?? 'var(--accent)';
                  if (f.custom && editingFn === f.key) {
                    return (
                      <div key={f.key} className="be-fnedit">
                        <input className="be-fnedit__name" value={editDraft.key} onChange={(e) => setEditDraft((d) => ({ ...d, key: e.target.value }))} placeholder="nom" autoFocus />
                        <div className="be-fnedit__row">
                          <input className="be-fnedit__params" value={editDraft.params} onChange={(e) => setEditDraft((d) => ({ ...d, params: e.target.value }))} placeholder="ctx, card" />
                          <select className="be-fnedit__ret" value={editDraft.returns} onChange={(e) => setEditDraft((d) => ({ ...d, returns: e.target.value }))}>
                            {['any', 'boolean', 'number', 'BidDecision', 'CardDecision'].map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                        <div className="be-fnedit__btns">
                          <button className="be-mini" onClick={() => commitEdit(f.key)}>✓ ok</button>
                          <button className="be-mini" onClick={() => setEditingFn(null)}>annuler</button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={f.key} className={`be-fnrow ${rightFn === f.key ? 'main' : ''} ${leftFn === f.key ? 'left' : ''}`}>
                      <button className="be-fnrow__main" onClick={() => setRightFn(f.key)} title="Ouvrir dans le panneau principal (droite)">
                        <span className="be-dot" style={{ background: col }} />
                        <span className="be-fnrow__name">{f.label}</span>
                        <span className="be-fnrow__ret" style={{ color: col }}>{f.returns}</span>
                      </button>
                      {splitOn && <button className="be-fnrow__side" onClick={() => setLeftFn(f.key)} title="Ouvrir à gauche">◧</button>}
                      <button className="be-fnrow__test" onClick={() => runTest(f.key)} title="Tester seule">▶</button>
                      {f.custom && <button className="be-fnrow__edit" onClick={() => startEdit(customFns.find((c) => c.key === f.key)!)} title="Renommer / paramètres">✎</button>}
                      {f.custom && <button className="be-fnrow__del" onClick={() => removeFunction(f.key)} title="Supprimer">✕</button>}
                    </div>
                  );
                })}
              </div>

              {/* Recherche compacte */}
              <div className="be-search"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 rechercher contexte…" /></div>

              <div className="be-side__sec">
                <h4>Contexte <span className="be-hint">(clic = insère)</span></h4>
                {ctxFiltered.map((g) => (
                  <div key={g.group} className="be-ctxgroup">
                    <div className="be-ctxgroup__label" style={{ color: g.color }}>{g.group}</div>
                    {g.entries.map((e) => (
                      <button key={e.path} className="be-ctxitem" onClick={() => insert(e.path)} title={e.desc}>
                        <span className="be-ctxitem__path" style={{ borderColor: g.color }}>{e.path}</span>
                        <span className="be-ctxitem__type">{e.type}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <div className="be-side__sec">
                <h4>Helpers</h4>
                {HELPERS_REFERENCE.filter((h) => !q || h.sig.toLowerCase().includes(q)).map((h) => (
                  <button key={h.sig} className="be-helper" onClick={() => insert(h.sig)} title={h.desc}><code>{h.sig}</code></button>
                ))}
              </div>
              <div className="be-side__sec">
                <h4>Extraits</h4>
                {SNIPPETS.map((s) => <button key={s.label} className="be-snippet" onClick={() => insert(s.code)}>{s.label}</button>)}
              </div>
            </div>

            {/* Colonne principale : éditeurs + contexte, puis console (ne couvre PAS la toolbox) */}
            <div className="be-main">
              <div className="be-work">
                {/* Centre : éditeur(s) */}
                <div className={`be-editors ${splitOn ? 'split' : ''}`}>
                  {splitOn && leftFn && renderEditor(leftFn, false)}
                  {renderEditor(rightFn, splitOn)}
                </div>

                {/* Droite : contexte éditable */}
                <div className="be-ctx">
                  <div className="be-ctx__sec">
                    <div className="be-ctx__head"><h4>Ma main <span className="be-hint">({ctx.hand.length})</span></h4><button className="be-mini" onClick={redeal}>🎲 Redistribuer</button></div>
                    <div className="be-hand">
                      {ctx.hand.map((c, i) => (
                        <div key={i} className={`be-card ${SUIT_RED(c.suit) ? 'red' : 'black'}`} title="Clic: rang · Clic droit: couleur"
                          onClick={() => cycleCard(i, 'rank', 1)} onContextMenu={(e) => { e.preventDefault(); cycleCard(i, 'suit', 1); }}>
                          <span className="be-card__rank">{c.rank}</span><span className="be-card__suit">{SUIT_SYM[c.suit]}</span>
                        </div>
                      ))}
                    </div>
                    <div className="be-ctx__hint">Clic = rang · Clic droit = couleur</div>
                  </div>
                  <div className="be-ctx__sec">
                    <h4>Réglages</h4>
                    <label className="be-row"><span>Atout</span><select value={ctx.trump} onChange={(e) => patch({ trump: e.target.value })}>{SUITS.map((s) => <option key={s} value={s}>{SUIT_SYM[s]} {s}</option>)}</select></label>
                    <label className="be-row"><span>Phase</span><select value={ctx.phase} onChange={(e) => patch({ phase: e.target.value as any })}><option value="bidding">enchère</option><option value="play">jeu</option></select></label>
                    <label className="be-row slider"><span>Agressivité</span><input type="range" min={0} max={10} value={ctx.aggressiveness} onChange={(e) => patch({ aggressiveness: +e.target.value })} /><b>{ctx.aggressiveness}</b></label>
                    <label className="be-row slider"><span>Concentration</span><input type="range" min={0} max={10} value={ctx.concentration} onChange={(e) => patch({ concentration: +e.target.value })} /><b>{ctx.concentration}</b></label>
                    <label className="be-row"><span>Annonce partenaire</span><input type="number" step={10} value={ctx.partnerBidValue} onChange={(e) => patch({ partnerBidValue: +e.target.value })} /></label>
                    <label className="be-row"><span>Annonce courante</span><input type="number" step={10} value={ctx.currentBidValue} onChange={(e) => patch({ currentBidValue: +e.target.value })} /></label>
                    <div className="be-row checks">
                      <label><input type="checkbox" checked={ctx.canContre} onChange={(e) => patch({ canContre: e.target.checked })} /> peut contrer</label>
                      <label><input type="checkbox" checked={ctx.canSurcontre} onChange={(e) => patch({ canSurcontre: e.target.checked })} /> peut surcontrer</label>
                    </div>
                  </div>
                  {/* Contexte complet + AlgoSpec en JSON, éditable */}
                  <div className="be-ctx__sec">
                    <div className="be-ctx__head">
                      <h4>Contexte complet (JSON)</h4>
                      <button className="be-mini" onClick={() => (showJson ? setShowJson(false) : openJson())}>{showJson ? '▾ masquer' : '▸ afficher'}</button>
                    </div>
                    {showJson && (
                      <>
                        <div className="be-json"><CodeMirror value={jsonDraft} height="240px" theme={themeExt as any}
                          extensions={[javascript({ typescript: true })]} onChange={setJsonDraft}
                          basicSetup={{ lineNumbers: true, foldGutter: true, bracketMatching: true }} /></div>
                        {jsonError && <div className="be-json__err">⚠ {jsonError}</div>}
                        <div className="be-json__btns">
                          <button className="be-btn run sm" onClick={applyJson}>✓ Appliquer</button>
                          <button className="be-mini" onClick={() => setJsonDraft(contextToJson(ctx))}>↻ recharger</button>
                          <button className="be-mini" onClick={resetJsonToDefault}>défaut</button>
                        </div>
                        <div className="be-ctx__hint">Modifier ici impacte les cartes, les réglages et l'AlgoSpec utilisés par l'aperçu.</div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Console — composant autonome (privée par fonction, minimisée par défaut) */}
              <ConsolePanel
                open={consoleOpen}
                tab={consoleTab}
                fnKey={consoleFor}
                fns={allFns.map((f) => ({ key: f.key, label: f.label }))}
                logs={logs}
                result={lastResult}
                onTab={(tb) => { setConsoleTab(tb); setConsoleOpen(true); }}
                onToggle={() => setConsoleOpen((o) => !o)}
                onSelectFn={(k) => { setConsoleFor(k); setConsoleOpen(true); }}
                onClear={() => { setLogsByFn((m) => ({ ...m, [consoleFor]: [] })); setResultByFn((m) => ({ ...m, [consoleFor]: undefined })); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
