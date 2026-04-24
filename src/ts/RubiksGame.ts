/**
 * Rubik's Cube Game
 * Gestion du jeu avec Three.js
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RubiksCube } from './RubiksCube';
import { Difficulty, Solution } from './types';

type FaceMoveBase = 'R' | 'L' | 'U' | 'D' | 'F' | 'B';
type RotationAxisMode = 'horizontal' | 'vertical';
type RotationDirection = 'positive' | 'negative';
type ScreenDirection = 'up' | 'down' | 'left' | 'right';

export class RubiksGame {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    
    private cube: RubiksCube;
    private currentDifficulty: Difficulty;
    
    private startTime: number;
    private elapsedTime: number;
    private timerInterval?: number;
    private timerStartedByPlayer: boolean;
    
    private solution: Solution;
    
    private onUpdateCallback?: () => void;
    private onSelectionChangeCallback?: (selectedFace: FaceMoveBase | null) => void;
    private raycaster: THREE.Raycaster;
    private pointer: THREE.Vector2;
    private pointerDownPos: { x: number; y: number } | null;
    private selectedMoveBase: FaceMoveBase | null;
    private selectedMesh: THREE.Mesh | null;
    private selectedMaterialIndex: number | null;
    private selectedMaterialState: { emissive: number; emissiveIntensity: number } | null;

    constructor() {
        // Initialiser Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        
        this.camera = new THREE.PerspectiveCamera(
            50,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);
        
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.minDistance = 8;
        this.controls.maxDistance = 30;
        this.controls.enablePan = false;
        this.controls.mouseButtons.RIGHT = null as unknown as THREE.MOUSE;
        
        this.currentDifficulty = {
            id: 'medium',
            name: '3×3 Classique',
            size: 3,
            scrambleMoves: 20,
            description: 'Le cube classique'
        };
        
        this.cube = new RubiksCube(this.scene, 3);
        
        this.startTime = 0;
        this.elapsedTime = 0;
        this.timerStartedByPlayer = false;
        
        this.solution = {
            moves: [],
            currentStep: 0,
            isPlaying: false
        };
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.pointerDownPos = null;
        this.selectedMoveBase = null;
        this.selectedMesh = null;
        this.selectedMaterialIndex = null;
        this.selectedMaterialState = null;
        
        this.setupScene();
        this.setupCallbacks();
        this.setupMouseControls();
        
        this.camera.position.set(8, 8, 12);
        this.camera.lookAt(0, 0, 0);
        
        window.addEventListener('resize', () => this.onResize());
    }

    private setupMouseControls(): void {
        const canvas = this.renderer.domElement;
        canvas.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return;
            this.pointerDownPos = { x: event.clientX, y: event.clientY };
        });

        canvas.addEventListener('mouseup', (event) => {
            if (event.button !== 0 || !this.pointerDownPos) return;

            const dx = event.clientX - this.pointerDownPos.x;
            const dy = event.clientY - this.pointerDownPos.y;
            this.pointerDownPos = null;
            if (this.cube.getState().isAnimating) return;

            const dragDistanceSquared = (dx * dx) + (dy * dy);
            if (dragDistanceSquared > 25) return;

            this.selectStickerFromPointerEvent(event);
        });
    }

    private getRaycastHit(event: MouseEvent): THREE.Intersection | null {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersections = this.raycaster.intersectObjects(this.cube.getCubeGroup().children, false);
        const hit = intersections.find((intersection) => intersection.face !== null) || null;
        if (!hit || !hit.face || !(hit.object instanceof THREE.Mesh)) {
            return null;
        }
        return hit;
    }

    private getMoveBaseFromHit(hit: THREE.Intersection): FaceMoveBase | null {
        if (!hit.face) return null;

        const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
        const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
        const absX = Math.abs(worldNormal.x);
        const absY = Math.abs(worldNormal.y);
        const absZ = Math.abs(worldNormal.z);

        if (absX >= absY && absX >= absZ) {
            return worldNormal.x >= 0 ? 'R' : 'L';
        }
        if (absY >= absX && absY >= absZ) {
            return worldNormal.y >= 0 ? 'U' : 'D';
        }
        return worldNormal.z >= 0 ? 'F' : 'B';
    }

    private clearSelectionHighlight(): void {
        if (!this.selectedMesh || this.selectedMaterialIndex === null || !this.selectedMaterialState) {
            return;
        }
        const materials = this.selectedMesh.material as THREE.Material[];
        const material = materials[this.selectedMaterialIndex] as THREE.MeshStandardMaterial | undefined;
        if (!material) return;
        material.emissive.setHex(this.selectedMaterialState.emissive);
        material.emissiveIntensity = this.selectedMaterialState.emissiveIntensity;
        material.needsUpdate = true;
    }

    private clearSelection(notify: boolean = true): void {
        this.clearSelectionHighlight();
        this.selectedMoveBase = null;
        this.selectedMesh = null;
        this.selectedMaterialIndex = null;
        this.selectedMaterialState = null;
        if (notify && this.onSelectionChangeCallback) {
            this.onSelectionChangeCallback(null);
        }
    }

    private selectStickerFromPointerEvent(event: MouseEvent): void {
        const hit = this.getRaycastHit(event);
        if (!hit || !(hit.object instanceof THREE.Mesh) || !hit.face) {
            this.clearSelection();
            return;
        }

        const moveBase = this.getMoveBaseFromHit(hit);
        if (!moveBase) {
            this.clearSelection();
            return;
        }

        this.clearSelection(false);

        const materialIndex = hit.face.materialIndex;
        const materials = hit.object.material as THREE.Material[];
        const selectedMaterial = materials[materialIndex] as THREE.MeshStandardMaterial | undefined;
        if (!selectedMaterial) {
            this.clearSelection();
            return;
        }

        this.selectedMoveBase = moveBase;
        this.selectedMesh = hit.object;
        this.selectedMaterialIndex = materialIndex;
        this.selectedMaterialState = {
            emissive: selectedMaterial.emissive.getHex(),
            emissiveIntensity: selectedMaterial.emissiveIntensity
        };

        selectedMaterial.emissive.setHex(0xffffff);
        selectedMaterial.emissiveIntensity = 0.8;
        selectedMaterial.needsUpdate = true;

        if (this.onSelectionChangeCallback) {
            this.onSelectionChangeCallback(moveBase);
        }
    }

    setupScene(): void {
        // Lumières
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        mainLight.position.set(10, 15, 10);
        mainLight.castShadow = true;
        mainLight.shadow.camera.left = -10;
        mainLight.shadow.camera.right = 10;
        mainLight.shadow.camera.top = 10;
        mainLight.shadow.camera.bottom = -10;
        mainLight.shadow.mapSize.width = 2048;
        mainLight.shadow.mapSize.height = 2048;
        this.scene.add(mainLight);

        const fillLight = new THREE.DirectionalLight(0x667eea, 0.4);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);

        const backLight = new THREE.DirectionalLight(0xf093fb, 0.3);
        backLight.position.set(0, 5, -10);
        this.scene.add(backLight);

        // Sol avec reflet
        const floorGeometry = new THREE.CircleGeometry(20, 64);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            roughness: 0.2,
            metalness: 0.8,
            transparent: true,
            opacity: 0.5
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -3;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Grille
        const gridHelper = new THREE.GridHelper(20, 40, 0x667eea, 0x333344);
        gridHelper.position.y = -2.99;
        this.scene.add(gridHelper);

        // Particules de fond
        this.createParticles();
    }

    createParticles(): void {
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 500;
        const positions = [];

        for (let i = 0; i < particleCount; i++) {
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            positions.push(x, y, z);
        }

        particleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

        const particleMaterial = new THREE.PointsMaterial({
            color: 0x667eea,
            size: 0.1,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });

        const particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(particles);
    }

    setupCallbacks(): void {
        this.cube.setOnMoveCallback(() => {
            this.updateUI();
        });

        this.cube.setOnSolvedCallback(() => {
            this.stopTimer();
            this.showVictory();
        });
    }

    async scramble(): Promise<void> {
        this.stopTimer();
        this.elapsedTime = 0;
        this.timerStartedByPlayer = false;
        await this.cube.scramble(this.currentDifficulty.scrambleMoves);
        this.updateUI();
    }

    reset(): void {
        this.cube.reset();
        this.clearSelection();
        this.stopTimer();
        this.elapsedTime = 0;
        this.timerStartedByPlayer = false;
        this.solution = {
            moves: [],
            currentStep: 0,
            isPlaying: false
        };
        this.updateUI();
    }

    async solve(): Promise<void> {
        // Chrono dédié à la résolution automatique :
        // on repart de 0 pour afficher le temps réellement mis par l'auto-solve.
        this.stopTimer();
        this.elapsedTime = 0;
        this.startTimer();

        const solutionMoves = this.cube.getSolution();
        this.solution = {
            moves: solutionMoves,
            currentStep: 0,
            isPlaying: true
        };

        for (let i = 0; i < solutionMoves.length; i++) {
            this.solution.currentStep = i;
            this.updateUI();
            await this.cube.rotate(solutionMoves[i], true);
            await this.sleep(100);
        }

        this.solution.isPlaying = false;
        this.updateUI();
    }

    changeDifficulty(difficulty: Difficulty): void {
        this.currentDifficulty = difficulty;
        this.cube.changeSize(difficulty.size);
        this.reset();
    }

    startTimer(): void {
        // Reprendre depuis elapsedTime pour permettre pause/reprise sans perdre le temps.
        this.startTime = Date.now() - this.elapsedTime;
        this.timerInterval = window.setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateUI();
        }, 100);
    }

    stopTimer(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = undefined;
        }
    }

    getFormattedTime(): string {
        const seconds = Math.floor(this.elapsedTime / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getCubeState() {
        return this.cube.getState();
    }

    // Expose the renderer canvas so UI code can attach pointer handlers
    public getCanvasElement(): HTMLCanvasElement {
        return this.renderer.domElement as HTMLCanvasElement;
    }

    // Given client coordinates, return the face base (R/L/U/D/F/B) or null
    public getFaceFromClientCoords(clientX: number, clientY: number): FaceMoveBase | null {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersections = this.raycaster.intersectObjects(this.cube.getCubeGroup().children, false);
        const hit = intersections.find((intersection) => intersection.face !== null) || null;
        if (!hit || !hit.face || !(hit.object instanceof THREE.Mesh)) return null;
        return this.getMoveBaseFromHit(hit);
    }

    getSolution() {
        return this.solution;
    }

    getSuggestedSolutionMoves(): string[] {
        return this.cube.getSolution();
    }

    // Permet d'exécuter un mouvement depuis l'UI
    async performMove(move: string, animate: boolean = true): Promise<void> {
        this.startTimerOnFirstManualMove();
        // Déléguer à RubiksCube.rotate
        // `Move` est un type alias pour string dans types.ts, donc on peut passer directement
        // mais on garde la signature en string ici pour simplicité côté UI.
        // Empêcher d'exécuter si une animation est en cours
        if (this.cube && typeof (this.cube as any).rotate === 'function') {
            await (this.cube as any).rotate(move, animate);
            this.updateUI();
        }
    }

    async rotateSelectedFace(clockwise: boolean): Promise<void> {
        if (!this.selectedMoveBase) return;
        const move = `${this.selectedMoveBase}${clockwise ? '' : "'"}`;
        await this.performMove(move);
    }

    async rotateSelectedWithMode(_axis: RotationAxisMode, direction: RotationDirection): Promise<void> {
        if (!this.selectedMoveBase) return;

        // Les flèches pilotent toujours la face sélectionnée pour éviter
        // les rotations de la face voisine (source principale de confusion).
        // Axe horizontal/vertical garde une sémantique UI, le sens reste explicite.
        const clockwise = direction === 'positive';
        const move = `${this.selectedMoveBase}${clockwise ? '' : "'"}`;
        await this.performMove(move);
    }

    async rotateSelectedSlice(axisMode: RotationAxisMode, direction: RotationDirection): Promise<void> {
        if (!this.selectedMesh) return;
        if (this.cube.getState().isAnimating) return;
        this.startTimerOnFirstManualMove();

        // horizontal -> axe Y (lignes), vertical -> axe X (colonnes)
        const axis: 'x' | 'y' = axisMode === 'horizontal' ? 'y' : 'x';
        const position = this.selectedMesh.position;
        const layer = axis === 'x' ? position.x : position.y;

        // By default map positive/negative to clockwise/anticlockwise
        let clockwise = direction === 'positive';

        // For left/right faces (L/R) the perceived direction for vertical
        // moves is inverted compared to face-local clockwise. Invert the
        // boolean so V+ / V- behave as vertical moves instead of rotating
        // the face clockwise/anticlockwise.
        if (this.selectedMoveBase === 'L' || this.selectedMoveBase === 'R') {
            clockwise = !clockwise;
        }

        await this.cube.rotateLayer(axis, layer, clockwise, true);
        this.updateUI();
    }

    private startTimerOnFirstManualMove(): void {
        if (this.timerStartedByPlayer) return;
        this.timerStartedByPlayer = true;
        this.startTimer();
    }

    async rotateSelectedToward(screenDirection: ScreenDirection): Promise<void> {
        if (!this.selectedMoveBase) return;

        const targetScreenDirection = this.getScreenDirectionVector(screenDirection);
        const stickerCenter = this.getSelectedStickerWorldCenter();

        if (!stickerCenter) {
            const clockwiseFallback = screenDirection === 'up' || screenDirection === 'left';
            const move = `${this.selectedMoveBase}${clockwiseFallback ? '' : "'"}`;
            await this.performMove(move);
            return;
        }

        const axis = this.getWorldAxisForMoveBase(this.selectedMoveBase).normalize();
        const radial = stickerCenter.clone();

        // Vitesse tangentielle instantanée pour un angle positif: v = axis × radial
        const tangentPositive = axis.clone().cross(radial);
        const tangentNegative = tangentPositive.clone().negate();

        // Projection locale en écran (plus stable que comparer des points à 90°).
        const positiveDelta = this.projectScreenDelta(stickerCenter, tangentPositive);
        const negativeDelta = this.projectScreenDelta(stickerCenter, tangentNegative);

        const positiveScore = positiveDelta.dot(targetScreenDirection);
        const negativeScore = negativeDelta.dot(targetScreenDirection);
        const clockwise = positiveScore >= negativeScore;

        const move = `${this.selectedMoveBase}${clockwise ? '' : "'"}`;
        await this.performMove(move);
    }

    private getScreenDirectionVector(direction: ScreenDirection): THREE.Vector2 {
        switch (direction) {
            case 'up':
                return new THREE.Vector2(0, 1);
            case 'down':
                return new THREE.Vector2(0, -1);
            case 'left':
                return new THREE.Vector2(-1, 0);
            case 'right':
                return new THREE.Vector2(1, 0);
        }
    }

    private projectScreenDelta(originWorld: THREE.Vector3, worldDirection: THREE.Vector3): THREE.Vector2 {
        const dirLen = worldDirection.length();
        if (dirLen < 1e-8) return new THREE.Vector2(0, 0);

        const epsilon = 0.2;
        const start = originWorld.clone().project(this.camera);
        const end = originWorld
            .clone()
            .add(worldDirection.clone().normalize().multiplyScalar(epsilon))
            .project(this.camera);

        const delta = new THREE.Vector2(end.x - start.x, end.y - start.y);
        if (delta.lengthSq() < 1e-12) return new THREE.Vector2(0, 0);
        return delta.normalize();
    }

    private getWorldAxisForMoveBase(moveBase: FaceMoveBase): THREE.Vector3 {
        if (moveBase === 'R' || moveBase === 'L') return new THREE.Vector3(1, 0, 0);
        if (moveBase === 'U' || moveBase === 'D') return new THREE.Vector3(0, 1, 0);
        return new THREE.Vector3(0, 0, 1);
    }

    private getSelectedStickerWorldCenter(): THREE.Vector3 | null {
        if (!this.selectedMesh || this.selectedMaterialIndex === null) return null;

        const faceNormals: THREE.Vector3[] = [
            new THREE.Vector3(1, 0, 0),   // right
            new THREE.Vector3(-1, 0, 0),  // left
            new THREE.Vector3(0, 1, 0),   // top
            new THREE.Vector3(0, -1, 0),  // bottom
            new THREE.Vector3(0, 0, 1),   // front
            new THREE.Vector3(0, 0, -1)   // back
        ];

        const localNormal = faceNormals[this.selectedMaterialIndex];
        if (!localNormal) return null;

        // Le sticker est proche de la surface du cubie (taille ~0.98).
        const localCenter = localNormal.clone().multiplyScalar(0.49);
        return this.selectedMesh.localToWorld(localCenter);
    }

    setOnSelectionChangeCallback(callback: (selectedFace: FaceMoveBase | null) => void): void {
        this.onSelectionChangeCallback = callback;
    }

    getSelectedFace(): FaceMoveBase | null {
        return this.selectedMoveBase;
    }

    getCurrentDifficulty() {
        return this.currentDifficulty;
    }

    setOnUpdateCallback(callback: () => void): void {
        this.onUpdateCallback = callback;
    }

    updateUI(): void {
        if (this.onUpdateCallback) {
            this.onUpdateCallback();
        }
    }

    showVictory(): void {
        const banner = document.createElement('div');
        banner.className = 'solved-banner';
        banner.innerHTML = `
            <h2>🎉 RÉSOLU ! 🎉</h2>
            <p>Temps: ${this.getFormattedTime()}</p>
            <p>Mouvements: ${this.getCubeState().moveCount}</p>
        `;
        document.body.appendChild(banner);

        setTimeout(() => {
            banner.remove();
        }, 5000);
    }

    onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    update(): void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
