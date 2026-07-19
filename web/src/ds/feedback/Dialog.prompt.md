Modale centrée + voile. Échap ou clic hors-cadre ferme. Surface web (le mobile préfère le BottomSheet).

```jsx
<Dialog open={open} title="Créer une table" onClose={close}
  footer={<><Button variant="ghost" onClick={close}>Annuler</Button><Button onClick={create}>Créer</Button></>}>
  <Input label="Nom de la table" />
</Dialog>
```
