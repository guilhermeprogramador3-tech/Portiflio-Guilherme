// ============================================
// PLAYER SYSTEM - Cidade Morta: Último Refúgio
// Jogador: movimento, status, colisão
// ============================================

class PlayerSystem {
    constructor() {
        this.position = new THREE.Vector3(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);

        // Status
        this.health = 100;
        this.maxHealth = 100;
        this.hunger = 100;
        this.thirst = 100;
        this.energy = 100;
        this.armor = 0;

        // Movimento
        this.walkSpeed = 5;
        this.runSpeed = 9;
        this.crouchSpeed = 2.5;
        this.jumpForce = 8;
        this.gravity = -20;
        this.isGrounded = true;
        this.isCrouching = false;
        this.isRunning = false;
        this.isAiming = false;

        // Input
        this.keys = {};
        this.moveDirection = new THREE.Vector3();

        // Combate
        this.equippedWeapon = 'fist';
        this.canAttack = true;
        this.attackCooldown = 0;
        this.currentAmmo = {};
        this.reserveAmmo = { pistol: 0, rifle: 0, shotgun: 0 };

        // Interação
        this.interactRange = 3;
        this.interactTarget = null;

        // Status decay
        this.hungerDecay = 0.5; // por minuto
        this.thirstDecay = 0.7;
        this.energyDecay = 0.3;

        // Invulnerabilidade temporária
        this.invulnerable = false;
        this.invulnerableTimer = 0;

        // Mobile
        this.mobileInput = { x: 0, y: 0 };
    }

    init() {
        // Keyboard input
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;

            if (e.code === 'ShiftLeft') this.isRunning = true;
            if (e.code === 'ControlLeft') this.isCrouching = !this.isCrouching;
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            if (e.code === 'ShiftLeft') this.isRunning = false;
        });

        // Mouse
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0 && Game.state === 'playing') this.attack();
            if (e.button === 2) this.isAiming = true;
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 2) this.isAiming = false;
        });

        document.addEventListener('contextmenu', (e) => e.preventDefault());

        // Inicializar munição
        this.currentAmmo = { pistol: 12, rifle: 30, shotgun: 6 };
    }

    update(deltaTime, cameraSystem, colliders) {
        if (Game.state !== 'playing') return;

        // Atualizar cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown <= 0) this.canAttack = true;
        }

        // Invulnerabilidade
        if (this.invulnerable) {
            this.invulnerableTimer -= deltaTime;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }

        // Calcular direção de movimento
        this.moveDirection.set(0, 0, 0);

        const forward = cameraSystem.getForward();
        const right = cameraSystem.getRight();

        // Teclado
        if (this.keys['KeyW']) this.moveDirection.add(forward);
        if (this.keys['KeyS']) this.moveDirection.sub(forward);
        if (this.keys['KeyD']) this.moveDirection.add(right);
        if (this.keys['KeyA']) this.moveDirection.sub(right);

        // Mobile joystick
        if (this.mobileInput.x !== 0 || this.mobileInput.y !== 0) {
            this.moveDirection.add(forward.clone().multiplyScalar(-this.mobileInput.y));
            this.moveDirection.add(right.clone().multiplyScalar(this.mobileInput.x));
        }

        // Normalizar e aplicar velocidade
        if (this.moveDirection.length() > 0) {
            this.moveDirection.normalize();

            let speed = this.walkSpeed;
            if (this.isRunning && this.energy > 0) {
                speed = this.runSpeed;
                this.energy -= 5 * deltaTime;
            }
            if (this.isCrouching) speed = this.crouchSpeed;

            // Efeito de sede baixa
            if (this.thirst < 20) speed *= 0.6;
            // Efeito de energia baixa - não pode correr
            if (this.energy <= 0) {
                this.isRunning = false;
                speed = Math.min(speed, this.walkSpeed);
            }

            this.velocity.x = this.moveDirection.x * speed;
            this.velocity.z = this.moveDirection.z * speed;
        } else {
            this.velocity.x *= 0.85;
            this.velocity.z *= 0.85;
        }

        // Pulo
        if ((this.keys['Space'] || this.mobileJump) && this.isGrounded) {
            this.velocity.y = this.jumpForce;
            this.isGrounded = false;
            this.mobileJump = false;
        }

        // Gravidade
        if (!this.isGrounded) {
            this.velocity.y += this.gravity * deltaTime;
        }

        // Aplicar movimento com colisão simples
        const newPos = this.position.clone();
        newPos.x += this.velocity.x * deltaTime;
        newPos.z += this.velocity.z * deltaTime;
        newPos.y += this.velocity.y * deltaTime;

        // Colisão com chão
        if (newPos.y <= 0) {
            newPos.y = 0;
            this.velocity.y = 0;
            this.isGrounded = true;
        }

        // Colisão com objetos. Mesmo filtro rápido de distância usado na IA
        // dos zumbis (ver zombies.js ensureColliderCache): descarta a
        // maioria dos colliders longe do jogador antes de fazer o cálculo
        // de ponto mais próximo (mais caro, e antes alocava 2 Vector3 novos
        // por collider testado a cada frame).
        if (colliders && colliders.length > 0) {
            const playerRadius = 0.4;
            for (const col of colliders) {
                if (!col.box) continue;
                if (col._r2 === undefined) {
                    const cx = (col.box.min.x + col.box.max.x) / 2;
                    const cz = (col.box.min.z + col.box.max.z) / 2;
                    const halfX = (col.box.max.x - col.box.min.x) / 2;
                    const halfZ = (col.box.max.z - col.box.min.z) / 2;
                    const radius = Math.sqrt(halfX * halfX + halfZ * halfZ) + 1.0;
                    col._cx = cx;
                    col._cz = cz;
                    col._r2 = radius * radius;
                }
                const fdx = newPos.x - col._cx;
                const fdz = newPos.z - col._cz;
                if (fdx * fdx + fdz * fdz > col._r2) continue;

                const closestX = Math.max(col.box.min.x, Math.min(newPos.x, col.box.max.x));
                const closestY = Math.max(col.box.min.y, Math.min(newPos.y + 0.9, col.box.max.y));
                const closestZ = Math.max(col.box.min.z, Math.min(newPos.z, col.box.max.z));
                const dx = newPos.x - closestX;
                const dz = newPos.z - closestZ;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < playerRadius && dist > 0.0001) {
                    const push = (playerRadius - dist) / dist;
                    newPos.x += dx * push;
                    newPos.z += dz * push;
                }
            }
        }

        this.position.copy(newPos);

        // Decay de status
        this.hunger -= this.hungerDecay * deltaTime / 60;
        this.thirst -= this.thirstDecay * deltaTime / 60;

        // Regenerar energia quando parado
        if (!this.isRunning && this.moveDirection.length() === 0) {
            this.energy = Math.min(100, this.energy + 3 * deltaTime);
        }

        // Efeitos de fome
        if (this.hunger <= 0) {
            this.hunger = 0;
            this.health -= 2 * deltaTime; // Perde vida sem comida
        }
        if (this.thirst <= 0) {
            this.thirst = 0;
            this.health -= 3 * deltaTime; // Perde vida sem água
        }

        // Regeneração com fome alta
        if (this.hunger > 80 && this.thirst > 50) {
            this.health = Math.min(this.maxHealth, this.health + 1 * deltaTime);
        }

        // Clamp
        this.health = Math.max(0, Math.min(this.maxHealth, this.health));
        this.hunger = Math.max(0, Math.min(100, this.hunger));
        this.thirst = Math.max(0, Math.min(100, this.thirst));
        this.energy = Math.max(0, Math.min(100, this.energy));

        // Morte
        if (this.health <= 0) {
            Game.playerDied();
        }

        // Atualizar HUD
        this.updateHUD();
    }

    attack() {
        if (!this.canAttack || Game.state !== 'playing') return;

        const weaponData = Game.weaponsSystem.getWeaponData(this.equippedWeapon);
        if (!weaponData) return;

        if (weaponData.type === 'ranged') {
            const ammoType = weaponData.ammoType;
            if (this.currentAmmo[ammoType] <= 0) {
                this.reload();
                return;
            }
            this.currentAmmo[ammoType]--;
            Game.weaponsSystem.fireRanged(weaponData, Game.cameraSystem);
        } else {
            Game.weaponsSystem.swingMelee(weaponData, Game.cameraSystem);
        }

        this.canAttack = false;
        this.attackCooldown = weaponData.speed;
        Game.cameraSystem.shake(0.02, 0.1);

        this.updateWeaponDisplay();
    }

    reload() {
        const weaponData = Game.weaponsSystem.getWeaponData(this.equippedWeapon);
        if (!weaponData || weaponData.type !== 'ranged') return;

        const ammoType = weaponData.ammoType;
        if (this.reserveAmmo[ammoType] <= 0) {
            EffectsSystem.notify('Sem munição de reserva!', 'danger');
            return;
        }

        const needed = weaponData.magSize - this.currentAmmo[ammoType];
        const available = Math.min(needed, this.reserveAmmo[ammoType]);
        this.currentAmmo[ammoType] += available;
        this.reserveAmmo[ammoType] -= available;

        EffectsSystem.notify('Recarregando...', 'info');
        this.canAttack = false;
        this.attackCooldown = weaponData.reloadTime;

        this.updateWeaponDisplay();
    }

    takeDamage(amount) {
        if (this.invulnerable) return;

        // Reduzir dano com armadura
        const actualDamage = amount * (1 - this.armor / 100);
        this.health -= actualDamage;

        // Invulnerabilidade temporária
        this.invulnerable = true;
        this.invulnerableTimer = 0.5;

        // Efeito visual
        Game.cameraSystem.shake(0.05, 0.15);

        if (this.health <= 0) {
            Game.playerDied();
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    feed(hungerAmount, thirstAmount = 0) {
        this.hunger = Math.min(100, this.hunger + hungerAmount);
        if (thirstAmount) this.thirst = Math.min(100, this.thirst + thirstAmount);
    }

    drink(amount) {
        this.thirst = Math.min(100, this.thirst + amount);
    }

    addEnergy(amount) {
        this.energy = Math.min(100, this.energy + amount);
    }

    updateHUD() {
        document.getElementById('health-bar').style.width = this.health + '%';
        document.getElementById('hunger-bar').style.width = this.hunger + '%';
        document.getElementById('thirst-bar').style.width = this.thirst + '%';
        document.getElementById('energy-bar').style.width = this.energy + '%';

        document.getElementById('health-value').textContent = Math.round(this.health);
        document.getElementById('hunger-value').textContent = Math.round(this.hunger);
        document.getElementById('thirst-value').textContent = Math.round(this.thirst);
        document.getElementById('energy-value').textContent = Math.round(this.energy);
    }

    updateWeaponDisplay() {
        const weaponData = Game.weaponsSystem.getWeaponData(this.equippedWeapon);
        if (weaponData) {
            document.getElementById('weapon-name').textContent = weaponData.icon + ' ' + weaponData.name;
            if (weaponData.type === 'ranged') {
                document.getElementById('ammo-count').textContent =
                    this.currentAmmo[weaponData.ammoType] + ' / ' + this.reserveAmmo[weaponData.ammoType];
            } else {
                document.getElementById('ammo-count').textContent = '';
            }
        }
    }

    isMoving() {
        return this.moveDirection.length() > 0.1;
    }

    getState() {
        return {
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            health: this.health,
            hunger: this.hunger,
            thirst: this.thirst,
            energy: this.energy,
            equippedWeapon: this.equippedWeapon
        };
    }

    loadState(state) {
        if (state.position) {
            this.position.set(state.position.x, state.position.y, state.position.z);
        }
        this.health = state.health || 100;
        this.hunger = state.hunger || 100;
        this.thirst = state.thirst || 100;
        this.energy = state.energy || 100;
        this.equippedWeapon = state.equippedWeapon || 'fist';
    }
}
