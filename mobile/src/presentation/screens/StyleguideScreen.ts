/* =============================================================================
 * PRESENTATION · screens/StyleguideScreen.ts
 * -----------------------------------------------------------------------------
 * APERÇU VIVANT du design system mobile (route #/styleguide).
 * Sert de référence visuelle ET de test manuel : tout composant du DS y est
 * rendu avec ses variantes. Si un token change, la dérive se voit ici d'abord.
 * ========================================================================== */
import { h } from '../../core/dom';
import { Avatar, Badge, BackButton, Button, Dialog, Field, Robot, ScreenHead, Slider } from '../components/ui';
import { AVATAR_PRESETS } from '../../domain/entities/Robot';
import type { AppContext } from '../context';

/** Jetons de couleur documentés (nom CSS → usage). */
const COLOR_TOKENS = [
  ['--c-gold', 'Accent principal · actions, contrats'],
  ['--c-success', 'Équipe NOUS · états positifs'],
  ['--c-danger', 'Équipe EUX · erreurs, exclusions'],
  ['--c-ink', 'Texte sur fond clair'],
  ['--c-text', 'Texte principal'],
  ['--c-text-soft', 'Texte secondaire'],
  ['--c-text-mute', 'Texte tertiaire'],
  ['--c-line', 'Bordures discrètes'],
  ['--c-line-strong', 'Bordures marquées'],
];

const section = (title: string, subtitle: string, ...content: (HTMLElement | null)[]) =>
  h('div', { class: 'card', style: { marginBottom: '12px' } },
    h('div', { class: 'eyebrow' }, title),
    h('div', { class: 'text-mute', style: { fontSize: '11px', margin: '3px 0 12px' } }, subtitle),
    h('div', { class: 'col gap-3' }, ...content));

export function StyleguideScreen(ctx: AppContext): HTMLElement {
  const { router } = ctx;

  const swatches = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' } },
    ...COLOR_TOKENS.map(([token, usage]) => h('div', { class: 'row gap-2', style: { alignItems: 'center' } },
      h('span', { style: { width: '26px', height: '26px', borderRadius: 'var(--r-sm)', background: `var(${token})`, border: '1px solid var(--c-line-strong)', flexShrink: '0' } }),
      h('div', { class: 'col', style: { gap: '0', minWidth: '0' } },
        h('span', { class: 'mono', style: { fontSize: '9.5px', color: 'var(--c-gold)' } }, token),
        h('span', { style: { fontSize: '10px', color: 'var(--c-text-mute)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } }, usage)))));

  const typography = h('div', { class: 'col gap-2' },
    h('div', { class: 'title', style: { fontSize: 'var(--fs-2xl)' } }, 'Titre — Bricolage Grotesque'),
    h('div', { class: 'title', style: { fontSize: 'var(--fs-xl)' } }, 'Sous-titre d\'écran'),
    h('div', { style: { fontSize: '14px', color: 'var(--c-text-soft)' } }, 'Texte courant — Manrope, lisible en paysage sur petit écran.'),
    h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--c-text-mute)' } }, 'Monospace — JetBrains Mono · scores, journaux, identifiants'));

  const buttons = h('div', { class: 'row gap-2 wrap' },
    Button('Principal'), Button('Secondaire', { variant: 'secondary' }),
    Button('Discret', { variant: 'ghost' }), Button('Danger', { variant: 'danger' }),
    Button('Petit', { size: 'sm' }));

  const badges = h('div', { class: 'row gap-2 wrap' },
    Badge('Neutre'), Badge('Or', 'gold'), Badge('Succès', 'success'),
    Badge('Danger', 'danger'), Badge('Info', 'info'), Badge('Niveau', 'level'));

  const avatars = h('div', { class: 'row gap-2' },
    ...AVATAR_PRESETS.map((a) => Avatar({ accent: a.accent, size: 38 })));

  const robots = h('div', { class: 'row gap-3', style: { alignItems: 'center' } },
    Robot({ size: 30 }), Robot({ size: 44, accent: 'var(--c-success)' }),
    Robot({ size: 58, accent: '#b39ddb', float: true }));

  const sliders = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '11px 20px' } },
    Slider({ label: 'Agressivité', value: 62, fill: 'linear-gradient(90deg,#b8912f,#e6c46a)' }),
    Slider({ label: 'Mémoire', value: 78, fill: 'linear-gradient(90deg,#1c6a40,#2f8f57)' }));

  const feature = h('div', { class: 'row gap-3' },
    ...([['LE JEU', 'Jouer', '♥', 'var(--g-heart)'], ['ROBOTS', 'Écurie', '♠', 'var(--g-spade)'], ['ÉDITEUR', 'Créer', '♦', 'var(--g-diamond)']] as const)
      .map(([k, t, g, grad]) => h('div', { class: 'feature-card fill', style: { height: '104px', '--card-grad': grad } },
        h('div', { class: 'feature-card__glyph' }, g),
        h('div', { class: 'feature-card__body' },
          h('div', { class: 'feature-card__kicker' }, k),
          h('div', { class: 'feature-card__title' }, t)))));

  const root = h('div', { class: 'anim-screen', style: { position: 'absolute', inset: '0', padding: '52px 24px 14px 60px', background: 'linear-gradient(160deg,#0a0f1c,#060a13)', overflow: 'auto' } },
    BackButton('← Accueil', () => router.go('home')),
    ScreenHead('DESIGN SYSTEM', 'Aperçu des composants',
      h('div', { class: 'row gap-2' },
        Button('Ouvrir un dialogue', { variant: 'secondary', size: 'sm', onClick: () => {
          const dlg = Dialog({ title: 'Dialogue de référence', body: 'Fond dépoli, carte surélevée, lueur dorée.',
            actions: [Button('Fermer', { variant: 'secondary', size: 'sm', onClick: () => dlg.remove() }), Button('Valider', { size: 'sm', onClick: () => dlg.remove() })],
            onClose: () => dlg.remove() });
          root.append(dlg);
        } }))),
    section('COULEURS', 'Jetons CSS — jamais de valeur en dur dans les écrans.', swatches),
    section('TYPOGRAPHIE', 'Trois familles : titres, texte courant, monospace.', typography),
    section('BOUTONS', 'Quatre variantes, deux tailles.', buttons),
    section('BADGES', 'Étiquettes d\'état et de catégorie.', badges),
    section('MASCOTTES & AVATARS', 'Identité visuelle des robots.', robots, avatars),
    section('CHAMPS & CURSEURS', 'Saisie et réglages de stratégie.', Field('Nom du robot', { value: 'Atné' }), sliders),
    section('CARTES-FONCTIONNALITÉS', 'Enseignes de navigation de l\'accueil.', feature),
  );
  return root;
}
