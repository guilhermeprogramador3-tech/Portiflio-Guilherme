// ============================================
// CRAFTING SYSTEM - Cidade Morta: Último Refúgio
// Fabricação de itens com receitas
// ============================================

class CraftingSystem {
    constructor() {
        this.recipes = [
            {
                id: 'bandage',
                name: 'Bandagem',
                icon: '🩹',
                result: 'bandage',
                resultQty: 2,
                materials: [
                    { id: 'fabric', name: 'Tecido', quantity: 1 },
                    { id: 'alcohol', name: 'Álcool', quantity: 1 }
                ],
                description: 'Bandagem improvisada para curar ferimentos.'
            },
            {
                id: 'medkit_craft',
                name: 'Kit Médico',
                icon: '🩹',
                result: 'medkit',
                resultQty: 1,
                materials: [
                    { id: 'fabric', name: 'Tecido', quantity: 2 },
                    { id: 'alcohol', name: 'Álcool', quantity: 2 },
                    { id: 'tools', name: 'Ferramentas', quantity: 1 }
                ],
                description: 'Kit médico completo.'
            },
            {
                id: 'armor_craft',
                name: 'Armadura Improvisada',
                icon: '🦺',
                result: 'vest',
                resultQty: 1,
                materials: [
                    { id: 'metal', name: 'Sucata de Metal', quantity: 3 },
                    { id: 'fabric', name: 'Tecido', quantity: 2 }
                ],
                description: 'Colete de proteção feito com metal e tecido.'
            },
            {
                id: 'sword_craft',
                name: 'Espada Improvisada',
                icon: '⚔️',
                result: 'sword',
                resultQty: 1,
                materials: [
                    { id: 'metal', name: 'Sucata de Metal', quantity: 4 },
                    { id: 'tools', name: 'Ferramentas', quantity: 1 },
                    { id: 'parts', name: 'Peças Mecânicas', quantity: 1 }
                ],
                description: 'Lâmina afiada improvisada com metal.'
            },
            {
                id: 'axe_craft',
                name: 'Machado',
                icon: '🪓',
                result: 'axe',
                resultQty: 1,
                materials: [
                    { id: 'metal', name: 'Sucata de Metal', quantity: 2 },
                    { id: 'parts', name: 'Peças Mecânicas', quantity: 1 }
                ],
                description: 'Machado resistente para combate.'
            },
            {
                id: 'ammo_pistol_craft',
                name: 'Munição Pistola',
                icon: '🔸',
                result: 'ammo_pistol',
                resultQty: 1,
                materials: [
                    { id: 'metal', name: 'Sucata de Metal', quantity: 2 },
                    { id: 'parts', name: 'Peças Mecânicas', quantity: 1 }
                ],
                description: 'Fabricar munição de pistola.'
            },
            {
                id: 'ammo_shotgun_craft',
                name: 'Munição Shotgun',
                icon: '🔶',
                result: 'ammo_shotgun',
                resultQty: 1,
                materials: [
                    { id: 'metal', name: 'Sucata de Metal', quantity: 3 },
                    { id: 'parts', name: 'Peças Mecânicas', quantity: 2 }
                ],
                description: 'Fabricar cartuchos de shotgun.'
            },
            {
                id: 'energy_drink_craft',
                name: 'Energético Caseiro',
                icon: '🫙',
                result: 'energy_drink',
                resultQty: 1,
                materials: [
                    { id: 'water_bottle', name: 'Garrafa d\'Água', quantity: 1 },
                    { id: 'alcohol', name: 'Álcool', quantity: 1 }
                ],
                description: 'Bebida energética improvisada.'
            }
        ];
    }

    canCraft(recipe) {
        for (const mat of recipe.materials) {
            if (!Game.inventorySystem.hasItem(mat.id, mat.quantity)) {
                return false;
            }
        }
        return true;
    }

    craft(recipeId) {
        const recipe = this.recipes.find(r => r.id === recipeId);
        if (!recipe) return false;

        if (!this.canCraft(recipe)) {
            EffectsSystem.notify('Materiais insuficientes!', 'danger');
            return false;
        }

        // Consumir materiais
        for (const mat of recipe.materials) {
            Game.inventorySystem.removeItem(mat.id, mat.quantity);
        }

        // Verificar se é arma
        const isWeapon = Game.weaponsData.find(w => w.id === recipe.result);
        if (isWeapon) {
            if (!Game.inventorySystem.ownedWeapons.includes(recipe.result)) {
                Game.inventorySystem.ownedWeapons.push(recipe.result);
            }
            EffectsSystem.notify(`Fabricou: ${recipe.icon} ${recipe.name}!`, 'success');
        } else {
            // Adicionar resultado ao inventário
            const added = Game.inventorySystem.addItem(recipe.result, recipe.resultQty);
            if (!added) {
                EffectsSystem.notify('Inventário cheio!', 'danger');
                return false;
            }
            EffectsSystem.notify(`Fabricou: ${recipe.icon} ${recipe.name} x${recipe.resultQty}!`, 'success');
        }

        this.render();
        return true;
    }

    render() {
        const container = document.getElementById('crafting-recipes');
        container.innerHTML = '';

        for (const recipe of this.recipes) {
            const div = document.createElement('div');
            div.className = 'craft-recipe';

            const info = document.createElement('div');
            info.innerHTML = `
                <span class="recipe-name">${recipe.icon} ${recipe.name}</span><br>
                <span class="recipe-materials">${recipe.materials.map(m =>
                    `${m.name} x${m.quantity} (${Game.inventorySystem.getItemCount(m.id)}/${m.quantity})`
                ).join(' + ')}</span>
            `;

            const btn = document.createElement('button');
            btn.textContent = 'Fabricar';
            btn.disabled = !this.canCraft(recipe);
            btn.addEventListener('click', () => this.craft(recipe.id));

            div.appendChild(info);
            div.appendChild(btn);
            container.appendChild(div);
        }
    }
}
