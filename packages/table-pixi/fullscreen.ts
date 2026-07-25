// ============================================================================
//  Fullscreen + landscape helpers for phones.
//  On mobile, the table is meant to be played fullscreen in landscape.
// ============================================================================

/** True when the viewport looks like a phone (coarse pointer + small side). */
export function isPhone(): boolean {
  if (typeof window === 'undefined') return false;
  const small = Math.min(window.innerWidth, window.innerHeight) <= 500;
  const coarse = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
  return small && coarse;
}

/** Request fullscreen on an element (best effort, cross-browser). */
export async function enterFullscreen(el: HTMLElement): Promise<void> {
  const anyEl = el as any;
  try {
    if (el.requestFullscreen) await el.requestFullscreen();
    else if (anyEl.webkitRequestFullscreen) anyEl.webkitRequestFullscreen();
  } catch { /* user gesture may be required; ignore */ }
  // Try to lock the orientation to landscape (only works in fullscreen on Android).
  try { await (screen.orientation as any)?.lock?.('landscape'); } catch { /* unsupported */ }
}

/** Leave fullscreen (best effort). */
export async function exitFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
  } catch { /* ignore */ }
  try { (screen.orientation as any)?.unlock?.(); } catch { /* ignore */ }
}

export function isFullscreen(): boolean {
  return typeof document !== 'undefined' && !!document.fullscreenElement;
}
