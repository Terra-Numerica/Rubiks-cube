/**
 * Rubik's Cube 3D
 * Classe principale avec Three.js
 */

import * as THREE from 'three';
import { Cubie, CubeState, Move } from './types';

export class RubiksCube {
    private scene: THREE.Scene;
    private cubies: Cubie[];
    private cubeGroup: THREE.Group;
    private size: number;
    private state: CubeState;
    
    // Couleurs standard du Rubik's Cube
    private readonly colors = {
        white: 0xFFFFFF,
        yellow: 0xFFFF00,
        red: 0xFF0000,
        orange: 0xFF8800,
        blue: 0x0000FF,
        green: 0x00FF00,
        black: 0x000000
    };
    
    private onMoveCallback?: () => void;
    private onSolvedCallback?: () => void;

    constructor(scene: THREE.Scene, size: number = 3) {
        this.scene = scene;
        this.size = size;
        this.cubies = [];
        this.cubeGroup = new THREE.Group();
        this.scene.add(this.cubeGroup);
        
        this.state = {
            size: size,
            moves: [],
            moveCount: 0,
            isSolved: true,
            isAnimating: false
        };
        
        this.createCube();
    }

    private createCube(): void {
        const gap = 0.05;
        const cubeSize = 1;
        const offset = ((this.size - 1) * (cubeSize + gap)) / 2;

        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                for (let z = 0; z < this.size; z++) {
                    const position = new THREE.Vector3(
                        x * (cubeSize + gap) - offset,
                        y * (cubeSize + gap) - offset,
                        z * (cubeSize + gap) - offset
                    );

                    const cubie = this.createCubie(position, x, y, z);
                    this.cubies.push(cubie);
                    this.cubeGroup.add(cubie.mesh);
                }
            }
        }
    }

    private createCubie(position: THREE.Vector3, x: number, y: number, z: number): Cubie {
        const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
        
        // Créer les matériaux pour chaque face
        const materials: THREE.MeshStandardMaterial[] = [];
        
        // Ordre : right, left, top, bottom, front, back
        const faceColors = [
            x === this.size - 1 ? this.colors.red : this.colors.black,     // Right
            x === 0 ? this.colors.orange : this.colors.black,               // Left
            y === this.size - 1 ? this.colors.white : this.colors.black,   // Top
            y === 0 ? this.colors.yellow : this.colors.black,               // Bottom
            z === this.size - 1 ? this.colors.green : this.colors.black,   // Front
            z === 0 ? this.colors.blue : this.colors.black                  // Back
        ];

        faceColors.forEach(color => {
            materials.push(new THREE.MeshStandardMaterial({
                color: color,
                emissive: color === this.colors.black ? 0x000000 : color,
                emissiveIntensity: color === this.colors.black ? 0 : 0.2,
                roughness: 0.3,
                metalness: 0.5
            }));
        });

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.position.copy(position);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Bordures noires
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x000000,
            linewidth: 2
        });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        mesh.add(wireframe);

        return {
            mesh: mesh,
            position: position.clone(),
            initialPosition: position.clone()
        };
    }

    async rotate(move: Move, animate: boolean = true, countAsMove: boolean = true): Promise<void> {
        if (this.state.isAnimating) return;

        this.state.isAnimating = true;
        this.state.moves.push(move);
        if (countAsMove) {
            this.state.moveCount++;
        }

        const axis = this.getMoveAxis(move);
        const layer = this.getMoveLayer(move);
        const direction = move.includes("'") ? -1 : 1;
        const angle = (Math.PI / 2) * direction;

        const affectedCubies = this.getAffectedCubies(axis, layer);

        if (animate) {
            await this.animateRotation(affectedCubies, axis, angle);
        } else {
            this.applyRotation(affectedCubies, axis, angle);
        }

        this.state.isAnimating = false;
        this.checkSolved();
        
        if (this.onMoveCallback) {
            this.onMoveCallback();
        }
    }

    async rotateLayer(axis: 'x' | 'y' | 'z', layer: number, clockwise: boolean, animate: boolean = true): Promise<void> {
        if (this.state.isAnimating) return;

        this.state.isAnimating = true;
        this.state.moveCount++;

        const angle = (Math.PI / 2) * (clockwise ? 1 : -1);
        const affectedCubies = this.getAffectedCubies(axis, layer);

        if (animate) {
            await this.animateRotation(affectedCubies, axis, angle);
        } else {
            this.applyRotation(affectedCubies, axis, angle);
        }

        this.state.isAnimating = false;
        this.checkSolved();

        if (this.onMoveCallback) {
            this.onMoveCallback();
        }
    }

    private getMoveAxis(move: Move): 'x' | 'y' | 'z' {
        const moveBase = move.replace("'", "");
        switch (moveBase) {
            case 'R':
            case 'L':
                return 'x';
            case 'U':
            case 'D':
                return 'y';
            case 'F':
            case 'B':
                return 'z';
            default:
                return 'x';
        }
    }

    private getMoveLayer(move: Move): number {
        const moveBase = move.replace("'", "");
        const offset = ((this.size - 1) * 1.05) / 2;
        
        switch (moveBase) {
            case 'R':
                return offset;
            case 'L':
                return -offset;
            case 'U':
                return offset;
            case 'D':
                return -offset;
            case 'F':
                return offset;
            case 'B':
                return -offset;
            default:
                return 0;
        }
    }

    private getAffectedCubies(axis: 'x' | 'y' | 'z', layer: number): Cubie[] {
        const tolerance = 0.1;
        return this.cubies.filter(cubie => {
            const pos = cubie.mesh.position;
            const coord = axis === 'x' ? pos.x : axis === 'y' ? pos.y : pos.z;
            return Math.abs(coord - layer) < tolerance;
        });
    }

    private async animateRotation(cubies: Cubie[], axis: 'x' | 'y' | 'z', angle: number): Promise<void> {
        const duration = 300;
        const steps = 20;
        const anglePerStep = angle / steps;
        const timePerStep = duration / steps;

        const rotationAxis = new THREE.Vector3(
            axis === 'x' ? 1 : 0,
            axis === 'y' ? 1 : 0,
            axis === 'z' ? 1 : 0
        );

        for (let i = 0; i < steps; i++) {
            cubies.forEach(cubie => {
                cubie.mesh.position.applyAxisAngle(rotationAxis, anglePerStep);
                cubie.mesh.rotateOnWorldAxis(rotationAxis, anglePerStep);
            });
            await this.sleep(timePerStep);
        }

        // Correction des positions finales
        cubies.forEach(cubie => {
            this.snapPosition(cubie);
        });
    }

    private applyRotation(cubies: Cubie[], axis: 'x' | 'y' | 'z', angle: number): void {
        const rotationAxis = new THREE.Vector3(
            axis === 'x' ? 1 : 0,
            axis === 'y' ? 1 : 0,
            axis === 'z' ? 1 : 0
        );

        cubies.forEach(cubie => {
            cubie.mesh.position.applyAxisAngle(rotationAxis, angle);
            cubie.mesh.rotateOnWorldAxis(rotationAxis, angle);
            this.snapPosition(cubie);
        });
    }

    private snapPosition(cubie: Cubie): void {
        const pos = cubie.mesh.position;
        cubie.mesh.position.set(
            Math.round(pos.x * 20) / 20,
            Math.round(pos.y * 20) / 20,
            Math.round(pos.z * 20) / 20
        );

        const rotation = cubie.mesh.rotation;
        cubie.mesh.rotation.set(
            Math.round(rotation.x / (Math.PI / 2)) * (Math.PI / 2),
            Math.round(rotation.y / (Math.PI / 2)) * (Math.PI / 2),
            Math.round(rotation.z / (Math.PI / 2)) * (Math.PI / 2)
        );
    }

    async scramble(moves: number = 20): Promise<void> {
        const possibleMoves: Move[] = ['R', 'L', 'U', 'D', 'F', 'B', 'R\'', 'L\'', 'U\'', 'D\'', 'F\'', 'B\''];
        
        for (let i = 0; i < moves; i++) {
            const randomMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
            await this.rotate(randomMove, true, false);
        }

        this.state.isSolved = false;
    }

    reset(): void {
        // Supprimer tous les cubies
        this.cubies.forEach(cubie => {
            this.cubeGroup.remove(cubie.mesh);
        });
        this.cubies = [];

        // Recréer le cube
        this.createCube();

        // Reset state
        this.state = {
            size: this.size,
            moves: [],
            moveCount: 0,
            isSolved: true,
            isAnimating: false
        };

        if (this.onMoveCallback) {
            this.onMoveCallback();
        }
    }

    private checkSolved(): void {
        // Vérification simplifiée : toutes les pièces à leur position initiale
        const tolerance = 0.15;
        const solved = this.cubies.every(cubie => {
            const currentPos = cubie.mesh.position;
            const initialPos = cubie.initialPosition;
            
            return (
                Math.abs(currentPos.x - initialPos.x) < tolerance &&
                Math.abs(currentPos.y - initialPos.y) < tolerance &&
                Math.abs(currentPos.z - initialPos.z) < tolerance
            );
        });

        if (solved && !this.state.isSolved && this.state.moveCount > 0) {
            this.state.isSolved = true;
            if (this.onSolvedCallback) {
                this.onSolvedCallback();
            }
        } else {
            this.state.isSolved = solved;
        }
    }

    getState(): CubeState {
        return { ...this.state };
    }

    getCubeGroup(): THREE.Group {
        return this.cubeGroup;
    }

    setOnMoveCallback(callback: () => void): void {
        this.onMoveCallback = callback;
    }

    setOnSolvedCallback(callback: () => void): void {
        this.onSolvedCallback = callback;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Générer une solution simple (inverse des mouvements de mélange)
    getSolution(): Move[] {
        const inverseMoves: { [key in Move]?: Move } = {
            'R': 'R\'', 'R\'': 'R',
            'L': 'L\'', 'L\'': 'L',
            'U': 'U\'', 'U\'': 'U',
            'D': 'D\'', 'D\'': 'D',
            'F': 'F\'', 'F\'': 'F',
            'B': 'B\'', 'B\'': 'B'
        };

        return this.state.moves
            .slice()
            .reverse()
            .map(move => inverseMoves[move] || move);
    }

    changeSize(newSize: number): void {
        this.size = newSize;
        this.reset();
    }
}
