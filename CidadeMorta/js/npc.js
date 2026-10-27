// ============================================
// NPC SYSTEM - Cidade Morta: Último Refúgio
// NPCs: sobreviventes, médicos, soldados, comerciantes
// ============================================

class NPCSystem {
    constructor(scene) {
        this.scene = scene;
        this.npcs = [];
    }

    init() {
        // NPCs dentro do interior da Torre Esperança (offset x=300 = sala paralela)
        // As posições são relativas ao interior: x=300 + posX_local

        // O General Ramos é o único NPC que entrega missões. Todas as 8
        // missões da cadeia principal passam por ele — o jogador sempre
        // precisa voltar e falar com ele para avançar a história.
        this.createNPC('General Ramos', 'soldier', new THREE.Vector3(300 + 3, 0, -4), null, () => {
            const qs = Game.questSystem;

            // Missão ativa em andamento: lembrar o objetivo atual
            if (qs.isQuestActive('m1_explore_city')) {
                return [
                    { text: 'Continue explorando, soldado. Elimine zumbis e traga comida para a Torre.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m2_hospital_raid')) {
                return [
                    { text: 'Vá ao Hospital, recupere os remédios e limpe a área. A Dra. Jennifer vai precisar deles.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m3_find_brother')) {
                return [
                    { text: 'O irmão da Ana está na Delegacia. Vá até lá e limpe a área.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m4_defend_tower')) {
                return [
                    { text: 'Fique perto da Torre e elimine os zumbis que se aproximarem. Não deixe que cheguem ao portão.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m5_military_raid')) {
                return [
                    { text: 'Vá até a Base Militar a sudoeste. Use o cartão no portão, pegue as armas no Arsenal e limpe o local.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m6_kill_mutant')) {
                return [
                    { text: 'O mutante ainda está por aí. Encontre-o e elimine-o.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m7_kill_king')) {
                return [
                    { text: 'O Rei Zumbi não vai cair fácil. Vá com tudo que tiver.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }
            if (qs.isQuestActive('m8_the_cure')) {
                return [
                    { text: 'Proteja a Dra. Jennifer até o Hospital. Não sei bem o que ela pretende fazer, mas confio nela.', options: [
                        { text: 'Entendido, General.', next: -1 }
                    ]}
                ];
            }

            // Nenhuma missão ativa: oferecer a próxima disponível da cadeia
            const nextId = qs.getNextAvailableMainQuest();

            if (nextId === 'm1_explore_city') {
                return [
                    { text: 'Bem-vindo à Torre Esperança, soldado. Precisamos de toda ajuda possível.', options: [
                        { text: 'O que posso fazer?', next: 1 },
                        { text: 'Como está a situação?', next: 2 }
                    ]},
                    { text: 'Explore a cidade, elimine zumbis e traga suprimentos. Comece com o básico.', options: [
                        { text: 'Aceitar Missão 1: Primeiros Passos.', action: 'quest_m1', next: -1 },
                        { text: 'Talvez depois.', next: -1 }
                    ]},
                    { text: 'A cidade está infestada. Os zumbis ficam mais agressivos à noite. Tenha cuidado lá fora.', options: [
                        { text: 'Entendido.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm2_hospital_raid') {
                return [
                    { text: 'Bom trabalho, soldado. Agora precisamos de remédios — a Dra. Jennifer não tem o suficiente.', options: [
                        { text: 'Aceitar Missão 2: Recuperar Remédios.', action: 'quest_m2', next: -1 },
                        { text: 'Vou me preparar antes.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm3_find_brother') {
                return [
                    { text: 'A Ana perdeu o irmão na Delegacia quando a cidade caiu. Vamos encontrá-lo.', options: [
                        { text: 'Aceitar Missão 3: Encontrar Sobreviventes.', action: 'quest_m3', next: -1 },
                        { text: 'Vou me preparar antes.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm4_defend_tower') {
                return [
                    { text: 'Soldado, sentimos uma horda se aproximando da Torre. Precisamos nos preparar para defendê-la.', options: [
                        { text: 'Como posso ajudar?', next: 1 }
                    ]},
                    { text: 'Fique perto da Torre e elimine os zumbis que se aproximarem. Não deixe que cheguem ao portão.', options: [
                        { text: 'Aceitar Missão 4: Defender a Torre.', action: 'quest_m4', next: -1 },
                        { text: 'Vou me preparar antes.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm5_military_raid') {
                return [
                    { text: 'Soldado, temos um problema sério: os zumbis estão mais fortes do que nunca. Nossas armas atuais não bastam.', options: [
                        { text: 'O que você sugere?', next: 1 },
                        { text: 'Onde conseguimos armas melhores?', next: 1 }
                    ]},
                    { text: 'A Base Militar tem um arsenal completo — rifles, shotguns, munição pesada. Está cercada e infestada, mas é a nossa única saída.', options: [
                        { text: 'O que eu preciso fazer?', next: 2 }
                    ]},
                    { text: 'Tome este cartão de acesso. Vá até a Base Militar, destranque o portão com ele, entre no Arsenal e pegue as armas. Limpe a base dos zumbis blindados que a tomaram.', options: [
                        { text: 'Aceitar Missão 5: Reforço Tático.', action: 'quest_m5', next: -1 },
                        { text: 'Ainda não estou pronto.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm6_kill_mutant') {
                return [
                    { text: 'Com essas armas em mãos, é hora de caçar aquele mutante que anda aterrorizando a zona norte.', options: [
                        { text: 'Aceitar Missão 6: Matar o Mutante.', action: 'quest_m6', next: -1 },
                        { text: 'Vou me preparar.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm7_kill_king') {
                return [
                    { text: 'O Rei Zumbi ainda está lá fora. É hora de terminar isso de vez.', options: [
                        { text: 'Aceitar Missão 7: O Rei Zumbi.', action: 'quest_m7', next: -1 },
                        { text: 'Ainda não.', next: -1 }
                    ]}
                ];
            }

            if (nextId === 'm8_the_cure') {
                return [
                    { text: 'Com o Rei morto, ainda há um problema: a Dra. Jennifer acha que achou uma cura. Quer testá-la em si mesma.', options: [
                        { text: 'Isso parece perigoso.', next: 1 }
                    ]},
                    { text: 'Eu sei. Mas ela não vai mudar de ideia. Escolte-a até o Hospital e fique de olho nela.', options: [
                        { text: 'Aceitar Missão 8: A Cura.', action: 'quest_m8', next: -1 },
                        { text: 'Ainda não.', next: -1 }
                    ]}
                ];
            }

            // Todas as missões completas
            return [
                { text: 'Você fez o que parecia impossível, soldado. A cidade está mais segura graças a você.', options: [
                    { text: 'Foi uma honra, General.', next: -1 }
                ]}
            ];
        });

        // A Dra. Jennifer cuida dos ferimentos do jogador e comenta sobre a
        // cura que está pesquisando, mas não entrega missões diretamente —
        // ela sempre encaminha o jogador ao General Ramos.
        this.createNPC('Dra. Jennifer', 'medic', new THREE.Vector3(300 - 4, 0, 0), null, () => {
            const qs = Game.questSystem;

            if (qs.isQuestActive('m8_the_cure')) {
                return [
                    { text: 'Estou pronta. Vamos até o Hospital — fique perto de mim no caminho.', options: [
                        { text: 'Vamos.', next: -1 }
                    ]}
                ];
            }

            if (qs.completedQuests.includes('m7_kill_king')) {
                return [
                    { text: 'Acho que finalmente encontrei uma cura... mas só vou saber se funciona testando em mim mesma.', options: [
                        { text: 'Isso é arriscado demais.', next: 1 },
                        { text: 'Fale com o General sobre isso.', next: 1 }
                    ]},
                    { text: 'Eu sei dos riscos. Fale com o General Ramos — ele vai querer me escoltar até o Hospital.', options: [
                        { text: 'Vou falar com ele.', next: -1 }
                    ]}
                ];
            }

            return [
                { text: 'Sou a Dra. Jennifer. Posso cuidar dos seus ferimentos se precisar.', options: [
                    { text: 'Preciso de cura. (Cura 50 HP)', action: 'heal_50', next: -1 },
                    { text: 'Tem remédios para trocar?', next: 1 },
                    { text: 'Obrigado, estou bem.', next: -1 }
                ]},
                { text: 'Traga-me álcool e tecido, e posso fazer bandagens para você.', options: [
                    { text: 'Vou procurar.', next: -1 }
                ]}
            ];
        });

        this.createNPC('Marco - Comerciante', 'trader', new THREE.Vector3(300 + 2, 0, 5.5), [
            { text: 'Ei! Tenho algumas coisas para trocar. O que precisa?', options: [
                { text: 'Comprar Munição Pistola (troca: 2 Metal)', action: 'trade_ammo_pistol', next: -1 },
                { text: 'Comprar Kit Médico (troca: 3 Tecido)', action: 'trade_medkit', next: -1 },
                { text: 'Comprar Comida (troca: 1 Metal)', action: 'trade_food', next: -1 },
                { text: 'Só estou olhando.', next: -1 }
            ]}
        ]);

        // Ana não entrega mais a Missão 3 diretamente — ela comenta sobre o
        // irmão, mas é o General quem dá a missão de fato.
        this.createNPC('Ana - Sobrevivente', 'survivor', new THREE.Vector3(300 + 4, 0, -2), null, () => {
            const qs = Game.questSystem;
            if (qs.completedQuests.includes('m3_find_brother')) {
                return [
                    { text: 'Obrigada por encontrar meu irmão. Não sei como agradecer.', options: [
                        { text: 'De nada, Ana.', next: -1 }
                    ]}
                ];
            }
            return [
                { text: 'Você é novo aqui? Eu estava no hospital quando tudo começou... Foi horrível.', options: [
                    { text: 'O que aconteceu no hospital?', next: 1 },
                    { text: 'Está segura agora.', next: 2 }
                ]},
                { text: 'Há zumbis especiais lá dentro. Mais fortes que os normais. Mas também há remédios valiosos. Fale com o General se quiser ajudar.', options: [
                    { text: 'Vou falar com ele.', next: -1 },
                    { text: 'Parece perigoso demais.', next: -1 }
                ]},
                { text: 'Meu irmão estava na delegacia quando a cidade caiu. Se puder, fale com o General Ramos sobre isso.', options: [
                    { text: 'Vou falar com ele.', next: -1 },
                    { text: 'Farei o possível.', next: -1 }
                ]}
            ];
        });

        // NPCs fora da torre (sobreviventes perdidos)
        this.createNPC('Pedro - Perdido', 'survivor', new THREE.Vector3(70, 0, -70), [
            { text: 'Socorro! Estou preso aqui! Pode me levar até a Torre?', options: [
                { text: 'Siga-me!', action: 'escort_pedro', next: -1 },
                { text: 'Espere aqui, volto depois.', next: -1 }
            ]}
        ]);
    }

    createNPC(name, type, position, dialogs, dialogResolver = null) {
        const group = new THREE.Group();
        const colors = {
            soldier: 0x3a5a3a,
            medic: 0xeeeeee,
            trader: 0x8a6a3a,
            survivor: 0x5a5a7a
        };
        const color = colors[type] || 0x6a6a6a;

        // Corpo
        const bodyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.4);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.2;
        body.castShadow = true;
        group.add(body);

        // Cabeça
        const headGeo = new THREE.SphereGeometry(0.22, 8, 8);
        const headMat = new THREE.MeshLambertMaterial({ color: 0xdeb887 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.95;
        group.add(head);

        // Braços
        const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
        const armMat = new THREE.MeshLambertMaterial({ color });
        const arm1 = new THREE.Mesh(armGeo, armMat);
        arm1.position.set(0.42, 1.1, 0);
        group.add(arm1);
        const arm2 = new THREE.Mesh(armGeo, armMat);
        arm2.position.set(-0.42, 1.1, 0);
        group.add(arm2);

        // Pernas
        const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x2a2a3a });
        const leg1 = new THREE.Mesh(legGeo, legMat);
        leg1.position.set(0.13, 0.35, 0);
        group.add(leg1);
        const leg2 = new THREE.Mesh(legGeo, legMat);
        leg2.position.set(-0.13, 0.35, 0);
        group.add(leg2);

        // Indicador de NPC (triângulo verde flutuante)
        const indicatorGeo = new THREE.ConeGeometry(0.15, 0.3, 4);
        const indicatorMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
        const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
        indicator.position.y = 2.5;
        indicator.rotation.x = Math.PI;
        group.add(indicator);

        // Tipo específico
        if (type === 'medic') {
            // Cruz vermelha
            const crossMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.05), crossMat);
            crossH.position.set(0, 1.4, 0.21);
            group.add(crossH);
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.05), crossMat);
            crossV.position.set(0, 1.4, 0.21);
            group.add(crossV);
        }

        if (type === 'soldier') {
            // Capacete
            const helmetGeo = new THREE.SphereGeometry(0.25, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
            const helmetMat = new THREE.MeshLambertMaterial({ color: 0x3a4a3a });
            const helmet = new THREE.Mesh(helmetGeo, helmetMat);
            helmet.position.y = 2.05;
            group.add(helmet);
        }

        group.position.copy(position);
        this.scene.add(group);

        const npc = {
            mesh: group,
            position: group.position,
            name,
            type,
            dialogs,
            dialogResolver,
            currentDialog: 0,
            isFollowing: false,
            followTarget: null,
            indicator,
            animTimer: 0
        };

        this.npcs.push(npc);
        return npc;
    }

    update(deltaTime, playerPosition) {
        for (const npc of this.npcs) {
            npc.animTimer += deltaTime;

            // Animação do indicador
            if (npc.indicator) {
                npc.indicator.position.y = 2.5 + Math.sin(npc.animTimer * 2) * 0.15;
            }

            // Seguir jogador
            if (npc.isFollowing) {
                const dist = npc.position.distanceTo(playerPosition);
                if (dist > 3) {
                    const dir = playerPosition.clone().sub(npc.position);
                    dir.y = 0;
                    dir.normalize();
                    npc.position.x += dir.x * 3 * deltaTime;
                    npc.position.z += dir.z * 3 * deltaTime;
                    npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
                }

                // Verificar se chegou ao destino da escolta. Por padrão o
                // destino é a Torre (origem do mapa); a Dra. Jennifer, na
                // Missão 8, tem destino = Hospital (ver escortDestination).
                const arrived = this.hasArrivedAtEscortDestination(npc);
                if (arrived) {
                    npc.isFollowing = false;
                    EffectsSystem.notify(`${npc.name} chegou ao destino em segurança!`, 'quest');
                    Game.questSystem.onNPCRescued(npc.name);

                    // Gatilho narrativo: Jennifer se injeta e se transforma
                    if (npc.name === 'Dra. Jennifer' && npc.escortDestination === 'hospital') {
                        this.triggerJenniferTransformation(npc);
                    }
                }
            }

            // Olhar para o jogador quando próximo
            const dist = npc.position.distanceTo(playerPosition);
            if (dist < 8 && !npc.isFollowing) {
                const dir = playerPosition.clone().sub(npc.position);
                npc.mesh.rotation.y = Math.atan2(dir.x, dir.z);
            }
        }
    }

    // Verifica se um NPC em escolta chegou ao seu destino. Sem
    // escortDestination definido, o padrão é a Torre Esperança (origem do
    // mapa) — comportamento original usado pela missão secundária do Pedro.
    hasArrivedAtEscortDestination(npc) {
        if (!npc.escortDestination || npc.escortDestination === 'tower') {
            return npc.position.length() < 25;
        }
        const area = Game.citySystem.areas.find(a =>
            a.name.toLowerCase().includes(npc.escortDestination.toLowerCase())
        );
        if (!area) return false;
        return npc.position.distanceTo(area.center) < 12;
    }

    // A Dra. Jennifer chega ao Hospital, aplica a injeção em si mesma e se
    // transforma na Zumbi Rainha — um boss que o jogador precisa derrotar
    // para completar a Missão 8.
    triggerJenniferTransformation(npc) {
        EffectsSystem.notify('💉 Dra. Jennifer: "É agora ou nunca... a cura tem que funcionar."', 'quest');

        setTimeout(() => {
            EffectsSystem.notify('⚠️ Algo deu terrivelmente errado!', 'danger');

            // Remove a NPC Jennifer da cena — ela "se transforma" no boss
            this.scene.remove(npc.mesh);
            const idx = this.npcs.indexOf(npc);
            if (idx > -1) this.npcs.splice(idx, 1);

            // Spawna a Zumbi Rainha na posição onde a Jennifer estava
            Game.zombieSystem.spawnZombie(npc.position.clone(), 'queen');

            setTimeout(() => {
                EffectsSystem.notify('👑 A ZUMBI RAINHA DESPERTOU!', 'danger');
            }, 1500);
        }, 2500);
    }

    talkTo(npc) {
        // NPCs com dialogResolver montam a árvore de diálogo dinamicamente,
        // conforme o progresso das missões (ex: o General Ramos oferece a
        // próxima missão disponível da cadeia, ou comenta a atual em curso).
        if (npc.dialogResolver) {
            npc.dialogs = npc.dialogResolver();
        }

        const dialog = npc.dialogs[npc.currentDialog];
        if (!dialog) return;

        Game.state = 'dialog';
        document.getElementById('dialog-screen').style.display = 'block';
        document.getElementById('dialog-npc-name').textContent = npc.name;
        document.getElementById('dialog-text').textContent = dialog.text;

        const optionsContainer = document.getElementById('dialog-options');
        optionsContainer.innerHTML = '';

        dialog.options.forEach(option => {
            const btn = document.createElement('button');
            btn.textContent = option.text;
            btn.addEventListener('click', () => {
                // Executar ação
                if (option.action) {
                    this.executeDialogAction(option.action, npc);
                }

                // Próximo diálogo ou fechar
                if (option.next >= 0) {
                    npc.currentDialog = option.next;
                    this.talkTo(npc);
                } else {
                    this.closeDialog(npc);
                }
            });
            optionsContainer.appendChild(btn);
        });

        document.exitPointerLock();
    }

    closeDialog(npc) {
        document.getElementById('dialog-screen').style.display = 'none';
        Game.state = 'playing';
        npc.currentDialog = 0;
    }

    executeDialogAction(action, npc) {
        switch (action) {
            case 'heal_50':
                Game.playerSystem.heal(50);
                EffectsSystem.notify('Curado! +50 HP', 'success');
                break;

            case 'trade_ammo_pistol':
                if (Game.inventorySystem.hasItem('metal', 2)) {
                    Game.inventorySystem.removeItem('metal', 2);
                    Game.inventorySystem.addItem('ammo_pistol', 1);
                    EffectsSystem.notify('Comprou munição de pistola!', 'success');
                } else {
                    EffectsSystem.notify('Materiais insuficientes! (Precisa: 2 Metal)', 'danger');
                }
                break;

            case 'trade_medkit':
                if (Game.inventorySystem.hasItem('fabric', 3)) {
                    Game.inventorySystem.removeItem('fabric', 3);
                    Game.inventorySystem.addItem('medkit', 1);
                    EffectsSystem.notify('Comprou kit médico!', 'success');
                } else {
                    EffectsSystem.notify('Materiais insuficientes! (Precisa: 3 Tecido)', 'danger');
                }
                break;

            case 'trade_food':
                if (Game.inventorySystem.hasItem('metal', 1)) {
                    Game.inventorySystem.removeItem('metal', 1);
                    Game.inventorySystem.addItem('food_canned', 1);
                    EffectsSystem.notify('Comprou comida!', 'success');
                } else {
                    EffectsSystem.notify('Materiais insuficientes! (Precisa: 1 Metal)', 'danger');
                }
                break;

            case 'quest_m1':
                Game.questSystem.startQuest('m1_explore_city');
                break;

            case 'quest_m2':
                Game.questSystem.startQuest('m2_hospital_raid');
                break;

            case 'quest_m3':
                Game.questSystem.startQuest('m3_find_brother');
                break;

            case 'quest_m4':
                Game.questSystem.startQuest('m4_defend_tower');
                break;

            case 'quest_m5':
                // startQuest já entrega o Cartão de Acesso Militar automaticamente
                // (ver QuestSystem.onMilitaryQuestStarted) e notifica o jogador.
                Game.questSystem.startQuest('m5_military_raid');
                break;

            case 'quest_m6':
                Game.questSystem.startQuest('m6_kill_mutant');
                break;

            case 'quest_m7':
                Game.questSystem.startQuest('m7_kill_king');
                break;

            case 'quest_m8':
                // startQuest já chama onCureQuestStarted(), que faz a Dra.
                // Jennifer começar a seguir o jogador automaticamente.
                Game.questSystem.startQuest('m8_the_cure');
                break;

            case 'escort_pedro':
                npc.isFollowing = true;
                npc.escortDestination = 'tower';
                EffectsSystem.notify(`${npc.name} está seguindo você!`, 'quest');
                Game.questSystem.startQuest('s1_escort_survivor');
                break;

            case 'escort_tiago':
                npc.isFollowing = true;
                npc.escortDestination = 'tower';
                EffectsSystem.notify(`${npc.name} está seguindo você!`, 'quest');
                break;
        }
    }
}
