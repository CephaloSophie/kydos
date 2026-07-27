Bouton pour une icône seule (barres d'outils, ControlBar, topbar). `label` est obligatoire — il alimente `aria-label` + `title`.

```jsx
<IconButton label="Pause" variant="ghost" active={paused} onClick={togglePause}>
  <IconPause/>
</IconButton>
```

Variantes `ghost | solid | accent`. `active` pose `aria-pressed` et le voile gold.
