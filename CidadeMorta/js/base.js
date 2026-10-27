// ============================================
// BASE SYSTEM - Cidade Morta: Último Refúgio
// Torre Esperança: evolução de nível 1-10
// ============================================

class BaseSystem {
    constructor(scene) {
        this.scene = scene;
        this.level = 1;
        this.maxLevel = 10;
        this.questsCompleted = 0;
        this.questsPerLevel = 2;

        this.levelBenefits = {
            1: { name: 'Refúgio Básico', description: 'Entrada, recepção e comércio básico.', unlocks: ['Portão blindado', 'Guardas', 'Comércio básico'] },
            2: { name: 'Enfermaria', description: 'Andar 2 desbloqueado: enfermaria.', unlocks: ['Cura gratuita', 'Mais NPCs médicos'] },
            3: { name: 'Oficina', description: 'Andar 3 desbloqueado: oficina de crafting.', unlocks: ['Novas receitas', 'Reparo de armas'] },
            4: { name: 'Laboratório', description: 'Andar 4 desbloqueado: laboratório.', unlocks: ['Antídotos', 'Melhorias de armas'] },
            5: { name: 'Dormitórios', description: 'Andar 5 desbloqueado: dormitórios.', unlocks: ['Regeneração ao dormir', 'Mais sobreviventes'] },
            6: { name: 'Arsenal', description: 'Andares 6-8: arsenal militar.', unlocks: ['Armas raras', 'Munição infinita na base'] },
            7: { name: 'Centro de Comando', description: 'Andares 9-12: centro de comando.', unlocks: ['Mapa completo', 'Radar de zumbis'] },
            8: { name: 'Defesas Avançadas', description: 'Andares 13-16: defesas.', unlocks: ['Torretas automáticas', 'Muros reforçados'] },
            9: { name: 'Centro de Pesquisa', description: 'Andares 17-19: pesquisa.', unlocks: ['Cura do vírus (lore)', 'Super armas'] },
            10: { name: 'Torre Completa', description: 'Topo: rádio e antena. Visão total da cidade.', unlocks: ['Contato com exterior', 'Vitória parcial'] }
        };
    }

    init() {
        this.updateTowerVisuals();
    }

    // ============================================
    // BASE MILITAR — portão com cartão de acesso,
    // zumbis especiais e arsenal de armas (Missão 5)
    // ============================================

    registerMilitaryBase(data) {
        this.militaryBase = {
            center: data.center,
            baseSize: data.baseSize,
            gateMesh: data.gateMesh,
            gatePosition: data.gatePosition,
            gateWidth: data.gateWidth,
            armoryPosition: data.armoryPosition,
            armoryDoorPosition: data.armoryDoorPosition,
            panel: data.panel,
            unlocked: false,
            assaultActive: false,
            armoryCratesSpawned: false
        };

        // Colisor do portão fechado — é removido quando destrancado
        const gw = data.gateWidth;
        this.militaryGateCollider = {
            box: new THREE.Box3(
                new THREE.Vector3(data.gatePosition.x - gw / 2, 0, data.gatePosition.z - 0.3),
                new THREE.Vector3(data.gatePosition.x + gw / 2, 4, data.gatePosition.z + 0.3)
            ),
            type: 'military_gate'
        };
        Game.colliders.push(this.militaryGateCollider);

        // OBS: a checagem de save com base já destrancada (_pendingMilitaryUnlock)
        // NÃO acontece aqui — precisa esperar linkArmoryInterior() rodar
        // primeiro, senão o assalto militar usaria a posição antiga
        // (externa) das caixas de armamento em vez do novo interior.
    }

    // Conecta a Base Militar (criada por citySystem) com o interior do
    // Arsenal (criado por buildingsSystem) — os dois são gerados em
    // momentos diferentes do carregamento do jogo e não se conhecem até
    // este ponto. Chamado explicitamente pelo game.js depois que ambos
    // já existem.
    linkArmoryInterior() {
        if (!this.militaryBase) return;
        const armoryInterior = Game.buildingsSystem && Game.buildingsSystem.getInterior('armory');
        if (!armoryInterior) return;

        armoryInterior.doorPosition = this.militaryBase.armoryDoorPosition;
        armoryInterior.outsideSpawn = this.militaryBase.armoryDoorPosition.clone().add(new THREE.Vector3(0, 0, 1.2));

        // As caixas de armamento (rifle/shotgun) ficam dentro do interior
        // do Arsenal — sobrescreve a posição externa antiga usada antes de
        // o Arsenal ter um interior de verdade.
        if (Game.buildingsSystem._armoryInteriorPosition) {
            this.militaryBase.armoryPosition = Game.buildingsSystem._armoryInteriorPosition;
        }

        // Se um save já carregado indicava que a base estava destrancada,
        // refazemos o desbloqueio agora — só depois do link acima, para que
        // o assalto militar e o spawn das caixas usem a posição correta
        // (dentro do Arsenal), e sem repetir notificações que o jogador já
        // tinha visto antes de salvar.
        if (this._pendingMilitaryUnlock) {
            this._pendingMilitaryUnlock = false;
            this.unlockMilitaryBase(true);
        }
    }

    // Chamado quando o jogador interage com o portão usando o Cartão Militar.
    // `silent` é usado ao restaurar um save onde a base já estava destrancada,
    // para recriar zumbis/caixas sem repetir notificações.
    unlockMilitaryBase(silent = false) {
        if (!this.militaryBase || this.militaryBase.unlocked) return false;

        this.militaryBase.unlocked = true;

        // Abre visualmente o portão (afunda no chão, como portão deslizante)
        if (this.militaryBase.gateMesh) {
            this.militaryBase.gateMesh.position.y = -4;
        }
        if (this.militaryBase.panel && this.militaryBase.panel.material) {
            this.militaryBase.panel.material.color.setHex(0x22ff44);
        }

        // Remove o colisor do portão para liberar a passagem
        const idx = Game.colliders.indexOf(this.militaryGateCollider);
        if (idx > -1) Game.colliders.splice(idx, 1);

        if (!silent) {
            EffectsSystem.notify('🔓 Portão da Base Militar destrancado!', 'success');
            // Avisa o sistema de missões (objetivo "use_keycard" da Missão 5)
            if (Game.questSystem) Game.questSystem.onMilitaryGateUnlocked();
        }

        // Ativa o assalto: enche a base de zumbis e libera o arsenal
        this.startMilitaryAssault(silent);
        return true;
    }

    // Popula a base militar com zumbis fixos (Missão 5) e libera as caixas de armas
    startMilitaryAssault(silent = false) {
        if (!this.militaryBase || this.militaryBase.assaultActive) return;
        this.militaryBase.assaultActive = true;

        const center = this.militaryBase.center;
        const half = this.militaryBase.baseSize / 2 - 3;

        // Pontos de spawn distribuídos dentro do perímetro da base, evitando
        // o interior dos barracões (z entre -8 e -2) e do Arsenal (z 6 a 11)
        const spawnOffsets = [
            [-half * 0.6, -half * 0.85], [half * 0.6, -half * 0.85],
            [-half * 0.3, half * 0.2], [half * 0.3, half * 0.2],
            [0, -half * 0.7], [-half * 0.7, half * 0.6],
            [half * 0.7, half * 0.6], [0, 0.3],
            [-half * 0.5, half * 0.45], [half * 0.5, half * 0.45]
        ];

        spawnOffsets.forEach(off => {
            const pos = new THREE.Vector3(center.x + off[0], 0, center.z + off[1]);
            // Maioria blindados (o General avisou: "os zumbis estão mais fortes"),
            // com alguns comuns/corredores misturados
            const roll = Math.random();
            const type = roll < 0.6 ? 'armored' : (roll < 0.85 ? 'common' : 'runner');
            Game.zombieSystem.spawnZombie(pos, type);
        });

        if (!silent) {
            EffectsSystem.notify('⚠️ A base está cheia de zumbis! Cuidado!', 'danger');
        }

        // Libera as caixas de armamento do arsenal
        this.spawnArmoryCrates();
    }

    // Cria as caixas de armamento dentro do Arsenal da base militar,
    // que entregam armas garantidas (rifle/shotgun) ao serem abertas.
    spawnArmoryCrates() {
        if (!this.militaryBase || this.militaryBase.armoryCratesSpawned) return;
        this.militaryBase.armoryCratesSpawned = true;

        const armoryPos = this.militaryBase.armoryPosition;
        const crateDefs = [
            { id: 'rifle', offset: [-2, 0, 0] },
            { id: 'shotgun', offset: [2, 0, 0] },
            { id: 'ammo_rifle', offset: [-1, 0, 1.5], qty: 2 },
            { id: 'ammo_shotgun', offset: [1, 0, 1.5], qty: 2 }
        ];

        crateDefs.forEach(def => {
            const pos = new THREE.Vector3(
                armoryPos.x + def.offset[0],
                0.25,
                armoryPos.z + def.offset[2]
            );
            Game.worldSystem.spawnWeaponCrate(pos, def.id, def.qty || 1);
        });
    }

    onQuestComplete() {
        this.questsCompleted++;

        if (this.questsCompleted >= this.questsPerLevel && this.level < this.maxLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.questsCompleted = 0;

        const benefits = this.levelBenefits[this.level];
        if (benefits) {
            EffectsSystem.notify(`🏗️ TORRE EVOLUIU! Nível ${this.level}: ${benefits.name}`, 'quest');

            setTimeout(() => {
                benefits.unlocks.forEach(unlock => {
                    EffectsSystem.notify(`✓ Desbloqueado: ${unlock}`, 'success');
                });
            }, 2000);
        }

        this.updateTowerVisuals();
        this.applyLevelBenefits();
    }

    updateTowerVisuals() {
        // Adicionar luzes baseado no nível
        const lightsPerLevel = this.level * 2;

        // Remover luzes antigas
        // (simplificado - apenas adiciona novas)
        for (let i = 0; i < Math.min(this.level, 5); i++) {
            const light = new THREE.PointLight(0xffaa44, 0.3, 10);
            light.position.set(
                (Math.random() - 0.5) * 15,
                i * 3.5 + 2,
                9 + Math.random() * 2
            );
            this.scene.add(light);
        }
    }

    applyLevelBenefits() {
        switch (this.level) {
            case 2:
                // Cura gratuita na base
                Game.playerSystem.maxHealth = 110;
                break;
            case 3:
                // Novas receitas de crafting
                Game.craftingSystem.recipes.push({
                    id: 'rifle_ammo_advanced',
                    name: 'Munição Rifle Avançada',
                    icon: '🔹',
                    result: 'ammo_rifle',
                    resultQty: 2,
                    materials: [
                        { id: 'metal', name: 'Sucata de Metal', quantity: 2 },
                        { id: 'parts', name: 'Peças Mecânicas', quantity: 1 }
                    ],
                    description: 'Munição de rifle em dobro.'
                });
                break;
            case 4:
                // Melhorias
                Game.playerSystem.maxHealth = 120;
                break;
            case 5:
                // Regeneração melhorada
                Game.playerSystem.maxHealth = 130;
                break;
            case 6:
                // Armas raras
                if (!Game.inventorySystem.ownedWeapons.includes('shotgun')) {
                    Game.inventorySystem.ownedWeapons.push('shotgun');
                    EffectsSystem.notify('🔫 Shotgun desbloqueada!', 'success');
                }
                break;
            case 7:
                // Radar melhorado
                Game.zombieSystem.maxZombies = 40; // Menos zumbis perto da base
                break;
            case 8:
                // Defesas - zumbis não chegam perto
                Game.playerSystem.maxHealth = 150;
                break;
            case 9:
                Game.playerSystem.maxHealth = 175;
                break;
            case 10:
                Game.playerSystem.maxHealth = 200;
                EffectsSystem.notify('🎉 PARABÉNS! Torre Esperança no nível máximo!', 'quest');
                EffectsSystem.notify('Você estabeleceu contato com o exterior. A esperança retorna.', 'quest');
                break;
        }
    }

    // Verificar se jogador está na safe zone
    isInSafeZone(position) {
        return position.length() < 25;
    }

    // Curar jogador quando na base (nível 2+)
    healInBase(deltaTime) {
        if (this.level >= 2 && this.isInSafeZone(Game.playerSystem.position)) {
            Game.playerSystem.health = Math.min(
                Game.playerSystem.maxHealth,
                Game.playerSystem.health + 5 * deltaTime
            );
        }
    }

    getState() {
        return {
            level: this.level,
            questsCompleted: this.questsCompleted,
            militaryBaseUnlocked: this.militaryBase ? this.militaryBase.unlocked : false
        };
    }

    loadState(state) {
        if (!state) return;
        this.level = state.level || 1;
        this.questsCompleted = state.questsCompleted || 0;
        this.updateTowerVisuals();

        // A Base Militar é registrada durante a geração da cidade, e o
        // link com o interior do Arsenal (linkArmoryInterior) acontece
        // logo depois — ambos no init() do jogo, que sempre roda ANTES do
        // jogador clicar em "Continuar". Ou seja, this.militaryBase já
        // existe e já está conectado ao Arsenal neste ponto. Aplicamos o
        // desbloqueio imediatamente; _pendingMilitaryUnlock existe apenas
        // como rede de segurança caso essa ordem mude no futuro.
        const wasUnlocked = !!state.militaryBaseUnlocked;
        if (wasUnlocked && this.militaryBase && !this.militaryBase.unlocked) {
            this.unlockMilitaryBase(true);
        } else {
            this._pendingMilitaryUnlock = wasUnlocked;
        }
    }
}
