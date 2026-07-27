Bandeau de score temps réel : équipe A · centre (manche + objectif) · équipe B. Le centre porte le cumul de manche ; `brut` affiche le brut de donne en cours.

```jsx
<ScoreBoard
  teamA={{ name:'Les Atouts', score:1240 }}
  teamB={{ name:'Capot City', score:980 }}
  target={1500} round={2} rounds={3} brut={{ a:82, b:80 }} />
```

`compact` pour le bandeau fixe mobile / la vue spectateur. Le score se relance en `anim-score-tick` à chaque changement.
