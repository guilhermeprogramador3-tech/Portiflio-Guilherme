// ============================================
// GAME MANAGER - Cidade Morta: Último Refúgio
// Gerenciador principal do jogo
// ============================================

const Game = {
    state: 'loading', // loading, menu, playing, paused, dead, inventory, crafting, dialog
    scene: null,
    renderer: null,
    clock: null,

    // Sistemas
    cameraSystem: null,
    playerSystem: null,
    worldSystem: null,
    citySystem: null,
    buildingsSystem: null,
    zombieSystem: null,
    npcSystem: null,
    weaponsSystem: null,
    inventorySystem: null,
    craftingSystem: null,
    vehicleSystem: null,
    questSystem: null,
    baseSystem: null,
    effectsSystem: null,

    // Dados
    itemsData: null,
    weaponsData: null,
    zombiesData: null,

    // Stats
    killedZombies: 0,
    daysSurvived: 0,
    discoveredAreas: [],

    // Colliders
    colliders: [],

    // Interior genérico ativo (Hospital, Delegacia, Mercado, Arsenal).
    // null quando o jogador está na cidade aberta ou dentro da Torre (que
    // usa seu próprio sistema mais antigo, towerInteriorActive).
    _activeInteriorId: null,

    async init() {
        this.updateLoadingProgress(5, 'Inicializando motor gráfico...');

        // Criar cena Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: window.innerWidth > 900 });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Evita travamentos em celulares fracos
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.body.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.loopStarted = false;

        // Carregar dados
        this.updateLoadingProgress(15, 'Carregando dados...');
        await this.loadGameData();

        // Inicializar sistemas
        this.updateLoadingProgress(25, 'Criando sistemas...');
        this.initSystems();

        // Gerar mundo
        this.updateLoadingProgress(40, 'Gerando cidade...');
        this.worldSystem.generate();

        this.updateLoadingProgress(60, 'Construindo edifícios...');
        this.citySystem.generate();
        this.buildingsSystem.generate();

        // A Base Militar (citySystem) e o interior do Arsenal
        // (buildingsSystem) são criados em ordens diferentes e não sabem
        // um do outro no momento da própria criação — esta chamada conecta
        // os dois agora que ambos já existem (porta do Arsenal + posição
        // das caixas de armamento da Missão 5).
        this.baseSystem.linkArmoryInterior();

        this.updateLoadingProgress(75, 'Populando mundo...');
        this.zombieSystem.init();
        this.npcSystem.init();
        this.vehicleSystem.init();
        this.baseSystem.init();

        this.updateLoadingProgress(90, 'Finalizando...');
        this.questSystem.init();
        this.effectsSystem.init();

        // Configurar eventos
        this.setupEvents();

        // Detectar mobile
        this.detectMobile();

        this.updateLoadingProgress(100, 'Pronto!');

        // Mostrar menu
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
            document.getElementById('main-menu').style.display = 'flex';
            this.state = 'menu';

            // Verificar save
            if (SaveSystem.hasSave()) {
                document.getElementById('btn-continue').style.display = 'block';
            }
        }, 500);

        // Resize
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    },

    async loadGameData() {
        try {
            const [itemsRes, weaponsRes, zombiesRes] = await Promise.all([
                fetch('data/items.json').then(r => r.json()),
                fetch('data/weapons.json').then(r => r.json()),
                fetch('data/zombies.json').then(r => r.json())
            ]);
            this.itemsData = itemsRes.items;
            this.weaponsData = weaponsRes.weapons;
            this.zombiesData = zombiesRes.zombies;
        } catch (e) {
            console.warn('Usando dados embutidos:', e);
            this.loadEmbeddedData();
        }
    },

    loadEmbeddedData() {
        this.itemsData = [
            {id:"food_canned",name:"Comida Enlatada",type:"food",icon:"🥫",hunger:25,stackable:true,maxStack:5},
            {id:"water_bottle",name:"Garrafa d'Água",type:"water",icon:"💧",thirst:30,stackable:true,maxStack:5},
            {id:"medkit",name:"Kit Médico",type:"medicine",icon:"🩹",health:50,stackable:true,maxStack:3},
            {id:"bandage",name:"Bandagem",type:"medicine",icon:"🩹",health:20,stackable:true,maxStack:5},
            {id:"fabric",name:"Tecido",type:"material",icon:"🧵",stackable:true,maxStack:10},
            {id:"metal",name:"Sucata de Metal",type:"material",icon:"🔩",stackable:true,maxStack:10},
            {id:"alcohol",name:"Álcool",type:"material",icon:"🧴",stackable:true,maxStack:5},
            {id:"tools",name:"Ferramentas",type:"material",icon:"🔧",stackable:true,maxStack:3},
            {id:"parts",name:"Peças Mecânicas",type:"material",icon:"⚙️",stackable:true,maxStack:5},
            {id:"fuel",name:"Combustível",type:"material",icon:"⛽",stackable:true,maxStack:3},
            {id:"ammo_pistol",name:"Munição Pistola",type:"ammo",icon:"🔸",ammoType:"pistol",amount:12,stackable:true,maxStack:5},
            {id:"ammo_rifle",name:"Munição Rifle",type:"ammo",icon:"🔹",ammoType:"rifle",amount:10,stackable:true,maxStack:5},
            {id:"ammo_shotgun",name:"Munição Shotgun",type:"ammo",icon:"🔶",ammoType:"shotgun",amount:8,stackable:true,maxStack:5},
            {id:"vest",name:"Colete Balístico",type:"armor",icon:"🦺",armor:30,stackable:false}
        ];
        this.weaponsData = [
            {id:"fist",name:"Punhos",type:"melee",icon:"👊",damage:5,speed:0.3,range:2},
            {id:"knife",name:"Faca",type:"melee",icon:"🔪",damage:15,speed:0.4,range:2.5,critical:0.2},
            {id:"bat",name:"Taco",type:"melee",icon:"🏏",damage:20,speed:0.6,range:3,critical:0.1},
            {id:"axe",name:"Machado",type:"melee",icon:"🪓",damage:30,speed:0.8,range:2.8,critical:0.15},
            {id:"sword",name:"Espada",type:"melee",icon:"⚔️",damage:35,speed:0.7,range:3.5,critical:0.2},
            {id:"pistol",name:"Pistola",type:"ranged",icon:"🔫",damage:25,speed:0.3,range:50,ammoType:"pistol",magSize:12,reloadTime:1.5,critical:0.15},
            {id:"rifle",name:"Rifle",type:"ranged",icon:"🔫",damage:35,speed:0.15,range:80,ammoType:"rifle",magSize:30,reloadTime:2.5,critical:0.1},
            {id:"shotgun",name:"Shotgun",type:"ranged",icon:"🔫",damage:60,speed:0.9,range:20,ammoType:"shotgun",magSize:6,reloadTime:3.0,critical:0.25,spread:0.3}
        ];
        this.zombiesData = [
            {id:"common",name:"Zumbi Comum",health:40,damage:10,speed:1.5,color:"#4a7a4a",scale:1.0,xp:10},
            {id:"runner",name:"Corredor",health:30,damage:15,speed:4.0,color:"#7a4a4a",scale:0.9,xp:20},
            {id:"armored",name:"Blindado",health:150,damage:25,speed:1.0,color:"#5a5a6a",scale:1.3,xp:40},
            {id:"mutant",name:"Mutante",health:500,damage:50,speed:2.0,color:"#8a2a8a",scale:2.0,xp:100,isBoss:true},
            {id:"king",name:"Rei Zumbi",health:2000,damage:80,speed:2.5,color:"#aa0000",scale:3.0,xp:500,isBoss:true,phases:3}
        ];
    },

    initSystems() {
        this.cameraSystem = new CameraSystem();
        this.cameraSystem.init();

        this.playerSystem = new PlayerSystem();
        this.playerSystem.init();

        this.effectsSystem = new EffectsSystem(this.scene);

        this.weaponsSystem = new WeaponsSystem(this.scene);
        this.inventorySystem = new InventorySystem();
        this.craftingSystem = new CraftingSystem();

        this.worldSystem = new WorldSystem(this.scene);
        this.citySystem = new CitySystem(this.scene);
        this.buildingsSystem = new BuildingsSystem(this.scene);

        this.zombieSystem = new ZombieSystem(this.scene);
        this.npcSystem = new NPCSystem(this.scene);
        this.vehicleSystem = new VehicleSystem(this.scene);
        this.questSystem = new QuestSystem();
        this.baseSystem = new BaseSystem(this.scene);
    },

    setupEvents() {
        // Teclas de interface
        document.addEventListener('keydown', (e) => {
            // Ignora o "key repeat" do navegador/SO (disparado continuamente
            // enquanto a tecla fica pressionada). Sem isso, segurar E perto
            // da porta da Torre podia chamar interact() várias vezes em
            // sequência rapidíssima, fazendo o jogador entrar e sair (ou
            // sair e reentrar) repetidas vezes no mesmo "toque" de tecla —
            // o que parecia uma barreira travando a entrada/saída.
            if (e.repeat) return;

            if (e.code === 'KeyI') this.toggleInventory();
            if (e.code === 'KeyC') this.toggleCrafting();
            if (e.code === 'KeyE') this.interact();
            if (e.code === 'KeyR') this.playerSystem.reload();
            if (e.code === 'Escape') this.togglePause();
            if (e.code === 'KeyM') this.toggleMap();
            if (e.code === 'KeyJ') this.toggleQuestLog();

            // Trocar armas com números
            if (e.code === 'Digit1') this.equipWeaponSlot(0);
            if (e.code === 'Digit2') this.equipWeaponSlot(1);
            if (e.code === 'Digit3') this.equipWeaponSlot(2);
            if (e.code === 'Digit4') this.equipWeaponSlot(3);
        });

        // Botões do menu
        document.getElementById('btn-new-game').addEventListener('click', () => this.newGame());
        document.getElementById('btn-continue').addEventListener('click', () => this.continueGame());
        document.getElementById('btn-controls').addEventListener('click', () => this.showControls());

        // Botões de pause
        document.getElementById('btn-resume').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-save').addEventListener('click', () => this.saveGame());
        document.getElementById('btn-quit').addEventListener('click', () => this.quitToMenu());

        // Morte
        document.getElementById('btn-respawn').addEventListener('click', () => this.respawn());

        // Inventário
        document.getElementById('btn-close-inventory').addEventListener('click', () => this.toggleInventory());
        document.getElementById('btn-close-crafting').addEventListener('click', () => this.toggleCrafting());
        document.getElementById('btn-close-questlog').addEventListener('click', () => this.toggleQuestLog());

        // Mobile
        document.getElementById('btn-mobile-attack').addEventListener('touchstart', () => this.playerSystem.attack());
        document.getElementById('btn-mobile-interact').addEventListener('touchstart', () => this.interact());
        document.getElementById('btn-mobile-jump').addEventListener('touchstart', () => { this.playerSystem.mobileJump = true; });
        document.getElementById('btn-mobile-inventory').addEventListener('touchstart', () => this.toggleInventory());
        document.getElementById('btn-mobile-reload').addEventListener('touchstart', () => this.playerSystem.reload());
        document.getElementById('btn-mobile-questlog').addEventListener('touchstart', () => this.toggleQuestLog());

        this.setupMobileJoystick();
    },

    setupMobileJoystick() {
        const base = document.getElementById('joystick-base');
        const stick = document.getElementById('joystick-stick');
        let touching = false;
        let startX, startY;

        const handleTouch = (e) => {
            if (!touching) return;
            const touch = e.touches[0];
            const rect = base.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const maxDist = rect.width / 2 - 25;

            let dx = touch.clientX - centerX;
            let dy = touch.clientY - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }

            stick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.playerSystem.mobileInput.x = dx / maxDist;
            this.playerSystem.mobileInput.y = dy / maxDist;
        };

        base.addEventListener('touchstart', (e) => {
            touching = true;
            handleTouch(e);
        });
        base.addEventListener('touchmove', handleTouch);
        base.addEventListener('touchend', () => {
            touching = false;
            stick.style.transform = 'translate(-50%, -50%)';
            this.playerSystem.mobileInput.x = 0;
            this.playerSystem.mobileInput.y = 0;
        });
    },

    detectMobile() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.innerWidth < 768;
        if (isMobile) {
            document.getElementById('mobile-controls').style.display = 'block';
        }
    },

    newGame() {
        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        this.state = 'playing';

        // Posicionar jogador em frente à Torre Esperança (área segura, fora da torre)
        this.playerSystem.position.set(0, 0, 16);
        this.playerSystem.equippedWeapon = 'knife';
        this.playerSystem.updateWeaponDisplay();

        // Dar itens iniciais
        this.inventorySystem.addItem('food_canned', 2);
        this.inventorySystem.addItem('water_bottle', 2);
        this.inventorySystem.addItem('bandage', 3);

        // Nenhuma missão é dada automaticamente — o jogador precisa
        // procurar o General Ramos na Torre para receber a Missão 1.
        EffectsSystem.notify('Bem-vindo à Cidade Morta. Fale com o General Ramos na Torre para receber sua primeira missão.', 'info');

        this.startGameLoop();
    },

    continueGame() {
        const saveData = SaveSystem.load();
        if (!saveData) {
            this.newGame();
            return;
        }

        document.getElementById('main-menu').style.display = 'none';
        document.getElementById('hud').style.display = 'block';
        this.state = 'playing';

        // Restaurar estado
        this.playerSystem.loadState(saveData.player);
        this.inventorySystem.loadState(saveData.inventory);
        // Restaura as armas que o jogador já possuía (ex: rifle/shotgun
        // conquistados na Base Militar) — sem isso, elas eram perdidas ao
        // recarregar o jogo, pois só ficavam salvas e nunca eram lidas de volta.
        if (Array.isArray(saveData.weapons) && saveData.weapons.length > 0) {
            this.inventorySystem.ownedWeapons = saveData.weapons;
        }
        this.questSystem.loadState(saveData.quests);
        this.baseSystem.loadState(saveData.base);
        this.killedZombies = saveData.killedZombies || 0;
        this.daysSurvived = saveData.daysSurvived || 0;
        this.discoveredAreas = saveData.discoveredAreas || [];

        // Se o save foi feito dentro da Torre, restaurar o estado "dentro"
        // para que a saída e os NPCs do interior continuem acessíveis.
        const sp = this.playerSystem.position;
        this.buildingsSystem.towerInteriorActive = sp.x > 290 && sp.x < 310 && sp.z > -10 && sp.z < 10;

        this.playerSystem.updateWeaponDisplay();
        EffectsSystem.notify('Jogo carregado com sucesso!', 'success');

        this.startGameLoop();
    },

    startGameLoop() {
        // Impede criar vários loops se clicar em continuar/nova partida várias vezes
        if (this.loopStarted) return;
        this.loopStarted = true;
        this.clock.start();
        this.gameLoop();
    },

    gameLoop() {
        requestAnimationFrame(() => this.gameLoop());

        const deltaTime = Math.min(this.clock.getDelta(), 0.1);

        if (this.state === 'playing') {
            // Atualizar sistemas
            this.playerSystem.update(deltaTime, this.cameraSystem, this.colliders);
            this.cameraSystem.update(
                deltaTime,
                this.playerSystem.position,
                this.playerSystem.isMoving(),
                this.playerSystem.isRunning,
                this.playerSystem.isAiming
            );

            this.zombieSystem.update(deltaTime, this.playerSystem.position);
            this.npcSystem.update(deltaTime, this.playerSystem.position);
            this.vehicleSystem.update(deltaTime);
            this.effectsSystem.update(deltaTime, this.playerSystem.position);
            this.worldSystem.update(deltaTime, this.playerSystem.position);
            this.questSystem.update(deltaTime);
            this.buildingsSystem.updateInterior(deltaTime);

            // Atualizar minimapa. Faz dezenas de operações de canvas e
            // itera todos os colliders/zumbis/NPCs do jogo a cada chamada
            // — desnecessário a 60fps já que é só uma referência visual
            // auxiliar. Throttle para ~12 vezes por segundo: imperceptível
            // para o jogador, mas evita boa parte desse trabalho repetido
            // sem necessidade em cada frame renderizado.
            this._minimapTimer = (this._minimapTimer || 0) + deltaTime;
            if (this._minimapTimer >= 1 / 12) {
                this._minimapTimer = 0;
                this.updateMinimap();
            }

            // Atualizar relógio dia/noite no HUD. Faz várias chamadas de
            // getElementById/textContent por frame para um relógio que
            // muda muito lentamente (8 min por dia completo) — 2x por
            // segundo já é mais que suficiente para parecer fluido.
            this._hudClockTimer = (this._hudClockTimer || 0) + deltaTime;
            if (this._hudClockTimer >= 0.5) {
                this._hudClockTimer = 0;
                this.updateDayNightHUD();
            }

            // Rede de segurança: garante que o flag "dentro da torre" sempre
            // reflita a posição real do jogador, mesmo se ele for movido por
            // outro caminho (save antigo, teleporte de debug, etc.). Evita o
            // jogador ficar "preso" no espaço paralelo do interior sem
            // conseguir interagir com a porta de saída.
            // Importante: checa a caixa real do lobby (x entre 290 e 310,
            // z entre -10 e 10), não apenas "x > 200" — a cidade aberta tem
            // áreas (estacionamentos, apartamentos) que passam de x=130 e o
            // jogador pode caminhar livremente além disso sem nunca ter
            // entrado na torre.
            const pp = this.playerSystem.position;
            const reallyInsideInterior = pp.x > 290 && pp.x < 310 && pp.z > -10 && pp.z < 10;
            if (this.buildingsSystem.towerInteriorActive !== reallyInsideInterior) {
                // Só corrige automaticamente quando os dois lados concordam
                // que algo está errado (ex: flag diz "fora" mas o jogador
                // está fisicamente dentro do lobby, ou vice-versa). Não força
                // "fora" só por estar perto da borda em z=10/x=290, já que
                // enterTowerInterior/exitTowerInterior já controlam o flag
                // corretamente nas transições normais.
                if (reallyInsideInterior && !this.buildingsSystem.towerInteriorActive) {
                    this.buildingsSystem.towerInteriorActive = true;
                } else if (!reallyInsideInterior && this.buildingsSystem.towerInteriorActive && (pp.x < 200)) {
                    this.buildingsSystem.towerInteriorActive = false;
                }
            }

            // Verificar interação
            this.checkInteraction();
        }

        // Renderizar
        this.renderer.render(this.scene, this.cameraSystem.camera);
    },

    checkInteraction() {
        const playerPos = this.playerSystem.position;
        const lookDir = this.cameraSystem.getLookDirection();
        let closestDist = this.playerSystem.interactRange;
        let target = null;

        // Verificar porta da Torre (exterior) ou saída (interior)
        const insideTower = this.isInsideTower();
        if (!insideTower) {
            // Porta de entrada — só visível fora
            for (const door of this.buildingsSystem.towerDoors) {
                const dist = playerPos.distanceTo(door.position);
                if (dist < closestDist + 1) {
                    closestDist = dist;
                    target = { type: 'tower_door', object: door };
                }
            }
        } else {
            // Porta de saída — dentro do interior, próximo à frente.
            // Usamos a distância até o vão da porta (não um ponto fixo único),
            // assim funciona mesmo se o jogador chegar de um ângulo diferente.
            const doorClampX = Math.max(297.5, Math.min(playerPos.x, 302.5));
            const exitPos = new THREE.Vector3(doorClampX, 0, 8.5);
            const dist = playerPos.distanceTo(exitPos);
            if (dist < closestDist + 2) {
                closestDist = dist;
                target = { type: 'tower_exit', object: { label: '[E] Sair da Torre' } };
            }
        }

        // Verificar portas dos interiores genéricos (Hospital, Delegacia,
        // Mercado, Arsenal). Mesmo padrão da Torre, mas reutilizável para
        // qualquer quantidade de prédios — cada um tem sua "sala paralela"
        // própria (offsetX) e uma porta no mundo real.
        const insideGenericInterior = this.getCurrentInteriorId();
        if (!insideGenericInterior) {
            for (const interior of this.buildingsSystem.interiors) {
                if (!interior.doorPosition) continue; // ex: Arsenal antes de destrancar a base
                // Trava defensiva extra: a porta do Arsenal só fica
                // interativa com a Base Militar já destrancada. Na prática
                // o próprio portão externo já bloqueia o caminho até aqui,
                // mas esta checagem evita qualquer acesso indevido caso a
                // física permita atravessar paredes por algum bug futuro.
                if (interior.id === 'armory' && (!this.baseSystem.militaryBase || !this.baseSystem.militaryBase.unlocked)) continue;
                const dist = playerPos.distanceTo(interior.doorPosition);
                if (dist < closestDist + 1.5) {
                    closestDist = dist;
                    target = { type: 'interior_door', object: interior };
                }
            }
        } else {
            const interior = this.buildingsSystem.getInterior(insideGenericInterior);
            if (interior) {
                const exitPos = new THREE.Vector3(interior.offsetX, 0, interior.D ? interior.D / 2 : 8);
                const dist = playerPos.distanceTo(exitPos);
                if (dist < closestDist + 2.5) {
                    closestDist = dist;
                    target = { type: 'interior_exit', object: interior };
                }
            }
        }

        // Verificar NPCs
        for (const npc of this.npcSystem.npcs) {
            const dist = playerPos.distanceTo(npc.position);
            if (dist < closestDist) {
                closestDist = dist;
                target = { type: 'npc', object: npc };
            }
        }

        // Verificar veículos
        for (const vehicle of this.vehicleSystem.vehicles) {
            const dist = playerPos.distanceTo(vehicle.position);
            if (dist < closestDist + 1) {
                closestDist = dist;
                target = { type: 'vehicle', object: vehicle };
            }
        }

        // Verificar itens no chão
        for (const item of this.worldSystem.groundItems) {
            const dist = playerPos.distanceTo(item.position);
            if (dist < closestDist) {
                closestDist = dist;
                target = { type: 'item', object: item };
            }
        }

        // Verificar loot containers (inclui caixas de armamento da base militar)
        for (const container of this.worldSystem.lootContainers) {
            if (container.looted) continue;
            const dist = playerPos.distanceTo(container.position);
            if (dist < closestDist) {
                closestDist = dist;
                target = { type: 'container', object: container };
            }
        }

        // Verificar o portão da Base Militar (precisa do Cartão Militar)
        const mb = this.baseSystem.militaryBase;
        if (mb && !mb.unlocked) {
            const dist = playerPos.distanceTo(mb.gatePosition);
            if (dist < closestDist + 2) {
                closestDist = dist;
                target = { type: 'military_gate', object: mb };
            }
        }

        this.playerSystem.interactTarget = target;
        const prompt = document.getElementById('interact-prompt');
        if (target) {
            prompt.style.display = 'block';
            if (target.type === 'npc') prompt.querySelector('span').textContent = `[E] Falar com ${target.object.name}`;
            else if (target.type === 'vehicle') prompt.querySelector('span').textContent = '[E] Entrar no veículo';
            else if (target.type === 'item') prompt.querySelector('span').textContent = `[E] Pegar ${target.object.name}`;
            else if (target.type === 'container') prompt.querySelector('span').textContent = target.object.isWeaponCrate ? `[E] Abrir ${target.object.name}` : '[E] Abrir';
            else if (target.type === 'tower_door') prompt.querySelector('span').textContent = target.object.label;
            else if (target.type === 'tower_exit') prompt.querySelector('span').textContent = target.object.label;

        } else {
            prompt.style.display = 'none';
        }
    },

    interact() {
        const target = this.playerSystem.interactTarget;
        if (!target) return;

        switch (target.type) {
            case 'npc':
                this.npcSystem.talkTo(target.object);
                break;
            case 'vehicle':
                this.vehicleSystem.enterVehicle(target.object);
                break;
            case 'item':
                this.worldSystem.pickupItem(target.object);
                break;
            case 'container':
                this.worldSystem.openContainer(target.object);
                break;
            case 'tower_door':
                this.enterTowerInterior();
                break;
            case 'tower_exit':
                this.exitTowerInterior();
                break;
            case 'military_gate':
                if (this.inventorySystem.hasItem('key_military', 1)) {
                    this.baseSystem.unlockMilitaryBase();
                } else {
                    EffectsSystem.notify('🔒 Você precisa do Cartão Militar para entrar.', 'danger');
                }
                break;
            case 'interior_door':
                this.enterInterior(target.object);
                break;
            case 'interior_exit':
                this.exitInterior(target.object);
                break;
        }
    },

    isInsideTower() {
        // Usa um flag de estado explícito em vez de checar a posição X do jogador.
        // Antes comparava `position.x > 200`, mas a cidade tem ruas e áreas que
        // passam de x=200 (ver world.js), então andar normalmente pela cidade
        // podia ser confundido com "estar dentro da torre": os NPCs da torre
        // (que ficam perto de x=300) pareciam ter sumido, e a saída
        // (que teleporta para fora da torre real) parecia não existir.
        return !!this.buildingsSystem.towerInteriorActive;
    },

    // Retorna o id do interior genérico em que o jogador está agora (ou
    // null se estiver na cidade aberta ou dentro da Torre, que usa seu
    // próprio sistema separado e mais antigo). Usa um flag de estado
    // explícito, pelo mesmo motivo de isInsideTower() acima.
    getCurrentInteriorId() {
        return this._activeInteriorId || null;
    },

    // Entrada genérica em qualquer interior registrado em
    // buildingsSystem.interiors (Hospital, Delegacia, Mercado, Arsenal).
    enterInterior(interior) {
        const now = performance.now();
        if (this._lastInteriorTeleport && now - this._lastInteriorTeleport < 500) return;
        this._lastInteriorTeleport = now;

        this.playerSystem.position.copy(interior.insideSpawn);
        this.playerSystem.velocity.set(0, 0, 0);
        this._activeInteriorId = interior.id;
        EffectsSystem.notify(`${interior.label} — Interior`, 'info');
        this.updateLocationHUD(`🏢 ${interior.label} — Interior`);
    },

    exitInterior(interior) {
        const now = performance.now();
        if (this._lastInteriorTeleport && now - this._lastInteriorTeleport < 500) return;
        this._lastInteriorTeleport = now;

        this.playerSystem.position.copy(interior.outsideSpawn);
        this.playerSystem.velocity.set(0, 0, 0);
        this._activeInteriorId = null;
        EffectsSystem.notify(`Voltou para fora — ${interior.label}`, 'info');
        this.updateLocationHUD('🌆 Cidade Morta');
    },

    enterTowerInterior() {
        // Cooldown evita re-teleportar imediatamente (ex: toque duplo no
        // botão mobile, ou o jogador ficar exatamente na borda de detecção
        // das duas portas ao mesmo tempo).
        const now = performance.now();
        if (this._lastTowerTeleport && now - this._lastTowerTeleport < 500) return;
        this._lastTowerTeleport = now;

        const spawn = this.buildingsSystem.towerInsideSpawn;
        this.playerSystem.position.set(spawn.x, spawn.y, spawn.z);
        this.playerSystem.velocity.set(0, 0, 0);
        this.buildingsSystem.towerInteriorActive = true;
        EffectsSystem.notify('Torre da Esperança — Interior', 'info');
        this.updateLocationHUD('🏢 Torre da Esperança — Lobby');

        // Mesma lógica de exitTowerInterior, em sentido inverso: se um NPC
        // em escolta estiver seguindo o jogador, ele entra junto.
        this.npcSystem.npcs.forEach(npc => {
            if (npc.isFollowing) {
                npc.position.set(spawn.x + 2, spawn.y, spawn.z + 1);
            }
        });
    },

    exitTowerInterior() {
        const now = performance.now();
        if (this._lastTowerTeleport && now - this._lastTowerTeleport < 500) return;
        this._lastTowerTeleport = now;

        const spawn = this.buildingsSystem.towerOutsideSpawn;
        this.playerSystem.position.set(spawn.x, spawn.y, spawn.z);
        this.playerSystem.velocity.set(0, 0, 0);
        this.buildingsSystem.towerInteriorActive = false;
        EffectsSystem.notify('Voltou para fora da Torre', 'info');
        this.updateLocationHUD('🌆 Cidade Morta');

        // NPCs em escolta (ex: Dra. Jennifer na Missão 8) ficam na sala
        // virtual do interior da torre (x≈300) e nunca se movem fisicamente
        // pela cidade real. Ao sair, teleportamos junto qualquer NPC que
        // esteja seguindo o jogador, senão a escolta nunca progride.
        this.npcSystem.npcs.forEach(npc => {
            if (npc.isFollowing) {
                npc.position.set(spawn.x + 2, spawn.y, spawn.z + 1);
            }
        });
    },

    updateLocationHUD(text) {
        const el = document.getElementById('hud-location');
        if (!el) return;
        el.textContent = text;
        el.style.opacity = '1';
        clearTimeout(this._locationHUDTimer);
        this._locationHUDTimer = setTimeout(() => { el.style.opacity = '0'; }, 3000);
    },

    toggleInventory() {
        if (this.state === 'playing') {
            this.state = 'inventory';
            document.getElementById('inventory-screen').style.display = 'flex';
            this.inventorySystem.render();
            document.exitPointerLock();
        } else if (this.state === 'inventory') {
            this.state = 'playing';
            document.getElementById('inventory-screen').style.display = 'none';
        }
    },

    toggleCrafting() {
        if (this.state === 'playing') {
            this.state = 'crafting';
            document.getElementById('crafting-screen').style.display = 'flex';
            this.craftingSystem.render();
            document.exitPointerLock();
        } else if (this.state === 'crafting') {
            this.state = 'playing';
            document.getElementById('crafting-screen').style.display = 'none';
        }
    },

    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            document.getElementById('pause-screen').style.display = 'flex';
            document.exitPointerLock();
        } else if (this.state === 'paused') {
            this.state = 'playing';
            document.getElementById('pause-screen').style.display = 'none';
        }
    },

    toggleMap() {
        // Futuro: mapa completo
    },

    toggleQuestLog() {
        if (this.state === 'playing') {
            this.state = 'questlog';
            document.getElementById('quest-log-screen').style.display = 'flex';
            this.questSystem.renderQuestLog();
            document.exitPointerLock();
        } else if (this.state === 'questlog') {
            this.state = 'playing';
            document.getElementById('quest-log-screen').style.display = 'none';
        }
    },

    equipWeaponSlot(index) {
        const weapons = this.inventorySystem.getOwnedWeapons();
        if (index < weapons.length) {
            this.playerSystem.equippedWeapon = weapons[index];
            this.playerSystem.updateWeaponDisplay();
            EffectsSystem.notify(`Equipou: ${this.weaponsSystem.getWeaponData(weapons[index]).name}`, 'info');
        }
    },

    saveGame() {
        const gameState = {
            player: this.playerSystem.getState(),
            inventory: this.inventorySystem.getState(),
            weapons: this.inventorySystem.getOwnedWeapons(),
            quests: this.questSystem.getState(),
            base: this.baseSystem.getState(),
            killedZombies: this.killedZombies,
            daysSurvived: this.daysSurvived,
            discoveredAreas: this.discoveredAreas
        };

        if (SaveSystem.save(gameState)) {
            EffectsSystem.notify('Jogo salvo com sucesso!', 'success');
        } else {
            EffectsSystem.notify('Erro ao salvar!', 'danger');
        }
    },

    playerDied() {
        this.state = 'dead';
        document.getElementById('death-screen').style.display = 'flex';
        document.exitPointerLock();
    },

    respawn() {
        document.getElementById('death-screen').style.display = 'none';
        this.state = 'playing';

        // Resetar jogador na Torre (área segura, fora da torre)
        this.playerSystem.position.set(0, 0, 16);
        this.playerSystem.health = 50;
        this.playerSystem.hunger = 50;
        this.playerSystem.thirst = 50;
        this.playerSystem.energy = 100;

        // Perder alguns itens
        this.inventorySystem.loseRandomItems(3);
        EffectsSystem.notify('Você renasceu na Torre Esperança.', 'info');
    },

    quitToMenu() {
        this.state = 'menu';
        document.getElementById('pause-screen').style.display = 'none';
        document.getElementById('hud').style.display = 'none';
        document.getElementById('main-menu').style.display = 'flex';
    },

    showControls() {
        alert(
            'CONTROLES:\n\n' +
            'WASD - Mover\n' +
            'Mouse - Olhar\n' +
            'Clique Esquerdo - Atacar\n' +
            'Clique Direito - Mirar\n' +
            'Shift - Correr\n' +
            'Ctrl - Agachar\n' +
            'Espaço - Pular\n' +
            'E - Interagir\n' +
            'R - Recarregar\n' +
            'I - Inventário\n' +
            'C - Crafting\n' +
            '1-4 - Trocar Arma\n' +
            'Esc - Pausar'
        );
    },

    updateMinimap() {
        const canvas = document.getElementById('minimap');
        const ctx = canvas.getContext('2d');
        const size = 200;
        const scale = 2;

        ctx.clearRect(0, 0, size, size);

        // Fundo
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
        ctx.fill();

        // Centro = jogador
        const px = this.playerSystem.position.x;
        const pz = this.playerSystem.position.z;

        // Desenhar edifícios próximos
        ctx.fillStyle = '#555';
        for (const col of this.colliders) {
            if (!col.box) continue;
            const cx = (col.box.min.x + col.box.max.x) / 2;
            const cz = (col.box.min.z + col.box.max.z) / 2;
            const dx = (cx - px) * scale + size/2;
            const dz = (cz - pz) * scale + size/2;
            const w = (col.box.max.x - col.box.min.x) * scale;
            const h = (col.box.max.z - col.box.min.z) * scale;

            if (dx > -50 && dx < size + 50 && dz > -50 && dz < size + 50) {
                ctx.fillRect(dx - w/2, dz - h/2, w, h);
            }
        }

        // Zumbis
        ctx.fillStyle = '#ff3333';
        for (const zombie of this.zombieSystem.zombies) {
            const dx = (zombie.position.x - px) * scale + size/2;
            const dz = (zombie.position.z - pz) * scale + size/2;
            const dist = Math.sqrt((dx - size/2)**2 + (dz - size/2)**2);
            if (dist < size/2) {
                ctx.beginPath();
                ctx.arc(dx, dz, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // NPCs
        ctx.fillStyle = '#33ff33';
        for (const npc of this.npcSystem.npcs) {
            const dx = (npc.position.x - px) * scale + size/2;
            const dz = (npc.position.z - pz) * scale + size/2;
            const dist = Math.sqrt((dx - size/2)**2 + (dz - size/2)**2);
            if (dist < size/2) {
                ctx.beginPath();
                ctx.arc(dx, dz, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Torre Esperança
        const tx = (0 - px) * scale + size/2;
        const tz = (0 - pz) * scale + size/2;
        const tDist = Math.sqrt((tx - size/2)**2 + (tz - size/2)**2);
        if (tDist < size/2) {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(tx, tz, 5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Jogador (centro)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(size/2, size/2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Direção do jogador
        const dir = this.cameraSystem.getForward();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(size/2, size/2);
        ctx.lineTo(size/2 + dir.x * 12, size/2 + dir.z * 12);
        ctx.stroke();

        // Borda circular
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/2 - 1, 0, Math.PI * 2);
        ctx.stroke();
    },

    updateDayNightHUD() {
        if (!this.effectsSystem) return;

        const timeStr  = this.effectsSystem.getGameTimeString();
        const phase    = this.effectsSystem.getDayPhase();
        const icon     = this.effectsSystem.getDayPhaseIcon();
        const day      = this.effectsSystem.dayCount;
        const isNight  = this.effectsSystem.isNight();

        const clockEl = document.getElementById('hud-clock');
        const phaseEl = document.getElementById('hud-phase');
        const dayEl   = document.getElementById('hud-day');

        if (clockEl) clockEl.textContent = timeStr;
        if (phaseEl) phaseEl.textContent = `${icon} ${phase}`;
        if (dayEl)   dayEl.textContent   = `Dia ${day}`;

        // Pulsar borda do relógio de vermelho à noite
        const clockBox = document.getElementById('day-night-display');
        if (clockBox) {
            clockBox.style.borderColor = isNight ? '#5577ff' : '#ffaa33';
            clockBox.style.boxShadow   = isNight
                ? '0 0 8px rgba(85,119,255,0.5)'
                : '0 0 8px rgba(255,170,51,0.4)';
        }
    },

    updateLoadingProgress(percent, text) {
        const bar = document.getElementById('loading-progress');
        const label = document.getElementById('loading-text');
        if (bar) bar.style.width = percent + '%';
        if (label) label.textContent = text;
    }
};
