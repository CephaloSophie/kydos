Tableau récapitulatif de fin de partie : une ligne par donne, totaux de manche, vainqueur surligné en gold.

```jsx
<RecapTable teamA={{name:'Les Atouts'}} teamB={{name:'Capot City'}} winner="a"
  rows={[
    {label:'Donne 1', a:82, b:80, contract:'110 ♥'},
    {label:'Donne 2', a:0, b:160, contract:'Capot · contré', roundEnd:true},
  ]} />
```
