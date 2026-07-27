Pilotage du moteur d'entraînement : pause/play, pas-à-pas, vitesse 0.25×→12×, délais avant/après pli. Émet des events, ne mute jamais l'état du moteur.

```jsx
<ControlBar playing={playing} speed={speed} delayBefore={400} delayAfter={700}
  onTogglePlay={() => setPlaying(p=>!p)} onStep={step} onSpeed={setSpeed}
  onDelayBefore={setBefore} onDelayAfter={setAfter} />
```
