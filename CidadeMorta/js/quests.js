// ============================================
// QUEST SYSTEM - Cidade Morta: Último Refúgio
// Sistema de missões numeradas, todas entregues pelo General
// Ramos. Progressão NÃO é automática: o jogador sempre precisa
// falar com o General para receber a próxima missão da cadeia.
// ============================================

class QuestSystem {
    constructor() {
        this.quests = [];
        this.activeQuest = null;
        this.completedQuests = [];

        // Cadeia principal de missões — numerada de 1 a 8.
        // Todas são entregues pelo General Ramos (ver npc.js). Os outros
        // NPCs (Dra. Jennifer, Ana) comentam sobre a situação, mas sempre
        // encaminham o jogador de volta ao General.
        this.mainChain = [
            'm1_explore_city',
            'm2_hospital_raid',
            'm3_find_brother',
            'm4_defend_tower',
            'm5_military_raid',
            'm6_kill_mutant',
            'm7_kill_king',
            'm8_the_cure'
        ];

        // Missões secundárias, fora da cadeia principal (oferecidas por
        // NPCs específicos e não bloqueiam a progressão principal)
        this.sideChain = ['s1_escort_survivor'];

        this.questDatabase = {
            // ---------------------------------------------------
            // MISSÃO 1 — Tutorial: explorar e entender o básico
            // ---------------------------------------------------
            'm1_explore_city': {
                id: 'm1_explore_city',
                number: 1,
                name: 'Missão 1: Primeiros Passos',
                giver: 'General Ramos',
                description: 'Aprenda a sobreviver. Explore a cidade, elimine alguns zumbis e colete comida.',
                objectives: [
                    { type: 'kill_zombies', target: 5, current: 0, text: 'Eliminar 5 zumbis' },
                    { type: 'collect_items', itemId: 'food_canned', target: 3, current: 0, text: 'Coletar 3 comidas' }
                ],
                rewards: { items: ['ammo_pistol', 'medkit'], notification: '✅ Missão 1 completa! Você está pronto para ir mais longe.' },
                onComplete: () => EffectsSystem.notify('📻 Volte e fale com o General Ramos para a próxima missão.', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 2 — Tutorial: coleta orientada + área específica
            // ---------------------------------------------------
            'm2_hospital_raid': {
                id: 'm2_hospital_raid',
                number: 2,
                name: 'Missão 2: Recuperar Remédios',
                giver: 'General Ramos',
                description: 'Vá ao hospital e recupere suprimentos médicos para a Torre.',
                objectives: [
                    { type: 'reach_area', area: 'hospital', reached: false, text: 'Chegar ao Hospital' },
                    { type: 'collect_items', itemId: 'medkit', target: 2, current: 0, text: 'Coletar 2 kits médicos' },
                    { type: 'kill_zombies', target: 10, current: 0, text: 'Eliminar 10 zumbis' }
                ],
                rewards: { items: ['medkit', 'medkit', 'ammo_rifle'], notification: '✅ Missão 2 completa! Remédios recuperados.' },
                onComplete: () => EffectsSystem.notify('📻 Volte e fale com o General Ramos para a próxima missão.', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 3 — Tutorial: resgate / combate em área
            // ---------------------------------------------------
            'm3_find_brother': {
                id: 'm3_find_brother',
                number: 3,
                name: 'Missão 3: Encontrar Sobreviventes',
                giver: 'General Ramos',
                description: 'Encontre o irmão de Ana na delegacia, resgate-o e limpe a área.',
                objectives: [
                    { type: 'reach_area', area: 'police', reached: false, text: 'Ir à Delegacia' },
                    { type: 'kill_zombies', target: 8, current: 0, text: 'Limpar a delegacia (8 zumbis)' },
                    { type: 'escort_npc', npcName: 'Tiago - Irmão de Ana', destinationArea: 'tower', completed: false, text: 'Escoltar Tiago até a Torre' }
                ],
                rewards: { items: ['ammo_pistol', 'ammo_pistol', 'vest'], notification: '✅ Missão 3 completa! Sobrevivente encontrado.' },
                onComplete: () => EffectsSystem.notify('📻 Volte e fale com o General Ramos para a próxima missão.', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 4 — Tutorial final: defesa em onda
            // ---------------------------------------------------
            'm4_defend_tower': {
                id: 'm4_defend_tower',
                number: 4,
                name: 'Missão 4: Defender a Torre',
                giver: 'General Ramos',
                description: 'Uma horda se aproxima! Defenda a Torre Esperança!',
                objectives: [
                    { type: 'kill_zombies', target: 25, current: 0, text: 'Eliminar 25 zumbis da horda' }
                ],
                rewards: { items: ['medkit', 'medkit', 'ammo_rifle', 'ammo_shotgun'], notification: '✅ Missão 4 completa! A Torre resistiu.' },
                onComplete: () => EffectsSystem.notify('📻 O General Ramos quer falar com você sobre a Base Militar.', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 5 — A Base Militar (zumbis fortes + armas)
            // ---------------------------------------------------
            'm5_military_raid': {
                id: 'm5_military_raid',
                number: 5,
                name: 'Missão 5: Reforço Tático',
                giver: 'General Ramos',
                description: 'Os zumbis estão mais fortes. O General deu acesso à Base Militar — use o cartão no portão, pegue armas no Arsenal e elimine os zumbis blindados que tomaram o local.',
                objectives: [
                    { type: 'reach_area', area: 'military', reached: false, text: 'Chegar à Base Militar' },
                    { type: 'use_keycard', area: 'military', used: false, text: 'Usar o Cartão Militar no portão' },
                    { type: 'collect_weapon', weaponId: 'rifle', collected: false, text: 'Pegar o Rifle no Arsenal' },
                    { type: 'collect_weapon', weaponId: 'shotgun', collected: false, text: 'Pegar a Shotgun no Arsenal' },
                    { type: 'kill_zombies', target: 12, current: 0, text: 'Eliminar 12 zumbis dentro da base' }
                ],
                rewards: { items: ['ammo_rifle', 'ammo_rifle', 'ammo_shotgun'], weapons: ['rifle', 'shotgun'], notification: '✅ Missão 5 completa! Base militar liberada e armas em mãos!' },
                onComplete: () => EffectsSystem.notify('📻 General Ramos: "Agora sim. Vamos caçar esse mutante."', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 6 — Boss: Mutante
            // ---------------------------------------------------
            'm6_kill_mutant': {
                id: 'm6_kill_mutant',
                number: 6,
                name: 'Missão 6: Matar o Mutante',
                giver: 'General Ramos',
                description: 'Um mutante foi avistado nas ruas. Elimine-o antes que cause mais dano.',
                objectives: [
                    { type: 'kill_boss', bossType: 'mutant', killed: false, text: 'Eliminar o Mutante' }
                ],
                rewards: { items: ['ammo_rifle', 'ammo_rifle', 'medkit', 'parts'], notification: '✅ Missão 6 completa! Mutante eliminado.' },
                onComplete: () => EffectsSystem.notify('📻 "Falta só o Rei Zumbi agora..." Fale com o General.', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 7 — Boss: Rei Zumbi
            // ---------------------------------------------------
            'm7_kill_king': {
                id: 'm7_kill_king',
                number: 7,
                name: 'Missão 7: O Rei Zumbi',
                giver: 'General Ramos',
                description: 'O Rei Zumbi se esconde no subsolo. Acabe com ele.',
                objectives: [
                    { type: 'kill_boss', bossType: 'king', killed: false, text: 'Derrotar o Rei Zumbi' }
                ],
                rewards: { items: ['vest', 'ammo_rifle', 'ammo_rifle', 'ammo_shotgun', 'ammo_shotgun'], notification: '✅ Missão 7 completa! O Rei caiu!' },
                onComplete: () => EffectsSystem.notify('📻 General Ramos: "Ainda há um problema: a Dra. Jennifer." Fale com ele.', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO 8 — A Cura: Jennifer se torna a Zumbi Rainha
            // ---------------------------------------------------
            'm8_the_cure': {
                id: 'm8_the_cure',
                number: 8,
                name: 'Missão 8: A Cura',
                giver: 'General Ramos',
                description: 'A Dra. Jennifer acredita ter desenvolvido uma cura e quer testá-la em si mesma no Hospital. Escolte-a até lá em segurança — mas esteja pronto para o que vier a seguir.',
                objectives: [
                    { type: 'escort_npc', npcName: 'Dra. Jennifer', destinationArea: 'hospital', completed: false, text: 'Escoltar a Dra. Jennifer até o Hospital' },
                    { type: 'kill_boss', bossType: 'queen', killed: false, text: 'Derrotar a Zumbi Rainha' }
                ],
                rewards: { items: ['vest', 'ammo_rifle', 'ammo_rifle', 'ammo_shotgun', 'ammo_shotgun', 'medkit', 'medkit'], notification: '🎉 Missão 8 completa! A Zumbi Rainha caiu. A cidade está mais segura.' },
                onComplete: () => EffectsSystem.notify('🎉 Obrigado por jogar Cidade Morta: Último Refúgio!', 'quest')
            },

            // ---------------------------------------------------
            // MISSÃO SECUNDÁRIA — Escoltar Pedro
            // ---------------------------------------------------
            's1_escort_survivor': {
                id: 's1_escort_survivor',
                number: null,
                isSide: true,
                name: 'Secundária: Escoltar Sobrevivente',
                giver: 'Pedro - Perdido',
                description: 'Leve Pedro em segurança até a Torre Esperança.',
                objectives: [
                    { type: 'escort_npc', npcName: 'Pedro - Perdido', destinationArea: 'tower', completed: false, text: 'Escoltar Pedro até a Torre' }
                ],
                rewards: { items: ['food_canned', 'food_canned', 'water_bottle', 'water_bottle'], notification: '✅ Secundária completa! Pedro está seguro.' }
            }
        };
    }

    init() {
        // Nenhuma missão é dada automaticamente ao iniciar — o jogador
        // precisa falar com o General Ramos para receber a Missão 1.
    }

    getQuestNumberLabel(quest) {
        if (!quest) return '';
        return quest.isSide ? 'Secundária' : `Missão ${quest.number}/${this.mainChain.length}`;
    }

    startQuest(questId) {
        if (this.completedQuests.includes(questId)) {
            EffectsSystem.notify('Missão já completada!', 'info');
            return;
        }
        if (this.quests.some(q => q.id === questId)) {
            EffectsSystem.notify('Missão já está ativa!', 'info');
            return;
        }

        const questData = this.questDatabase[questId];
        if (!questData) return;

        // Clonar para não modificar o original (removendo funções não serializáveis)
        const quest = JSON.parse(JSON.stringify(questData, (key, val) => key === 'onComplete' ? undefined : val));
        quest.onComplete = questData.onComplete;

        this.quests.push(quest);
        if (!this.activeQuest) this.activeQuest = quest;

        const label = this.getQuestNumberLabel(quest);
        EffectsSystem.notify(`📋 Nova missão — ${label}: ${quest.name}`, 'quest');
        this.updateQuestDisplay();

        // Gatilhos especiais de início de missão
        if (questId === 'm5_military_raid') {
            this.onMilitaryQuestStarted();
        }
        if (questId === 'm6_kill_mutant') {
            this.onMutantQuestStarted();
        }
        if (questId === 'm7_kill_king') {
            this.onKingQuestStarted();
        }
        if (questId === 'm8_the_cure') {
            this.onCureQuestStarted();
        }
    }

    // A Missão 6 só pode ser completada se o Mutante de fato existir no
    // mundo — ele é spawnado no Parque, ao norte da cidade, assim que a
    // missão começa (a menos que um já esteja vivo, ex: save recarregado).
    onMutantQuestStarted() {
        if (this.quests.find(q => q.id === 'm6_kill_mutant') &&
            !Game.zombieSystem.zombies.some(z => z.type === 'mutant')) {
            const park = Game.citySystem.areas.find(a => a.name === 'Parque');
            const pos = park ? park.center.clone() : new THREE.Vector3(120, 0, -50);
            Game.zombieSystem.spawnZombie(pos, 'mutant');
            EffectsSystem.notify('👹 O Mutante foi localizado no Parque!', 'danger');
        }
    }

    // A Missão 7 spawna o Rei Zumbi perto da Área Residencial (seu "covil"
    // no subsolo, narrativamente) assim que a missão começa.
    onKingQuestStarted() {
        if (this.quests.find(q => q.id === 'm7_kill_king') &&
            !Game.zombieSystem.zombies.some(z => z.type === 'king')) {
            const pos = new THREE.Vector3(40, 0, -40);
            Game.zombieSystem.spawnZombie(pos, 'king');
            EffectsSystem.notify('👑 O REI ZUMBI EMERGIU!', 'danger');
        }
    }

    // Dá o cartão de acesso automaticamente ao iniciar a Missão 5
    // (reforça a entrega feita pelo diálogo do General, evitando travar
    // o jogador caso o item tenha sido perdido/descartado).
    onMilitaryQuestStarted() {
        if (!Game.inventorySystem.hasItem('key_military', 1)) {
            Game.inventorySystem.addItem('key_military', 1);
            EffectsSystem.notify('🪪 Recebeu: Cartão de Acesso Militar', 'success');
        }
    }

    // Ao iniciar a Missão 8, a Dra. Jennifer começa a seguir o jogador
    // automaticamente (ela já está esperando na Torre para a escolta).
    onCureQuestStarted() {
        const jennifer = Game.npcSystem.npcs.find(n => n.name === 'Dra. Jennifer');
        if (jennifer) {
            jennifer.isFollowing = true;
            jennifer.escortDestination = 'hospital';
            EffectsSystem.notify('Dra. Jennifer está seguindo você até o Hospital.', 'quest');
        }
    }

    update(deltaTime) {
        if (this.quests.length === 0) return;

        for (const quest of this.quests) {
            // Verificar objetivos de área
            for (const obj of quest.objectives) {
                if (obj.type === 'reach_area' && !obj.reached) {
                    const playerPos = Game.playerSystem.position;
                    const areas = Game.citySystem.areas;
                    const area = areas.find(a => a.name.toLowerCase().includes(obj.area.toLowerCase()));
                    if (area && playerPos.distanceTo(area.center) < 30) {
                        obj.reached = true;
                        EffectsSystem.notify(`✓ Chegou: ${obj.text}`, 'quest');
                    }
                }

                // Verificar coleta de itens
                if (obj.type === 'collect_items') {
                    obj.current = Game.inventorySystem.getItemCount(obj.itemId);
                }

                // Verificar coleta de armas específicas (ex: pegar rifle/shotgun no Arsenal)
                if (obj.type === 'collect_weapon' && !obj.collected) {
                    if (Game.inventorySystem.ownedWeapons.includes(obj.weaponId)) {
                        obj.collected = true;
                        EffectsSystem.notify(`✓ ${obj.text}`, 'quest');
                    }
                }
            }

            // Verificar se esta missão está completa
            if (this.isQuestComplete(quest)) {
                this.completeQuest(quest);
            }
        }

        this.updateQuestDisplay();
    }

    onZombieKilled(zombieType) {
        if (this.quests.length === 0) return;

        for (const quest of this.quests) {
            for (const obj of quest.objectives) {
                if (obj.type === 'kill_zombies') {
                    obj.current = (obj.current || 0) + 1;
                }
                if (obj.type === 'kill_boss' && zombieType === obj.bossType) {
                    obj.killed = true;
                    EffectsSystem.notify(`✓ Boss eliminado!`, 'quest');
                }
            }
        }
    }

    onNPCRescued(npcName) {
        if (this.quests.length === 0) return;

        for (const quest of this.quests) {
            for (const obj of quest.objectives) {
                if (obj.type === 'escort_npc' && obj.npcName === npcName) {
                    obj.completed = true;
                }
            }
        }
    }

    // Chamado pelo BaseSystem quando o jogador usa o cartão no portão da base militar
    onMilitaryGateUnlocked() {
        if (this.quests.length === 0) return;

        for (const quest of this.quests) {
            for (const obj of quest.objectives) {
                if (obj.type === 'use_keycard' && obj.area === 'military' && !obj.used) {
                    obj.used = true;
                    EffectsSystem.notify(`✓ ${obj.text}`, 'quest');
                }
            }
        }
    }

    // Chamado pelo WorldSystem quando uma caixa de armamento é aberta
    onArmoryCrateOpened() {
        // A verificação real de 'collect_weapon' acontece em update() ao
        // checar ownedWeapons, então nada extra é necessário aqui — mas o
        // hook existe para permitir futuras expansões (ex: contagem de caixas).
    }

    isQuestComplete(quest) {
        return quest.objectives.every(obj => {
            switch (obj.type) {
                case 'kill_zombies': return (obj.current || 0) >= obj.target;
                case 'collect_items': return (obj.current || 0) >= obj.target;
                case 'reach_area': return obj.reached;
                case 'kill_boss': return obj.killed;
                case 'escort_npc': return obj.completed;
                case 'use_keycard': return obj.used;
                case 'collect_weapon': return obj.collected;
                default: return false;
            }
        });
    }

    completeQuest(quest) {
        this.completedQuests.push(quest.id);

        // Dar recompensas
        if (quest.rewards) {
            if (quest.rewards.items) {
                quest.rewards.items.forEach(itemId => {
                    Game.inventorySystem.addItem(itemId, 1);
                });
            }
            if (quest.rewards.weapons) {
                quest.rewards.weapons.forEach(weaponId => {
                    if (!Game.inventorySystem.ownedWeapons.includes(weaponId)) {
                        Game.inventorySystem.ownedWeapons.push(weaponId);
                    }
                });
            }
            EffectsSystem.notify(quest.rewards.notification || 'Missão completa!', 'quest');
        }

        // Callback narrativo específico da missão
        if (typeof quest.onComplete === 'function') {
            setTimeout(() => quest.onComplete(), 1500);
        }

        // Remover missão da lista ativa
        const idx = this.quests.indexOf(quest);
        if (idx > -1) this.quests.splice(idx, 1);

        if (this.activeQuest === quest) {
            this.activeQuest = this.quests.length > 0 ? this.quests[0] : null;
        }

        // Evoluir base
        Game.baseSystem.onQuestComplete();

        // Nota: a progressão NÃO é automática — o jogador precisa voltar e
        // falar com o General Ramos para receber a próxima missão da
        // cadeia principal. O diálogo dinâmico do General (ver npc.js) já
        // sabe qual missão oferecer com base em completedQuests.
    }

    isQuestActive(questId) {
        return this.quests.some(q => q.id === questId);
    }

    isQuestAvailable(questId) {
        if (this.completedQuests.includes(questId)) return false;
        if (this.quests.some(q => q.id === questId)) return false;
        const idx = this.mainChain.indexOf(questId);
        if (idx <= 0) return true; // primeira missão ou missão secundária
        // só disponível se a anterior da cadeia já foi completada
        return this.completedQuests.includes(this.mainChain[idx - 1]);
    }

    // Retorna o id da próxima missão da cadeia principal que o General
    // pode oferecer (não completada, não ativa, com a anterior concluída).
    getNextAvailableMainQuest() {
        for (const id of this.mainChain) {
            if (!this.completedQuests.includes(id) && !this.quests.some(q => q.id === id)) {
                return this.isQuestAvailable(id) ? id : null;
            }
        }
        return null;
    }

    updateQuestDisplay() {
        const display = document.getElementById('quest-text');
        if (!this.activeQuest || !this.quests.includes(this.activeQuest)) {
            this.activeQuest = this.quests.length > 0 ? this.quests[0] : null;
        }
        if (!this.activeQuest) {
            // Sem missão ativa: indicar que o General Ramos tem a próxima
            const nextId = this.getNextAvailableMainQuest();
            display.textContent = nextId
                ? '📋 Fale com o General Ramos na Torre para receber sua próxima missão.'
                : '';
            this.renderQuestLog();
            return;
        }

        const obj = this.getCurrentObjective(this.activeQuest);
        const label = this.getQuestNumberLabel(this.activeQuest);

        if (obj) {
            let text = `📋 ${label} — ${this.activeQuest.name}: ${obj.text}`;
            if (obj.type === 'kill_zombies') text += ` (${obj.current || 0}/${obj.target})`;
            if (obj.type === 'collect_items') text += ` (${obj.current || 0}/${obj.target})`;
            display.textContent = text;
        } else {
            display.textContent = `📋 ${label} — ${this.activeQuest.name}: Completa!`;
        }

        this.renderQuestLog();
    }

    getCurrentObjective(quest) {
        return quest.objectives.find(o => {
            if (o.type === 'kill_zombies') return (o.current || 0) < o.target;
            if (o.type === 'collect_items') return (o.current || 0) < o.target;
            if (o.type === 'reach_area') return !o.reached;
            if (o.type === 'kill_boss') return !o.killed;
            if (o.type === 'escort_npc') return !o.completed;
            if (o.type === 'use_keycard') return !o.used;
            if (o.type === 'collect_weapon') return !o.collected;
            return false;
        });
    }

    // ============================================
    // LOG DE MISSÕES (painel completo, tecla J)
    // ============================================

    renderQuestLog() {
        const list = document.getElementById('quest-log-list');
        if (!list) return; // painel pode não estar aberto/criado ainda
        list.innerHTML = '';

        if (this.quests.length === 0) {
            const nextId = this.getNextAvailableMainQuest();
            const msg = nextId
                ? `Nenhuma missão ativa. Fale com o General Ramos na Torre para receber: ${this.questDatabase[nextId].name}.`
                : 'Nenhuma missão ativa. Fale com o General Ramos na Torre.';
            list.innerHTML = `<p class="quest-log-empty">${msg}</p>`;
        }

        // Missões ativas
        this.quests.forEach(quest => {
            list.appendChild(this.buildQuestLogEntry(quest, 'active'));
        });

        // Próxima missão da cadeia principal (se houver e não estiver ativa)
        const nextId = this.getNextAvailableMainQuest();
        if (nextId) {
            list.appendChild(this.buildQuestLogEntry(this.questDatabase[nextId], 'upcoming'));
        }

        // Missões completas
        if (this.completedQuests.length > 0) {
            const header = document.createElement('h4');
            header.className = 'quest-log-section';
            header.textContent = 'Concluídas';
            list.appendChild(header);

            this.completedQuests.forEach(id => {
                const data = this.questDatabase[id];
                if (!data) return;
                list.appendChild(this.buildQuestLogEntry(data, 'done'));
            });
        }
    }

    buildQuestLogEntry(quest, status) {
        const entry = document.createElement('div');
        entry.className = `quest-log-entry quest-log-${status}`;

        const title = document.createElement('div');
        title.className = 'quest-log-title';
        const label = this.getQuestNumberLabel(quest);
        title.textContent = status === 'done' ? `✅ ${label} — ${quest.name}` :
                             status === 'upcoming' ? `🔒 ${label} — ${quest.name} (fale com ${quest.giver})` :
                             `▶ ${label} — ${quest.name}`;
        entry.appendChild(title);

        if (status !== 'done') {
            const desc = document.createElement('div');
            desc.className = 'quest-log-desc';
            desc.textContent = quest.description;
            entry.appendChild(desc);
        }

        if (status === 'active') {
            const objList = document.createElement('ul');
            objList.className = 'quest-log-objectives';
            quest.objectives.forEach(obj => {
                const li = document.createElement('li');
                let done = false;
                let text = obj.text;
                switch (obj.type) {
                    case 'kill_zombies':
                    case 'collect_items':
                        done = (obj.current || 0) >= obj.target;
                        text += ` (${obj.current || 0}/${obj.target})`;
                        break;
                    case 'reach_area': done = obj.reached; break;
                    case 'kill_boss': done = obj.killed; break;
                    case 'escort_npc': done = obj.completed; break;
                    case 'use_keycard': done = obj.used; break;
                    case 'collect_weapon': done = obj.collected; break;
                }
                li.textContent = (done ? '✓ ' : '• ') + text;
                li.className = done ? 'quest-log-obj-done' : 'quest-log-obj-pending';
                objList.appendChild(li);
            });
            entry.appendChild(objList);
        }

        return entry;
    }

    getState() {
        return {
            active: this.activeQuest ? this.activeQuest.id : null,
            all: this.quests,
            completed: this.completedQuests
        };
    }

    loadState(state) {
        if (!state) return;
        this.quests = state.all || [];
        // Reanexar callbacks onComplete (perdidos na serialização JSON do save)
        this.quests.forEach(q => {
            const original = this.questDatabase[q.id];
            if (original) q.onComplete = original.onComplete;
        });
        this.completedQuests = state.completed || [];
        const activeId = state.active;
        this.activeQuest = this.quests.find(q => q.id === activeId) || this.quests[0] || null;
        this.updateQuestDisplay();
    }
}
