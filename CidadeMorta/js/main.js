// ============================================
// MAIN - Cidade Morta: Último Refúgio
// Ponto de entrada do jogo
// ============================================

// Inicializar quando o DOM estiver pronto
window.addEventListener('DOMContentLoaded', () => {
    console.log('🧟 Cidade Morta: Último Refúgio - Inicializando...');
    Game.init().catch(err => {
        console.error('Erro fatal ao inicializar o jogo:', err);
        document.getElementById('loading-text').textContent = 'Erro ao carregar. Recarregue a página.';
    });
});

// Prevenir scroll
window.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
window.addEventListener('touchmove', (e) => {
    if (Game.state === 'playing') e.preventDefault();
}, { passive: false });
