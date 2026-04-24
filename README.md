# 🎲 Rubik's Cube 3D Interactif

Jeu Rubik's Cube 3D en `Three.js` + `TypeScript` avec plusieurs tailles de cube, mode de résolution auto et mode guidé "Essayer".

## 🚀 Lancer le projet

```bash
npm install
npm run dev
```

Build production :

```bash
npm run build
npm run preview
```

## 🎮 Fonctionnalités actuelles

- 4 difficultés : `2x2`, `3x3`, `4x4`, `5x5`
- sélection d'une case au clic
- rotation de la face sélectionnée : `↻ Horaire` / `↺ Anti-horaire`
- rotation de couche (y compris couches du milieu) : `H-`, `H+`, `V-`, `V+`
- `Mélanger` (scramble) sans incrémenter le compteur de coups
- fenêtre `Solution` avec 2 choix :
  - `Essayer` : panneau guide persistant et déplaçable (mobile + desktop)
  - `Résoudre auto` : résolution automatique animée

## ⏱️ Règles chrono / compteur

- Le chrono ne démarre pas sur `Mélanger`.
- Le chrono démarre au premier mouvement manuel joueur.
- En `Résoudre auto`, le chrono est remis à zéro et mesure le temps de l'auto-résolution.
- Le compteur de coups ne compte pas les mouvements du `Mélanger`.

## 📁 Structure utile

```txt
rubiks-cube/
├── src/
│   ├── ts/
│   │   ├── main.ts
│   │   ├── RubiksGame.ts
│   │   ├── RubiksCube.ts
│   │   └── types.ts
│   └── css/
│       └── game.css
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── framework/
│   └── framework.js   # placeholder non utilisé
└── dist/              # généré par `npm run build`
```

## 🛠️ Stack

- `three`
- `typescript`
- `vite`

---

Projet pédagogique / interactif autour du Rubik's Cube.
