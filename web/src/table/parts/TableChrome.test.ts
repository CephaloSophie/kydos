import { describe, it, expect } from 'vitest';
import { FeltBackdrop, TableToast, PlayerSeat } from './TableChrome';

describe('TableChrome — composants autonomes', () => {
  it('FeltBackdrop : null sans atout', () => {
    expect(FeltBackdrop({ atout: null })).toBeNull();
  });
  it('FeltBackdrop : rend un fragment avec atout', () => {
    const el: any = FeltBackdrop({ atout: { sym: '♠', red: false }, corners: true });
    expect(el).not.toBeNull();
  });
  it('TableToast : null sans message', () => {
    expect(TableToast({ message: null })).toBeNull();
  });
  it('TableToast : rend avec message', () => {
    const el: any = TableToast({ message: 'Pli !' });
    expect(el).not.toBeNull();
    expect(el.props.children).toBe('Pli !');
  });
  it('PlayerSeat : produit un élément (siège présentationnel)', () => {
    const el: any = PlayerSeat({ dir: 'south', team: 'a', name: 'Alice', logoName: 'A & C',
      isDonneur: true, isEntame: false, isMeneur: true, demande: null, contre: 'none' });
    expect(el).not.toBeNull();
    expect(el.props.className).toContain('gt-seat');
    expect(el.props.className).toContain('active');
  });
});
