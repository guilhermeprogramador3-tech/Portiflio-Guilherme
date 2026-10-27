// ============================================
// SAVE SYSTEM - Cidade Morta: Último Refúgio
// Sistema de salvamento com LocalStorage
// ============================================

const SaveSystem = {
    SAVE_KEY: 'cidademorta_save',

    save(gameState) {
        try {
            const saveData = {
                timestamp: Date.now(),
                version: '1.0',
                player: {
                    position: { x: gameState.player.position.x, y: gameState.player.position.y, z: gameState.player.position.z },
                    health: gameState.player.health,
                    hunger: gameState.player.hunger,
                    thirst: gameState.player.thirst,
                    energy: gameState.player.energy,
                    equippedWeapon: gameState.player.equippedWeapon
                },
                inventory: gameState.inventory,
                weapons: gameState.weapons,
                quests: gameState.quests,
                base: gameState.base,
                killedZombies: gameState.killedZombies || 0,
                daysSurvived: gameState.daysSurvived || 0,
                discoveredAreas: gameState.discoveredAreas || []
            };
            localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Erro ao salvar:', e);
            return false;
        }
    },

    load() {
        try {
            const data = localStorage.getItem(this.SAVE_KEY);
            if (data) {
                return JSON.parse(data);
            }
            return null;
        } catch (e) {
            console.error('Erro ao carregar save:', e);
            return null;
        }
    },

    hasSave() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    },

    deleteSave() {
        localStorage.removeItem(this.SAVE_KEY);
    },

    getDefaultState() {
        return {
            player: {
                position: { x: 0, y: 1.7, z: 0 },
                health: 100,
                hunger: 100,
                thirst: 100,
                energy: 100,
                equippedWeapon: 'fist'
            },
            inventory: [],
            weapons: ['fist', 'knife'],
            quests: [],
            base: { level: 1 },
            killedZombies: 0,
            daysSurvived: 0,
            discoveredAreas: []
        };
    }
};
