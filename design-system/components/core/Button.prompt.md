Bouton d'action de Contrée — l'action atout (`primary`, gold) jusqu'à l'action discrète (`ghost`).

```jsx
<Button variant="primary" onClick={join}>Rejoindre la table</Button>
<Button variant="secondary" iconLeft={<IconEye/>}>Observer</Button>
<Button variant="ghost" size="sm">Annuler</Button>
<Button variant="danger" loading>Supprimer</Button>
```

Variantes : `primary` (gold), `secondary` (surface), `ghost` (texte), `danger` (rouge), `spark` (cyan esport, réservé aux actions « live »). Tailles `sm | md | lg`. `loading` injecte un spinner et passe `aria-busy`. Couleurs 100 % tokens.
