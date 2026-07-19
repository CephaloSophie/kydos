Carte de Belote. Face (rang + couleur rouge/noir via tokens) ou dos. Tailles `sm | md | lg`.

```jsx
<PlayingCard rank="A" suit="hearts" size="md" playable onClick={play} />
<PlayingCard rank="10" suit="spades" winning />
<PlayingCard faceDown size="sm" />
<PlayingCard rank="V" suit="clubs" disabled />   {/* non jouable */}
```

`playable` = anneau gold + soulèvement au survol ; `winning` = lueur ; `disabled` = atténuée. Couleur déduite de `suit` (jamais en dur).
