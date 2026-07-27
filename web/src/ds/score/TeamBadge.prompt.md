Identicon de clan 5×5 (façon GitHub) + couleur HSL dérivée du nom. Le helper `teamColor(name)` est la source de vérité à brancher sur `--team-*-h/s/l`.

```jsx
<TeamBadge name="Les Atouts" size={48} showName points={4820} />
<TeamBadge name="Capot City" size={32} animate />

const c = teamColor("Les Atouts"); // { h, s, l }
el.style.setProperty('--team-a-h', c.h);
```

Déterministe : même nom → même motif + même couleur. Aucune couleur en dur.
