// ============================================
// CITY SYSTEM - Cidade Morta: Último Refúgio
// Geração da cidade com áreas distintas
// ============================================

class CitySystem {
    constructor(scene) {
        this.scene = scene;
        this.areas = [];

        // Zonas de exclusão: retângulos (com margem de segurança) em torno
        // dos prédios "fixos" e únicos da cidade (Hospital, Delegacia,
        // Mercado, Base Militar). createHouse/createCommercialBuilding
        // verificam isso antes de se posicionar, evitando que uma casa ou
        // prédio comercial nasça sobrepondo um desses — problema que já
        // existia mesmo antes do adensamento da cidade (ex: uma casa do
        // bloco residencial original colidia com o Mercado).
        this.exclusionZones = [
            { x: 100, z: 50, halfW: 16, halfD: 13 },   // Hospital
            { x: -100, z: 50, halfW: 14, halfD: 11 },  // Delegacia
            { x: 50, z: -120, halfW: 18, halfD: 14 },  // Mercado
            { x: -120, z: -120, halfW: 21, halfD: 21 } // Base Militar
        ];
    }

    // Retorna true se um retângulo (centro x,z + metade da largura/profundidade)
    // intersecta qualquer zona de exclusão fixa da cidade.
    intersectsExclusionZone(x, z, halfW, halfD) {
        return this.exclusionZones.some(zone => {
            return Math.abs(x - zone.x) < (halfW + zone.halfW) &&
                   Math.abs(z - zone.z) < (halfD + zone.halfD);
        });
    }

    generate() {
        this.createRoadNetwork();
        this.createHopeBuilding();
        // Criar áreas da cidade
        this.createResidentialArea();
        this.createCommercialArea();
        this.createEastDistrict();
        this.createHospital();
        this.createPoliceStation();
        this.createSupermarket();
        this.createMilitaryBase();
        this.createPark();
        this.createParkingLots();
        this.createAlleys();
    }

    // Distrito Leste: preenche o vazio entre o Hospital e o Parque com um
    // mix de casas e prédios comerciais, deixando a cidade mais densa e
    // coerente em todos os quadrantes (antes só havia espaço vazio aqui).
    createEastDistrict() {
        const positions = [
            { x: 85, z: -10 }, { x: 115, z: -10 }, { x: 145, z: -10 },
            { x: 85, z: 20 }, { x: 115, z: 20 }, { x: 145, z: 20 }
        ];

        positions.forEach((pos, i) => {
            // Alterna entre prédio comercial e casa para variedade visual
            if (i % 2 === 0) {
                this.createCommercialBuilding(pos.x, pos.z);
            } else {
                this.createHouse(pos.x, pos.z);
            }
        });

        this.areas.push({ name: 'Distrito Leste', center: new THREE.Vector3(115, 0, 5) });
    }

    createResidentialArea() {
        // Casas na zona residencial (quadrante nordeste)
        const baseX = 60;
        const baseZ = -60;

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 4; col++) {
                const x = baseX + col * 25;
                const z = baseZ - row * 25;
                this.createHouse(x, z);
            }
        }

        // Mais casas no quadrante sudoeste
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const x = -60 - col * 25;
                const z = 60 + row * 25;
                this.createHouse(x, z);
            }
        }

        // Terceiro bloco: quadrante sudeste, hoje quase vazio (longe do
        // Hospital e da Delegacia, que ficam mais perto da origem). Deixa
        // a cidade mais densa e coerente em todos os quadrantes.
        const baseX3 = 45;
        const baseZ3 = 85;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const x = baseX3 + col * 25;
                const z = baseZ3 + row * 25;
                this.createHouse(x, z);
            }
        }

        this.areas.push({ name: 'Área Residencial', center: new THREE.Vector3(baseX + 40, 0, baseZ - 40) });
        this.areas.push({ name: 'Bairro Sul', center: new THREE.Vector3(baseX3 + 25, 0, baseZ3 + 25) });
    }

    // Paletas de cor fixas das casas — materiais compartilhados entre todas
    // as casas que sorteiam a mesma cor, em vez de criar um Material novo
    // (e nunca liberado) para cada uma das 25 casas do mapa.
    getHouseMaterials() {
        if (this._houseMatCache) return this._houseMatCache;
        const wallColors = [0x8B7355, 0x9B8B6B, 0x7B6B55, 0xA09080, 0x6B5B45];
        this._houseMatCache = {
            walls: wallColors.map(c => new THREE.MeshLambertMaterial({ color: c })),
            roof: new THREE.MeshLambertMaterial({ color: 0x4a2a1a }),
            door: new THREE.MeshLambertMaterial({ color: 0x3a2a1a }),
            window: new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.7 })
        };
        return this._houseMatCache;
    }

    createHouse(x, z) {
        const width = 8 + Math.random() * 4;
        const depth = 8 + Math.random() * 4;
        // Não criar a casa se ela cair sobre um prédio fixo da cidade
        // (Hospital, Delegacia, Mercado, Base Militar) — antes isso podia
        // acontecer silenciosamente, deixando casas "dentro" desses prédios.
        if (this.intersectsExclusionZone(x, z, width / 2 + 1, depth / 2 + 1)) return;

        const group = new THREE.Group();
        const height = 3 + Math.random() * 1.5;
        const colorIdx = Math.floor(Math.random() * 5);
        const mats = this.getHouseMaterials();

        // Paredes (geometria não é compartilhável — cada casa tem dimensões
        // aleatórias próprias — mas o material de cor é reaproveitado)
        const wallGeo = new THREE.BoxGeometry(width, height, depth);
        const walls = new THREE.Mesh(wallGeo, mats.walls[colorIdx]);
        walls.position.y = height / 2;
        walls.castShadow = true;
        walls.receiveShadow = true;
        group.add(walls);

        // Telhado — sem sombra: é pequeno e fica no topo, a sombra
        // projetada tem pouquíssimo impacto visual mas soma ao custo de
        // sombra de cada uma das 25 casas do mapa.
        const roofGeo = new THREE.ConeGeometry(Math.max(width, depth) * 0.7, 2, 4);
        const roof = new THREE.Mesh(roofGeo, mats.roof);
        roof.position.y = height + 1;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);

        // Porta
        const doorGeo = new THREE.BoxGeometry(1, 2, 0.1);
        const door = new THREE.Mesh(doorGeo, mats.door);
        door.position.set(0, 1, depth / 2 + 0.05);
        group.add(door);

        // Janelas
        const windowGeo = new THREE.BoxGeometry(0.8, 0.8, 0.1);

        [-width / 3, width / 3].forEach(wx => {
            const win = new THREE.Mesh(windowGeo, mats.window);
            win.position.set(wx, height * 0.6, depth / 2 + 0.05);
            group.add(win);
        });

        // Janelas laterais
        const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.8), mats.window);
        sideWin.position.set(width / 2 + 0.05, height * 0.6, 0);
        group.add(sideWin);

        group.position.set(x, 0, z);
        this.scene.add(group);

        // Collider
        const box = new THREE.Box3(
            new THREE.Vector3(x - width / 2, 0, z - depth / 2),
            new THREE.Vector3(x + width / 2, height, z + depth / 2)
        );
        Game.colliders.push({ box, type: 'house' });
    }

    createCommercialArea() {
        // Prédios comerciais (quadrante noroeste)
        const baseX = -60;
        const baseZ = -60;

        for (let i = 0; i < 6; i++) {
            const x = baseX - (i % 3) * 30;
            const z = baseZ - Math.floor(i / 3) * 35;
            this.createCommercialBuilding(x, z);
        }

        // Segunda fileira de prédios comerciais, estendendo em direção a
        // z positivo (mais perto da origem) em vez de mais negativo — isso
        // mantém distância segura da Base Militar, que fica bem próxima
        // do canto sudoeste do mapa (z muito negativo).
        for (let i = 0; i < 6; i++) {
            const x = baseX - (i % 3) * 30;
            const z = baseZ + 35 + Math.floor(i / 3) * 35;
            this.createCommercialBuilding(x, z);
        }

        this.areas.push({ name: 'Área Comercial', center: new THREE.Vector3(baseX - 40, 0, baseZ - 30) });
    }

    // Material de janela compartilhado entre TODOS os prédios comerciais —
    // antes, cada prédio criava sua própria instância de material para cada
    // janela (até ~30 janelas por prédio, vezes 6 prédios = ~180 materiais
    // únicos, todos idênticos exceto a posição da janela).
    getCommercialWindowAssets() {
        if (this._commWindowAssets) return this._commWindowAssets;
        this._commWindowAssets = {
            mat: new THREE.MeshBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.8 })
        };
        return this._commWindowAssets;
    }

    createCommercialBuilding(x, z) {
        const width = 12 + Math.random() * 6;
        const depth = 10 + Math.random() * 5;
        // Mesma checagem de createHouse: não criar o prédio se ele cair
        // sobre um dos prédios fixos da cidade.
        if (this.intersectsExclusionZone(x, z, width / 2 + 1, depth / 2 + 1)) return;

        const floors = 2 + Math.floor(Math.random() * 4);
        const height = floors * 3.5;
        const color = [0x6a6a7a, 0x5a5a6a, 0x7a7a8a, 0x4a4a5a][Math.floor(Math.random() * 4)];

        const group = new THREE.Group();

        // Corpo principal
        const bodyGeo = new THREE.BoxGeometry(width, height, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = height / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Janelas (grid). Material compartilhado entre todos os prédios; a
        // geometria é criada uma vez por prédio (mesma largura/altura para
        // todas as janelas daquele prédio específico) e reaproveitada nas
        // N instâncias de Mesh, em vez de uma BoxGeometry nova por janela.
        const winAssets = this.getCommercialWindowAssets();
        const winGeo = new THREE.BoxGeometry(width * 0.25, 1.5, 0.1);
        for (let floor = 0; floor < floors; floor++) {
            for (let w = 0; w < 3; w++) {
                const win = new THREE.Mesh(winGeo, winAssets.mat);
                win.position.set(
                    (w - 1) * (width * 0.3),
                    floor * 3.5 + 2.5,
                    depth / 2 + 0.05
                );
                group.add(win);

                // Lado oposto
                const win2 = win.clone();
                win2.position.z = -depth / 2 - 0.05;
                group.add(win2);
            }
        }

        // Entrada
        const entranceGeo = new THREE.BoxGeometry(3, 3, 0.1);
        const entranceMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
        const entrance = new THREE.Mesh(entranceGeo, entranceMat);
        entrance.position.set(0, 1.5, depth / 2 + 0.06);
        group.add(entrance);

        group.position.set(x, 0, z);
        this.scene.add(group);

        // Collider
        const box = new THREE.Box3(
            new THREE.Vector3(x - width / 2, 0, z - depth / 2),
            new THREE.Vector3(x + width / 2, height, z + depth / 2)
        );
        Game.colliders.push({ box, type: 'building' });
    }

    createHospital() {
        const x = 100, z = 50;
        const group = new THREE.Group();

        // Prédio principal
        const bodyGeo = new THREE.BoxGeometry(25, 15, 18);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 7.5;
        body.castShadow = true;
        group.add(body);

        // Cruz vermelha
        const crossMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 0.2), crossMat);
        crossH.position.set(0, 12, 9.1);
        group.add(crossH);
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(1, 4, 0.2), crossMat);
        crossV.position.set(0, 12, 9.1);
        group.add(crossV);

        // Entrada de emergência
        const entGeo = new THREE.BoxGeometry(5, 3.5, 2);
        const entMat = new THREE.MeshLambertMaterial({ color: 0xcccccc });
        const entrance = new THREE.Mesh(entGeo, entMat);
        entrance.position.set(0, 1.75, 10);
        group.add(entrance);

        // Janelas
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x88aacc });
        for (let floor = 0; floor < 4; floor++) {
            for (let w = 0; w < 5; w++) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 0.1), windowMat);
                win.position.set((w - 2) * 4.5, floor * 3.5 + 3, 9.1);
                group.add(win);
            }
        }

        group.position.set(x, 0, z);
        this.scene.add(group);

        const box = new THREE.Box3(
            new THREE.Vector3(x - 12.5, 0, z - 9),
            new THREE.Vector3(x + 12.5, 15, z + 9)
        );
        Game.colliders.push({ box, type: 'hospital' });
        this.areas.push({ name: 'Hospital', center: new THREE.Vector3(x, 0, z) });
    }

    createPoliceStation() {
        const x = -100, z = 50;
        const group = new THREE.Group();

        // Prédio
        const bodyGeo = new THREE.BoxGeometry(20, 8, 15);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x5a5a6a });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 4;
        body.castShadow = true;
        group.add(body);

        // Faixa azul
        const stripGeo = new THREE.BoxGeometry(20.1, 1, 15.1);
        const stripMat = new THREE.MeshBasicMaterial({ color: 0x0044aa });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.y = 7;
        group.add(strip);

        // Entrada
        const doorGeo = new THREE.BoxGeometry(3, 3, 0.2);
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.5, 7.6);
        group.add(door);

        group.position.set(x, 0, z);
        this.scene.add(group);

        const box = new THREE.Box3(
            new THREE.Vector3(x - 10, 0, z - 7.5),
            new THREE.Vector3(x + 10, 8, z + 7.5)
        );
        Game.colliders.push({ box, type: 'police' });
        this.areas.push({ name: 'Delegacia', center: new THREE.Vector3(x, 0, z) });
    }

    createSupermarket() {
        const x = 50, z = -120;
        const group = new THREE.Group();

        // Prédio grande e baixo
        const bodyGeo = new THREE.BoxGeometry(30, 6, 20);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xccccaa });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 3;
        body.castShadow = true;
        group.add(body);

        // Letreiro
        const signGeo = new THREE.BoxGeometry(15, 2, 0.5);
        const signMat = new THREE.MeshBasicMaterial({ color: 0x00aa00 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 7, 10);
        group.add(sign);

        // Estacionamento
        const parkGeo = new THREE.PlaneGeometry(30, 15);
        const parkMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const parking = new THREE.Mesh(parkGeo, parkMat);
        parking.rotation.x = -Math.PI / 2;
        parking.position.set(0, 0.01, 18);
        group.add(parking);

        // Carrinhos de compras
        for (let i = 0; i < 5; i++) {
            const cartGeo = new THREE.BoxGeometry(0.5, 0.6, 0.8);
            const cartMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
            const cart = new THREE.Mesh(cartGeo, cartMat);
            cart.position.set(-10 + i * 2 + Math.random(), 0.3, 15);
            cart.rotation.y = Math.random() * 0.5;
            group.add(cart);
        }

        group.position.set(x, 0, z);
        this.scene.add(group);

        const box = new THREE.Box3(
            new THREE.Vector3(x - 15, 0, z - 10),
            new THREE.Vector3(x + 15, 6, z + 10)
        );
        Game.colliders.push({ box, type: 'supermarket' });
        this.areas.push({ name: 'Mercado', center: new THREE.Vector3(x, 0, z) });
    }

    createMilitaryBase() {
        const x = -120, z = -120;
        const group = new THREE.Group();

        // Muro
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x4a5a4a });
        const wallThickness = 0.5;
        const baseSize = 35;
        const gateWidth = 5;

        // 4 muros — o muro frontal (+z) fica dividido com um vão central para o portão
        const frontWallSegment = (baseSize - gateWidth) / 2;
        const walls = [
            { pos: [-(gateWidth / 2 + frontWallSegment / 2), 2, baseSize / 2], size: [frontWallSegment, 4, wallThickness] },
            { pos: [(gateWidth / 2 + frontWallSegment / 2), 2, baseSize / 2], size: [frontWallSegment, 4, wallThickness] },
            { pos: [0, 2, -baseSize / 2], size: [baseSize, 4, wallThickness] },
            { pos: [baseSize / 2, 2, 0], size: [wallThickness, 4, baseSize] },
            { pos: [-baseSize / 2, 2, 0], size: [wallThickness, 4, baseSize] }
        ];

        walls.forEach(w => {
            const geo = new THREE.BoxGeometry(...w.size);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(...w.pos);
            mesh.castShadow = true;
            group.add(mesh);

            const wbox = new THREE.Box3(
                new THREE.Vector3(x + w.pos[0] - w.size[0] / 2, 0, z + w.pos[2] - w.size[2] / 2),
                new THREE.Vector3(x + w.pos[0] + w.size[0] / 2, w.size[1], z + w.pos[2] + w.size[2] / 2)
            );
            Game.colliders.push({ box: wbox, type: 'military_wall' });
        });

        // Portão de acesso (visual) — barra metálica que abre quando destrancada
        const gateMat = new THREE.MeshLambertMaterial({ color: 0x6a1a1a });
        const gateGeo = new THREE.BoxGeometry(gateWidth, 4, 0.4);
        const gateMesh = new THREE.Mesh(gateGeo, gateMat);
        gateMesh.position.set(0, 2, baseSize / 2);
        gateMesh.castShadow = true;
        group.add(gateMesh);

        // Painel/leitor de cartão ao lado do portão
        const panelGeo = new THREE.BoxGeometry(0.5, 1, 0.2);
        const panelMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.set(gateWidth / 2 + 0.4, 1.3, baseSize / 2);
        group.add(panel);

        // Placa de aviso
        const signGeo = new THREE.BoxGeometry(2.5, 0.8, 0.05);
        const signMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 4.3, baseSize / 2);
        group.add(sign);

        // Barracões
        for (let i = 0; i < 3; i++) {
            const barGeo = new THREE.BoxGeometry(10, 3, 6);
            const barMat = new THREE.MeshLambertMaterial({ color: 0x3a4a3a });
            const barrack = new THREE.Mesh(barGeo, barMat);
            barrack.position.set(-8 + i * 10, 1.5, -5);
            barrack.castShadow = true;
            group.add(barrack);

            const bbox = new THREE.Box3(
                new THREE.Vector3(x - 8 + i * 10 - 5, 0, z - 5 - 3),
                new THREE.Vector3(x - 8 + i * 10 + 5, 3, z - 5 + 3)
            );
            Game.colliders.push({ box: bbox, type: 'barrack' });
        }

        // Torre de vigia
        const towerGeo = new THREE.BoxGeometry(3, 8, 3);
        const tower = new THREE.Mesh(towerGeo, wallMat);
        tower.position.set(14, 4, 14);
        tower.castShadow = true;
        group.add(tower);

        // Arsenal: construção próxima à entrada, agora com interior
        // explorável de fato (ver buildings.js createArmoryInterior). As
        // caixas de armamento ficam dentro da sala; o jogador entra pela
        // porta na frente do prédio, que só funciona com a base já
        // destrancada (mesma regra de acesso da Missão 5).
        const armoryGeo = new THREE.BoxGeometry(7, 3, 5);
        const armoryMat = new THREE.MeshLambertMaterial({ color: 0x2f3a2f });
        const armory = new THREE.Mesh(armoryGeo, armoryMat);
        armory.position.set(0, 1.5, baseSize / 2 - 9);
        armory.castShadow = true;
        group.add(armory);

        const armoryBox = new THREE.Box3(
            new THREE.Vector3(x - 3.5, 0, z + (baseSize / 2 - 9) - 2.5),
            new THREE.Vector3(x + 3.5, 3, z + (baseSize / 2 - 9) + 2.5)
        );
        Game.colliders.push({ box: armoryBox, type: 'armory' });

        // Porta do Arsenal (visual + ponto de interação para entrar)
        const armoryDoorMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
        const armoryDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.15), armoryDoorMat);
        armoryDoor.position.set(0, 1.1, baseSize / 2 - 9 + 2.55);
        group.add(armoryDoor);
        const armoryDoorWorldPos = new THREE.Vector3(x, 1.1, z + (baseSize / 2 - 9) + 2.55);

        // Letreiro "ARSENAL" — fica voltado para o portão (lado da entrada)
        const arsenalSignMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const arsenalSign = new THREE.Mesh(new THREE.BoxGeometry(4, 0.6, 0.1), arsenalSignMat);
        arsenalSign.position.set(0, 3.4, baseSize / 2 - 9 + 2.6);
        group.add(arsenalSign);

        group.position.set(x, 0, z);
        this.scene.add(group);

        // Nota: não adicionamos um collider único cobrindo toda a área da
        // base (35x35) — isso bloquearia completamente a entrada, mesmo após
        // destrancar o portão. Os muros, barracões, torre e arsenal já têm
        // seus próprios colliders individuais (acima), com o vão do portão livre.
        this.areas.push({ name: 'Base Militar', center: new THREE.Vector3(x, 0, z) });

        // Registra o portão e a área da base no BaseSystem, que controla o
        // acesso por cartão e o spawn de zumbis/armas especiais da Missão 5.
        // As caixas de armamento agora ficam DENTRO do interior do Arsenal
        // (ver buildings.js createArmoryInterior) — armoryDoorPosition é o
        // ponto de interação que leva a esse interior, só utilizável depois
        // que o portão externo da base for destrancado.
        Game.baseSystem.registerMilitaryBase({
            center: new THREE.Vector3(x, 0, z),
            baseSize,
            gateMesh,
            gatePosition: new THREE.Vector3(x, 2, z + baseSize / 2),
            gateWidth,
            armoryPosition: new THREE.Vector3(x, 0, z + (baseSize / 2 - 9) + 5.5),
            armoryDoorPosition: armoryDoorWorldPos,
            panel
        });
    }

    createPark() {
        const x = 120, z = -50;
        const group = new THREE.Group();

        // Gramado
        const grassGeo = new THREE.PlaneGeometry(40, 40);
        const grassMat = new THREE.MeshLambertMaterial({ color: 0x2a4a2a });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = 0.01;
        group.add(grass);

        // Lago
        const lakeGeo = new THREE.CircleGeometry(6, 16);
        const lakeMat = new THREE.MeshBasicMaterial({ color: 0x224466, transparent: true, opacity: 0.7 });
        const lake = new THREE.Mesh(lakeGeo, lakeMat);
        lake.rotation.x = -Math.PI / 2;
        lake.position.set(5, 0.02, -5);
        group.add(lake);

        // Bancos
        const benchMat = new THREE.MeshLambertMaterial({ color: 0x5a3a1a });
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const bx = Math.cos(angle) * 12;
            const bz = Math.sin(angle) * 12;
            const bench = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.6), benchMat);
            bench.position.set(bx, 0.5, bz);
            bench.rotation.y = angle;
            group.add(bench);
        }

        // Playground destruído
        const slideGeo = new THREE.BoxGeometry(1, 2, 4);
        const slideMat = new THREE.MeshLambertMaterial({ color: 0xaa3333 });
        const slide = new THREE.Mesh(slideGeo, slideMat);
        slide.position.set(-10, 1, 8);
        slide.rotation.z = 0.3;
        group.add(slide);

        group.position.set(x, 0, z);
        this.scene.add(group);

        this.areas.push({ name: 'Parque', center: new THREE.Vector3(x, 0, z) });
    }

    createParkingLots() {
        // Estacionamentos em vários pontos
        const locations = [
            { x: -50, z: 120 },
            { x: 130, z: 100 }
        ];

        locations.forEach(loc => {
            const group = new THREE.Group();

            // Piso
            const floorGeo = new THREE.PlaneGeometry(25, 20);
            const floorMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
            const floor = new THREE.Mesh(floorGeo, floorMat);
            floor.rotation.x = -Math.PI / 2;
            floor.position.y = 0.01;
            group.add(floor);

            // Vagas marcadas
            const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
            for (let i = 0; i < 8; i++) {
                const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 4), lineMat);
                line.rotation.x = -Math.PI / 2;
                line.position.set(-10 + i * 3, 0.02, 0);
                group.add(line);
            }

            group.position.set(loc.x, 0, loc.z);
            this.scene.add(group);
        });
    }

    createAlleys() {
        // Becos escuros entre prédios
        const alleyMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

        const alleys = [
            { x: -45, z: -45, w: 3, d: 20 },
            { x: 45, z: -90, w: 20, d: 3 },
            { x: -90, z: 30, w: 3, d: 15 },
            { x: 90, z: -30, w: 3, d: 18 }
        ];

        alleys.forEach(alley => {
            const geo = new THREE.PlaneGeometry(alley.w, alley.d);
            const mesh = new THREE.Mesh(geo, alleyMat);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(alley.x, 0.015, alley.z);
            this.scene.add(mesh);
        });
    }

    createRoadNetwork() {
        const roadMat = new THREE.MeshLambertMaterial({color:0x303030});
        for(let i=-3;i<=3;i++){
            let road=new THREE.Mesh(new THREE.PlaneGeometry(18,220),roadMat);
            road.rotation.x=-Math.PI/2;
            road.position.set(i*35,0.01,0);
            this.scene.add(road);
            let road2=new THREE.Mesh(new THREE.PlaneGeometry(220,18),roadMat);
            road2.rotation.x=-Math.PI/2;
            road2.position.set(0,0.01,i*35);
            this.scene.add(road2);
        }
    }

    createHopeBuilding(){
        // Caixa cinza genérica removida — a Torre Esperança real já é gerada
        // pelo BuildingsSystem (buildings.js → createTorreEsperanca) com
        // fachada detalhada, janelas, portão blindado e barricadas de arame farpado.
        // Mantemos apenas a entrada no mapa de áreas para o sistema de missões.
        this.areas.push({name:'Prédio da Esperança',center:new THREE.Vector3(0,0,0)});
    }

}
