// ============================================
// CAMERA SYSTEM - Cidade Morta: Último Refúgio
// Câmera FPS com Pointer Lock API
// ============================================

class CameraSystem {
    constructor() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.pitch = 0;
        this.yaw = 0;
        this.sensitivity = 0.002;
        this.isLocked = false;
        this.headBob = 0;
        this.headBobSpeed = 10;
        this.headBobAmount = 0.05;
        this.isMoving = false;
        this.targetFOV = 75;
        this.currentFOV = 75;
        this.touchLook = false;
        this.lastTouch = null;
    }

    init() {
        this.camera.position.set(0, 1.7, 0);

        // Pointer Lock
        document.addEventListener('click', () => {
            if (!this.isLocked && Game.state === 'playing') {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === document.body;
            document.body.style.cursor = this.isLocked ? 'none' : 'default';
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isLocked) return;
            this.yaw -= e.movementX * this.sensitivity;
            this.pitch -= e.movementY * this.sensitivity;
            this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
        });


        // Controle de câmera no celular: arrastar dedo para olhar
        // Mobile: somente lado direito controla a câmera
        document.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            if (t.clientX > window.innerWidth * 0.5) {
                this.touchLook = true;
                this.lastTouch = t;
            } else {
                this.touchLook = false;
                this.lastTouch = null;
            }
        }, {passive:true});

        document.addEventListener('touchmove', (e) => {
            if (!this.touchLook || !this.lastTouch || Game.state !== 'playing') return;
            const t = e.touches[0];
            const dx = t.clientX - this.lastTouch.clientX;
            const dy = t.clientY - this.lastTouch.clientY;
            this.yaw -= dx * 0.008;
            this.pitch -= dy * 0.008;
            this.pitch = Math.max(-Math.PI/2+0.01, Math.min(Math.PI/2-0.01, this.pitch));
            this.lastTouch = t;
            e.preventDefault();
        }, {passive:false});

        document.addEventListener('touchend', () => {
            this.touchLook = false;
            this.lastTouch = null;
        }, {passive:true});

        // Resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    }

    update(deltaTime, playerPosition, isMoving, isRunning, isAiming) {
        // Atualizar posição da câmera
        this.camera.position.copy(playerPosition);
        this.camera.position.y += 1.7; // Altura dos olhos

        // Head bob
        this.isMoving = isMoving;
        if (isMoving) {
            const speed = isRunning ? this.headBobSpeed * 1.5 : this.headBobSpeed;
            this.headBob += speed * deltaTime;
            const bobOffset = Math.sin(this.headBob) * this.headBobAmount;
            this.camera.position.y += bobOffset;
        }

        // FOV
        if (isAiming) {
            this.targetFOV = 50;
        } else if (isRunning) {
            this.targetFOV = 85;
        } else {
            this.targetFOV = 75;
        }
        this.currentFOV += (this.targetFOV - this.currentFOV) * 5 * deltaTime;
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();

        // Rotação
        const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
        this.camera.quaternion.setFromEuler(euler);
    }

    getForward() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        dir.y = 0;
        dir.normalize();
        return dir;
    }

    getRight() {
        const dir = new THREE.Vector3(1, 0, 0);
        dir.applyQuaternion(this.camera.quaternion);
        dir.y = 0;
        dir.normalize();
        return dir;
    }

    getLookDirection() {
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyQuaternion(this.camera.quaternion);
        return dir;
    }

    shake(intensity = 0.1, duration = 0.2) {
        const startTime = performance.now();
        const originalPitch = this.pitch;
        const originalYaw = this.yaw;

        const shakeInterval = setInterval(() => {
            const elapsed = (performance.now() - startTime) / 1000;
            if (elapsed >= duration) {
                clearInterval(shakeInterval);
                return;
            }
            const factor = 1 - elapsed / duration;
            this.pitch = originalPitch + (Math.random() - 0.5) * intensity * factor;
            this.yaw = originalYaw + (Math.random() - 0.5) * intensity * factor;
        }, 16);
    }
}
