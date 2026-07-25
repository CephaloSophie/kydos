import { useState } from 'react';

export interface MenuButtonProps {
  onScore(): void;
  onFullscreen(): void;
  onLeave?: () => void;
}

/** MenuButton — design-system hamburger ☰ + dropdown panel. */
export function MenuButton({ onScore, onFullscreen, onLeave }: MenuButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ky-menu">
      <button className="ky-menu__btn" title="Menu" onClick={() => setOpen((o) => !o)}>
        <span /><span /><span />
      </button>
      {open && (
        <div className="ky-menu__panel">
          <button className="ky-menu__item" onClick={() => { setOpen(false); onScore(); }}><span className="ky-menu__ico">▤</span> Feuille de score</button>
          <button className="ky-menu__item" onClick={() => { setOpen(false); onFullscreen(); }}><span className="ky-menu__ico">⛶</span> Plein écran</button>
          {onLeave && <button className="ky-menu__item" onClick={() => { setOpen(false); onLeave(); }}><span className="ky-menu__ico">⏻</span> Quitter la partie</button>}
        </div>
      )}
    </div>
  );
}
