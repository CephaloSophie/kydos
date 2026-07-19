Tapis de jeu desktop : 4 sièges (N/E/S/O), pli central animé, panneau du pli précédent, atout au centre. Le siège actif est surligné gold.

```jsx
<TableFelt
  atout="hearts"
  seats={[
    {dir:'south', name:'Vous', team:'Les Atouts', cards:7, active:true},
    {dir:'west', name:'Iznogoud', team:'Capot City', isRobot:true, cards:7},
    {dir:'north', name:'Partenaire', team:'Les Atouts', cards:7},
    {dir:'east', name:'Roboubelot', team:'Capot City', isRobot:true, cards:7},
  ]}
  trick={{ south:{rank:'A',suit:'hearts',winning:true}, west:{rank:'9',suit:'hearts'} }}
  prevTrick={[{rank:'R',suit:'spades'},{rank:'7',suit:'spades'}]} />
```

Composer la main du joueur via `children` (rangée de `PlayingCard` en bas).
