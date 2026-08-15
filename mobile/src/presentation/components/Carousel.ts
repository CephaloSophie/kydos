/* =============================================================================
 * PRESENTATION · components/Carousel.ts (v14.10)
 * -----------------------------------------------------------------------------
 * Carrousel horizontal générique :
 *   • scroll natif (touch + molette) → performant, accessible ;
 *   • flèches ← → à gauche/droite qui font scrollBy en smooth ;
 *   • drag souris pour bureau ;
 *   • extensible : marche pour 3 items comme pour 30 ;
 *   • responsive : les items définissent leur propre largeur (min-content
 *     conseillé) — le carrousel n'impose rien.
 *
 * Utilisation :
 *   const c = Carousel([tile1, tile2, tile3], { itemGap: 8, chromeInset: 24 });
 *   host.append(c);
 * ========================================================================== */
import { h } from '../../core/dom';

interface CarouselOptions {
  /** Espacement entre items (px). */
  itemGap?: number;
  /** Marge intérieure gauche/droite du track (px). */
  chromeInset?: number;
  /** Décalage px pour un clic sur les flèches (défaut : la largeur du viewport). */
  stepPx?: number;
  /** Classe additionnelle pour customiser (background, hauteur…). */
  className?: string;
}

export function Carousel(items: HTMLElement[], opts: CarouselOptions = {}): HTMLElement {
  const gap = opts.itemGap ?? 8;
  const inset = opts.chromeInset ?? 12;

  // Track : conteneur défilable natif. scroll-snap pour un rendu propre.
  const track = h('div', {
    class: 'carousel__track',
    style: {
      display: 'flex', gap: `${gap}px`, padding: `2px ${inset}px`,
      overflowX: 'auto', overflowY: 'hidden',
      scrollBehavior: 'smooth', scrollSnapType: 'x proximity',
      // Cacher scrollbar (croix-plateforme).
      msOverflowStyle: 'none', scrollbarWidth: 'none',
      // Chaque item peut se rétrécir mais pas grandir : min-content conseillé.
      alignItems: 'stretch', minHeight: '0',
    },
  });
  // Firefox/Safari : scrollbar-width; WebKit : ::-webkit-scrollbar via CSS.
  items.forEach((item) => {
    item.style.scrollSnapAlign = 'start';
    item.style.flexShrink = '0';
    track.append(item);
  });

  // Flèches (visibles seulement si le contenu déborde vraiment).
  const arrow = (dir: 'left' | 'right') => h('button', {
    class: `carousel__arrow carousel__arrow--${dir}`,
    onClick: () => {
      const step = opts.stepPx ?? Math.max(120, track.clientWidth - inset * 2);
      track.scrollBy({ left: dir === 'left' ? -step : step, behavior: 'smooth' });
    },
    'aria-label': dir === 'left' ? 'Pr\u00e9c\u00e9dent' : 'Suivant',
    style: {
      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
      [dir]: '2px', zIndex: '3',
      width: '28px', height: '28px', borderRadius: '999px',
      background: 'rgba(6,10,20,.75)', color: 'var(--c-gold)',
      border: '1px solid rgba(240,196,106,.35)',
      cursor: 'pointer', display: 'none',   // affiché seulement si overflow
      alignItems: 'center', justifyContent: 'center',
      fontSize: '14px', fontWeight: '700',
      backdropFilter: 'blur(4px)',
    },
  }, dir === 'left' ? '\u2039' : '\u203a');
  const leftArrow = arrow('left');
  const rightArrow = arrow('right');

  // Racine positionnée pour ancrer les flèches en overlay.
  const root = h('div', {
    class: `carousel ${opts.className ?? ''}`,
    style: { position: 'relative', overflow: 'hidden' },
  }, track, leftArrow, rightArrow) as HTMLElement;

  // Affiche/masque les flèches selon la position du scroll et le débordement.
  const updateArrows = () => {
    const overflows = track.scrollWidth > track.clientWidth + 2;
    if (!overflows) {
      leftArrow.style.display = 'none';
      rightArrow.style.display = 'none';
      return;
    }
    const atStart = track.scrollLeft <= 2;
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    leftArrow.style.display = atStart ? 'none' : 'flex';
    rightArrow.style.display = atEnd ? 'none' : 'flex';
  };
  track.addEventListener('scroll', updateArrows, { passive: true });
  // Premier calcul après montage (le layout doit être fait).
  requestAnimationFrame(() => requestAnimationFrame(updateArrows));
  // Réévalue au resize (window).
  const onResize = () => updateArrows();
  window.addEventListener('resize', onResize, { passive: true });

  // Drag souris (desktop) — permet de "swiper" au clic-maintenu.
  let dragging = false;
  let startX = 0;
  let startScroll = 0;
  track.addEventListener('mousedown', (e) => {
    dragging = true; startX = e.clientX; startScroll = track.scrollLeft;
    track.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  window.addEventListener('mouseup', () => { dragging = false; track.style.cursor = ''; });

  // Cleanup pour ne pas fuiter les listeners globaux.
  (root as any)._cleanup = () => {
    window.removeEventListener('resize', onResize);
  };
  return root;
}
