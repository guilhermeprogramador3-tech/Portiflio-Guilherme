# Cidade Morta: Último Refúgio

## Jogo de Sobrevivência Zumbi 3D em Mundo Aberto

Um jogo completo de sobrevivência em primeira pessoa (FPS) ambientado em uma cidade pós-apocalíptica infestada de zumbis. Desenvolvido inteiramente com tecnologias web.

## Tecnologias

- HTML5
- CSS3
- JavaScript ES6+
- Three.js (WebGL)
- Pointer Lock API
- LocalStorage (salvamento)

## Como Jogar

1. Abra o projeto com **Live Server** ou qualquer servidor HTTP local
2. Abra `index.html` no navegador
3. Clique em "Novo Jogo" para começar

### Usando Live Server (VS Code)
```
1. Instale a extensão "Live Server" no VS Code
2. Clique com botão direito em index.html
3. Selecione "Open with Live Server"
```

### Usando Python
```bash
cd CidadeMorta
python -m http.server 8000
# Acesse: http://localhost:8000
```

### Usando Node.js
```bash
npx serve CidadeMorta
```

## Controles

| Tecla | Ação |
|-------|------|
| W/A/S/D | Mover |
| Mouse | Olhar |
| Clique Esquerdo | Atacar |
| Clique Direito | Mirar |
| Shift | Correr |
| Ctrl | Agachar |
| Espaço | Pular |
| E | Interagir |
| R | Recarregar |
| I | Inventário |
| C | Crafting |
| J | Diário de Missões |
| 1-4 | Trocar Arma |
| Esc | Pausar |

## Sistema de Missões

O jogo segue uma cadeia principal de **8 missões numeradas**, todas entregues pelo **General Ramos**. A progressão não é automática: ao completar uma missão, o jogador precisa voltar e falar com o General para receber a próxima.

1. **Primeiros Passos** — tutorial de combate e coleta.
2. **Recuperar Remédios** — ida ao Hospital.
3. **Encontrar Sobreviventes** — ida à Delegacia.
4. **Defender a Torre** — onda de zumbis na base.
5. **Reforço Tático** — o General avisa que os zumbis estão mais fortes e dá um **Cartão de Acesso Militar**. Leve-o até o portão da **Base Militar**, destranque-o, pegue o **Rifle** e a **Shotgun** nas caixas do Arsenal, e elimine os zumbis blindados que tomaram a base.
6. **Matar o Mutante** — um boss é localizado no Parque.
7. **O Rei Zumbi** — boss final... ou quase.
8. **A Cura** — a Dra. Jennifer acredita ter encontrado uma cura e quer testá-la em si mesma. Escolte-a até o Hospital — mas a injeção dá errado, e ela se transforma na **Zumbi Rainha**, o verdadeiro boss final do jogo.

Outros NPCs (Dra. Jennifer, Ana) comentam sobre a situação ao longo da história, mas sempre encaminham o jogador de volta ao General para receber a missão oficialmente. Há ainda uma missão secundária (escoltar o Pedro até a Torre). Pressione **J** a qualquer momento para abrir o **Diário de Missões**, que mostra a missão ativa com seus objetivos, a próxima missão da cadeia e o histórico de missões concluídas.

## Performance

O jogo foi otimizado para suportar a quantidade alta de zumbis simultâneos sem perda de FPS:
- Geometrias e materiais 3D são compartilhados entre objetos idênticos (zumbis do mesmo tipo, casas, prédios, carros, postes) em vez de criar uma instância nova para cada um.
- A IA de colisão dos zumbis usa um filtro rápido de distância antes de checar colisão de fato, evitando milhares de checagens desnecessárias por frame.
- Sombras dinâmicas são limitadas aos bosses e estruturas grandes; zumbis comuns e objetos pequenos não lançam sombra, já que o ganho visual não compensa o custo com dezenas deles na tela.
- A luz/sombra direcional (sol) agora acompanha o jogador pelo mapa, em vez de ficar fixa perto da Torre — melhora tanto a qualidade visual quanto a performance.
- Minimapa e relógio do HUD são atualizados a uma taxa menor (12x/s e 2x/s) já que são elementos de UI que não precisam de atualização a 60fps.

## Sistemas Implementados

- **Mundo Aberto 3D**: Cidade densa com ruas, mais de 50 prédios e casas, hospital, delegacia, mercado, base militar, parque
- **Interiores Exploráveis**: Hospital, Delegacia, Mercado e o Arsenal da Base Militar têm interior completo (entre pela porta com [E]) — a Torre Esperança também tem 20 andares internos
- **Torre Esperança**: Safe zone central com 20 andares, evolui de nível 1 a 10
- **Sistema de Zumbis**: 6 tipos (Comum, Corredor, Blindado, Mutante, Rei Zumbi, Zumbi Rainha) com IA
- **NPCs**: Sobreviventes, médicos, soldados, comerciantes com diálogos dinâmicos
- **Armas**: Corpo a corpo (faca, taco, machado, espada) e à distância (pistola, rifle, shotgun)
- **Inventário**: 30 slots com sistema de empilhamento
- **Crafting**: Fabricação de bandagens, armaduras, armas e munição
- **Veículos**: 5 veículos dirigíveis com combustível
- **Missões**: Cadeia de 8 missões entregues pelo General, com objetivos e recompensas
- **Ciclo Dia/Noite**: Zumbis mais perigosos à noite
- **Clima**: Chuva, neblina, iluminação dinâmica
- **Salvamento**: LocalStorage automático
- **Mobile**: Joystick virtual e botões touch
- **Minimapa**: Mostra zumbis, NPCs e pontos de interesse

## Estrutura do Projeto

```
CidadeMorta/
├── index.html
├── style.css
├── README.md
├── js/
│   ├── main.js          - Ponto de entrada
│   ├── game.js          - Gerenciador principal
│   ├── player.js        - Jogador e movimento
│   ├── camera.js        - Câmera FPS
│   ├── world.js         - Terreno e itens
│   ├── city.js          - Geração da cidade
│   ├── buildings.js     - Torre e prédios
│   ├── zombies.js       - Sistema de zumbis
│   ├── npc.js           - NPCs e diálogos
│   ├── weapons.js       - Armas e combate
│   ├── inventory.js     - Inventário
│   ├── crafting.js      - Fabricação
│   ├── vehicles.js      - Veículos
│   ├── quests.js        - Missões
│   ├── base.js          - Evolução da Torre
│   ├── save.js          - Salvamento
│   └── effects.js       - Efeitos visuais
├── assets/
│   ├── models/
│   ├── textures/
│   └── sounds/
└── data/
    ├── items.json       - Dados dos itens
    ├── weapons.json     - Dados das armas
    └── zombies.json     - Dados dos zumbis
```

## Requisitos

- Navegador moderno com suporte a WebGL (Chrome, Firefox, Edge, Safari)
- Servidor HTTP local (Live Server, Python http.server, etc.)

## Licença

Projeto educacional - uso livre.
