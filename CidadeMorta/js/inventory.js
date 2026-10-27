// ============================================
// INVENTORY SYSTEM - Cidade Morta: Último Refúgio
// Inventário com 30 slots, equipar, usar, jogar fora
// ============================================

class InventorySystem {
    constructor() {
        this.slots = new Array(30).fill(null);
        this.maxSlots = 30;
        this.selectedSlot = -1;
        this.ownedWeapons = ['fist', 'knife'];
    }

    addItem(itemId, quantity = 1) {
        // Verificar se é arma primeiro — armas vivem em weaponsData, não em
        // itemsData, então essa checagem precisa vir antes de qualquer busca
        // em itemsData (senão a busca falha e a arma nunca é adicionada).
        const weaponData = Game.weaponsData && Game.weaponsData.find(w => w.id === itemId);
        if (weaponData) {
            if (!this.ownedWeapons.includes(itemId)) {
                this.ownedWeapons.push(itemId);
                EffectsSystem.notify(`Nova arma: ${weaponData.name}`, 'success');
            }
            return true;
        }

        const itemData = Game.itemsData.find(it => it.id === itemId);
        if (!itemData) return false;

        // Tentar empilhar
        if (itemData.stackable) {
            for (let i = 0; i < this.maxSlots; i++) {
                if (this.slots[i] && this.slots[i].id === itemId) {
                    const maxStack = itemData.maxStack || 5;
                    const canAdd = maxStack - this.slots[i].quantity;
                    if (canAdd > 0) {
                        const toAdd = Math.min(quantity, canAdd);
                        this.slots[i].quantity += toAdd;
                        quantity -= toAdd;
                        if (quantity <= 0) return true;
                    }
                }
            }
        }

        // Adicionar em slot vazio
        while (quantity > 0) {
            const emptySlot = this.slots.findIndex(s => s === null);
            if (emptySlot === -1) return false; // Inventário cheio

            const maxStack = itemData.stackable ? (itemData.maxStack || 5) : 1;
            const toAdd = Math.min(quantity, maxStack);
            this.slots[emptySlot] = {
                id: itemId,
                quantity: toAdd,
                data: itemData
            };
            quantity -= toAdd;
        }

        return true;
    }

    removeItem(itemId, quantity = 1) {
        for (let i = 0; i < this.maxSlots; i++) {
            if (this.slots[i] && this.slots[i].id === itemId) {
                if (this.slots[i].quantity <= quantity) {
                    quantity -= this.slots[i].quantity;
                    this.slots[i] = null;
                } else {
                    this.slots[i].quantity -= quantity;
                    quantity = 0;
                }
                if (quantity <= 0) return true;
            }
        }
        return quantity <= 0;
    }

    hasItem(itemId, quantity = 1) {
        let count = 0;
        for (const slot of this.slots) {
            if (slot && slot.id === itemId) {
                count += slot.quantity;
                if (count >= quantity) return true;
            }
        }
        return false;
    }

    getItemCount(itemId) {
        let count = 0;
        for (const slot of this.slots) {
            if (slot && slot.id === itemId) {
                count += slot.quantity;
            }
        }
        return count;
    }

    useItem(slotIndex) {
        const slot = this.slots[slotIndex];
        if (!slot) return;

        const item = slot.data || Game.itemsData.find(it => it.id === slot.id);
        if (!item) return;

        switch (item.type) {
            case 'food':
                Game.playerSystem.feed(item.hunger || 0, item.thirst || 0);
                EffectsSystem.notify(`Comeu ${item.name}`, 'success');
                this.consumeSlot(slotIndex);
                break;

            case 'water':
                Game.playerSystem.drink(item.thirst || 0);
                if (item.hunger) Game.playerSystem.feed(item.hunger);
                EffectsSystem.notify(`Bebeu ${item.name}`, 'success');
                this.consumeSlot(slotIndex);
                break;

            case 'medicine':
                if (item.health) Game.playerSystem.heal(item.health);
                if (item.energy) Game.playerSystem.addEnergy(item.energy);
                EffectsSystem.notify(`Usou ${item.name}`, 'success');
                this.consumeSlot(slotIndex);
                break;

            case 'consumable':
                if (item.energy) Game.playerSystem.addEnergy(item.energy);
                if (item.health) Game.playerSystem.heal(item.health);
                EffectsSystem.notify(`Usou ${item.name}`, 'success');
                this.consumeSlot(slotIndex);
                break;

            case 'ammo':
                const ammoType = item.ammoType;
                const amount = item.amount || 10;
                Game.playerSystem.reserveAmmo[ammoType] += amount;
                EffectsSystem.notify(`+${amount} munição ${ammoType}`, 'success');
                this.consumeSlot(slotIndex);
                break;

            case 'armor':
                Game.playerSystem.armor = item.armor || 0;
                EffectsSystem.notify(`Equipou ${item.name} (Armadura: ${item.armor})`, 'success');
                break;
        }

        this.render();
    }

    consumeSlot(slotIndex) {
        if (this.slots[slotIndex].quantity > 1) {
            this.slots[slotIndex].quantity--;
        } else {
            this.slots[slotIndex] = null;
        }
    }

    dropItem(slotIndex) {
        const slot = this.slots[slotIndex];
        if (!slot) return;

        // Spawnar item no chão
        const dropPos = Game.playerSystem.position.clone();
        const forward = Game.cameraSystem.getForward();
        dropPos.add(forward.multiplyScalar(2));
        Game.worldSystem.spawnGroundItem(slot.id, dropPos);

        // Remover do inventário
        if (slot.quantity > 1) {
            slot.quantity--;
        } else {
            this.slots[slotIndex] = null;
        }

        EffectsSystem.notify(`Jogou fora: ${slot.id}`, 'info');
        this.render();
    }

    loseRandomItems(count) {
        let lost = 0;
        for (let i = 0; i < this.maxSlots && lost < count; i++) {
            if (this.slots[i] && Math.random() > 0.5) {
                this.slots[i] = null;
                lost++;
            }
        }
    }

    getOwnedWeapons() {
        return this.ownedWeapons;
    }

    render() {
        const grid = document.getElementById('inventory-grid');
        grid.innerHTML = '';

        for (let i = 0; i < this.maxSlots; i++) {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'inv-slot' + (i === this.selectedSlot ? ' selected' : '');

            if (this.slots[i]) {
                const item = this.slots[i].data || Game.itemsData.find(it => it.id === this.slots[i].id);
                slotDiv.textContent = item ? item.icon : '?';

                if (this.slots[i].quantity > 1) {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'item-count';
                    countSpan.textContent = this.slots[i].quantity;
                    slotDiv.appendChild(countSpan);
                }
            }

            slotDiv.addEventListener('click', () => this.selectSlot(i));
            grid.appendChild(slotDiv);
        }
    }

    selectSlot(index) {
        this.selectedSlot = index;
        this.render();
        this.showItemDetails(index);
    }

    showItemDetails(index) {
        const slot = this.slots[index];
        const nameEl = document.getElementById('item-name');
        const descEl = document.getElementById('item-desc');
        const useBtn = document.getElementById('btn-use-item');
        const equipBtn = document.getElementById('btn-equip-item');
        const dropBtn = document.getElementById('btn-drop-item');

        if (!slot) {
            nameEl.textContent = 'Slot vazio';
            descEl.textContent = '';
            useBtn.style.display = 'none';
            equipBtn.style.display = 'none';
            dropBtn.style.display = 'none';
            return;
        }

        const item = slot.data || Game.itemsData.find(it => it.id === slot.id);
        nameEl.textContent = item ? `${item.icon} ${item.name} (x${slot.quantity})` : slot.id;
        descEl.textContent = item ? item.description || '' : '';

        // Botões
        const usable = ['food', 'water', 'medicine', 'consumable', 'ammo'].includes(item?.type);
        const equipable = item?.type === 'armor';

        useBtn.style.display = usable ? 'inline-block' : 'none';
        equipBtn.style.display = equipable ? 'inline-block' : 'none';
        dropBtn.style.display = 'inline-block';

        // Event listeners
        useBtn.onclick = () => this.useItem(index);
        equipBtn.onclick = () => this.useItem(index);
        dropBtn.onclick = () => this.dropItem(index);
    }

    getState() {
        return this.slots.map(s => s ? { id: s.id, quantity: s.quantity } : null);
    }

    loadState(state) {
        if (!state || !Array.isArray(state)) return;
        this.slots = state.map(s => {
            if (!s) return null;
            const data = Game.itemsData.find(it => it.id === s.id);
            return { id: s.id, quantity: s.quantity, data };
        });
    }
}
