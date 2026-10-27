// ============================================
// WORLD SYSTEM - Cidade Morta: Último Refúgio
// Terreno, otimização por distância, itens
// ============================================

class WorldSystem {
    constructor(scene) {
        this.scene = scene;
        this.groundItems = [];
        this.lootContainers = [];
        this.chunks = [];
        this.loadedChunks = new Set();
        this.chunkSize = 50;
        this.viewDistance = 150;
        this.decorations = [];
    }

    generate() {
        // Chão principal
        this.createGround();

        // Estradas
        this.createRoads();

        // Decorações urbanas
        this.createUrbanDecor();

        // Loot containers espalhados
        this.createLootContainers();
    }

    createGround() {
        // Chão de asfalto/concreto. A geometria era subdividida em 50x50
        // segmentos (5000 triângulos) sem nenhum motivo — não há
        // deslocamento de vértices nem textura que precise da subdivisão, e
        // o material é um Lambert plano. Reduzido para 1x1, igual à
        // calçada logo abaixo, sem qualquer mudança visual perceptível.
        const groundGeo = new THREE.PlaneGeometry(500, 500, 1, 1);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Calçadas (áreas mais claras)
        const sidewalkGeo = new THREE.PlaneGeometry(500, 500, 1, 1);
        const sidewalkMat = new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.3 });
        const sidewalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
        sidewalk.rotation.x = -Math.PI / 2;
        sidewalk.position.y = 0.01;
        this.scene.add(sidewalk);
    }

    createRoads() {
        const roadMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });

        // Avenidas principais (N-S e L-O)
        const roads = [
            { x: 0, z: 0, w: 12, h: 500, rot: 0 },   // Avenida Norte-Sul
            { x: 0, z: 0, w: 500, h: 12, rot: 0 },   // Avenida Leste-Oeste
            { x: -80, z: 0, w: 8, h: 500, rot: 0 },  // Rua lateral 1
            { x: 80, z: 0, w: 8, h: 500, rot: 0 },   // Rua lateral 2
            { x: 0, z: -80, w: 500, h: 8, rot: 0 },  // Rua lateral 3
            { x: 0, z: 80, w: 500, h: 8, rot: 0 },   // Rua lateral 4
            { x: -160, z: 0, w: 6, h: 400, rot: 0 }, // Rua secundária
            { x: 160, z: 0, w: 6, h: 400, rot: 0 },  // Rua secundária
            { x: 0, z: -160, w: 400, h: 6, rot: 0 }, // Rua secundária
            { x: 0, z: 160, w: 400, h: 6, rot: 0 },  // Rua secundária
        ];

        roads.forEach(road => {
            const geo = new THREE.PlaneGeometry(road.w, road.h);
            const mesh = new THREE.Mesh(geo, roadMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(road.x, 0.02, road.z);
            this.scene.add(mesh);

            // Linhas centrais
            const lineGeo = new THREE.PlaneGeometry(road.w > road.h ? road.w * 0.9 : 0.3, road.h > road.w ? road.h * 0.9 : 0.3);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.rotation.x = -Math.PI / 2;
            line.position.set(road.x, 0.03, road.z);
            this.scene.add(line);
        });
    }

    createUrbanDecor() {
        // Carros abandonados
        this.createAbandonedCars();

        // Postes de luz
        this.createStreetLights();

        // Lixo e detritos
        this.createDebris();

        // Árvores mortas
        this.createDeadTrees();

        // Placas destruídas
        this.createBrokenSigns();
    }

    // Geometrias e materiais compartilhados entre os 40 carros abandonados.
    // Antes, cada carro criava 3 geometrias + 3 materiais só para si (corpo,
    // teto, roda) — só a cor do corpo varia, e vem de uma paleta fixa de 5
    // opções, então cacheamos por cor em vez de instanciar do zero 40 vezes.
    getCarAssets(color) {
        if (!this._carAssetCache) {
            this._carAssetCache = {
                roofGeo: new THREE.BoxGeometry(2.5, 0.8, 1.8),
                roofMat: new THREE.MeshLambertMaterial({ color: 0x222222 }),
                wheelGeo: new THREE.CylinderGeometry(0.35, 0.35, 0.3, 8),
                wheelMat: new THREE.MeshLambertMaterial({ color: 0x111111 }),
                bodyGeo: new THREE.BoxGeometry(4, 1.2, 2),
                bodyMatByColor: {}
            };
        }
        const cache = this._carAssetCache;
        if (!cache.bodyMatByColor[color]) {
            cache.bodyMatByColor[color] = new THREE.MeshLambertMaterial({ color });
        }
        return cache;
    }

    createAbandonedCars() {
        const carColors = [0x8B0000, 0x2F4F4F, 0x4A4A4A, 0x1a1a3a, 0x3a3a1a];
        const positions = [];

        for (let i = 0; i < 40; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            // Evitar centro (Torre)
            if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
            positions.push({ x, z, rot: Math.random() * Math.PI * 2 });
        }

        positions.forEach(pos => {
            const color = carColors[Math.floor(Math.random() * carColors.length)];
            const car = this.createCarMesh(color);
            car.position.set(pos.x, 0, pos.z);
            car.rotation.y = pos.rot;
            this.scene.add(car);

            // Adicionar como collider
            const box = new THREE.Box3().setFromObject(car);
            Game.colliders.push({ box, type: 'car' });
        });
    }

    createCarMesh(color) {
        const group = new THREE.Group();
        const a = this.getCarAssets(color);

        // Corpo
        const body = new THREE.Mesh(a.bodyGeo, a.bodyMatByColor[color]);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        // Teto
        const roof = new THREE.Mesh(a.roofGeo, a.roofMat);
        roof.position.set(-0.3, 1.5, 0);
        roof.castShadow = true;
        group.add(roof);

        // Rodas
        const wheelPositions = [
            [1.2, 0.35, 1.1], [1.2, 0.35, -1.1],
            [-1.2, 0.35, 1.1], [-1.2, 0.35, -1.1]
        ];
        wheelPositions.forEach(wp => {
            const wheel = new THREE.Mesh(a.wheelGeo, a.wheelMat);
            wheel.position.set(...wp);
            wheel.rotation.x = Math.PI / 2;
            group.add(wheel);
        });

        // Dano aleatório (inclinação)
        if (Math.random() > 0.5) {
            group.rotation.z = (Math.random() - 0.5) * 0.1;
        }

        return group;
    }

    createStreetLights() {
        const poleMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
        // Geometrias de dimensão fixa, compartilhadas entre todos os ~40
        // postes de luz gerados pelo loop abaixo (antes eram recriadas a
        // cada poste, mesmo sendo idênticas exceto a posição/rotação).
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.15, 6, 6);
        const armGeo = new THREE.BoxGeometry(1.5, 0.1, 0.1);
        const lampGeo = new THREE.SphereGeometry(0.2, 6, 6);

        for (let i = -200; i <= 200; i += 30) {
            // Ao longo das avenidas
            [{ x: 7, z: i }, { x: -7, z: i }, { x: i, z: 7 }, { x: i, z: -7 }].forEach(pos => {
                if (Math.random() > 0.7) return; // Alguns quebrados

                const pole = new THREE.Group();

                const poleMesh = new THREE.Mesh(poleGeo, poleMat);
                poleMesh.position.y = 3;
                pole.add(poleMesh);

                // Braço
                const arm = new THREE.Mesh(armGeo, poleMat);
                arm.position.set(0.75, 5.8, 0);
                pole.add(arm);

                // Luz
                const lamp = new THREE.Mesh(lampGeo, lightMat);
                lamp.position.set(1.5, 5.6, 0);
                pole.add(lamp);

                // Alguns quebrados/inclinados
                if (Math.random() > 0.6) {
                    pole.rotation.z = (Math.random() - 0.5) * 0.3;
                }

                pole.position.set(pos.x, 0, pos.z);
                this.scene.add(pole);
            });
        }
    }

    createDebris() {
        const debrisMat = new THREE.MeshLambertMaterial({ color: 0x4a4a3a });
        const bloodMat = new THREE.MeshBasicMaterial({ color: 0x440000, transparent: true, opacity: 0.6 });

        for (let i = 0; i < 100; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;

            // Lixo
            const size = 0.2 + Math.random() * 0.5;
            const geo = new THREE.BoxGeometry(size, size * 0.3, size * 0.8);
            const debris = new THREE.Mesh(geo, debrisMat);
            debris.position.set(x, size * 0.15, z);
            debris.rotation.y = Math.random() * Math.PI;
            this.scene.add(debris);
        }

        // Manchas de sangue
        for (let i = 0; i < 30; i++) {
            const x = (Math.random() - 0.5) * 300;
            const z = (Math.random() - 0.5) * 300;
            const size = 0.5 + Math.random() * 2;
            const geo = new THREE.CircleGeometry(size, 8);
            const blood = new THREE.Mesh(geo, bloodMat);
            blood.rotation.x = -Math.PI / 2;
            blood.position.set(x, 0.02, z);
            this.scene.add(blood);
        }
    }

    createDeadTrees() {
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
        // Galhos têm dimensões fixas (só posição/rotação variam) — uma única
        // geometria compartilhada entre as 25 árvores × 3 galhos cada (75
        // instâncias), em vez de recriá-la a cada galho.
        const branchGeo = new THREE.CylinderGeometry(0.05, 0.1, 1.5, 4);

        for (let i = 0; i < 25; i++) {
            const x = (Math.random() - 0.5) * 400;
            const z = (Math.random() - 0.5) * 400;
            if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;

            const tree = new THREE.Group();
            const height = 3 + Math.random() * 4;

            // Tronco
            const trunkGeo = new THREE.CylinderGeometry(0.15, 0.3, height, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = height / 2;
            trunk.castShadow = true;
            tree.add(trunk);

            // Galhos
            for (let j = 0; j < 3; j++) {
                const branch = new THREE.Mesh(branchGeo, trunkMat);
                branch.position.set(
                    (Math.random() - 0.5) * 0.5,
                    height * 0.5 + j * 0.8,
                    (Math.random() - 0.5) * 0.5
                );
                branch.rotation.z = (Math.random() - 0.5) * 1.2;
                tree.add(branch);
            }

            tree.position.set(x, 0, z);
            this.scene.add(tree);
        }
    }

    createBrokenSigns() {
        const signMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const textMat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });

        const signs = ['PERIGO', 'ZONA MORTA', 'SEM SAÍDA', 'AJUDA', 'QUARENTENA'];

        // Geometrias de dimensão fixa, compartilhadas entre as 15 placas
        // (antes recriadas a cada iteração, mesmo sendo sempre idênticas).
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 2.5, 4);
        const plateGeo = new THREE.BoxGeometry(1.5, 0.8, 0.05);

        for (let i = 0; i < 15; i++) {
            const x = (Math.random() - 0.5) * 350;
            const z = (Math.random() - 0.5) * 350;

            const sign = new THREE.Group();

            // Poste
            const pole = new THREE.Mesh(poleGeo, signMat);
            pole.position.y = 1.25;
            sign.add(pole);

            // Placa
            const plate = new THREE.Mesh(plateGeo, signMat);
            plate.position.y = 2.5;
            sign.add(plate);

            sign.position.set(x, 0, z);
            sign.rotation.y = Math.random() * Math.PI;
            // Inclinação de dano
            sign.rotation.z = (Math.random() - 0.5) * 0.3;
            this.scene.add(sign);
        }
    }

    createLootContainers() {
        const containerTypes = [
            { name: 'Caixa', color: 0x8B4513, loot: ['food_canned', 'water_bottle', 'fabric', 'metal'] },
            { name: 'Mochila', color: 0x2F4F2F, loot: ['food_canned', 'bandage', 'water_bottle', 'ammo_pistol'] },
            { name: 'Carro de Polícia', color: 0x1a1a4a, loot: ['ammo_pistol', 'ammo_rifle', 'vest', 'medkit'] },
            { name: 'Caixa Médica', color: 0xffffff, loot: ['medkit', 'bandage', 'alcohol', 'painkillers'] },
            { name: 'Caixa Militar', color: 0x3a4a3a, loot: ['ammo_rifle', 'ammo_shotgun', 'vest', 'parts'] }
        ];

        for (let i = 0; i < 60; i++) {
            const x = (Math.random() - 0.5) * 380;
            const z = (Math.random() - 0.5) * 380;
            if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;

            const type = containerTypes[Math.floor(Math.random() * containerTypes.length)];

            const geo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
            const mat = new THREE.MeshLambertMaterial({ color: type.color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(x, 0.25, z);
            mesh.castShadow = true;
            this.scene.add(mesh);

            // Indicador de loot (brilho)
            const glowGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const glowMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.set(x, 0.7, z);
            this.scene.add(glow);

            this.lootContainers.push({
                position: new THREE.Vector3(x, 0.25, z),
                mesh,
                glow,
                name: type.name,
                lootTable: type.loot,
                looted: false
            });
        }
    }

    // Caixa de armamento garantido (usada no Arsenal da Base Militar).
    // Diferente de createLootContainers (loot aleatório), esta caixa sempre
    // entrega o item/arma específico ao ser aberta — ex: rifle, shotgun.
    spawnWeaponCrate(position, itemOrWeaponId, quantity = 1) {
        const isWeapon = !!(Game.weaponsData && Game.weaponsData.find(w => w.id === itemOrWeaponId));
        const itemData = !isWeapon ? Game.itemsData.find(it => it.id === itemOrWeaponId) : null;
        const weaponData = isWeapon ? Game.weaponsData.find(w => w.id === itemOrWeaponId) : null;

        const geo = new THREE.BoxGeometry(1, 0.6, 0.7);
        const mat = new THREE.MeshLambertMaterial({ color: 0x2a3a2a });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 0.3;
        mesh.castShadow = true;
        this.scene.add(mesh);

        // Faixa amarela de identificação (caixa militar)
        const stripeGeo = new THREE.BoxGeometry(1.02, 0.12, 0.72);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.copy(mesh.position);
        this.scene.add(stripe);

        // Brilho indicando que pode ser aberta
        const glowGeo = new THREE.SphereGeometry(0.2, 8, 8);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.7 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(mesh.position);
        glow.position.y += 0.6;
        this.scene.add(glow);

        const label = weaponData ? weaponData.name : (itemData ? itemData.name : itemOrWeaponId);

        const crate = {
            position: mesh.position.clone(),
            mesh,
            stripe,
            glow,
            name: `Caixa de Armamento (${label})`,
            isWeaponCrate: true,
            weaponId: weaponData ? weaponData.id : null,
            itemId: itemData ? itemData.id : null,
            quantity,
            looted: false
        };

        this.lootContainers.push(crate);
        return crate;
    }

    openContainer(container) {
        if (container.looted) return;
        container.looted = true;

        // Remover brilho
        if (container.glow) {
            this.scene.remove(container.glow);
        }

        // Mudar cor para indicar que foi saqueado
        container.mesh.material.color.setHex(0x333333);
        if (container.stripe) container.stripe.material.color.setHex(0x555555);

        // Caixa de armamento garantido (arsenal da base militar)
        if (container.isWeaponCrate) {
            if (container.weaponId) {
                Game.inventorySystem.addItem(container.weaponId, 1);
            } else if (container.itemId) {
                Game.inventorySystem.addItem(container.itemId, container.quantity || 1);
                const itemData = Game.itemsData.find(it => it.id === container.itemId);
                if (itemData) {
                    EffectsSystem.notify(`+ ${itemData.icon} ${itemData.name} x${container.quantity || 1}`, 'success');
                }
            }
            Game.effectsSystem.createPickupEffect(container.position);
            if (Game.questSystem) Game.questSystem.onArmoryCrateOpened();
            return;
        }

        // Gerar loot aleatório
        const numItems = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numItems; i++) {
            const itemId = container.lootTable[Math.floor(Math.random() * container.lootTable.length)];
            const added = Game.inventorySystem.addItem(itemId, 1);
            if (added) {
                const itemData = Game.itemsData.find(it => it.id === itemId);
                if (itemData) {
                    EffectsSystem.notify(`+ ${itemData.icon} ${itemData.name}`, 'success');
                }
            } else {
                EffectsSystem.notify('Inventário cheio!', 'danger');
                break;
            }
        }

        Game.effectsSystem.createPickupEffect(container.position);
    }

    pickupItem(item) {
        const added = Game.inventorySystem.addItem(item.id, 1);
        if (added) {
            this.scene.remove(item.mesh);
            if (item.glow) this.scene.remove(item.glow);
            const idx = this.groundItems.indexOf(item);
            if (idx > -1) this.groundItems.splice(idx, 1);
            EffectsSystem.notify(`+ ${item.icon} ${item.name}`, 'success');
            Game.effectsSystem.createPickupEffect(item.position);
        } else {
            EffectsSystem.notify('Inventário cheio!', 'danger');
        }
    }

    spawnGroundItem(itemId, position) {
        const itemData = Game.itemsData.find(it => it.id === itemId);
        if (!itemData) return;

        const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const mat = new THREE.MeshLambertMaterial({ color: 0xffcc00 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        mesh.position.y = 0.15;
        this.scene.add(mesh);

        const glowGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(mesh.position);
        glow.position.y += 0.3;
        this.scene.add(glow);

        this.groundItems.push({
            id: itemId,
            name: itemData.name,
            icon: itemData.icon,
            position: mesh.position.clone(),
            mesh,
            glow
        });
    }

    update(deltaTime, playerPosition) {
        // Animação de itens no chão (flutuação)
        const time = performance.now() * 0.001;
        for (const item of this.groundItems) {
            if (item.glow) {
                item.glow.position.y = item.position.y + 0.3 + Math.sin(time * 2) * 0.1;
            }
        }

        // Animação de containers não saqueados
        for (const container of this.lootContainers) {
            if (!container.looted && container.glow) {
                container.glow.position.y = container.position.y + 0.45 + Math.sin(time * 2) * 0.1;
                container.glow.material.opacity = 0.4 + Math.sin(time * 3) * 0.2;
            }
        }

        // LOD - esconder objetos distantes (otimização)
        const maxDist = this.viewDistance;
        for (const container of this.lootContainers) {
            const dist = playerPosition.distanceTo(container.position);
            container.mesh.visible = dist < maxDist;
            if (container.glow) container.glow.visible = dist < maxDist && !container.looted;
        }
    }
}
