Curseur de réglage. Cœur de la config robot (agressivité, concentration, vélocité) et de la ControlBar (vitesse, délais).

```jsx
<Slider label="Agressivité" value={agr} min={0} max={1} onChange={setAgr} format={v => v.toFixed(2)} />
<Slider label="Vitesse" value={spd} min={0.25} max={12} step={0.25} format={v => `${v}×`} accent="var(--spark)" />
```

Contrôlé : passe `value` + `onChange(number)`. `format` pour l'unité affichée.
