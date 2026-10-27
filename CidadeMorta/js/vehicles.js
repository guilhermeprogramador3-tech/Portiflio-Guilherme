// ============================================
// VEHICLE SYSTEM - Cidade Morta: Último Refúgio
// Veículos: entrar, sair, dirigir, combustível
// ============================================

class VehicleSystem {
    constructor(scene) {
        this.scene = scene;
        this.vehicles = [];
        this.activeVehicle = null;
        this.isInVehicle = false;
    }

    init() {
        // Criar veículos dirigíveis em pontos estratégicos
        this.createVehicle('Sedan', new THREE.Vector3(30, 0, 30), 0x2244aa, { speed: 20, fuel: 80, maxFuel: 100, health: 100 });
        this.createVehicle('Pickup', new THREE.Vector3(-50, 0, 70), 0x884422, { speed: 18, fuel: 60, maxFuel: 120, health: 150 });
        this.createVehicle('SUV Militar', new THREE.Vector3(-110, 0, -100), 0x3a4a3a, { speed: 22, fuel: 100, maxFuel: 150, health: 200 });
        this.createVehicle('Van', new THREE.Vector3(80, 0, -60), 0xeeeeee, { speed: 15, fuel: 50, maxFuel: 100, health: 120 });
        this.createVehicle('Esportivo', new THREE.Vector3(140, 0, 80), 0xcc0000, { speed: 30, fuel: 40, maxFuel: 80, health: 80 });
    }

    createVehicle(name, position, color, stats) {
        const group = new THREE.Group();

        // Corpo do veículo
        const bodyGeo = new THREE.BoxGeometry(4.5, 1.3, 2.2);
        const bodyMat = new THREE.MeshLambertMaterial({ color });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);

        // Cabine
        const cabinGeo = new THREE.BoxGeometry(2.5, 1, 2);
        const cabinMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(-0.3, 1.7, 0);
        cabin.castShadow = true;
        group.add(cabin);

        // Vidros
        const glassMat = new THREE.MeshBasicMaterial({ color: 0x88aacc, transparent: true, opacity: 0.5 });
        const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 1.8), glassMat);
        frontGlass.position.set(0.95, 1.7, 0);
        group.add(frontGlass);

        // Rodas
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
        const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
        const wheelPositions = [
            [1.4, 0.4, 1.2], [1.4, 0.4, -1.2],
            [-1.4, 0.4, 1.2], [-1.4, 0.4, -1.2]
        ];
        const wheels = [];
        wheelPositions.forEach(wp => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(...wp);
            wheel.rotation.x = Math.PI / 2;
            group.add(wheel);
            wheels.push(wheel);
        });

        // Faróis
        const lightGeo = new THREE.SphereGeometry(0.15, 6, 6);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
        const headlight1 = new THREE.Mesh(lightGeo, lightMat);
        headlight1.position.set(2.25, 0.7, 0.7);
        group.add(headlight1);
        const headlight2 = new THREE.Mesh(lightGeo, lightMat);
        headlight2.position.set(2.25, 0.7, -0.7);
        group.add(headlight2);

        group.position.copy(position);
        group.rotation.y = Math.random() * Math.PI * 2;
        this.scene.add(group);

        const vehicle = {
            mesh: group,
            position: group.position,
            rotation: group.rotation,
            name,
            wheels,
            ...stats,
            velocity: 0,
            steer: 0,
            isRunning: false
        };

        this.vehicles.push(vehicle);
        return vehicle;
    }

    enterVehicle(vehicle) {
        if (vehicle.fuel <= 0) {
            EffectsSystem.notify('Sem combustível! Use um galão de combustível.', 'danger');

            // Verificar se tem combustível no inventário
            if (Game.inventorySystem.hasItem('fuel', 1)) {
                Game.inventorySystem.removeItem('fuel', 1);
                vehicle.fuel = 30;
                EffectsSystem.notify('Abasteceu o veículo! (+30 combustível)', 'success');
            }
            return;
        }

        this.isInVehicle = true;
        this.activeVehicle = vehicle;
        vehicle.isRunning = true;

        // Teleportar jogador para dentro
        Game.playerSystem.position.copy(vehicle.position);

        EffectsSystem.notify(`Entrou no ${vehicle.name}`, 'info');

        // Mudar controles
        this.setupVehicleControls();
    }

    exitVehicle() {
        if (!this.activeVehicle) return;

        this.isInVehicle = false;
        this.activeVehicle.isRunning = false;
        this.activeVehicle.velocity = 0;

        // Posicionar jogador ao lado
        const exitPos = this.activeVehicle.position.clone();
        exitPos.x += 3;
        Game.playerSystem.position.copy(exitPos);

        EffectsSystem.notify(`Saiu do ${this.activeVehicle.name}`, 'info');
        this.activeVehicle = null;
    }

    setupVehicleControls() {
        // Os controles são gerenciados no update
    }

    update(deltaTime) {
        if (!this.isInVehicle || !this.activeVehicle) return;

        const vehicle = this.activeVehicle;
        const keys = Game.playerSystem.keys;

        // Aceleração
        if (keys['KeyW']) {
            vehicle.velocity = Math.min(vehicle.speed, vehicle.velocity + 15 * deltaTime);
        } else if (keys['KeyS']) {
            vehicle.velocity = Math.max(-vehicle.speed * 0.5, vehicle.velocity - 20 * deltaTime);
        } else {
            // Desaceleração natural
            vehicle.velocity *= (1 - 2 * deltaTime);
            if (Math.abs(vehicle.velocity) < 0.1) vehicle.velocity = 0;
        }

        // Direção
        if (keys['KeyA']) {
            vehicle.steer = Math.min(1, vehicle.steer + 3 * deltaTime);
        } else if (keys['KeyD']) {
            vehicle.steer = Math.max(-1, vehicle.steer - 3 * deltaTime);
        } else {
            vehicle.steer *= (1 - 5 * deltaTime);
        }

        // Sair do veículo
        if (keys['KeyE']) {
            keys['KeyE'] = false;
            this.exitVehicle();
            return;
        }

        // Aplicar movimento
        if (Math.abs(vehicle.velocity) > 0.1) {
            const turnRate = vehicle.steer * 2 * deltaTime * (vehicle.velocity / vehicle.speed);
            vehicle.mesh.rotation.y += turnRate;

            const forward = new THREE.Vector3(
                Math.sin(vehicle.mesh.rotation.y),
                0,
                Math.cos(vehicle.mesh.rotation.y)
            );

            vehicle.position.add(forward.multiplyScalar(vehicle.velocity * deltaTime));

            // Consumir combustível
            vehicle.fuel -= Math.abs(vehicle.velocity) * 0.01 * deltaTime;
            if (vehicle.fuel <= 0) {
                vehicle.fuel = 0;
                vehicle.velocity = 0;
                EffectsSystem.notify('Sem combustível!', 'danger');
                this.exitVehicle();
                return;
            }

            // Animar rodas
            for (const wheel of vehicle.wheels) {
                wheel.rotation.z += vehicle.velocity * deltaTime * 2;
            }
        }

        // Atualizar posição do jogador
        Game.playerSystem.position.copy(vehicle.position);
        Game.playerSystem.position.y = 1.5;

        // Atropelar zumbis
        const zombiesNear = Game.zombieSystem.getZombiesInRange(vehicle.position, 3);
        for (const zombie of zombiesNear) {
            if (Math.abs(vehicle.velocity) > 5) {
                const damage = Math.abs(vehicle.velocity) * 5;
                Game.zombieSystem.damageZombie(zombie, damage);
                vehicle.velocity *= 0.8;
                Game.cameraSystem.shake(0.1, 0.2);
            }
        }

        // Atualizar display
        document.getElementById('weapon-name').textContent = `🚗 ${vehicle.name}`;
        document.getElementById('ammo-count').textContent = `⛽ ${Math.round(vehicle.fuel)}/${vehicle.maxFuel} | ${Math.round(vehicle.velocity)} km/h`;
    }
}
