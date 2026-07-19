Champ texte sombre (auth, recherche du lobby, nom de robot).

```jsx
<Input label="Email" type="email" hint="On ne le partage jamais." iconLeft={<IconMail/>} />
<Input label="Nom du robot" error="Déjà pris" defaultValue="Iznogoud" />
```

`error` bascule l'état invalide (bordure rouge + `aria-invalid`). Focus = anneau gold.
