/**
 * Rubik's Cube 3D - Terra Numerica
 * Point d'entrée principal
 */

import { RubiksGame } from './RubiksGame';
import { Difficulty } from './types';

// Difficultés disponibles
const DIFFICULTIES: Difficulty[] = [
    {
        id: 'easy',
        name: '2×2 Pocket Cube',
        size: 2,
        scrambleMoves: 10,
        description: 'Parfait pour débuter'
    },
    {
        id: 'medium',
        name: '3×3 Classique',
        size: 3,
        scrambleMoves: 20,
        description: 'Le cube original'
    },
    {
        id: 'hard',
        name: '4×4 Revenge',
        size: 4,
        scrambleMoves: 40,
        description: 'Pour les experts'
    },
    {
        id: 'expert',
        name: '5×5 Professor',
        size: 5,
        scrambleMoves: 60,
        description: 'Défi ultime'
    }
];

// Initialiser le jeu
const game = new RubiksGame();
let pendingSolutionMoves: string[] = [];

// Créer l'interface utilisateur
function createUI(): void {
    // Créer fond animé
    createAnimatedBackground();
    
    // Dashboard
    const dashboard = document.createElement('div');
    dashboard.id = 'dashboard';
    dashboard.innerHTML = `
        <h2>🎲 Rubik's Cube</h2>
        
        <div class="stat-row" style="border-left-color: #667eea;">
            <span class="stat-label">Mouvements:</span>
            <span id="move-count" class="stat-value info">0</span>
        </div>
        
        <div class="stat-row" style="border-left-color: #f093fb;">
            <span class="stat-label">Temps:</span>
            <span id="timer" class="stat-value warning">00:00</span>
        </div>
        
        <div class="stat-row" style="border-left-color: #4ade80;">
            <span class="stat-label">Statut:</span>
            <span id="status" class="stat-value success">Résolu</span>
        </div>
    `;
    document.body.appendChild(dashboard);

    // Sélecteur de difficulté
    const difficultySelector = document.createElement('div');
    difficultySelector.id = 'difficulty-selector';
    difficultySelector.innerHTML = `
        <h3>📊 Difficulté</h3>
        <div class="difficulty-grid" id="difficulty-grid"></div>
    `;
    // Create a right sidebar container to hold difficulty selector and instructions
    let rightSidebar = document.getElementById('right-sidebar') as HTMLElement | null;
    if (!rightSidebar) {
        rightSidebar = document.createElement('div');
        rightSidebar.id = 'right-sidebar';
        document.body.appendChild(rightSidebar);
    }
    rightSidebar.appendChild(difficultySelector);

    // Remplir les difficultés
    const difficultyGrid = document.getElementById('difficulty-grid')!;
    DIFFICULTIES.forEach(diff => {
        const button = document.createElement('button');
        button.className = `difficulty-button ${diff.id}`;
        if (diff.id === 'medium') {
            button.classList.add('active');
        }
        button.innerHTML = `
            <div style="font-size: 20px; margin-bottom: 5px;">${diff.name}</div>
            <div class="difficulty-info">${diff.description}</div>
        `;
        button.addEventListener('click', () => {
            document.querySelectorAll('.difficulty-button').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
            game.changeDifficulty(diff);
            updateUI();
        });
        difficultyGrid.appendChild(button);
    });

    // Contrôles
    const controls = document.createElement('div');
    controls.id = 'controls';
    controls.innerHTML = `
        <button class="game-button warning" id="scramble-btn">🎲 Mélanger</button>
        <button class="game-button info" id="solve-btn">✨ Solution</button>
        <button class="game-button danger" id="reset-btn">🔄 Réinitialiser</button>
        <div id="face-controls">
            <span id="selected-face-label">Carré sélectionné: aucun</span>
            <div id="arrow-controls">
                <button class="game-button arrow-btn" id="rotate-cw-btn" disabled title="Tourner la face dans le sens horaire">↻ Horaire</button>
                <button class="game-button arrow-btn" id="rotate-ccw-btn" disabled title="Tourner la face dans le sens anti-horaire">↺ Anti-horaire</button>
                <button class="game-button arrow-btn" id="rotate-h-neg-btn" disabled title="Tourner la couche horizontale vers la gauche">H-</button>
                <button class="game-button arrow-btn" id="rotate-h-pos-btn" disabled title="Tourner la couche horizontale vers la droite">H+</button>
                <button class="game-button arrow-btn" id="rotate-v-neg-btn" disabled title="Tourner la couche verticale vers le haut">V-</button>
                <button class="game-button arrow-btn" id="rotate-v-pos-btn" disabled title="Tourner la couche verticale vers le bas">V+</button>
            </div>
        </div>
    `;
    document.body.appendChild(controls);

    // Face legend (permanently visible so users know face abbreviations)
    const faceLegend = document.createElement('div');
    faceLegend.id = 'face-legend';
    faceLegend.innerHTML = `
        <div class="legend-title">Faces</div>
        <div class="legend-grid">
            <div class="legend-item"><span class="face-key">U</span><span class="face-name">Up</span></div>
            <div class="legend-item"><span class="face-key">D</span><span class="face-name">Down</span></div>
            <div class="legend-item"><span class="face-key">L</span><span class="face-name">Left</span></div>
            <div class="legend-item"><span class="face-key">R</span><span class="face-name">Right</span></div>
            <div class="legend-item"><span class="face-key">F</span><span class="face-name">Front</span></div>
            <div class="legend-item"><span class="face-key">B</span><span class="face-name">Back</span></div>
        </div>
    `;
    // append legend inside controls so it stays near the game buttons
    controls.appendChild(faceLegend);

    // Instructions
    const instructions = document.createElement('div');
    instructions.id = 'instructions';
    instructions.innerHTML = `
        <h4>🎮 Comment jouer</h4>
        <p><strong>🖱️ Glisser :</strong> Tourner la caméra</p>
        <p><strong>🖱️ Clic sur un carré :</strong> Sélection du carré (surbrillance)</p>
        <p><strong>↻ / ↺ :</strong> Rotation horaire / anti-horaire de la face sélectionnée</p>
        <p><strong>H- / H+ :</strong> Rotation de la couche horizontale de la case sélectionnée</p>
        <p><strong>V- / V+ :</strong> Rotation de la couche verticale de la case sélectionnée</p>
        <p><strong>🎲 Mélanger :</strong> Commence le défi</p>
        <p><strong>✨ Solution :</strong> Résout automatiquement</p>
        <p><strong>🎯 But :</strong> Une couleur par face !</p>
    `;
    // Put instructions into the right sidebar so it stacks with the difficulty selector
    const existingRight = document.getElementById('right-sidebar')!;
    existingRight.appendChild(instructions);

    // Modal de solution
    const modal = document.createElement('div');
    modal.id = 'solution-modal';
    modal.innerHTML = `
        <div class="solution-content">
            <h2>✨ Solution Étape par Étape</h2>
            <div style="display:flex; gap:12px; justify-content:center; margin-bottom: 18px;">
                <button class="game-button info" id="try-solution-btn">🧩 Essayer</button>
                <button class="game-button warning" id="auto-solution-btn">🤖 Résoudre auto</button>
                <button class="game-button" id="close-solution-btn">Fermer</button>
            </div>
            <div class="solution-steps" id="solution-steps"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // Guide manuel persistant (reste affiché pendant que l'utilisateur manipule le cube)
    const manualGuide = document.createElement('div');
    manualGuide.id = 'manual-solution-guide';
    manualGuide.style.position = 'fixed';
    manualGuide.style.left = '20px';
    manualGuide.style.top = '120px';
    manualGuide.style.width = '320px';
    manualGuide.style.maxWidth = 'calc(100vw - 24px)';
    manualGuide.style.maxHeight = '60vh';
    manualGuide.style.overflowY = 'auto';
    manualGuide.style.zIndex = '150';
    manualGuide.style.display = 'none';
    manualGuide.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(30,30,50,0.9)); border: 2px solid #667eea; border-radius: 16px; padding: 16px;">
            <div id="manual-guide-drag-handle" style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom: 10px; cursor: move; touch-action: none;">
                <h3 style="margin:0;">🧩 Mode Essayer</h3>
                <span style="font-size: 12px; opacity: 0.8;">Glisser pour déplacer</span>
            </div>
            <div style="margin-bottom: 12px; font-size: 13px; line-height: 1.45; opacity: 0.95;">
                <p><strong>Comment utiliser ce guide :</strong></p>
                <p>1) Lis le mouvement de l'étape (ex: <strong>R</strong>, <strong>U'</strong>).</p>
                <p>2) Reproduis ce mouvement sur le cube avec les boutons de rotation.</p>
                <p>3) Continue dans l'ordre jusqu'à la dernière étape.</p>
                <p style="opacity:0.85;">Astuce : une lettre avec apostrophe (ex: <strong>R'</strong>) signifie anti-horaire.</p>
            </div>
            <div id="manual-solution-steps"></div>
            <div style="text-align: center; margin-top: 12px;">
                <button class="game-button danger" id="close-manual-guide-btn">Fermer le guide</button>
            </div>
        </div>
    `;
    document.body.appendChild(manualGuide);
    setupDraggableManualGuide(manualGuide);

    // Événements
    document.getElementById('scramble-btn')!.addEventListener('click', async () => {
        await game.scramble();
    });

    document.getElementById('solve-btn')!.addEventListener('click', async () => {
        pendingSolutionMoves = game.getSuggestedSolutionMoves();
        showSolutionModal(pendingSolutionMoves);
    });

    document.getElementById('reset-btn')!.addEventListener('click', () => {
        game.reset();
    });
    document.getElementById('rotate-cw-btn')!.addEventListener('click', async () => {
        await game.rotateSelectedFace(true);
    });
    document.getElementById('rotate-ccw-btn')!.addEventListener('click', async () => {
        await game.rotateSelectedFace(false);
    });
    document.getElementById('rotate-h-neg-btn')!.addEventListener('click', async () => {
        await game.rotateSelectedSlice('horizontal', 'negative');
    });
    document.getElementById('rotate-h-pos-btn')!.addEventListener('click', async () => {
        await game.rotateSelectedSlice('horizontal', 'positive');
    });
    document.getElementById('rotate-v-neg-btn')!.addEventListener('click', async () => {
        await game.rotateSelectedSlice('vertical', 'negative');
    });
    document.getElementById('rotate-v-pos-btn')!.addEventListener('click', async () => {
        await game.rotateSelectedSlice('vertical', 'positive');
    });

    document.getElementById('close-solution-btn')!.addEventListener('click', () => {
        document.getElementById('solution-modal')!.classList.remove('show');
    });
    document.getElementById('try-solution-btn')!.addEventListener('click', () => {
        document.getElementById('solution-modal')!.classList.remove('show');
        showManualGuide(pendingSolutionMoves);
    });
    document.getElementById('auto-solution-btn')!.addEventListener('click', async () => {
        document.getElementById('solution-modal')!.classList.remove('show');
        await game.solve();
    });
    document.getElementById('close-manual-guide-btn')!.addEventListener('click', () => {
        document.getElementById('manual-solution-guide')!.style.display = 'none';
    });

    // Mettre à jour les contrôles de face sélectionnée
    game.setOnSelectionChangeCallback((selectedFace) => {
        const label = document.getElementById('selected-face-label')!;
        const cw = document.getElementById('rotate-cw-btn') as HTMLButtonElement;
        const ccw = document.getElementById('rotate-ccw-btn') as HTMLButtonElement;
        const hNeg = document.getElementById('rotate-h-neg-btn') as HTMLButtonElement;
        const hPos = document.getElementById('rotate-h-pos-btn') as HTMLButtonElement;
        const vNeg = document.getElementById('rotate-v-neg-btn') as HTMLButtonElement;
        const vPos = document.getElementById('rotate-v-pos-btn') as HTMLButtonElement;
        const hasSelection = Boolean(selectedFace);
        label.textContent = hasSelection ? `Carré sélectionné (face ${selectedFace})` : 'Carré sélectionné: aucun';
        cw.disabled = !hasSelection;
        ccw.disabled = !hasSelection;
        hNeg.disabled = !hasSelection;
        hPos.disabled = !hasSelection;
        vNeg.disabled = !hasSelection;
        vPos.disabled = !hasSelection;
    });
}

function createAnimatedBackground(): void {
    const bgCubes = document.createElement('div');
    bgCubes.className = 'background-cubes';
    
    for (let i = 0; i < 10; i++) {
        const cube = document.createElement('div');
        cube.className = 'bg-cube';
        cube.style.left = `${Math.random() * 100}%`;
        cube.style.top = `${100 + Math.random() * 20}%`;
        cube.style.animationDelay = `${Math.random() * 5}s`;
        cube.style.animationDuration = `${15 + Math.random() * 10}s`;
        bgCubes.appendChild(cube);
    }
    
    document.body.appendChild(bgCubes);
}

function showSolutionModal(moves: string[]): void {
    const modal = document.getElementById('solution-modal')!;
    const stepsContainer = document.getElementById('solution-steps')!;
    
    stepsContainer.innerHTML = '';
    
    if (moves.length === 0) {
        stepsContainer.innerHTML = '<p style="text-align: center; color: #4ade80; font-size: 20px;">✅ Déjà résolu !</p>';
    } else {
        moves.forEach((move, index) => {
            const step = document.createElement('div');
            step.className = 'solution-step';
            step.innerHTML = `
                <div class="step-number">Étape ${index + 1}</div>
                <div class="step-move">${move}</div>
                <div class="step-description">${getMoveDescription(move)}</div>
            `;
            stepsContainer.appendChild(step);
        });
    }
    
    modal.classList.add('show');
}

function showManualGuide(moves: string[]): void {
    const guide = document.getElementById('manual-solution-guide')!;
    const stepsContainer = document.getElementById('manual-solution-steps')!;
    stepsContainer.innerHTML = '';

    if (moves.length === 0) {
        stepsContainer.innerHTML = '<p style="text-align: center; color: #4ade80; font-size: 18px;">✅ Cube déjà résolu</p>';
    } else {
        const intro = document.createElement('div');
        intro.className = 'solution-step';
        intro.style.marginBottom = '10px';
        intro.innerHTML = `
            <div class="step-number">🎯 Objectif</div>
            <div class="step-description">Exécute chaque mouvement dans l'ordre. Le cube sera résolu à la fin de la liste.</div>
        `;
        stepsContainer.appendChild(intro);

        moves.forEach((move, index) => {
            const row = document.createElement('div');
            row.className = 'solution-step';
            row.style.marginBottom = '8px';
            row.innerHTML = `
                <div class="step-number">Étape ${index + 1}</div>
                <div class="step-move">${move}</div>
                <div class="step-description">${getMoveDescription(move)}</div>
            `;
            stepsContainer.appendChild(row);
        });
    }

    guide.style.display = 'block';
}

function setupDraggableManualGuide(guide: HTMLElement): void {
    const handle = guide.querySelector('#manual-guide-drag-handle') as HTMLElement | null;
    if (!handle) return;

    let dragging = false;
    let pointerId: number | null = null;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const clampToViewport = (left: number, top: number) => {
        const width = guide.offsetWidth;
        const height = guide.offsetHeight;
        const minLeft = 8;
        const minTop = 8;
        const maxLeft = Math.max(window.innerWidth - width - 8, minLeft);
        const maxTop = Math.max(window.innerHeight - height - 8, minTop);
        return {
            left: Math.min(Math.max(left, minLeft), maxLeft),
            top: Math.min(Math.max(top, minTop), maxTop)
        };
    };

    handle.addEventListener('pointerdown', (event) => {
        dragging = true;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        const rect = guide.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        handle.setPointerCapture(event.pointerId);
        document.body.style.userSelect = 'none';
    });

    handle.addEventListener('pointermove', (event) => {
        if (!dragging || event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const clamped = clampToViewport(startLeft + dx, startTop + dy);
        guide.style.left = `${clamped.left}px`;
        guide.style.top = `${clamped.top}px`;
    });

    const stopDrag = () => {
        dragging = false;
        pointerId = null;
        document.body.style.userSelect = 'auto';
    };

    handle.addEventListener('pointerup', stopDrag);
    handle.addEventListener('pointercancel', stopDrag);

    window.addEventListener('resize', () => {
        if (guide.style.display === 'none') return;
        const rect = guide.getBoundingClientRect();
        const clamped = clampToViewport(rect.left, rect.top);
        guide.style.left = `${clamped.left}px`;
        guide.style.top = `${clamped.top}px`;
    });
}

function getMoveDescription(move: string): string {
    const descriptions: { [key: string]: string } = {
        'R': 'Tourner la face droite dans le sens horaire',
        'R\'': 'Tourner la face droite dans le sens anti-horaire',
        'L': 'Tourner la face gauche dans le sens horaire',
        'L\'': 'Tourner la face gauche dans le sens anti-horaire',
        'U': 'Tourner la face haute dans le sens horaire',
        'U\'': 'Tourner la face haute dans le sens anti-horaire',
        'D': 'Tourner la face basse dans le sens horaire',
        'D\'': 'Tourner la face basse dans le sens anti-horaire',
        'F': 'Tourner la face avant dans le sens horaire',
        'F\'': 'Tourner la face avant dans le sens anti-horaire',
        'B': 'Tourner la face arrière dans le sens horaire',
        'B\'': 'Tourner la face arrière dans le sens anti-horaire'
    };
    return descriptions[move] || 'Mouvement du cube';
}

function updateUI(): void {
    const state = game.getCubeState();
    
    // Mouvements
    document.getElementById('move-count')!.textContent = state.moveCount.toString();
    
    // Timer
    document.getElementById('timer')!.textContent = game.getFormattedTime();
    
    // Statut
    const statusElement = document.getElementById('status')!;
    if (state.isSolved) {
        statusElement.textContent = 'Résolu ✓';
        statusElement.className = 'stat-value success';
    } else {
        statusElement.textContent = 'En cours...';
        statusElement.className = 'stat-value warning';
    }
}

// Callback du jeu
game.setOnUpdateCallback(updateUI);

// Créer l'interface
createUI();
updateUI();

// Setup face hover tooltip (minimal, non-intrusive)
function setupFaceHoverTooltip(gameInstance: RubiksGame) {
    // Defensive checks: ensure helpers exist
    if (typeof (gameInstance as any).getCanvasElement !== 'function' || typeof (gameInstance as any).getFaceFromClientCoords !== 'function') {
        // nothing to do if methods missing
        console.warn('Face hover tooltip not initialized: required methods missing on game instance.');
        return;
    }

    const canvas = gameInstance.getCanvasElement();

    // avoid creating multiple tooltips
    if (document.getElementById('face-tooltip')) return;

    const tooltip = document.createElement('div');
    tooltip.id = 'face-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.display = 'none';
    tooltip.style.zIndex = '600';
    tooltip.style.padding = '6px 8px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.background = 'rgba(20,20,40,0.95)';
    tooltip.style.color = 'white';
    tooltip.style.fontFamily = 'Orbitron, sans-serif';
    tooltip.style.fontSize = '13px';
    document.body.appendChild(tooltip);

    const names: { [k: string]: string } = { U: 'Haut', D: 'Bas', L: 'Gauche', R: 'Droite', F: 'Avant', B: 'Arrière' };

    const onMoveWindow = (ev: PointerEvent) => {
        try {
            const rect = canvas.getBoundingClientRect();
            // if pointer not over canvas area, hide tooltip
            if (ev.clientX < rect.left || ev.clientX > rect.right || ev.clientY < rect.top || ev.clientY > rect.bottom) {
                tooltip.style.display = 'none';
                return;
            }

            const face = gameInstance.getFaceFromClientCoords(ev.clientX, ev.clientY);
            if (!face) {
                tooltip.style.display = 'none';
                return;
            }
            tooltip.style.display = 'block';
            // keep tooltip inside viewport when near edges
            const x = Math.min(ev.clientX + 12, window.innerWidth - 160);
            const y = Math.min(ev.clientY + 12, window.innerHeight - 40);
            tooltip.style.left = `${x}px`;
            tooltip.style.top = `${y}px`;
            tooltip.innerHTML = `<strong>${face}</strong> — ${names[face]}`;
        } catch (err) {
            console.error('Error in face hover handler:', err);
            tooltip.style.display = 'none';
        }
    };

    // listen on window so overlays don't prevent pointermove; handler checks if pointer is inside canvas
    window.addEventListener('pointermove', onMoveWindow);
}

// initialize tooltip
setupFaceHoverTooltip(game);

// Boucle de rendu
function animate(): void {
    requestAnimationFrame(animate);
    game.update();
}

animate();

// Message de bienvenue
setTimeout(() => {
    console.log(`
╔══════════════════════════════════════════════════╗
║         🎲 RUBIK'S CUBE 3D INTERACTIF 🎲       ║
╠══════════════════════════════════════════════════╣
║                                                  ║
║  🎯 Objectif:                                    ║
║     Remettre chaque face d'une seule couleur    ║
║                                                  ║
║  🎮 Contrôles:                                   ║
║     Souris pour tourner la vue                   ║
║     Boutons pour les actions                     ║
║                                                  ║
║  📊 Difficultés:                                 ║
║     2×2 - Pocket Cube (débutant)                ║
║     3×3 - Classique (intermédiaire)             ║
║     4×4 - Revenge (expert)                      ║
║     5×5 - Professor (maître)                    ║
║                                                  ║
║  ✨ Fonctionnalités:                             ║
║     - Mélange automatique                        ║
║     - Solution étape par étape                   ║
║     - Chronomètre intégré                        ║
║     - Compteur de mouvements                     ║
║                                                  ║
╚══════════════════════════════════════════════════╝
    `);
}, 1000);
