/* =============================================================================
 * SOUND · SoundService.ts — moteur audio de la table (Web Audio API, zéro dép.).
 * -----------------------------------------------------------------------------
 * Pourquoi Web Audio API : natif dans la WebView Capacitor et le navigateur,
 * latence faible pour les effets, et deux bus de volume indépendants (mélodie /
 * effets) via des GainNodes — impossible proprement avec de simples <audio>.
 *
 * Robustesse :
 *   • fichier manquant / décodage raté → silencieux (jamais d'exception UI) ;
 *   • politique d'autoplay → `unlock()` au premier geste utilisateur ;
 *   • volumes persistés en localStorage (clés dans soundConfig).
 *
 * Remplacement des sons : voir soundConfig.ts + docs/SOUNDS.md.
 * ========================================================================== */
import {
  DEFAULT_MELODY_VOLUME, DEFAULT_SFX_VOLUME, EFFECT_FILES, MELODY_BY_TABLE_KIND,
  SOUNDS_BASE, STORAGE_KEYS, type SoundEffect,
} from './soundConfig';

type Ctx = AudioContext;

export class SoundService {
  #ctx: Ctx | null = null;
  #melodyGain: GainNode | null = null;
  #sfxGain: GainNode | null = null;
  #buffers = new Map<string, AudioBuffer>();
  #loading = new Map<string, Promise<AudioBuffer | null>>();
  #melodySource: AudioBufferSourceNode | null = null;
  #melodyFile: string | null = null;
  #unlocked = false;

  // Volumes 0..100 (persistés).
  #melodyVolume = readVolume(STORAGE_KEYS.melody, DEFAULT_MELODY_VOLUME);
  #sfxVolume = readVolume(STORAGE_KEYS.sfx, DEFAULT_SFX_VOLUME);

  /** Contexte + bus créés paresseusement (autoplay policy). */
  #ensureContext(): Ctx | null {
    if (this.#ctx) return this.#ctx;
    const AC = (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null; // environnement sans audio (tests) : service inerte
    this.#ctx = new AC();
    this.#melodyGain = this.#ctx.createGain();
    this.#sfxGain = this.#ctx.createGain();
    this.#melodyGain.gain.value = this.#melodyVolume / 100;
    this.#sfxGain.gain.value = this.#sfxVolume / 100;
    this.#melodyGain.connect(this.#ctx.destination);
    this.#sfxGain.connect(this.#ctx.destination);
    return this.#ctx;
  }

  /**
   * À appeler sur le PREMIER geste utilisateur (tap/clic) : débloque l'audio
   * (les WebViews suspendent le contexte tant qu'aucun geste n'a eu lieu).
   */
  unlock(): void {
    const ctx = this.#ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    this.#unlocked = true;
  }

  /** Charge (et met en cache) un fichier audio ; null si indisponible. */
  async #load(file: string): Promise<AudioBuffer | null> {
    if (this.#buffers.has(file)) return this.#buffers.get(file)!;
    if (this.#loading.has(file)) return this.#loading.get(file)!;
    const ctx = this.#ensureContext();
    if (!ctx) return null;
    const p = (async () => {
      try {
        const res = await fetch(`${SOUNDS_BASE}${file}`);
        if (!res.ok) return null;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        this.#buffers.set(file, buf);
        return buf;
      } catch { return null; }               // fichier absent/corrompu : silence
      finally { this.#loading.delete(file); }
    })();
    this.#loading.set(file, p);
    return p;
  }

  /** Précharge les effets (appel au montage de l'écran de table). */
  preloadEffects(): void {
    for (const file of Object.values(EFFECT_FILES)) void this.#load(file);
  }

  /**
   * Précharge TOUS les sons (effets + mélodies de toutes les tables) en une
   * passe. Appelé une fois à la première connexion (bootstrap, page waiting)
   * pour que le jeu — y compris hors-ligne ensuite — dispose de tous ses sons
   * sans latence. Retourne une promesse résolue quand tout est tenté (les
   * fichiers absents sont silencieusement ignorés).
   */
  async preloadAll(): Promise<void> {
    const files = new Set<string>([
      ...Object.values(EFFECT_FILES),
      ...Object.values(MELODY_BY_TABLE_KIND),
    ]);
    await Promise.allSettled([...files].map((f) => this.#load(f)));
  }

  /** Nombre de buffers audio actuellement en cache (debug / tests). */
  get cachedCount(): number { return this.#buffers.size; }

  /** Joue un effet sonore (one-shot, bus « effets »). */
  playEffect(effect: SoundEffect): void {
    const ctx = this.#ensureContext();
    if (!ctx || !this.#sfxGain || this.#sfxVolume === 0) return;
    void this.#load(EFFECT_FILES[effect]).then((buf) => {
      if (!buf || !this.#ctx || !this.#sfxGain) return;
      const src = this.#ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.#sfxGain);
      try { src.start(); } catch { /* contexte non débloqué : ignoré */ }
    });
  }

  /** Démarre (ou change) la mélodie d'ambiance pour un type de table. */
  playMelodyForTable(kind: string | null | undefined): void {
    const file = MELODY_BY_TABLE_KIND[kind ?? 'default'] ?? MELODY_BY_TABLE_KIND.default;
    if (this.#melodyFile === file && this.#melodySource) return;   // déjà en cours
    this.stopMelody();
    this.#melodyFile = file;
    const ctx = this.#ensureContext();
    if (!ctx || !this.#melodyGain) return;
    void this.#load(file).then((buf) => {
      if (!buf || !this.#ctx || !this.#melodyGain || this.#melodyFile !== file) return;
      const src = this.#ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this.#melodyGain);
      try { src.start(); this.#melodySource = src; } catch { /* non débloqué */ }
    });
  }

  /** Coupe la mélodie (sortie de table). */
  stopMelody(): void {
    try { this.#melodySource?.stop(); } catch { /* déjà arrêtée */ }
    this.#melodySource = null;
    this.#melodyFile = null;
  }

  // ── Volumes (0..100, persistés) ──────────────────────────────────────────
  melodyVolume(): number { return this.#melodyVolume; }
  sfxVolume(): number { return this.#sfxVolume; }

  setMelodyVolume(v: number): void {
    this.#melodyVolume = clamp(v);
    if (this.#melodyGain) this.#melodyGain.gain.value = this.#melodyVolume / 100;
    persistVolume(STORAGE_KEYS.melody, this.#melodyVolume);
  }

  setSfxVolume(v: number): void {
    this.#sfxVolume = clamp(v);
    if (this.#sfxGain) this.#sfxGain.gain.value = this.#sfxVolume / 100;
    persistVolume(STORAGE_KEYS.sfx, this.#sfxVolume);
  }
}

function clamp(v: number): number { return Math.max(0, Math.min(100, Math.round(v))); }

function readVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? clamp(n) : fallback;
  } catch { return fallback; }
}

function persistVolume(key: string, value: number): void {
  try { localStorage.setItem(key, String(value)); } catch { /* stockage indispo */ }
}

/** Instance partagée de l'app. */
export const soundService = new SoundService();
