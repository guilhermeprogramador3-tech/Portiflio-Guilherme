// ============================================
// BUILDINGS SYSTEM - Cidade Morta: Último Refúgio
// Torre Esperança e prédios com interior
// ============================================

class BuildingsSystem {
    constructor(scene) {
        this.scene = scene;
        this.towerFloors = [];
        this.towerInterior = null;
        this.towerInteriorActive = false;
        this.towerDoors = []; // pontos de entrada/saída

        // Sistema genérico de interiores explORáveis (Hospital, Delegacia,
        // Mercado, Arsenal da Base Militar). Cada interior vive em sua
        // própria "sala paralela" deslocada no eixo X (mesmo truque já
        // usado pela Torre, em x=300), evitando qualquer sobreposição
        // geométrica com a cidade aberta ou entre interiores diferentes.
        // Estrutura de cada entrada: { id, label, offsetX, insideSpawn,
        // outsideSpawn, doorPosition (mundo real), exitDoorLocalPos }.
        this.interiors = [];
        this.activeInteriorId = null;
        this._nextInteriorOffset = 400; // 300 já é usado pela Torre
    }

    // Reserva e registra um novo offset de "sala paralela" para um
    // interior. Chamado pelos métodos create*Interior() abaixo.
    registerInterior(def) {
        this.interiors.push(def);
        return def;
    }

    allocateInteriorOffset() {
        const offset = this._nextInteriorOffset;
        this._nextInteriorOffset += 100; // espaçamento generoso entre salas
        return offset;
    }

    getInterior(id) {
        return this.interiors.find(i => i.id === id);
    }

    generate() {
        this.createTorreEsperanca();
        this.createTorreInterior();
        this.createApartments();
        this.createHospitalInterior();
        this.createPoliceInterior();
        this.createSupermarketInterior();
        this.createArmoryInterior();
    }

    // ============================================
    // HELPER GENÉRICO DE INTERIOR
    // ============================================
    // Constrói a "casca" básica de um interior explorável: chão, teto,
    // paredes com vão de porta na frente, e colliders correspondentes.
    // Usado por Hospital, Delegacia, Mercado e Arsenal — cada um adiciona
    // depois seus próprios móveis/decoração específicos dentro da sala.
    // Retorna { group, offsetX, doorGapHalfWidth, D } para o caller
    // continuar populando a sala com mobília.
    buildInteriorShell(W, D, H, materials) {
        const offsetX = this.allocateInteriorOffset();
        const group = new THREE.Group();
        const wallThick = 0.3;
        const doorGapHalfWidth = 2.5; // vão da porta: x entre -2.5 e 2.5 (local)

        const floorMat = materials.floor;
        const wallMat = materials.wall;
        const ceilMat = materials.ceiling || materials.wall;

        // Chão
        const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), floorMat);
        floor.position.set(0, 0.1, 0);
        floor.receiveShadow = true;
        group.add(floor);

        // Teto
        const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), ceilMat);
        ceil.position.set(0, H, 0);
        group.add(ceil);

        // Paredes esquerda/direita/fundo
        const wallL = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, D), wallMat);
        wallL.position.set(-W / 2, H / 2, 0);
        wallL.receiveShadow = true;
        group.add(wallL);
        const wallR = wallL.clone();
        wallR.position.x = W / 2;
        group.add(wallR);
        const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W, H, wallThick), wallMat);
        wallBack.position.set(0, H / 2, -D / 2);
        wallBack.receiveShadow = true;
        group.add(wallBack);

        // Parede da frente com vão de porta no meio
        const frontSegWidth = (W - doorGapHalfWidth * 2) / 2;
        const wallFrontL = new THREE.Mesh(new THREE.BoxGeometry(frontSegWidth, H, wallThick), wallMat);
        wallFrontL.position.set(-(doorGapHalfWidth + frontSegWidth / 2), H / 2, D / 2);
        group.add(wallFrontL);
        const wallFrontR = wallFrontL.clone();
        wallFrontR.position.x = doorGapHalfWidth + frontSegWidth / 2;
        group.add(wallFrontR);
        // Verga acima da porta
        const doorHeight = Math.min(3.5, H - 0.5);
        const wallFrontTop = new THREE.Mesh(new THREE.BoxGeometry(doorGapHalfWidth * 2, H - doorHeight, wallThick), wallMat);
        wallFrontTop.position.set(0, doorHeight + (H - doorHeight) / 2, D / 2);
        group.add(wallFrontTop);

        // Colliders (coordenadas absolutas, considerando o offset da sala)
        const ox = offsetX;
        Game.colliders.push({ box: new THREE.Box3(new THREE.Vector3(ox - W / 2 - wallThick, 0, -D / 2), new THREE.Vector3(ox - W / 2, H, D / 2)), type: 'interior_wall' });
        Game.colliders.push({ box: new THREE.Box3(new THREE.Vector3(ox + W / 2, 0, -D / 2), new THREE.Vector3(ox + W / 2 + wallThick, H, D / 2)), type: 'interior_wall' });
        Game.colliders.push({ box: new THREE.Box3(new THREE.Vector3(ox - W / 2, 0, -D / 2 - wallThick), new THREE.Vector3(ox + W / 2, H, -D / 2)), type: 'interior_wall' });
        Game.colliders.push({ box: new THREE.Box3(new THREE.Vector3(ox - W / 2, 0, D / 2), new THREE.Vector3(ox - doorGapHalfWidth, H, D / 2 + wallThick)), type: 'interior_wall' });
        Game.colliders.push({ box: new THREE.Box3(new THREE.Vector3(ox + doorGapHalfWidth, 0, D / 2), new THREE.Vector3(ox + W / 2, H, D / 2 + wallThick)), type: 'interior_wall' });

        group.position.set(offsetX, 0, 0);
        this.scene.add(group);

        return { group, offsetX, doorGapHalfWidth, D };
    }

    // Registra a entrada/saída de um interior simples: porta no mundo real
    // (perto do prédio correspondente) + spawns dentro/fora.
    finalizeInterior(id, label, shell, worldDoorPosition, worldOutsidePosition) {
        this.registerInterior({
            id,
            label,
            offsetX: shell.offsetX,
            D: shell.D,
            insideSpawn: new THREE.Vector3(shell.offsetX, 0, shell.D / 2 - 3),
            outsideSpawn: worldOutsidePosition,
            doorPosition: worldDoorPosition,
            doorGapHalfWidth: shell.doorGapHalfWidth,
            active: false
        });
    }

    // ============================================
    // INTERIOR DO HOSPITAL (usado na Missão 2)
    // ============================================
    createHospitalInterior() {
        const floorMat = new THREE.MeshLambertMaterial({ color: 0xdde4e8 });
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xeef2f4 });
        const ceilMat = new THREE.MeshLambertMaterial({ color: 0xc8d0d4 });

        const shell = this.buildInteriorShell(20, 16, 4, { floor: floorMat, wall: wallMat, ceiling: ceilMat });
        const group = shell.group;

        // Leitos hospitalares (3, encostados na parede do fundo)
        const bedFrameMat = new THREE.MeshLambertMaterial({ color: 0xaaaaaa });
        const mattressMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f0 });
        [-7, 0, 7].forEach(bx => {
            const frame = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 3.2), bedFrameMat);
            frame.position.set(bx, 0.45, -5.5);
            frame.castShadow = true;
            group.add(frame);
            const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.3, 3), mattressMat);
            mattress.position.set(bx, 0.85, -5.5);
            group.add(mattress);
        });

        // Cortinas separadoras entre leitos (translúcidas)
        const curtainMat = new THREE.MeshBasicMaterial({ color: 0x88ccdd, transparent: true, opacity: 0.4 });
        const curtainGeo = new THREE.BoxGeometry(0.05, 2.2, 3.2);
        [-3.5, 3.5].forEach(cx => {
            const curtain = new THREE.Mesh(curtainGeo, curtainMat);
            curtain.position.set(cx, 1.3, -5.5);
            group.add(curtain);
        });

        // Balcão de enfermagem (centro)
        const counterMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(5, 1.1, 1.2), counterMat);
        counter.position.set(0, 0.55, 1);
        counter.castShadow = true;
        group.add(counter);

        // Armário de remédios (objetivo de missão: coletar medkits aqui)
        const cabinetMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.2, 0.6), cabinetMat);
        cabinet.position.set(7.5, 1.1, 6.5);
        cabinet.castShadow = true;
        group.add(cabinet);
        // Cruz vermelha no armário
        const crossMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.05), crossMat);
        crossH.position.set(7.5, 1.6, 6.81);
        group.add(crossH);
        const crossV = crossH.clone();
        crossV.rotation.z = Math.PI / 2;
        group.add(crossV);

        // Macas/equipamento espalhado (decoração de caos)
        const stretcherMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
        const stretcher = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 2), stretcherMat);
        stretcher.position.set(-7.5, 0.35, 6);
        stretcher.rotation.y = 0.4;
        group.add(stretcher);

        // Luz de emergência (ambiente clínico)
        const light = new THREE.PointLight(0xccf0ff, 1.2, 18);
        light.position.set(0, 3.5, 0);
        group.add(light);

        // Manchas de sangue no chão (clima de apocalipse)
        const bloodMat = new THREE.MeshBasicMaterial({ color: 0x440000, transparent: true, opacity: 0.5 });
        [[3, -2], [-5, 3]].forEach(([bx, bz]) => {
            const blood = new THREE.Mesh(new THREE.CircleGeometry(0.8, 8), bloodMat);
            blood.rotation.x = -Math.PI / 2;
            blood.position.set(bx, 0.21, bz);
            group.add(blood);
        });

        // Caixas de loot dentro do hospital: kits médicos garantidos perto
        // do armário, reforçando o objetivo "Coletar 2 kits médicos" da
        // Missão 2 sem depender só de loot aleatório da cidade aberta.
        const ox = shell.offsetX;
        if (Game.worldSystem) {
            Game.worldSystem.spawnGroundItem('medkit', new THREE.Vector3(ox + 6.5, 0, 5.5));
            Game.worldSystem.spawnGroundItem('medkit', new THREE.Vector3(ox + 8.5, 0, 5.5));
            Game.worldSystem.spawnGroundItem('bandage', new THREE.Vector3(ox + 7.5, 0, 4.5));
        }

        this.finalizeInterior(
            'hospital',
            'Hospital',
            shell,
            new THREE.Vector3(100, 0, 60), // porta real (entrada de emergência do prédio)
            new THREE.Vector3(100, 0, 64)  // ponto de saída, um pouco afastado da porta
        );

        // Guardar referência para spawn de loot médico ao gerar o mundo
        this._hospitalInteriorOffset = shell.offsetX;
    }

    // ============================================
    // INTERIOR DO MERCADO
    // ============================================
    createSupermarketInterior() {
        const floorMat = new THREE.MeshLambertMaterial({ color: 0xb8b8a0 });
        const wallMat = new THREE.MeshLambertMaterial({ color: 0xccccaa });
        const ceilMat = new THREE.MeshLambertMaterial({ color: 0x999980 });

        const shell = this.buildInteriorShell(24, 18, 4.5, { floor: floorMat, wall: wallMat, ceiling: ceilMat });
        const group = shell.group;
        const ox = shell.offsetX;

        // Prateleiras (3 fileiras, decoração de mercado saqueado)
        const shelfMat = new THREE.MeshLambertMaterial({ color: 0x556655 });
        const shelfGeo = new THREE.BoxGeometry(1, 2, 6);
        [-7, 0, 7].forEach(sx => {
            const shelf = new THREE.Mesh(shelfGeo, shelfMat);
            shelf.position.set(sx, 1, -3);
            shelf.castShadow = true;
            group.add(shelf);

            // Itens caídos ao lado da prateleira (decoração de caos/saque)
            const itemMat = new THREE.MeshBasicMaterial({ color: 0xddaa00 });
            for (let i = 0; i < 3; i++) {
                const item = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), itemMat);
                item.position.set(sx + (Math.random() - 0.5) * 1.5, 0.15, -3 + (Math.random() - 0.5) * 5);
                group.add(item);
            }
        });

        // Caixa registradora / balcão de saída
        const counterMat = new THREE.MeshLambertMaterial({ color: 0x888877 });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(3, 1.1, 1), counterMat);
        counter.position.set(8, 0.55, 5);
        counter.castShadow = true;
        group.add(counter);

        // Geladeiras/freezers (fundo da loja)
        const fridgeMat = new THREE.MeshLambertMaterial({ color: 0xaaccdd });
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(6, 2.5, 1), fridgeMat);
        fridge.position.set(-7, 1.25, -7.5);
        fridge.castShadow = true;
        group.add(fridge);

        // Carrinho de compras virado (caos)
        const cartMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const cart = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.8), cartMat);
        cart.position.set(2, 0.3, 4);
        cart.rotation.z = Math.PI / 2;
        group.add(cart);

        // Iluminação fluorescente fraca
        const light = new THREE.PointLight(0xeeffcc, 1, 20);
        light.position.set(0, 4, 0);
        group.add(light);

        // Loot garantido: comida e água, consistente com ser um mercado —
        // dá um motivo real de visita mesmo sem uma missão dedicada a ele.
        if (Game.worldSystem) {
            Game.worldSystem.spawnGroundItem('food_canned', new THREE.Vector3(ox - 7, 0, -1));
            Game.worldSystem.spawnGroundItem('food_canned', new THREE.Vector3(ox, 0, -1));
            Game.worldSystem.spawnGroundItem('water_bottle', new THREE.Vector3(ox + 7, 0, -1));
            Game.worldSystem.spawnGroundItem('water_bottle', new THREE.Vector3(ox - 7, 0, -7.5));
            Game.worldSystem.spawnGroundItem('fabric', new THREE.Vector3(ox + 7, 0, -5));
        }

        this.finalizeInterior(
            'supermarket',
            'Mercado',
            shell,
            new THREE.Vector3(50, 0, -102), // entrada pelo lado do estacionamento
            new THREE.Vector3(50, 0, -98)
        );
    }
    createPoliceInterior() {
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x6a6a72 });
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x7a7a85 });
        const ceilMat = new THREE.MeshLambertMaterial({ color: 0x4a4a52 });

        const shell = this.buildInteriorShell(18, 16, 4, { floor: floorMat, wall: wallMat, ceiling: ceilMat });
        const group = shell.group;
        const ox = shell.offsetX;

        // Mesa de evidências (centro)
        const deskMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
        const desk = new THREE.Mesh(new THREE.BoxGeometry(4, 1, 1.8), deskMat);
        desk.position.set(0, 0.5, 1);
        desk.castShadow = true;
        group.add(desk);

        // Armas/evidências sobre a mesa (decoração)
        const evidenceMat = new THREE.MeshBasicMaterial({ color: 0xcccc00 });
        const evidence = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), evidenceMat);
        evidence.position.set(0.8, 1.03, 1);
        group.add(evidence);

        // Celas ao fundo (grades verticais)
        const barMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const cellWallMat = new THREE.MeshLambertMaterial({ color: 0x555560 });
        [-5, 5].forEach(cellX => {
            // Parede lateral da cela
            const cellSide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 4), cellWallMat);
            cellSide.position.set(cellX + (cellX > 0 ? 2 : -2), 1.5, -5.5);
            group.add(cellSide);

            // Grades da frente da cela
            for (let g = -1; g <= 1; g++) {
                const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), barMat);
                bar.position.set(cellX + g * 0.7, 1.5, -3.5);
                group.add(bar);
            }
        });

        // Armário de armas/munição (estante de evidências)
        const cabinetMat = new THREE.MeshLambertMaterial({ color: 0x444444 });
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, 3), cabinetMat);
        cabinet.position.set(-7.5, 1.1, 3);
        cabinet.castShadow = true;
        group.add(cabinet);

        // Luz de emergência vermelha (clima tenso de delegacia abandonada)
        const light = new THREE.PointLight(0xffaaaa, 1, 18);
        light.position.set(0, 3.5, -2);
        group.add(light);

        // O irmão da Ana, preso em uma das celas — dá um motivo concreto
        // para entrar na delegacia, além de "limpar a área" genérico.
        if (Game.npcSystem) {
            Game.npcSystem.createNPC('Tiago - Irmão de Ana', 'survivor', new THREE.Vector3(ox - 5, 0, -5.5), [
                { text: 'Você... você não é um zumbi! Por favor, me tire daqui, a porta da cela está destrancada mas eu não consigo passar pelos zumbis lá fora.', options: [
                    { text: 'Vou te levar para a Torre.', action: 'escort_tiago', next: -1 },
                    { text: 'Fique aqui, vou limpar a área primeiro.', next: -1 }
                ]}
            ]);
        }

        // Loot de munição garantido no armário de evidências
        if (Game.worldSystem) {
            Game.worldSystem.spawnGroundItem('ammo_pistol', new THREE.Vector3(ox - 7.5, 0, 2.5));
            Game.worldSystem.spawnGroundItem('ammo_pistol', new THREE.Vector3(ox - 7.5, 0, 3.5));
        }

        this.finalizeInterior(
            'police',
            'Delegacia',
            shell,
            new THREE.Vector3(-100, 0, 57.6), // porta real (entrada do prédio)
            new THREE.Vector3(-100, 0, 61)
        );
    }

    // ============================================
    // INTERIOR DO ARSENAL (Base Militar — usado na Missão 5)
    // ============================================
    // A porta real fica DENTRO do perímetro da Base Militar — o jogador só
    // consegue chegar até ela depois de destrancar o portão externo com o
    // Cartão Militar (mesma regra de acesso já implementada em base.js).
    // As caixas de armamento (rifle/shotgun) ficam dentro desta sala, em
    // vez de na área externa como antes.
    createArmoryInterior() {
        const floorMat = new THREE.MeshLambertMaterial({ color: 0x3a3f3a });
        const wallMat = new THREE.MeshLambertMaterial({ color: 0x2f3a2f });
        const ceilMat = new THREE.MeshLambertMaterial({ color: 0x252a25 });

        const shell = this.buildInteriorShell(12, 10, 3.2, { floor: floorMat, wall: wallMat, ceiling: ceilMat });
        const group = shell.group;
        const ox = shell.offsetX;

        // Racks de armas nas paredes (decoração)
        const rackMat = new THREE.MeshLambertMaterial({ color: 0x4a4a4a });
        [-4, 4].forEach(rx => {
            const rack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2, 3), rackMat);
            rack.position.set(rx, 1, -4);
            rack.castShadow = true;
            group.add(rack);
        });

        // Mesa central onde ficam as caixas de armamento
        const tableMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const table = new THREE.Mesh(new THREE.BoxGeometry(5, 0.8, 2.5), tableMat);
        table.position.set(0, 0.4, 0);
        table.castShadow = true;
        group.add(table);

        // Letreiro "ARSENAL" interno
        const signMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
        const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 0.1), signMat);
        sign.position.set(0, 2.6, -4.85);
        group.add(sign);

        // Luz de emergência amarela (clima de instalação militar)
        const light = new THREE.PointLight(0xffddaa, 1.3, 14);
        light.position.set(0, 2.8, 0);
        group.add(light);

        // Posição das caixas de armamento, agora dentro do Arsenal (sobre
        // a mesa central). O BaseSystem usa esta posição em
        // spawnArmoryCrates() para colocar rifle/shotgun/munição.
        const armoryInteriorPos = new THREE.Vector3(ox, 0.85, 0);

        this.finalizeInterior(
            'armory',
            'Arsenal',
            shell,
            null, // a porta real é controlada pelo BaseSystem (depende do portão estar destrancado)
            null
        );

        // Guarda a posição interna para o BaseSystem usar ao spawnar as
        // caixas de armamento da Missão 5.
        this._armoryInteriorPosition = armoryInteriorPos;
        this._armoryInteriorOffsetX = ox;
    }

    // ============================================
    // INTERIOR DA TORRE DA ESPERANÇA
    // ============================================
    createTorreInterior() {
        const group = new THREE.Group();
        const W = 17;  // largura interna
        const D = 17;  // profundidade interna
        const H = 5;   // altura do lobby
        const wallThick = 0.3;

        // Materiais
        const floorMat  = new THREE.MeshLambertMaterial({ color: 0x8a7a6a }); // concreto
        const wallMat   = new THREE.MeshLambertMaterial({ color: 0x7a8a9a }); // parede
        const ceilMat   = new THREE.MeshLambertMaterial({ color: 0x606878 }); // teto
        const metalMat  = new THREE.MeshLambertMaterial({ color: 0x4a4a5a });
        const woodMat   = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
        const darkMat   = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });

        // --- CHÃO ---
        const floor = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), floorMat);
        floor.position.set(0, 0.1, 0);
        floor.receiveShadow = true;
        group.add(floor);

        // --- TETO ---
        const ceil = new THREE.Mesh(new THREE.BoxGeometry(W, 0.2, D), ceilMat);
        ceil.position.set(0, H, 0);
        group.add(ceil);

        // --- PAREDES (esquerda, direita, fundo; frente aberta na posição Z+) ---
        // Parede esquerda
        const wallL = new THREE.Mesh(new THREE.BoxGeometry(wallThick, H, D), wallMat);
        wallL.position.set(-W / 2, H / 2, 0);
        wallL.receiveShadow = true;
        group.add(wallL);
        // Parede direita
        const wallR = wallL.clone();
        wallR.position.x = W / 2;
        group.add(wallR);
        // Parede do fundo
        const wallBack = new THREE.Mesh(new THREE.BoxGeometry(W, H, wallThick), wallMat);
        wallBack.position.set(0, H / 2, -D / 2);
        wallBack.receiveShadow = true;
        group.add(wallBack);
        // Parede da frente — dois segmentos com portão no meio
        const wallFrontL = new THREE.Mesh(new THREE.BoxGeometry(5.5, H, wallThick), wallMat);
        wallFrontL.position.set(-5.75, H / 2, D / 2);
        group.add(wallFrontL);
        const wallFrontR = wallFrontL.clone();
        wallFrontR.position.x = 5.75;
        group.add(wallFrontR);
        // Verga acima da porta
        const wallFrontTop = new THREE.Mesh(new THREE.BoxGeometry(5, H - 3.5, wallThick), wallMat);
        wallFrontTop.position.set(0, 3.5 + (H - 3.5) / 2, D / 2);
        group.add(wallFrontTop);

        // Colliders das paredes do interior (coordenadas absolutas, offset x=300)
        const ox = 300; // offset do grupo do interior
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(ox - W / 2 - wallThick, 0, -D / 2),
                new THREE.Vector3(ox - W / 2, H, D / 2)
            ), type: 'interior_wall'
        });
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(ox + W / 2, 0, -D / 2),
                new THREE.Vector3(ox + W / 2 + wallThick, H, D / 2)
            ), type: 'interior_wall'
        });
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(ox - W / 2, 0, -D / 2 - wallThick),
                new THREE.Vector3(ox + W / 2, H, -D / 2)
            ), type: 'interior_wall'
        });
        // Frente — dois segmentos com vão da porta no meio (x entre -2.5 e 2.5)
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(ox - W / 2, 0, D / 2),
                new THREE.Vector3(ox - 2.5, H, D / 2 + wallThick)
            ), type: 'interior_wall'
        });
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(ox + 2.5, 0, D / 2),
                new THREE.Vector3(ox + W / 2, H, D / 2 + wallThick)
            ), type: 'interior_wall'
        });

        // --- ILUMINAÇÃO INTERNA ---
        // Luz ambiente central
        const ambLight = new THREE.PointLight(0xffeecc, 1.5, 20);
        ambLight.position.set(0, H - 0.5, 0);
        group.add(ambLight);
        // Luminárias no teto (visual)
        const lampMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
        for (let lx = -5; lx <= 5; lx += 5) {
            const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.4), lampMat);
            lamp.position.set(lx, H - 0.15, 0);
            group.add(lamp);
            const lLight = new THREE.PointLight(0xffeecc, 0.6, 10);
            lLight.position.set(lx, H - 0.5, 0);
            group.add(lLight);
        }
        // Luz de emergência vermelha pulsante (armazenada para animação)
        const redLampMat = new THREE.MeshBasicMaterial({ color: 0xff4444 });
        const redLamp = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), redLampMat);
        redLamp.position.set(-7, H - 0.2, 6);
        group.add(redLamp);
        this._redLamp = redLamp;

        // --- MÓVEIS E DETALHES ---

        // Balcão de recepção (centro-frente)
        const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 1.1, 1.2), woodMat);
        counter.position.set(0, 0.55, 5);
        counter.castShadow = true;
        group.add(counter);
        const counterTop = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.1, 1.4), metalMat);
        counterTop.position.set(0, 1.15, 5);
        group.add(counterTop);

        // Armário de suprimentos (fundo esquerdo)
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(2, 2.5, 0.6), metalMat);
        cabinet.position.set(-6.5, 1.25, -7.5);
        cabinet.castShadow = true;
        group.add(cabinet);
        // Prateleiras
        for (let sh = 0; sh < 3; sh++) {
            const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.05, 0.55), darkMat);
            shelf.position.set(-6.5, 0.6 + sh * 0.85, -7.5);
            group.add(shelf);
        }

        // Mesa tática com mapa (centro da sala)
        const table = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 1.5), woodMat);
        table.position.set(3, 0.9, -3);
        table.castShadow = true;
        group.add(table);
        const tableLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), woodMat);
        [[-1.4, -0.65], [1.4, -0.65], [-1.4, 0.65], [1.4, 0.65]].forEach(([lx, lz]) => {
            const leg = tableLeg.clone();
            leg.position.set(3 + lx, 0.45, -3 + lz);
            group.add(leg);
        });
        // "Mapa" em cima da mesa
        const mapMesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.02, 1.2), new THREE.MeshBasicMaterial({ color: 0xd4c89a }));
        mapMesh.position.set(3, 0.96, -3);
        group.add(mapMesh);

        // Cadeiras ao redor da mesa
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), woodMat);
        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.05), woodMat);
        [[-2, 0], [2, 0]].forEach(([cx, cz]) => {
            const seat = chairSeat.clone();
            seat.position.set(3 + cx, 0.5, -3 + cz * 0.5);
            group.add(seat);
            const back = chairBack.clone();
            back.position.set(3 + cx, 0.85, -3 + cz * 0.5 - 0.28);
            group.add(back);
        });

        // Barris de suprimentos (canto direito)
        const barrelMat = new THREE.MeshLambertMaterial({ color: 0x3a5a3a });
        [[5.5, -6], [6.5, -5], [5.5, -4.5]].forEach(([bx, bz]) => {
            const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 1.0, 8), barrelMat);
            barrel.position.set(bx, 0.5, bz);
            barrel.castShadow = true;
            group.add(barrel);
        });

        // Caixas de equipamento (fundo direito)
        const boxMat = new THREE.MeshLambertMaterial({ color: 0x8a6a3a });
        [[5, -7, 0.5], [6, -7, 0.5], [5.5, -7, 1.1]].forEach(([bx, bz, by]) => {
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.7, 0.8), boxMat);
            box.position.set(bx, by, bz);
            box.castShadow = true;
            group.add(box);
        });

        // Escada para andares superiores (fundo esquerdo)
        const stairMat = new THREE.MeshLambertMaterial({ color: 0x555566 });
        for (let s = 0; s < 8; s++) {
            const step = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.15, 0.6), stairMat);
            step.position.set(-5.5, 0.15 + s * 0.55, -5 + s * 0.6);
            group.add(step);
        }

        // Quadro de avisos na parede esquerda
        const boardMat = new THREE.MeshBasicMaterial({ color: 0x8a6a3a });
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 2), boardMat);
        board.position.set(-W / 2 + 0.1, 2.5, 2);
        group.add(board);
        // Papéis no quadro
        const paperMat = new THREE.MeshBasicMaterial({ color: 0xf0e8d0 });
        for (let p = 0; p < 4; p++) {
            const paper = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.5), paperMat);
            paper.position.set(-W / 2 + 0.15, 2.2 + Math.floor(p / 2) * 0.6, 1.5 + (p % 2) * 0.6);
            group.add(paper);
        }

        // Gerador (fundo direito)
        const genMat = new THREE.MeshLambertMaterial({ color: 0x3a3a4a });
        const generator = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.0, 0.8), genMat);
        generator.position.set(6.5, 0.5, -7);
        group.add(generator);
        const genLight = new THREE.PointLight(0x44ff44, 0.3, 4);
        genLight.position.set(6.5, 1.2, -7);
        group.add(genLight);

        // Posicionar o grupo no centro (z=-300 = oculto, será teletransportado ao entrar)
        // O interior vive numa "sala paralela" no eixo X = 300
        group.position.set(300, 0, 0);
        this.scene.add(group);
        this.towerInterior = group;

        // Ponto de spawn dentro (logo atrás da porta)
        this.towerInsideSpawn = new THREE.Vector3(300, 0, 6.5);
        // Ponto de spawn fora (em frente à porta da torre)
        this.towerOutsideSpawn = new THREE.Vector3(0, 0, 12);

        // Registrar "porta" externa (no mundo real) — um collider interativo
        // Posicionado no vão livre entre as paredes laterais (x entre -3 e 3, z até 9)
        this.towerDoors.push({
            position: new THREE.Vector3(0, 0, 7.5),
            type: 'tower_enter',
            label: '[E] Entrar na Torre da Esperança'
        });
    }

    updateInterior(deltaTime) {
        if (!this._redLamp) return;
        this._redLampTimer = (this._redLampTimer || 0) + deltaTime;
        const pulse = 0.5 + 0.5 * Math.sin(this._redLampTimer * 3);
        this._redLamp.material.color.setRGB(pulse, 0, 0);
    }

    createTorreEsperanca() {
        const group = new THREE.Group();
        const floors = 20;
        const floorHeight = 3.5;
        const width = 18;
        const depth = 18;
        const totalHeight = floors * floorHeight;

        // Estrutura principal
        const bodyGeo = new THREE.BoxGeometry(width, totalHeight, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0x6a7a8a });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = totalHeight / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Janelas por andar. Eram 320 instâncias de Mesh (20 andares × 4
        // posições × 4 lados) usando apenas 2 formas de geometria distintas
        // (janela "de frente/trás" e janela "lateral") — cada uma recriada
        // do zero a cada chamada de `new THREE.BoxGeometry`. Cacheamos as
        // duas formas uma única vez e reaproveitamos em todas as 320.
        const windowMat = new THREE.MeshBasicMaterial({ color: 0x334455 });
        const litWindowMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
        const winGeoFB = new THREE.BoxGeometry(2.5, 1.8, 0.1);  // frente/trás
        const winGeoLR = new THREE.BoxGeometry(0.1, 1.8, 2.5);  // laterais

        for (let floor = 0; floor < floors; floor++) {
            const y = floor * floorHeight + 2;
            const isLit = floor < 5; // Primeiros andares iluminados

            for (let w = 0; w < 4; w++) {
                const mat = isLit && Math.random() > 0.3 ? litWindowMat : windowMat;
                // Frente
                const win = new THREE.Mesh(winGeoFB, mat);
                win.position.set((w - 1.5) * 4, y, depth / 2 + 0.05);
                group.add(win);
                // Trás
                const win2 = win.clone();
                win2.position.z = -depth / 2 - 0.05;
                group.add(win2);
                // Laterais
                const win3 = new THREE.Mesh(winGeoLR, mat);
                win3.position.set(width / 2 + 0.05, y, (w - 1.5) * 4);
                group.add(win3);
                const win4 = win3.clone();
                win4.position.x = -width / 2 - 0.05;
                group.add(win4);
            }
        }

        // Portão blindado (entrada)
        const gateMat = new THREE.MeshLambertMaterial({ color: 0x3a3a4a });
        const gate = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 0.5), gateMat);
        gate.position.set(0, 2, depth / 2 + 0.3);
        group.add(gate);

        // Reforços metálicos no portão
        const reinforceMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        for (let i = 0; i < 3; i++) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4, 0.6), reinforceMat);
            bar.position.set(-1.5 + i * 1.5, 2, depth / 2 + 0.3);
            group.add(bar);
        }

        // Antena no topo
        const antennaMat = new THREE.MeshLambertMaterial({ color: 0x888888 });
        const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 8, 6), antennaMat);
        antenna.position.y = totalHeight + 4;
        group.add(antenna);

        // Luz vermelha no topo
        const topLight = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        topLight.position.y = totalHeight + 8;
        group.add(topLight);

        // Ponto de luz na antena
        const pointLight = new THREE.PointLight(0xff0000, 0.5, 20);
        pointLight.position.y = totalHeight + 8;
        group.add(pointLight);

        // Barricadas ao redor
        this.createBarricades(group, width, depth);

        // Luzes na entrada
        const entryLight = new THREE.PointLight(0xffaa44, 1, 15);
        entryLight.position.set(0, 4, depth / 2 + 2);
        group.add(entryLight);

        // Placa "TORRE ESPERANÇA"
        const signGeo = new THREE.BoxGeometry(8, 1.5, 0.2);
        const signMat = new THREE.MeshBasicMaterial({ color: 0x1a3a5a });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 5.5, depth / 2 + 0.5);
        group.add(sign);

        group.position.set(0, 0, 0);
        this.scene.add(group);

        // Colliders da torre — paredes com vão para a porta de entrada
        // (em vez de um bloco sólido, para o jogador conseguir chegar até a porta)
        const doorHalfWidth = 3; // largura livre do portão (frente, z positivo)

        // Parede de trás (fecha completamente o fundo da torre)
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(-width / 2, 0, -depth / 2),
                new THREE.Vector3(width / 2, totalHeight, 0)
            ),
            type: 'tower'
        });
        // Parede lateral esquerda (metade da frente, do centro até a quina)
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(-width / 2, 0, 0),
                new THREE.Vector3(-doorHalfWidth, totalHeight, depth / 2)
            ),
            type: 'tower'
        });
        // Parede lateral direita (metade da frente, do centro até a quina)
        Game.colliders.push({
            box: new THREE.Box3(
                new THREE.Vector3(doorHalfWidth, 0, 0),
                new THREE.Vector3(width / 2, totalHeight, depth / 2)
            ),
            type: 'tower'
        });
        // O vão entre -doorHalfWidth e +doorHalfWidth na frente (z entre 0 e depth/2) fica livre = porta

        // Área segura ao redor
        this.createSafeZonePerimeter();
    }

    createBarricades(parent, towerWidth, towerDepth) {
        // Barricadas de sacos de areia reforçadas na base da torre
        const bagMat  = new THREE.MeshLambertMaterial({ color: 0x6b5a3a });
        const wireMat = new THREE.MeshLambertMaterial({ color: 0x5a5a5a });
        const postMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });

        const positions = [
            { x: -towerWidth / 2 - 2, z: 0,               rot: 0          },
            { x:  towerWidth / 2 + 2, z: 0,               rot: 0          },
            { x: -8,                  z: towerDepth/2 + 2, rot: Math.PI/2  },
            { x:  8,                  z: towerDepth/2 + 2, rot: Math.PI/2  },
            { x:  0,                  z: -towerDepth/2 - 2,rot: Math.PI/2  }
        ];

        positions.forEach(pos => {
            const isZ = Math.abs(pos.rot) > 0.1; // barricada orientada no eixo Z
            // Fileira dupla de sacos de areia
            for (let row = 0; row < 2; row++) {
                for (let i = 0; i < 4; i++) {
                    const bag = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.55), bagMat);
                    const offset = (i - 1.5) * 1.45;
                    bag.position.set(
                        pos.x + (isZ ? 0 : offset),
                        0.19 + row * 0.38,
                        pos.z + (isZ ? offset : 0)
                    );
                    bag.rotation.y = pos.rot;
                    bag.rotation.z = (Math.random() - 0.5) * 0.08;
                    parent.add(bag);
                }
            }
            // Poste de arame nos extremos
            for (const side of [-1, 1]) {
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), postMat);
                post.position.set(
                    pos.x + (isZ ? 0 : side * 3.2),
                    1.0,
                    pos.z + (isZ ? side * 3.2 : 0)
                );
                parent.add(post);
            }
            // 3 fios de arame farpado
            for (let h = 0.55; h <= 1.55; h += 0.5) {
                const wireLen = 6.8;
                const wireSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, wireLen, 4), wireMat);
                wireSeg.rotation.z = Math.PI / 2;
                wireSeg.position.set(
                    pos.x + (isZ ? 0 : 0),
                    h,
                    pos.z + (isZ ? 0 : 0)
                );
                if (isZ) wireSeg.rotation.set(0, 0, 0), wireSeg.rotation.x = Math.PI / 2;
                parent.add(wireSeg);
                // Farpas ao longo do fio
                for (let b = -2.8; b <= 2.8; b += 0.45) {
                    const barb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.025), wireMat);
                    barb.position.set(
                        pos.x + (isZ ? 0 : b),
                        h,
                        pos.z + (isZ ? b : 0)
                    );
                    barb.rotation.y = (Math.random() - 0.5) * Math.PI;
                    parent.add(barb);
                    const barb2 = barb.clone();
                    barb2.rotation.y += Math.PI / 2;
                    parent.add(barb2);
                }
            }
        });
    }

    createSafeZonePerimeter() {
        // Perímetro de barricadas com arame farpado ao redor da zona segura
        const group = new THREE.Group();

        const postMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });  // poste metálico
        const wireMat = new THREE.MeshLambertMaterial({ color: 0x666666 });  // arame
        const woodMat = new THREE.MeshLambertMaterial({ color: 0x6b4a22 });  // tábua de madeira
        const bagMat  = new THREE.MeshLambertMaterial({ color: 0x7a6040 });  // sacos de areia
        const rustMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });  // madeira envelhecida

        // Perímetro retangular: deixa abertura frontal central (z+) para passagem do jogador
        const R = 26;         // distância do centro
        const gap = 5;        // metade da largura da abertura frontal
        const step = 3.8;     // espaçamento entre postes

        // Gera uma seção de barricada entre dois postes
        const addSection = (x1, z1, x2, z2) => {
            const dx = x2 - x1, dz = z2 - z1;
            const len = Math.sqrt(dx * dx + dz * dz);
            const angle = Math.atan2(dx, dz);
            const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;

            // Postes de metal nos extremos
            [0, 1].forEach(t => {
                const px = x1 + dx * t, pz = z1 + dz * t;
                const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 6), postMat);
                post.position.set(px, 1.3, pz);
                group.add(post);
                // Topo afiado do poste
                const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 6), postMat);
                tip.position.set(px, 2.725, pz);
                group.add(tip);
            });

            // Painel de madeira (tábuas verticais)
            const plankCount = Math.max(2, Math.floor(len / 0.6));
            for (let i = 0; i < plankCount; i++) {
                const t = (i + 0.5) / plankCount;
                const px = x1 + dx * t, pz = z1 + dz * t;
                const plankH = 1.4 + Math.random() * 0.5;
                const plank = new THREE.Mesh(new THREE.BoxGeometry(0.22, plankH, len / plankCount * 0.85), woodMat);
                plank.position.set(px, plankH / 2, pz);
                plank.rotation.y = angle;
                plank.rotation.z = (Math.random() - 0.5) * 0.06;
                group.add(plank);
            }

            // Sacos de areia na base
            const bagCount = Math.max(1, Math.floor(len / 1.6));
            for (let i = 0; i < bagCount; i++) {
                const t = (i + 0.5) / bagCount;
                const px = x1 + dx * t, pz = z1 + dz * t;
                // Fileira inferior
                const bag1 = new THREE.Mesh(new THREE.BoxGeometry(len / bagCount * 0.9, 0.36, 0.52), bagMat);
                bag1.position.set(px, 0.18, pz);
                bag1.rotation.y = angle;
                group.add(bag1);
                // Fileira superior (levemente deslocada)
                const bag2 = new THREE.Mesh(new THREE.BoxGeometry(len / bagCount * 0.85, 0.34, 0.48), bagMat);
                bag2.position.set(px + (Math.random()-0.5)*0.1, 0.54, pz + (Math.random()-0.5)*0.1);
                bag2.rotation.y = angle + (Math.random()-0.5)*0.1;
                group.add(bag2);
            }

            // Fios de arame farpado (3 alturas)
            for (let h = 0.9; h <= 2.1; h += 0.6) {
                const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, len, 4), wireMat);
                wire.rotation.x = Math.PI / 2;
                wire.position.set(cx, h, cz);
                wire.rotation.y = angle;
                group.add(wire);

                // Farpas ao longo do fio
                const barbSpacing = 0.38;
                const numBarbs = Math.floor(len / barbSpacing);
                for (let b = 0; b < numBarbs; b++) {
                    const t2 = (b + 0.5) / numBarbs;
                    const bx = x1 + dx * t2, bz = z1 + dz * t2;
                    // Cruz de farpas
                    for (let k = 0; k < 2; k++) {
                        const barb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.022, 0.022), wireMat);
                        barb.position.set(bx, h, bz);
                        barb.rotation.y = angle + k * Math.PI / 2 + (Math.random()-0.5)*0.4;
                        group.add(barb);
                    }
                }
            }

            // Rolo de arame no topo (apenas em algumas seções)
            if (Math.random() > 0.45) {
                const rollRadius = 0.28;
                const roll = new THREE.Mesh(new THREE.TorusGeometry(rollRadius, 0.035, 5, 14), wireMat);
                roll.position.set(cx, 2.5, cz);
                roll.rotation.x = Math.PI / 2;
                roll.rotation.y = angle;
                group.add(roll);
                // Farpas no rolo
                for (let a = 0; a < 8; a++) {
                    const ang = (a / 8) * Math.PI * 2;
                    const rx = Math.cos(ang) * rollRadius, ry = Math.sin(ang) * rollRadius;
                    const rbarb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.02), wireMat);
                    rbarb.position.set(cx + rx, 2.5 + ry, cz);
                    rbarb.rotation.y = angle + ang;
                    group.add(rbarb);
                }
            }
        };

        // Lado de trás (z negativo)
        for (let x = -R; x < R; x += step) {
            addSection(x, -R, Math.min(x + step, R), -R);
        }
        // Lado direito (x positivo)
        for (let z = -R; z < R; z += step) {
            addSection(R, z, R, Math.min(z + step, R));
        }
        // Lado esquerdo (x negativo)
        for (let z = -R; z < R; z += step) {
            addSection(-R, z, -R, Math.min(z + step, R));
        }
        // Frente esquerda (de -R até -gap)
        for (let x = -R; x < -gap; x += step) {
            addSection(x, R, Math.min(x + step, -gap), R);
        }
        // Frente direita (de +gap até +R)
        for (let x = gap; x < R; x += step) {
            addSection(x, R, Math.min(x + step, R), R);
        }

        // Placas de aviso nas laterais da abertura frontal
        const signMat = new THREE.MeshLambertMaterial({ color: 0xdd2222 });
        const signTextMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        [-gap - 0.5, gap + 0.5].forEach((sx, idx) => {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.0, 6), postMat);
            pole.position.set(sx, 1.5, R);
            group.add(pole);
            const sign = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.08), signMat);
            sign.position.set(sx, 2.9, R);
            group.add(sign);
            const txt = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 0.1), signTextMat);
            txt.position.set(sx, 2.9, R + 0.05);
            group.add(txt);
        });

        group.position.set(0, 0, 0);
        this.scene.add(group);
    }

    createApartments() {
        // Prédios de apartamentos em vários locais
        const locations = [
            { x: -40, z: -130, floors: 6 },
            { x: 40, z: 130, floors: 8 },
            { x: -130, z: -40, floors: 5 },
            { x: 130, z: 40, floors: 7 },
            { x: -80, z: 130, floors: 4 },
            { x: 80, z: -130, floors: 6 }
        ];

        locations.forEach(loc => {
            this.createApartmentBuilding(loc.x, loc.z, loc.floors);
        });
    }

    // Assets de varanda/grade/janela compartilhados entre os 6 prédios de
    // apartamentos (antes cada prédio criava seu próprio conjunto, mesmo
    // sendo todos visualmente idênticos exceto a posição).
    getApartmentAssets() {
        if (this._apartmentAssets) return this._apartmentAssets;
        this._apartmentAssets = {
            balconyMat: new THREE.MeshLambertMaterial({ color: 0x555555 }),
            balconyGeo: new THREE.BoxGeometry(3, 0.2, 1.5),
            railMat: new THREE.MeshLambertMaterial({ color: 0x444444, transparent: true, opacity: 0.5 }),
            railGeo: new THREE.BoxGeometry(3, 1, 0.05),
            windowMat: new THREE.MeshBasicMaterial({ color: 0x223344 }),
            windowGeo: new THREE.BoxGeometry(2, 1.5, 0.1)
        };
        return this._apartmentAssets;
    }

    createApartmentBuilding(x, z, floors) {
        const group = new THREE.Group();
        const width = 14;
        const depth = 10;
        const floorHeight = 3;
        const totalHeight = floors * floorHeight;
        const a = this.getApartmentAssets();

        // Corpo
        const colors = [0x8a7a6a, 0x7a8a7a, 0x6a6a8a, 0x9a8a7a];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const bodyGeo = new THREE.BoxGeometry(width, totalHeight, depth);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = totalHeight / 2;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Varandas
        for (let floor = 1; floor < floors; floor++) {
            for (let side = -1; side <= 1; side += 2) {
                const balcony = new THREE.Mesh(a.balconyGeo, a.balconyMat);
                balcony.position.set(side * 4, floor * floorHeight, depth / 2 + 0.75);
                group.add(balcony);

                // Grade
                const rail = new THREE.Mesh(a.railGeo, a.railMat);
                rail.position.set(side * 4, floor * floorHeight + 0.5, depth / 2 + 1.45);
                group.add(rail);
            }
        }

        // Janelas
        for (let floor = 0; floor < floors; floor++) {
            for (let w = 0; w < 3; w++) {
                const win = new THREE.Mesh(a.windowGeo, a.windowMat);
                win.position.set((w - 1) * 4, floor * floorHeight + 1.8, depth / 2 + 0.05);
                group.add(win);
            }
        }

        // Entrada
        const doorGeo = new THREE.BoxGeometry(2.5, 3, 0.2);
        const doorMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.5, depth / 2 + 0.1);
        group.add(door);

        // Número do prédio
        const numMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const numGeo = new THREE.BoxGeometry(1, 0.5, 0.05);
        const num = new THREE.Mesh(numGeo, numMat);
        num.position.set(0, 3.5, depth / 2 + 0.15);
        group.add(num);

        group.position.set(x, 0, z);
        this.scene.add(group);

        // Collider
        const box = new THREE.Box3(
            new THREE.Vector3(x - width / 2, 0, z - depth / 2),
            new THREE.Vector3(x + width / 2, totalHeight, z + depth / 2)
        );
        Game.colliders.push({ box, type: 'apartment' });
    }
}
