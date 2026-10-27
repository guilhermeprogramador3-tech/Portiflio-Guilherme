// ============================================
// ZOMBIE SYSTEM - Cidade Morta: Último Refúgio
// IA de zumbis: visão, audição, perseguição, ataque
// ============================================

class ZombieSystem {
    constructor(scene) {
        this.scene = scene;
        this.zombies = [];
        // Quantidade "moderada-alta" pedida: ~70 zumbis simultâneos de dia,
        // subindo para ~90 à noite (ver update()). O raio de spawn foi
        // reduzido para que os zumbis nasçam mais perto do jogador e fiquem
        // visíveis com mais frequência, em vez de só na borda do mapa.
        this.maxZombies = 70;
        this.spawnRadius = 55;
        this.despawnRadius = 120;
        this.spawnTimer = 0;
        this.spawnInterval = 3;
    }

    init() {
        // Spawn inicial: bem mais zumbis desde o começo, para o mapa já
        // nascer com uma horda visível em vez de ficar vazio nos primeiros
        // minutos enquanto o spawn periódico (1 a cada poucos segundos) sobe.
        for (let i = 0; i < 60; i++) {
            this.spawnZombie();
        }
    }

    spawnZombie(forcePosition = null, forceType = null) {
        // O limite de zumbis simultâneos só vale para o spawn ambiente
        // automático. Spawns forçados por eventos de missão (bosses como
        // mutant/king/queen, ou a horda da Base Militar) sempre devem
        // acontecer — senão a missão fica impossível de completar se o
        // mapa já estiver com zumbis comuns no limite.
        if (!forceType && this.zombies.length >= this.maxZombies) return;

        // Escolher tipo
        let typeData;
        if (forceType) {
            typeData = Game.zombiesData.find(z => z.id === forceType);
        } else {
            const isNight = Game.effectsSystem && Game.effectsSystem.isNight();
            const rand = Math.random();
            if (rand < 0.6) typeData = Game.zombiesData[0]; // Comum
            else if (rand < 0.8) typeData = Game.zombiesData[1]; // Corredor
            else if (rand < 0.95) typeData = Game.zombiesData[2]; // Blindado
            else if (isNight && rand < 0.98) typeData = Game.zombiesData[3]; // Mutante (noite)
            else typeData = Game.zombiesData[0];
        }

        if (!typeData) typeData = Game.zombiesData[0];

        // Posição
        let position;
        if (forcePosition) {
            position = forcePosition.clone();
        } else {
            const playerPos = Game.playerSystem ? Game.playerSystem.position : new THREE.Vector3();

            // Tenta algumas vezes encontrar um ponto válido (fora da safe
            // zone da Torre e fora do interior x>200). Antes, ao cair na
            // safe zone por coincidência, o spawn era simplesmente
            // cancelado e nada nascia — reduzindo a contagem real de
            // zumbis sem motivo aparente para quem está jogando.
            let attempts = 0;
            do {
                const angle = Math.random() * Math.PI * 2;
                // Faixa de 25 a 80 unidades do jogador: perto o bastante
                // para serem vistos com frequência, mas fora do alcance
                // imediato de ataque (evita zumbis "aparecendo" colados).
                const dist = 25 + Math.random() * this.spawnRadius;
                position = new THREE.Vector3(
                    playerPos.x + Math.cos(angle) * dist,
                    0,
                    playerPos.z + Math.sin(angle) * dist
                );
                attempts++;
            } while (attempts < 8 && (position.length() < 30 || position.x > 200));

            // Se mesmo após várias tentativas o ponto ainda for inválido,
            // empurra a posição para fora do raio da safe zone na mesma
            // direção, em vez de simplesmente desistir do spawn.
            if (position.length() < 30) {
                const dir = position.clone();
                if (dir.length() < 0.001) dir.set(1, 0, 0);
                dir.normalize();
                position.set(dir.x * 35, 0, dir.z * 35);
            }
            if (position.x > 200) {
                position.x = 190;
            }
        }

        // Criar mesh
        const zombie = this.createZombieMesh(typeData);
        zombie.position.copy(position);
        this.scene.add(zombie.mesh);

        this.zombies.push(zombie);
    }

    // Geometrias e materiais são caros de criar e, sem necessidade, eram
    // instanciados do zero para CADA zumbi spawnado (até ~70 ao mesmo
    // tempo). Como zumbis do mesmo tipo são visualmente idênticos (mesma
    // forma e cor), cacheamos por typeData.id e reaproveitamos entre todas
    // as instâncias — só a posição/rotação do mesh muda por zumbi.
    getZombieAssets(typeData) {
        if (!this._assetCache) this._assetCache = {};
        if (this._assetCache[typeData.id]) return this._assetCache[typeData.id];

        const scale = typeData.scale || 1;
        const color = new THREE.Color(typeData.color);

        const assets = {
            bodyGeo: new THREE.BoxGeometry(0.6 * scale, 1.2 * scale, 0.4 * scale),
            bodyMat: new THREE.MeshLambertMaterial({ color }),
            headGeo: new THREE.SphereGeometry(0.25 * scale, 8, 8),
            headMat: new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.8) }),
            eyeGeo: new THREE.SphereGeometry(0.05 * scale, 4, 4),
            eyeMat: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
            armGeo: new THREE.BoxGeometry(0.2 * scale, 0.8 * scale, 0.2 * scale),
            armMat: new THREE.MeshLambertMaterial({ color: color.clone().multiplyScalar(0.9) }),
            legGeo: new THREE.BoxGeometry(0.22 * scale, 0.8 * scale, 0.22 * scale)
        };
        this._assetCache[typeData.id] = assets;
        return assets;
    }

    createZombieMesh(typeData) {
        const group = new THREE.Group();
        const scale = typeData.scale || 1;
        const a = this.getZombieAssets(typeData);
        // Sombra apenas em bosses: são poucos (no máximo 1-2 por vez) e
        // grandes o bastante para a sombra ser perceptível. Zumbis comuns
        // chegam a ~70 simultâneos — desenhar a sombra de cada um deles a
        // cada frame é um dos maiores custos de performance do jogo para
        // um ganho visual mínimo.
        const wantsShadow = !!typeData.isBoss;

        // Corpo
        const body = new THREE.Mesh(a.bodyGeo, a.bodyMat);
        body.position.y = 1.2 * scale;
        body.castShadow = wantsShadow;
        group.add(body);

        // Cabeça
        const head = new THREE.Mesh(a.headGeo, a.headMat);
        head.position.y = 1.95 * scale;
        head.castShadow = wantsShadow;
        group.add(head);

        // Olhos vermelhos
        const eye1 = new THREE.Mesh(a.eyeGeo, a.eyeMat);
        eye1.position.set(0.08 * scale, 1.98 * scale, 0.2 * scale);
        group.add(eye1);
        const eye2 = new THREE.Mesh(a.eyeGeo, a.eyeMat);
        eye2.position.set(-0.08 * scale, 1.98 * scale, 0.2 * scale);
        group.add(eye2);

        // Braços
        const arm1 = new THREE.Mesh(a.armGeo, a.armMat);
        arm1.position.set(0.45 * scale, 1.1 * scale, 0.1 * scale);
        arm1.rotation.x = -0.3;
        group.add(arm1);
        const arm2 = new THREE.Mesh(a.armGeo, a.armMat);
        arm2.position.set(-0.45 * scale, 1.1 * scale, 0.1 * scale);
        arm2.rotation.x = -0.3;
        group.add(arm2);

        // Pernas
        const leg1 = new THREE.Mesh(a.legGeo, a.bodyMat);
        leg1.position.set(0.15 * scale, 0.4 * scale, 0);
        group.add(leg1);
        const leg2 = new THREE.Mesh(a.legGeo, a.bodyMat);
        leg2.position.set(-0.15 * scale, 0.4 * scale, 0);
        group.add(leg2);

        return {
            mesh: group,
            position: group.position,
            type: typeData.id,
            health: typeData.health,
            maxHealth: typeData.health,
            damage: typeData.damage,
            speed: typeData.speed,
            xp: typeData.xp,
            isBoss: typeData.isBoss || false,
            state: 'idle', // idle, patrol, chase, attack
            target: null,
            attackCooldown: 0,
            attackRate: 1.5,
            detectionRange: 20,
            attackRange: 2 * scale,
            patrolTarget: null,
            patrolTimer: 0,
            animTimer: 0,
            arms: [group.children[3], group.children[4]],
            legs: [group.children[5], group.children[6]],
            scale: scale
        };
    }

    update(deltaTime, playerPosition) {
        this.spawnTimer += deltaTime;

        // Spawn periódico
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            if (this.zombies.length < this.maxZombies) {
                this.spawnZombie();
            }
        }

        // Mais zumbis à noite
        if (Game.effectsSystem && Game.effectsSystem.isNight()) {
            this.maxZombies = 90;
            this.spawnInterval = 1.5;
        } else {
            this.maxZombies = 70;
            this.spawnInterval = 3;
        }

        // Atualizar cada zumbi
        // Se o jogador está no interior da torre, zumbis ficam parados lá fora
        const playerInsideTower = playerPosition.x > 200;

        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];

            // Despawn se muito longe
            const distToPlayer = zombie.position.distanceTo(playerPosition);
            if (distToPlayer > this.despawnRadius) {
                this.scene.remove(zombie.mesh);
                this.zombies.splice(i, 1);
                continue;
            }

            this.updateZombieAI(zombie, deltaTime, playerInsideTower ? new THREE.Vector3(0, 0, 0) : playerPosition, playerInsideTower ? 9999 : distToPlayer);
            this.animateZombie(zombie, deltaTime);
        }
    }

    // Calcula e cacheia, na primeira vez que um collider é usado pela IA dos
    // zumbis, um círculo simples (centro + raio²) que envolve sua caixa. É
    // usado como filtro rápido de distância antes do containsPoint, que é
    // bem mais caro (compara 3 pares min/max). Calculado uma única vez por
    // collider (colliders do mapa não se movem), então o custo é amortizado.
    ensureColliderCache(col) {
        if (col._r2 !== undefined) return;
        const cx = (col.box.min.x + col.box.max.x) / 2;
        const cz = (col.box.min.z + col.box.max.z) / 2;
        const halfX = (col.box.max.x - col.box.min.x) / 2;
        const halfZ = (col.box.max.z - col.box.min.z) / 2;
        // Raio do círculo envolvente + uma margem pequena (raio aproximado
        // do corpo do zumbi) para nunca descartar um collider que ainda
        // poderia, de fato, conter o ponto checado.
        const radius = Math.sqrt(halfX * halfX + halfZ * halfZ) + 1.0;
        col._cx = cx;
        col._cz = cz;
        col._r2 = radius * radius;
    }

    updateZombieAI(zombie, deltaTime, playerPosition, distToPlayer) {
        // Cooldown de ataque
        if (zombie.attackCooldown > 0) {
            zombie.attackCooldown -= deltaTime;
        }

        // Não perseguir na safe zone
        const inSafeZone = playerPosition.length() < 25;

        switch (zombie.state) {
            case 'idle':
                // Detectar jogador
                if (distToPlayer < zombie.detectionRange && !inSafeZone) {
                    zombie.state = 'chase';
                    zombie.target = playerPosition;
                } else {
                    // Patrulhar aleatoriamente
                    zombie.patrolTimer -= deltaTime;
                    if (zombie.patrolTimer <= 0) {
                        zombie.patrolTimer = 3 + Math.random() * 5;
                        zombie.patrolTarget = new THREE.Vector3(
                            zombie.position.x + (Math.random() - 0.5) * 20,
                            0,
                            zombie.position.z + (Math.random() - 0.5) * 20
                        );
                        zombie.state = 'patrol';
                    }
                }
                break;

            case 'patrol':
                if (zombie.patrolTarget) {
                    const dir = zombie.patrolTarget.clone().sub(zombie.position);
                    dir.y = 0;
                    const dist = dir.length();

                    if (dist > 1) {
                        dir.normalize();
                        const oldPos = zombie.position.clone();
                        zombie.position.x += dir.x * zombie.speed * 0.5 * deltaTime;
                        zombie.position.z += dir.z * zombie.speed * 0.5 * deltaTime;
                        if (Game.colliders) {
                            for (const col of Game.colliders) {
                                if (!col.box) continue;
                                this.ensureColliderCache(col);
                                const dx = zombie.position.x - col._cx;
                                const dz = zombie.position.z - col._cz;
                                if (dx * dx + dz * dz > col._r2) continue;
                                if (col.box.containsPoint(zombie.position)) zombie.position.copy(oldPos);
                            }
                        }
                        zombie.mesh.rotation.y = Math.atan2(dir.x, dir.z);
                    } else {
                        zombie.state = 'idle';
                    }
                }

                // Detectar jogador durante patrulha
                if (distToPlayer < zombie.detectionRange && !inSafeZone) {
                    zombie.state = 'chase';
                }
                break;

            case 'chase':
                if (inSafeZone || distToPlayer > zombie.detectionRange * 2) {
                    zombie.state = 'idle';
                    break;
                }

                if (distToPlayer <= zombie.attackRange) {
                    zombie.state = 'attack';
                } else {
                    // Mover em direção ao jogador
                    const dir = playerPosition.clone().sub(zombie.position);
                    dir.y = 0;
                    dir.normalize();

                    // Zumbis ficam 35% mais rápidos à noite
                    const nightSpeed = (Game.effectsSystem && Game.effectsSystem.isNight()) ? 1.35 : 1.0;
                    const oldPos = zombie.position.clone();
                    zombie.position.x += dir.x * zombie.speed * nightSpeed * deltaTime;
                    zombie.position.z += dir.z * zombie.speed * nightSpeed * deltaTime;

                    // zumbis respeitam prédios e paredes. Antes de checar
                    // containsPoint (caro, com min/max em 3 eixos) contra
                    // CADA collider do jogo, filtramos por distância — um
                    // teste muito mais barato que já descarta a enorme
                    // maioria dos colliders longe do zumbi. Com ~70 zumbis
                    // e 40+ colliders, isso evita milhares de checagens
                    // desnecessárias por frame.
                    if (Game.colliders) {
                        for (const col of Game.colliders) {
                            if (!col.box) continue;
                            this.ensureColliderCache(col);
                            const dx = zombie.position.x - col._cx;
                            const dz = zombie.position.z - col._cz;
                            if (dx * dx + dz * dz > col._r2) continue;
                            if (col.box.containsPoint(zombie.position)) {
                                zombie.position.copy(oldPos);
                                zombie.state = 'patrol';
                                break;
                            }
                        }
                    }
                    zombie.mesh.rotation.y = Math.atan2(dir.x, dir.z);
                }
                break;

            case 'attack':
                if (distToPlayer > zombie.attackRange * 1.5) {
                    zombie.state = 'chase';
                    break;
                }

                // Atacar
                if (zombie.attackCooldown <= 0) {
                    Game.playerSystem.takeDamage(zombie.damage);
                    zombie.attackCooldown = zombie.attackRate;
                    Game.effectsSystem.createBloodSplatter(playerPosition.clone().add(new THREE.Vector3(0, 1, 0)));
                    EffectsSystem.notify(`${zombie.isBoss ? '💀' : '🧟'} -${zombie.damage} HP`, 'danger');
                }

                // Olhar para o jogador
                const lookDir = playerPosition.clone().sub(zombie.position);
                zombie.mesh.rotation.y = Math.atan2(lookDir.x, lookDir.z);
                break;
        }
    }

    animateZombie(zombie, deltaTime) {
        zombie.animTimer += deltaTime;
        const isMoving = zombie.state === 'chase' || zombie.state === 'patrol';

        if (isMoving) {
            // Animação de caminhada
            const speed = zombie.state === 'chase' ? 8 : 4;
            const swing = Math.sin(zombie.animTimer * speed) * 0.4;
            if (zombie.legs[0]) zombie.legs[0].rotation.x = swing;
            if (zombie.legs[1]) zombie.legs[1].rotation.x = -swing;
            if (zombie.arms[0]) zombie.arms[0].rotation.x = -swing * 0.5 - 0.3;
            if (zombie.arms[1]) zombie.arms[1].rotation.x = swing * 0.5 - 0.3;
        }

        if (zombie.state === 'attack') {
            // Animação de ataque
            const attackAnim = Math.sin(zombie.animTimer * 10) * 0.8;
            if (zombie.arms[0]) zombie.arms[0].rotation.x = attackAnim - 0.5;
            if (zombie.arms[1]) zombie.arms[1].rotation.x = attackAnim - 0.5;
        }
    }

    damageZombie(zombie, damage) {
        zombie.health -= damage;

        // Efeito de dano
        Game.effectsSystem.createBloodSplatter(zombie.position.clone().add(new THREE.Vector3(0, 1.2, 0)));

        // Alertar zumbi
        if (zombie.state === 'idle' || zombie.state === 'patrol') {
            zombie.state = 'chase';
        }

        // Morte
        if (zombie.health <= 0) {
            this.killZombie(zombie);
            return true;
        }
        return false;
    }

    killZombie(zombie) {
        this.scene.remove(zombie.mesh);
        const idx = this.zombies.indexOf(zombie);
        if (idx > -1) this.zombies.splice(idx, 1);

        Game.killedZombies++;

        // Drop de loot
        if (Math.random() > 0.6) {
            const lootTable = ['food_canned', 'water_bottle', 'fabric', 'metal', 'ammo_pistol'];
            const itemId = lootTable[Math.floor(Math.random() * lootTable.length)];
            Game.worldSystem.spawnGroundItem(itemId, zombie.position.clone());
        }

        // Notificação
        EffectsSystem.notify(`☠️ ${zombie.isBoss ? 'BOSS' : 'Zumbi'} eliminado! +${zombie.xp}XP`, 'success');

        // Verificar quest
        Game.questSystem.onZombieKilled(zombie.type);
    }

    getZombiesInRange(position, range) {
        return this.zombies.filter(z => z.position.distanceTo(position) <= range);
    }

    alertNearbyZombies(position, range) {
        const nearby = this.getZombiesInRange(position, range);
        nearby.forEach(z => {
            if (z.state === 'idle' || z.state === 'patrol') {
                z.state = 'chase';
            }
        });
    }
}
