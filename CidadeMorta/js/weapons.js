// ============================================
// WEAPONS SYSTEM - Cidade Morta: Último Refúgio
// Armas corpo a corpo e à distância
// ============================================

class WeaponsSystem {
    constructor(scene) {
        this.scene = scene;
        this.projectiles = [];
    }

    getWeaponData(weaponId) {
        return Game.weaponsData.find(w => w.id === weaponId);
    }

    swingMelee(weaponData, cameraSystem) {
        const origin = cameraSystem.camera.position.clone();
        const direction = cameraSystem.getLookDirection();

        // Raycasting para detectar hit
        const raycaster = new THREE.Raycaster(origin, direction, 0, weaponData.range);

        // Verificar zumbis no alcance
        const zombiesInRange = Game.zombieSystem.getZombiesInRange(
            Game.playerSystem.position,
            weaponData.range
        );

        let hit = false;
        for (const zombie of zombiesInRange) {
            const dirToZombie = zombie.position.clone().sub(Game.playerSystem.position);
            dirToZombie.y = 0;
            const angle = direction.angleTo(dirToZombie.normalize());

            if (angle < 0.6) { // ~35 graus de cone
                const damage = this.calculateDamage(weaponData);
                const killed = Game.zombieSystem.damageZombie(zombie, damage);
                hit = true;

                if (!killed) {
                    EffectsSystem.notify(`💥 -${damage}`, 'info');
                }
                break; // Corpo a corpo atinge um por vez
            }
        }

        // Efeito visual de swing
        this.createSwingEffect(origin, direction);

        // Som alertar zumbis próximos
        Game.zombieSystem.alertNearbyZombies(Game.playerSystem.position, 10);
    }

    fireRanged(weaponData, cameraSystem) {
        const origin = cameraSystem.camera.position.clone();
        const direction = cameraSystem.getLookDirection();

        // Spread (shotgun)
        const spread = weaponData.spread || 0;
        const pellets = spread > 0 ? 5 : 1;

        for (let i = 0; i < pellets; i++) {
            const dir = direction.clone();
            if (spread > 0) {
                dir.x += (Math.random() - 0.5) * spread;
                dir.y += (Math.random() - 0.5) * spread * 0.5;
                dir.z += (Math.random() - 0.5) * spread;
                dir.normalize();
            }

            // Criar projétil visual
            this.createBulletTracer(origin, dir, weaponData.range);

            // Raycasting
            const raycaster = new THREE.Raycaster(origin, dir, 0, weaponData.range);

            // Verificar hit em zumbis
            let closestHit = null;
            let closestDist = weaponData.range;

            for (const zombie of Game.zombieSystem.zombies) {
                // Checar distância e direção
                const toZombie = zombie.position.clone().sub(origin);
                const projDist = toZombie.dot(dir);

                if (projDist > 0 && projDist < closestDist) {
                    const perpDist = toZombie.clone().sub(dir.clone().multiplyScalar(projDist)).length();
                    const hitRadius = 0.8 * (zombie.scale || 1);

                    if (perpDist < hitRadius) {
                        closestDist = projDist;
                        closestHit = zombie;
                    }
                }
            }

            if (closestHit) {
                const damage = this.calculateDamage(weaponData);
                const killed = Game.zombieSystem.damageZombie(closestHit, damage);
                if (!killed) {
                    EffectsSystem.notify(`🎯 -${damage}`, 'info');
                }
            }
        }

        // Efeito de flash do tiro
        this.createMuzzleFlash(origin, direction);

        // Alertar zumbis pelo barulho
        const alertRange = weaponData.id === 'shotgun' ? 40 : weaponData.id === 'rifle' ? 35 : 25;
        Game.zombieSystem.alertNearbyZombies(Game.playerSystem.position, alertRange);
    }

    calculateDamage(weaponData) {
        let damage = weaponData.damage;

        // Crítico
        if (weaponData.critical && Math.random() < weaponData.critical) {
            damage *= 2;
            EffectsSystem.notify('CRÍTICO!', 'success');
        }

        // Variação
        damage *= 0.9 + Math.random() * 0.2;

        return Math.round(damage);
    }

    createSwingEffect(origin, direction) {
        // Arco de ataque visual
        const geo = new THREE.RingGeometry(0.5, 1.5, 8, 1, 0, Math.PI * 0.6);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const swing = new THREE.Mesh(geo, mat);
        swing.position.copy(origin).add(direction.clone().multiplyScalar(1));
        swing.lookAt(origin.clone().add(direction.clone().multiplyScalar(5)));
        this.scene.add(swing);

        // Remover após animação
        setTimeout(() => {
            this.scene.remove(swing);
            swing.geometry.dispose();
            swing.material.dispose();
        }, 150);
    }

    createBulletTracer(origin, direction, range) {
        const geo = new THREE.BufferGeometry();
        const end = origin.clone().add(direction.clone().multiplyScalar(Math.min(range, 50)));
        const positions = new Float32Array([
            origin.x, origin.y, origin.z,
            end.x, end.y, end.z
        ]);
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.LineBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.8 });
        const line = new THREE.Line(geo, mat);
        this.scene.add(line);

        setTimeout(() => {
            this.scene.remove(line);
            line.geometry.dispose();
            line.material.dispose();
        }, 100);
    }

    createMuzzleFlash(origin, direction) {
        const flashGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const flashMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(origin).add(direction.clone().multiplyScalar(0.8));
        this.scene.add(flash);

        // Point light temporário
        const light = new THREE.PointLight(0xffaa00, 2, 5);
        light.position.copy(flash.position);
        this.scene.add(light);

        setTimeout(() => {
            this.scene.remove(flash);
            this.scene.remove(light);
            flash.geometry.dispose();
            flash.material.dispose();
        }, 50);
    }
}
