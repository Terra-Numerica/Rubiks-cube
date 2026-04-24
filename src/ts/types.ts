/**
 * Types pour Rubik's Cube 3D
 */

import * as THREE from 'three';

export type Face = 'front' | 'back' | 'left' | 'right' | 'up' | 'down';
export type Move = 'R' | 'L' | 'U' | 'D' | 'F' | 'B' | 'R\'' | 'L\'' | 'U\'' | 'D\'' | 'F\'' | 'B\'';

export interface Cubie {
    mesh: THREE.Mesh;
    position: THREE.Vector3;
    initialPosition: THREE.Vector3;
}

export interface CubeState {
    size: number;
    moves: Move[];
    moveCount: number;
    isSolved: boolean;
    isAnimating: boolean;
}

export interface Difficulty {
    id: string;
    name: string;
    size: number;
    scrambleMoves: number;
    description: string;
}

export interface Solution {
    moves: Move[];
    currentStep: number;
    isPlaying: boolean;
}
