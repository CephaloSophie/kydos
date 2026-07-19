import { describe, it, expect } from 'vitest';
import { fmtCumul } from './ScoreView';

describe('fmtCumul — affichage manuscrit (dizaines, milliers en apostrophes)', () => {
  it('sous 1000 : dizaines sur 2 chiffres, sans apostrophe', () => {
    expect(fmtCumul(950)).toMatchObject({ text: '95', apos: '' });
    expect(fmtCumul(990)).toMatchObject({ text: '99', apos: '' });
    expect(fmtCumul(60)).toMatchObject({ text: '06', apos: '' });
  });
  it('franchissement 1000 : une apostrophe, milliers retirés (1040 -> 04\')', () => {
    expect(fmtCumul(1040)).toMatchObject({ text: '04', apos: "'", thousands: 1 });
    expect(fmtCumul(1500)).toMatchObject({ text: '50', apos: "'", thousands: 1 });
  });
  it('franchissement 2000 : deux apostrophes (2040 -> 04\'\')', () => {
    expect(fmtCumul(2040)).toMatchObject({ text: '04', apos: "''", thousands: 2 });
  });
});
