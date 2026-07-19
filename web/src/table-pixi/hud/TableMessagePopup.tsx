export interface TableMessagePopupProps {
  outcome: 'win' | 'lose';
  title: string;
  us: number;
  them: number;
  countdown?: number;
  footer?: string;
}

/** EndRoundPopup — design-system: banner (win gold / lose slate), scores, countdown. */
export function TableMessagePopup({ outcome, title, us, them, countdown, footer }: TableMessagePopupProps) {
  return (
    <div className="px-scrim">
      <div className="ky-end">
        <span className={`ky-end__banner ky-end__banner--${outcome}`}>{outcome === 'win' ? 'Victoire' : 'Défaite'}</span>
        <h3 className="ky-end__title">{title}</h3>
        <div className="ky-end__scores">
          <div className="ky-end__scoreblock"><span className="ky-end__label">Nous</span><span className="ky-end__num">{us}</span></div>
          <div className="ky-end__scoreblock"><span className="ky-end__label">Eux</span><span className="ky-end__num">{them}</span></div>
        </div>
        {countdown != null && countdown > 0 && <div className="ky-end__countdown">{countdown}</div>}
        {footer && <div className="ky-end__foot">{footer}</div>}
      </div>
    </div>
  );
}
