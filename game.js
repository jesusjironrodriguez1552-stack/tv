// Configuración del juego
const INITIAL_BUDGET = 200;
const BID_INCREMENT = 5;
const PLAYERS_PER_ROUND = 5;

const POSITIONS_ORDER = [
    { name: 'porteros', display: 'Porteros', count: 1 },
    { name: 'defensa', display: 'Defensas Centrales', count: 2 },
    { name: 'laterales', display: 'Laterales', count: 2 },
    { name: 'mediocentrodefensibo', display: 'Mediocentro Defensivo', count: 1 },
    { name: 'mediocentros', display: 'Mediocentro', count: 1 },
    { name: 'mediocentroofensibo', display: 'Mediocentro Ofensivo', count: 1 },
    { name: 'extremoizquierdo', display: 'Extremo Izquierdo', count: 1 },
    { name: 'extremoderecho', display: 'Extremo Derecho', count: 1 },
    { name: 'delantero', display: 'Delantero Centro', count: 1 }
];

// Estado del juego
let gameState = {
    currentRound: 0,
    currentPosition: 0,
    playersNeededInPosition: 0,
    totalPlayersNeeded: 11,
    players: {
        human: { budget: INITIAL_BUDGET, squad: [] },
        ia1: { budget: INITIAL_BUDGET, squad: [] },
        ia2: { budget: INITIAL_BUDGET, squad: [] },
        ia3: { budget: INITIAL_BUDGET, squad: [] }
    },
    currentPlayers: [],
    auction: {
        active: false,
        currentPlayer: null,
        currentBid: 0,
        currentBidder: null,
        turn: 0,
        participants: ['human', 'ia1', 'ia2', 'ia3'],
        passed: new Set()
    }
};

// Referencias DOM
const elements = {
    startBtn: document.getElementById('start-btn'),
    playersGrid: document.getElementById('players-grid'),
    auctionPanel: document.getElementById('auction-panel'),
    bidBtn: document.getElementById('bid-btn'),
    passBtn: document.getElementById('pass-btn'),
    currentBid: document.getElementById('current-bid'),
    currentTurn: document.getElementById('current-turn'),
    roundTitle: document.getElementById('round-title'),
    roundSubtitle: document.getElementById('round-subtitle'),
    revealModal: document.getElementById('reveal-modal'),
    countdown: document.getElementById('countdown'),
    formation: document.getElementById('formation'),
    auctionStatus: document.getElementById('auction-status'),
    biddingHistory: document.getElementById('bidding-history')
};

// Datos de jugadores con fallback
const playersData = {
    porteros: typeof porteros !== 'undefined' ? porteros : [],
    defensa: typeof defensa !== 'undefined' ? defensa : [],
    laterales: typeof laterales !== 'undefined' ? laterales : [],
    mediocentros: typeof mediocentros !== 'undefined' ? mediocentros : [],
    mediocentrodefensibo: typeof mediocentrodefensibo !== 'undefined' ? mediocentrodefensibo : [],
    mediocentroofensibo: typeof mediocentroofensibo !== 'undefined' ? mediocentroofensibo : [],
    extremoizquierdo: typeof extremoizquierdo !== 'undefined' ? extremoizquierdo : [],
    extremoderecho: typeof extremoderecho !== 'undefined' ? extremoderecho : [],
    delantero: typeof delanteros !== 'undefined' ? delanteros : []
};

// Funciones de utilidad
const getDefaultPosition = (positionKey) => {
    const map = {
        'porteros': 'POR', 'defensa': 'DFC', 'laterales': 'LD', 'mediocentros': 'MC',
        'mediocentrodefensibo': 'MCD', 'mediocentroofensibo': 'MCO', 
        'extremoizquierdo': 'EI', 'extremoderecho': 'ED', 'delantero': 'DC'
    };
    return map[positionKey] || 'MC';
};

const normalizePlayerData = (player, positionKey) => {
    const normalized = { ...player };
    if (normalized.precioTransferencia && !normalized.precio) {
        normalized.precio = normalized.precioTransferencia;
    }
    if (!normalized.posicion) {
        normalized.posicion = getDefaultPosition(positionKey);
    }
    if (normalized.nombre && normalized.apellido && !normalized.nombre.includes(normalized.apellido)) {
        normalized.nombre = `${normalized.nombre} ${normalized.apellido}`;
    }
    return normalized;
};

const getPlayerDisplayName = (player) => ({
    human: 'TÚ', ia1: 'IA 1', ia2: 'IA 2', ia3: 'IA 3'
}[player] || player);

// Inicialización
function initGame() {
    console.log('Inicializando juego...');
    
    // Crear datos de prueba si no existen
    if (Object.values(playersData).every(arr => arr.length === 0)) {
        createTestData();
    }
    
    elements.startBtn?.addEventListener('click', startGame);
    elements.bidBtn?.addEventListener('click', makeBid);
    elements.passBtn?.addEventListener('click', passTurn);
    
    if (elements.bidBtn) elements.bidBtn.disabled = true;
    if (elements.passBtn) elements.passBtn.disabled = true;
    
    updateBudgetDisplay();
}

// Crear datos de prueba
function createTestData() {
    const testPlayers = {
        porteros: [
            { nombre: 'Ter Stegen', club: 'Barcelona', precio: 60 },
            { nombre: 'Courtois', club: 'Real Madrid', precio: 65 },
            { nombre: 'Oblak', club: 'Atlético', precio: 70 },
            { nombre: 'Alisson', club: 'Liverpool', precio: 75 },
            { nombre: 'Donnarumma', club: 'PSG', precio: 55 }
        ],
        defensa: [
            { nombre: 'Van Dijk', club: 'Liverpool', precio: 80 },
            { nombre: 'Ramos', club: 'Sevilla', precio: 70 },
            { nombre: 'Marquinhos', club: 'PSG', precio: 65 },
            { nombre: 'Dias', club: 'Man City', precio: 75 },
            { nombre: 'Koulibaly', club: 'Chelsea', precio: 60 }
        ]
    };
    
    // Llenar todas las posiciones con datos de prueba
    Object.keys(playersData).forEach(pos => {
        if (playersData[pos].length === 0) {
            playersData[pos] = testPlayers[pos] || Array.from({length: 5}, (_, i) => ({
                nombre: `Jugador ${pos} ${i+1}`,
                club: `Club ${String.fromCharCode(65+i)}`,
                precio: 30 + Math.random() * 50
            }));
        }
    });
}

// Control del juego
function startGame() {
    elements.startBtn.style.display = 'none';
    gameState.currentRound = 1;
    gameState.currentPosition = 0;
    gameState.playersNeededInPosition = POSITIONS_ORDER[0].count;
    startNewRound();
}

function startNewRound() {
    const position = POSITIONS_ORDER[gameState.currentPosition];
    
    elements.roundTitle.textContent = `Ronda ${gameState.currentRound}: ${position.display}`;
    elements.roundSubtitle.textContent = `Selecciona ${position.count} ${position.display.toLowerCase()}`;
    
    updateAuctionStatus(`🏆 Nueva ronda - Buscando ${position.display}...`);
    
    gameState.currentPlayers = selectRandomPlayers(position.name);
    displayPlayers();
    
    gameState.auction.participants = ['human', 'ia1', 'ia2', 'ia3'];
    gameState.auction.passed = new Set();
    
    if (elements.biddingHistory) elements.biddingHistory.innerHTML = '';
    
    setTimeout(() => startPlayerAuction(0), 1000);
}

function selectRandomPlayers(position) {
    const available = [...playersData[position]];
    const selected = [];
    
    for (let i = 0; i < PLAYERS_PER_ROUND && available.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * available.length);
        const player = available.splice(randomIndex, 1)[0];
        selected.push(normalizePlayerData(player, position));
    }
    
    return selected;
}

function displayPlayers() {
    if (!elements.playersGrid) return;
    
    elements.playersGrid.innerHTML = '';
    
    gameState.currentPlayers.forEach((player, index) => {
        const card = document.createElement('div');
        card.className = 'player-card';
        card.innerHTML = `
            <div class="player-position">${player.posicion}</div>
            <div class="player-name hidden">???</div>
            <div class="player-club hidden">???</div>
            <div class="player-price">€${Math.round(player.precio)}M</div>
        `;
        elements.playersGrid.appendChild(card);
    });
}

// Sistema de subastas
function startPlayerAuction(playerIndex) {
    if (playerIndex >= gameState.currentPlayers.length) {
        checkRoundCompletion();
        return;
    }
    
    const player = gameState.currentPlayers[playerIndex];
    gameState.auction = {
        active: true,
        currentPlayer: player,
        currentBid: Math.round(player.precio),
        currentBidder: null,
        turn: 0,
        participants: gameState.auction.participants,
        passed: new Set()
    };
    
    if (elements.auctionPanel) elements.auctionPanel.style.display = 'block';
    updateAuctionDisplay();
    updateAuctionStatus(`💰 Subasta por ${player.posicion} - Precio base: €${Math.round(player.precio)}M`);
    
    if (elements.biddingHistory) elements.biddingHistory.innerHTML = '';
    
    processTurn();
}

function processTurn() {
    if (!gameState.auction.active) return;
    
    const activeParticipants = gameState.auction.participants.filter(p => !gameState.auction.passed.has(p));
    
    if (activeParticipants.length <= 1) {
        endAuction();
        return;
    }
    
    const currentPlayer = activeParticipants[gameState.auction.turn % activeParticipants.length];
    
    if (elements.currentTurn) {
        elements.currentTurn.textContent = getPlayerDisplayName(currentPlayer);
        elements.currentTurn.style.cssText = `
            background-color: ${currentPlayer === 'human' ? '#28a745' : '#007bff'};
            color: white; padding: 5px 10px; border-radius: 5px; font-weight: bold;
        `;
    }
    
    updateAuctionStatus(`🎯 Turno de ${getPlayerDisplayName(currentPlayer)}`);
    
    if (currentPlayer === 'human') {
        enableHumanControls();
    } else {
        setTimeout(() => processAITurn(currentPlayer), 1500);
    }
}

function enableHumanControls() {
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const canBid = gameState.players.human.budget >= nextBid;
    
    if (elements.bidBtn) {
        elements.bidBtn.disabled = !canBid;
        elements.bidBtn.textContent = `Pujar (€${nextBid}M)`;
        elements.bidBtn.style.opacity = canBid ? '1' : '0.5';
    }
    
    if (elements.passBtn) {
        elements.passBtn.disabled = false;
        elements.passBtn.style.opacity = '1';
    }
}

function processAITurn(aiPlayer) {
    const player = gameState.auction.currentPlayer;
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const aiBudget = gameState.players[aiPlayer].budget;
    
    // Lógica mejorada de IA
    const baseInterest = player.precio >= 60 ? 0.7 : 0.5;
    const randomFactor = Math.random();
    const budgetFactor = aiBudget > 100 ? 1.2 : 0.8;
    const interest = Math.min(0.9, baseInterest * budgetFactor);
    
    const maxAffordable = Math.min(aiBudget, player.precio * 1.5);
    
    if (nextBid <= maxAffordable && randomFactor < interest) {
        // IA puja
        gameState.auction.currentBid = nextBid;
        gameState.auction.currentBidder = aiPlayer;
        gameState.players[aiPlayer].budget -= BID_INCREMENT;
        
        addBiddingAction(`${getPlayerDisplayName(aiPlayer)} puja €${nextBid}M`, aiPlayer);
        updateBudgetDisplay();
        updateAuctionDisplay();
        
        gameState.auction.turn++;
        setTimeout(() => processTurn(), 1000);
    } else {
        // IA pasa
        gameState.auction.passed.add(aiPlayer);
        addBiddingAction(`${getPlayerDisplayName(aiPlayer)} pasa`, aiPlayer);
        
        gameState.auction.turn++;
        setTimeout(() => processTurn(), 1000);
    }
}

function makeBid() {
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    
    if (gameState.players.human.budget >= nextBid) {
        gameState.auction.currentBid = nextBid;
        gameState.auction.currentBidder = 'human';
        gameState.players.human.budget -= BID_INCREMENT;
        
        addBiddingAction(`TÚ pujas €${nextBid}M`, 'human');
        updateBudgetDisplay();
        updateAuctionDisplay();
        
        if (elements.bidBtn) elements.bidBtn.disabled = true;
        if (elements.passBtn) elements.passBtn.disabled = true;
        
        gameState.auction.turn++;
        setTimeout(() => processTurn(), 1000);
    }
}

function passTurn() {
    gameState.auction.passed.add('human');
    addBiddingAction(`TÚ pasas`, 'human');
    
    if (elements.bidBtn) elements.bidBtn.disabled = true;
    if (elements.passBtn) elements.passBtn.disabled = true;
    
    gameState.auction.turn++;
    setTimeout(() => processTurn(), 1000);
}

function endAuction() {
    const winner = gameState.auction.currentBidder;
    const player = gameState.auction.currentPlayer;
    const finalPrice = gameState.auction.currentBid;
    
    if (winner) {
        updateAuctionStatus(`🎉 ${getPlayerDisplayName(winner)} gana por €${finalPrice}M`);
        
        player.assigned = true;
        player.winner = winner;
        player.finalPrice = finalPrice;
        
        // Remover ganador de participantes futuros si ya tiene suficientes jugadores
        const winnerSquadSize = gameState.players[winner].squad.length;
        if (winnerSquadSize >= gameState.totalPlayersNeeded - 1) {
            gameState.auction.participants = gameState.auction.participants.filter(p => p !== winner);
        }
        
        showPlayerReveal(player, winner, finalPrice);
    } else {
        updateAuctionStatus(`😔 Nadie quiso al jugador`);
        startNextAuction();
    }
}

function showPlayerReveal(player, winner, price) {
    if (!elements.revealModal || !elements.countdown) {
        addPlayerToSquad(player, winner);
        startNextAuction();
        return;
    }
    
    elements.revealModal.style.display = 'flex';
    
    let countdown = 3;
    elements.countdown.textContent = countdown;
    
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            elements.countdown.textContent = countdown;
        } else {
            clearInterval(countdownInterval);
            elements.countdown.textContent = '🎊';
            
            const revealText = document.querySelector('.reveal-text');
            if (revealText) {
                revealText.innerHTML = `
                    <div style="font-size: 28px; margin: 20px 0; color: #FFD700;">${player.nombre}</div>
                    <div style="font-size: 18px; margin: 10px 0;">${player.club}</div>
                    <div style="font-size: 16px; opacity: 0.8;">€${price}M</div>
                `;
            }
            
            addPlayerToSquad(player, winner);
            
            setTimeout(() => {
                elements.revealModal.style.display = 'none';
                startNextAuction();
            }, 3000);
        }
    }, 1000);
}

function addPlayerToSquad(player, winner) {
    gameState.players[winner].squad.push(player);
    
    if (winner === 'human') {
        updateFormationDisplay();
    }
    
    updateAuctionStatus(`✨ ${getPlayerDisplayName(winner)} fichó a ${player.nombre} por €${player.finalPrice}M`);
}

function startNextAuction() {
    if (elements.auctionPanel) elements.auctionPanel.style.display = 'none';
    
    const nextPlayerIndex = gameState.currentPlayers.findIndex(p => !p.assigned);
    
    if (nextPlayerIndex !== -1) {
        setTimeout(() => startPlayerAuction(nextPlayerIndex), 1000);
    } else {
        checkRoundCompletion();
    }
}

function checkRoundCompletion() {
    gameState.playersNeededInPosition--;
    
    if (gameState.playersNeededInPosition <= 0) {
        gameState.currentPosition++;
        
        if (gameState.currentPosition >= POSITIONS_ORDER.length) {
            endGame();
        } else {
            gameState.currentRound++;
            gameState.playersNeededInPosition = POSITIONS_ORDER[gameState.currentPosition].count;
            setTimeout(() => startNewRound(), 2000);
        }
    } else {
        gameState.currentRound++;
        setTimeout(() => startNewRound(), 2000);
    }
}

function endGame() {
    const humanSquad = gameState.players.human.squad;
    const totalSpent = INITIAL_BUDGET - gameState.players.human.budget;
    
    updateAuctionStatus(`🏆 ¡JUEGO COMPLETADO! Plantilla finalizada.`);
    
    // Mostrar estadísticas finales
    setTimeout(() => {
        const finalStats = `
            💰 Gastaste: €${totalSpent}M de €${INITIAL_BUDGET}M<br>
            ⚽ Fichaste: ${humanSquad.length} jugadores<br>
            💎 Jugador más caro: ${humanSquad.reduce((max, p) => p.finalPrice > max.finalPrice ? p : max).nombre} (€${humanSquad.reduce((max, p) => p.finalPrice > max.finalPrice ? p : max).finalPrice}M)
        `;
        updateAuctionStatus(finalStats);
        
        // Mostrar botón para reiniciar
        if (elements.startBtn) {
            elements.startBtn.textContent = 'Jugar de Nuevo';
            elements.startBtn.style.display = 'block';
            elements.startBtn.onclick = () => location.reload();
        }
    }, 1500);
}

// Funciones de interfaz
function updateBudgetDisplay() {
    ['human', 'ia1', 'ia2', 'ia3'].forEach(player => {
        const budgetEl = document.getElementById(`${player}-budget`);
        if (budgetEl) budgetEl.textContent = `€${gameState.players[player].budget}M`;
    });
}

function updateAuctionDisplay() {
    const player = gameState.auction.currentPlayer;
    const positionEl = document.getElementById('auction-position');
    
    if (positionEl) positionEl.textContent = player.posicion;
    if (elements.currentBid) elements.currentBid.textContent = `€${gameState.auction.currentBid}M`;
}

function updateAuctionStatus(message) {
    if (elements.auctionStatus) {
        elements.auctionStatus.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 15px; border-radius: 10px; text-align: center; 
                        font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        margin: 10px 0;">
                ${message}
            </div>
        `;
    }
}

function addBiddingAction(action, player) {
    if (!elements.biddingHistory) return;
    
    const colors = { human: '#28a745', ia1: '#007bff', ia2: '#fd7e14', ia3: '#6f42c1' };
    
    const actionElement = document.createElement('div');
    actionElement.innerHTML = `
        <div style="background-color: ${colors[player] || '#6c757d'}; 
                    color: white; padding: 8px 12px; margin: 3px 0; border-radius: 20px; 
                    font-size: 14px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${action}
        </div>
    `;
    
    elements.biddingHistory.appendChild(actionElement);
    
    // Mantener solo las últimas 6 acciones
    const actions = elements.biddingHistory.children;
    if (actions.length > 6) {
        elements.biddingHistory.removeChild(actions[0]);
    }
    
    elements.biddingHistory.scrollTop = elements.biddingHistory.scrollHeight;
}

function updateFormationDisplay() {
    if (!elements.formation) return;
    
    const humanSquad = gameState.players.human.squad;
    const positionSlots = {};
    
    // Obtener slots de posición
    POSITIONS_ORDER.forEach(pos => {
        positionSlots[pos.name] = elements.formation.querySelectorAll(`[data-position="${pos.name}"]`);
    });
    
    // Limpiar formación
    Object.values(positionSlots).forEach(slots => {
        slots.forEach(slot => {
            slot.classList.remove('filled');
            slot.textContent = slot.getAttribute('data-position').substring(0, 3).toUpperCase();
        });
    });
    
    // Llenar con jugadores
    humanSquad.forEach(player => {
        const position = getPlayerFormationPosition(player.posicion);
        const slots = positionSlots[position];
        
        if (slots) {
            const emptySlot = Array.from(slots).find(slot => !slot.classList.contains('filled'));
            if (emptySlot) {
                emptySlot.classList.add('filled');
                const displayName = player.nombre.split(' ')[0];
                emptySlot.textContent = displayName;
                emptySlot.title = `${player.nombre} (€${player.finalPrice}M)`;
            }
        }
    });
}

function getPlayerFormationPosition(position) {
    const positionMap = {
        'POR': 'porteros', 'DFC': 'defensa', 'LI': 'laterales', 'LD': 'laterales',
        'MCD': 'mediocentrodefensibo', 'MC': 'mediocentros', 'MCO': 'mediocentroofensibo',
        'EI': 'extremoizquierdo', 'ED': 'extremoderecho', 'DC': 'delantero'
    };
    return positionMap[position] || 'mediocentros';
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', initGame);
