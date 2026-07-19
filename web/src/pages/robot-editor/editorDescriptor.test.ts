import { describe, it, expect } from 'vitest';
import { describeBrain, describeProject, describeEditor, RETURN_COLORS, EDITOR_LAYOUT, TOOLBOX_DESCRIPTOR } from './editorDescriptor';

describe('editorDescriptor — tout est représentable en JSON', () => {
  it('describeBrain : contrat + custom, couleurs par type', () => {
    const d = describeBrain('MonCerveau', 'noir', [{ key: 'scoreCarte', params: 'ctx, carte', returns: 'number' }]);
    expect(d.name).toBe('MonCerveau');
    // 4 fonctions du contrat + 1 custom
    expect(d.functions.length).toBe(5);
    const bid = d.functions.find((f) => f.key === 'decideBid')!;
    expect(bid.color).toBe(RETURN_COLORS.BidDecision);
    const custom = d.functions.find((f) => f.key === 'scoreCarte')!;
    expect(custom.custom).toBe(true);
    expect(custom.params).toBe('ctx, carte');
  });

  it('describeProject : versions résumées', () => {
    const p = describeProject({ title: 'P', activeVersion: 0, versions: [
      { label: 'V-1.0.0', brainName: 'X', functions: [{ key: 'decideBid', params: 'ctx', returns: '', body: '', custom: false }], generatedCode: '', previewSettings: null },
    ] } as any);
    expect(p.versions[0].label).toBe('V-1.0.0');
    expect(p.versions[0].functionCount).toBe(1);
  });

  it('describeEditor : snapshot complet sérialisable', () => {
    const snap = describeEditor({ name: 'X', theme: 'noir', customFns: [], project: null });
    const json = JSON.stringify(snap);
    expect(json).toContain('kanto-aplo/brain-editor@1');
    const back = JSON.parse(json);
    expect(back.layout.length).toBe(EDITOR_LAYOUT.length);
    expect(back.toolbox.sections.length).toBe(TOOLBOX_DESCRIPTOR.sections.length);
  });
});
