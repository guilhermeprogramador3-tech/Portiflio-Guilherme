// ============================================
// EFFECTS SYSTEM - Cidade Morta: Último Refúgio
// Partículas, clima, iluminação, dia/noite
// ============================================

class EffectsSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.rain = null;
        this.isRaining = false;
        this.fog = null;

        // Ciclo dia/noite
        // timeOfDay: 0.0 = amanhecer(6h), 0.25 = meio-dia(12h), 0.5 = entardecer(18h), 0.75 = meia-noite(0h)
        this.timeOfDay = 0.1; // Começa logo após o amanhecer
        this.dayDuration = 480; // 8 minutos por dia completo
        this.ambientLight = null;
        this.directionalLight = null;
        this.nightMultiplier = 1;

        // Objetos visuais do céu
        this.starField = null;
        this.moon = null;
        this.moonGlow = null;
        this.sunMesh = null;
        this.sunGlow = null;

        // Controle de dias
        this.dayCount = 1;
        this.prevIsNight = false;
        this.transitionCooldown = 0;
    }

    init() {
        // Iluminação ambiente
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);

        // Luz direcional (sol/lua)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;
        // mapSize reduzido de 2048 para 1024: como o frustum agora segue o
        // jogador (ver updateLighting) e cobre uma área bem menor e focada,
        // a mesma resolução de pixels do shadow map rende muito mais
        // detalhe por unidade de mundo — 1024 aqui fica mais nítido do que
        // 2048 cobrindo uma área fixa longe de onde o jogador está.
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.near = 0.5;
        this.directionalLight.shadow.camera.far = 200;
        // Frustum reduzido de -100/100 para -60/60: cobre confortavelmente
        // a área visível ao redor do jogador (a câmera nunca vê muito mais
        // que isso) sem desperdiçar resolução do shadow map em área vazia.
        this.directionalLight.shadow.camera.left = -60;
        this.directionalLight.shadow.camera.right = 60;
        this.directionalLight.shadow.camera.top = 60;
        this.directionalLight.shadow.camera.bottom = -60;
        this.directionalLight.shadow.bias = -0.0015;
        this.scene.add(this.directionalLight);
        // O target precisa estar na cena para que mudar sua posição altere
        // de fato a direção da luz e o frustum de sombra.
        this.scene.add(this.directionalLight.target);

        // Neblina
        this.scene.fog = new THREE.FogExp2(0x222233, 0.006);

        // Criar objetos do céu
        this.createStarField();
        this.createSunMesh();
        this.createMoonMesh();

        // Iniciar chuva (aleatório)
        if (Math.random() > 0.65) {
            this.startRain();
        }

        // Forçar estado inicial
        this.updateLighting();
    }

    // ── Estrelas ──────────────────────────────────────────
    createStarField() {
        const count = 2000;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi   = Math.acos(Math.random()); // hemisfera superior apenas
            const r     = 350 + Math.random() * 80;
            positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi) + 20;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const mat = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.2,
            transparent: true,
            opacity: 0,
            sizeAttenuation: false
        });

        this.starField = new THREE.Points(geo, mat);
        this.scene.add(this.starField);
    }

    // ── Sol visual ────────────────────────────────────────
    createSunMesh() {
        const geo = new THREE.SphereGeometry(14, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 0 });
        this.sunMesh = new THREE.Mesh(geo, mat);

        const glowGeo = new THREE.SphereGeometry(22, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffdd44, transparent: true, opacity: 0, side: THREE.BackSide
        });
        this.sunGlow = new THREE.Mesh(glowGeo, glowMat);
        this.sunMesh.add(this.sunGlow);
        this.scene.add(this.sunMesh);
    }

    // ── Lua visual ────────────────────────────────────────
    createMoonMesh() {
        const geo = new THREE.SphereGeometry(9, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0xddeeff, transparent: true, opacity: 0 });
        this.moon = new THREE.Mesh(geo, mat);

        const glowGeo = new THREE.SphereGeometry(14, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x8899cc, transparent: true, opacity: 0, side: THREE.BackSide
        });
        this.moonGlow = new THREE.Mesh(glowGeo, glowMat);
        this.moon.add(this.moonGlow);
        this.scene.add(this.moon);
    }

    // ── Update principal ──────────────────────────────────
    update(deltaTime, playerPosition = null) {
        this.timeOfDay += deltaTime / this.dayDuration;
        if (this.timeOfDay >= 1) this.timeOfDay -= 1;

        if (this.transitionCooldown > 0) this.transitionCooldown -= deltaTime;

        // Detectar transições dia/noite
        const nowNight = this.isNight();
        if (nowNight !== this.prevIsNight && this.transitionCooldown <= 0) {
            this.transitionCooldown = 5; // evitar spam
            if (nowNight) {
                // Entrou na noite
                EffectsSystem.notify('🌑 A noite chegou... os mortos ficam mais ferozes!', 'danger');
                // Incrementa dia ao cair da noite
                this.dayCount++;
                if (typeof Game !== 'undefined') Game.daysSurvived = this.dayCount - 1;
            } else {
                // Entrou no dia
                EffectsSystem.notify('🌅 Um novo amanhecer. Sobreviva mais um dia.', 'info');
            }
            this.prevIsNight = nowNight;
        }

        this.updateLighting(playerPosition);
        this.updateSkyObjects();
        this.updateParticles(deltaTime);
        this.updateRain(deltaTime);
    }

    // ── Iluminação da cena ────────────────────────────────
    updateLighting(playerPosition) {
        const angle = this.timeOfDay * Math.PI * 2;
        const sunH  = Math.sin(angle); // -1 (meia-noite) … +1 (meio-dia)

        // Posição da luz direcional (acompanha o sol). O offset é relativo
        // ao jogador — antes era um ponto fixo no mundo (perto da Torre),
        // então a câmera de sombra (frustum -100..100) cobria sempre a
        // mesma área da Torre e nunca o lugar onde o jogador de fato está.
        // Isso desperdiçava o shadow map em área vazia e deixava o resto
        // do mapa sem sombra nenhuma. Mover a luz E o seu target junto do
        // jogador resolve os dois problemas com o mesmo shadow map.
        const px = playerPosition ? playerPosition.x : 0;
        const pz = playerPosition ? playerPosition.z : 0;
        this.directionalLight.position.set(
            px + Math.cos(angle) * 150,
            Math.max(10, sunH * 150),
            pz + 80
        );
        if (this.directionalLight.target) {
            this.directionalLight.target.position.set(px, 0, pz);
            this.directionalLight.target.updateMatrixWorld();
        }

        if (sunH > 0.25) {
            // ── Pleno dia ──
            const t = Math.min(1, (sunH - 0.25) / 0.75);
            const r = 0.52 + t * 0.28;
            const g = 0.65 + t * 0.20;
            const b = 0.85 + t * 0.10;
            this.scene.background = new THREE.Color(r, g, b);
            this.scene.fog.color.setRGB(r, g, b);
            this.directionalLight.color.setHex(0xfff5cc);
            this.directionalLight.intensity = 0.3 + t * 0.75;
            this.ambientLight.intensity     = 0.25 + t * 0.30;
            this.scene.fog.density = 0.005;
            this.nightMultiplier = 1.0;

        } else if (sunH > 0.0) {
            // ── Amanhecer / início da tarde ──
            const t = sunH / 0.25;
            const r = 0.55 + t * 0.10 - (1 - t) * 0.10;
            const g = 0.30 + t * 0.25;
            const b = 0.40 + t * 0.35;
            this.scene.background = new THREE.Color(
                0.45 + t * 0.07, 0.28 + t * 0.30, 0.38 + t * 0.35
            );
            this.scene.fog.color.setRGB(0.45 + t * 0.07, 0.28 + t * 0.30, 0.38 + t * 0.35);
            this.directionalLight.color.setHex(0xff9955);
            this.directionalLight.intensity = 0.05 + t * 0.35;
            this.ambientLight.intensity     = 0.08 + t * 0.22;
            this.scene.fog.density = 0.007 - t * 0.002;
            this.nightMultiplier = 0.5 + t * 0.5;

        } else if (sunH > -0.15) {
            // ── Entardecer / crepúsculo ──
            const t = (sunH + 0.15) / 0.15; // 1→0 ao anoitecer
            this.scene.background = new THREE.Color(
                0.20 + t * 0.25, 0.10 + t * 0.18, 0.22 + t * 0.16
            );
            this.scene.fog.color.setRGB(
                0.20 + t * 0.25, 0.10 + t * 0.18, 0.22 + t * 0.16
            );
            this.directionalLight.color.setHex(0xff6633);
            this.directionalLight.intensity = t * 0.12;
            this.ambientLight.intensity     = 0.06 + t * 0.08;
            this.scene.fog.density = 0.008 + (1 - t) * 0.003;
            this.nightMultiplier = t * 0.5;

        } else {
            // ── Noite plena ──
            const depth = Math.min(1, (-sunH - 0.15) / 0.85);
            const r = 0.02 + (1 - depth) * 0.03;
            const g = 0.02 + (1 - depth) * 0.02;
            const b = 0.08 + depth * 0.07;
            this.scene.background = new THREE.Color(r, g, b);
            this.scene.fog.color.setRGB(r, g, b);
            this.directionalLight.color.setHex(0x3355aa);
            this.directionalLight.intensity = 0.05 + (1 - depth) * 0.08;
            this.ambientLight.intensity     = 0.04 + (1 - depth) * 0.04;
            this.scene.fog.density = 0.010 + depth * 0.003;
            this.nightMultiplier = 0.15 + (1 - depth) * 0.15;
        }
    }

    // ── Posicionar sol, lua e estrelas no céu ─────────────
    updateSkyObjects() {
        const angle = this.timeOfDay * Math.PI * 2;
        const sunH  = Math.sin(angle);
        const skyR  = 280; // raio do "domo" do céu

        // Sol
        const sunX = Math.cos(angle) * skyR;
        const sunY = sunH * skyR;
        const sunZ = 60;
        this.sunMesh.position.set(sunX, sunY, sunZ);

        // Visibilidade do sol (suave)
        const sunVis = Math.max(0, Math.min(1, sunH * 5));
        this.sunMesh.material.opacity = sunVis * 0.95;
        this.sunGlow.material.opacity = sunVis * 0.25;

        // Cor do sol: branco ao meio-dia, laranja no horizonte
        const t = Math.max(0, Math.min(1, (sunH - 0.0) / 0.4));
        this.sunMesh.material.color.setRGB(1, 0.85 + t * 0.15, 0.3 + t * 0.65);

        // Lua (oposta ao sol)
        const moonX = -sunX;
        const moonY = -sunY;
        this.moon.position.set(moonX, moonY, sunZ);

        const moonVis = Math.max(0, Math.min(1, (-sunH - 0.0) * 4));
        this.moon.material.opacity      = moonVis * 0.90;
        this.moonGlow.material.opacity  = moonVis * 0.18;

        // Estrelas: aparecem à noite
        const starOpacity = Math.max(0, Math.min(1, (-sunH - 0.05) * 6));
        this.starField.material.opacity = starOpacity;

        // Rotação suave das estrelas (movimento sideral lento)
        this.starField.rotation.y = this.timeOfDay * Math.PI * 0.05;
    }

    // ── Consultas públicas ────────────────────────────────
    isNight() {
        const sunH = Math.sin(this.timeOfDay * Math.PI * 2);
        return sunH < -0.15;
    }

    isDusk() {
        const sunH = Math.sin(this.timeOfDay * Math.PI * 2);
        return sunH >= -0.15 && sunH <= 0.1;
    }

    /** Hora do jogo em formato HH:MM (0→06:00, 0.25→12:00, 0.5→18:00, 0.75→00:00) */
    getGameTimeString() {
        const totalH = (this.timeOfDay * 24 + 6) % 24;
        const h = Math.floor(totalH);
        const m = Math.floor((totalH - h) * 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    /** Fase do dia como string em português */
    getDayPhase() {
        const sunH = Math.sin(this.timeOfDay * Math.PI * 2);
        if (sunH > 0.5)   return 'Dia';
        if (sunH > 0.1)   return 'Tarde';
        if (sunH > -0.05) return this.timeOfDay < 0.5 ? 'Amanhecer' : 'Entardecer';
        return 'Noite';
    }

    /** Emoji/ícone da fase atual */
    getDayPhaseIcon() {
        const phase = this.getDayPhase();
        const icons = { 'Dia': '☀️', 'Tarde': '🌤️', 'Amanhecer': '🌅', 'Entardecer': '🌆', 'Noite': '🌑' };
        return icons[phase] || '🌍';
    }

    startRain() {
        if (this.isRaining) return;
        this.isRaining = true;
        EffectsSystem.notify('🌧️ Começou a chover...', 'info');

        const rainCount = 3000;
        const rainGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(rainCount * 3);
        const velocities = new Float32Array(rainCount);

        for (let i = 0; i < rainCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 200;
            positions[i * 3 + 1] = Math.random() * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            velocities[i] = 0.5 + Math.random() * 0.5;
        }

        rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        rainGeo.userData = { velocities };

        const rainMat = new THREE.PointsMaterial({
            color: 0xaaaacc,
            size: 0.1,
            transparent: true,
            opacity: 0.6
        });

        this.rain = new THREE.Points(rainGeo, rainMat);
        this.scene.add(this.rain);

        // Aumentar neblina durante chuva
        this.scene.fog.density = 0.012;
    }

    stopRain() {
        if (!this.isRaining) return;
        this.isRaining = false;

        if (this.rain) {
            this.scene.remove(this.rain);
            this.rain.geometry.dispose();
            this.rain.material.dispose();
            this.rain = null;
        }

        this.scene.fog.density = 0.008;
    }

    updateRain(deltaTime) {
        if (!this.rain) return;

        const positions = this.rain.geometry.attributes.position.array;
        const velocities = this.rain.geometry.userData.velocities;

        for (let i = 0; i < positions.length / 3; i++) {
            positions[i * 3 + 1] -= velocities[i] * 60 * deltaTime;

            if (positions[i * 3 + 1] < 0) {
                positions[i * 3 + 1] = 100;
                positions[i * 3] = (Math.random() - 0.5) * 200;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
            }
        }

        this.rain.geometry.attributes.position.needsUpdate = true;
    }

    // Criar explosão de partículas de sangue
    createBloodSplatter(position) {
        const count = 15;
        for (let i = 0; i < count; i++) {
            const particle = {
                mesh: this.createParticleMesh(0xff0000, 0.1),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 3,
                    (Math.random() - 0.5) * 5
                ),
                life: 1.0,
                decay: 1.5 + Math.random()
            };
            particle.mesh.position.copy(position);
            this.scene.add(particle.mesh);
            this.particles.push(particle);
        }
    }

    // Criar explosão
    createExplosion(position) {
        const count = 30;
        for (let i = 0; i < count; i++) {
            const color = Math.random() > 0.5 ? 0xff6600 : 0xffaa00;
            const particle = {
                mesh: this.createParticleMesh(color, 0.2 + Math.random() * 0.3),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 10,
                    Math.random() * 8,
                    (Math.random() - 0.5) * 10
                ),
                life: 1.0,
                decay: 2 + Math.random()
            };
            particle.mesh.position.copy(position);
            this.scene.add(particle.mesh);
            this.particles.push(particle);
        }
    }

    // Criar partícula de coleta
    createPickupEffect(position) {
        const count = 8;
        for (let i = 0; i < count; i++) {
            const particle = {
                mesh: this.createParticleMesh(0x00ff88, 0.08),
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random() * 3 + 1,
                    (Math.random() - 0.5) * 2
                ),
                life: 1.0,
                decay: 2
            };
            particle.mesh.position.copy(position);
            this.scene.add(particle.mesh);
            this.particles.push(particle);
        }
    }

    createParticleMesh(color, size) {
        const geo = new THREE.SphereGeometry(size, 4, 4);
        const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
        return new THREE.Mesh(geo, mat);
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.velocity.y -= 9.8 * deltaTime;
            p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
            p.life -= p.decay * deltaTime;
            p.mesh.material.opacity = Math.max(0, p.life);

            if (p.life <= 0) {
                this.scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    // Notificação na tela
    static notify(message, type = 'info') {
        const container = document.getElementById('notifications');
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.style.borderLeft = type === 'danger' ? '3px solid #ff3333' :
                                  type === 'success' ? '3px solid #33ff33' :
                                  type === 'quest' ? '3px solid #ffaa00' : '3px solid #3388ff';
        notif.textContent = message;
        container.appendChild(notif);

        setTimeout(() => {
            if (notif.parentNode) notif.parentNode.removeChild(notif);
        }, 3500);
    }
}
