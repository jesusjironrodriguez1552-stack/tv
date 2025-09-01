// Configuración del juego
const INITIAL_BUDGET = 200; // millones
const BID_INCREMENT = 5; // millones
const PLAYERS_PER_ROUND = 5;

// Posiciones en orden para la formación 4-3-3
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
    messagesContainer: document.getElementById('messages-container'),
    roundTitle: document.getElementById('round-title'),
    roundSubtitle: document.getElementById('round-subtitle'),
    revealModal: document.getElementById('reveal-modal'),
    countdown: document.getElementById('countdown'),
    formation: document.getElementById('formation'),
    auctionStatus: document.getElementById('auction-status'),
    biddingHistory: document.getElementById('bidding-history')
};

// Mapeo de datos de jugadores
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

// Función helper para obtener posición por defecto según el tipo de jugador
function getDefaultPosition(positionKey) {
    const positionMap = {
        'porteros': 'POR',
        'defensa': 'DFC',
        'laterales': 'LD',
        'mediocentros': 'MC',
        'mediocentrodefensibo': 'MCD',
        'mediocentroofensibo': 'MCO',
        'extremoizquierdo': 'EI',
        'extremoderecho': 'ED',
        'delantero': 'DC'
    };
    return positionMap[positionKey] || 'MC';
}

// Función para normalizar los datos del jugador
function normalizePlayerData(player, positionKey) {
    const normalizedPlayer = { ...player };
    
    // Convertir precioTransferencia a precio
    if (normalizedPlayer.precioTransferencia && !normalizedPlayer.precio) {
        normalizedPlayer.precio = normalizedPlayer.precioTransferencia;
    }
    
    // Agregar posición si no existe
    if (!normalizedPlayer.posicion) {
        normalizedPlayer.posicion = getDefaultPosition(positionKey);
    }
    
    // Crear nombre completo si tiene nombre y apellido separados
    if (!normalizedPlayer.nombre && normalizedPlayer.nombre && normalizedPlayer.apellido) {
        normalizedPlayer.nombre = `${normalizedPlayer.nombre} ${normalizedPlayer.apellido}`;
    } else if (normalizedPlayer.nombre && normalizedPlayer.apellido && !normalizedPlayer.nombre.includes(normalizedPlayer.apellido)) {
        normalizedPlayer.nombre = `${normalizedPlayer.nombre} ${normalizedPlayer.apellido}`;
    }
    
    return normalizedPlayer;
}

// Inicialización del juego
function initGame() {
    console.log('Inicializando juego...');
    
    if (!elements.startBtn) {
        console.error('Botón de inicio no encontrado');
        return;
    }
    
    elements.startBtn.addEventListener('click', startGame);
    
    if (elements.bidBtn) {
        elements.bidBtn.addEventListener('click', makeBid);
        elements.bidBtn.disabled = true;
    }
    
    if (elements.passBtn) {
        elements.passBtn.addEventListener('click', passTurn);
        elements.passBtn.disabled = true;
    }
    
    updateBudgetDisplay();
    console.log('Juego inicializado correctamente');
}

// Iniciar juego
function startGame() {
    console.log('Iniciando juego...');
    elements.startBtn.style.display = 'none';
    gameState.currentRound = 1;
    gameState.currentPosition = 0;
    gameState.playersNeededInPosition = POSITIONS_ORDER[0].count;
    startNewRound();
}

// Iniciar nueva ronda
function startNewRound() {
    const position = POSITIONS_ORDER[gameState.currentPosition];
    
    elements.roundTitle.textContent = `Ronda ${gameState.currentRound}: ${position.display}`;
    elements.roundSubtitle.textContent = `Selecciona ${position.count} ${position.display.toLowerCase()} para tu formación 4-3-3`;
    
    updateAuctionStatus(`🏆 Nueva ronda iniciada - Buscando ${position.display}...`);
    
    // Seleccionar 5 jugadores aleatorios únicos
    gameState.currentPlayers = selectRandomPlayers(position.name);
    displayPlayers();
    
    // Resetear subasta
    gameState.auction.participants = ['human', 'ia1', 'ia2', 'ia3'];
    gameState.auction.passed = new Set();
    
    // Limpiar historial de pujas
    if (elements.biddingHistory) {
        elements.biddingHistory.innerHTML = '';
    }
    
    // Iniciar primera subasta
    setTimeout(() => startPlayerAuction(0), 1000);
}

// Seleccionar jugadores aleatorios
function selectRandomPlayers(position) {
    const availablePlayers = [...playersData[position]];
    const selectedPlayers = [];
    
    for (let i = 0; i < PLAYERS_PER_ROUND && availablePlayers.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        const rawPlayer = availablePlayers.splice(randomIndex, 1)[0];
        const normalizedPlayer = normalizePlayerData(rawPlayer, position);
        selectedPlayers.push(normalizedPlayer);
    }
    
    return selectedPlayers;
}

// Mostrar jugadores en el grid - SIN BANDERAS
function displayPlayers() {
    if (!elements.playersGrid) return;
    
    elements.playersGrid.innerHTML = '';
    
    gameState.currentPlayers.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <div class="player-position">${player.posicion}</div>
            <div class="player-name hidden">???</div>
            <div class="player-club hidden">???</div>
            <div class="player-price">€${player.precio}M</div>
        `;
        
        elements.playersGrid.appendChild(playerCard);
    });
}

// Iniciar subasta de jugador
function startPlayerAuction(playerIndex) {
    if (playerIndex >= gameState.currentPlayers.length) {
        checkRoundCompletion();
        return;
    }
    
    const player = gameState.currentPlayers[playerIndex];
    gameState.auction.active = true;
    gameState.auction.currentPlayer = player;
    gameState.auction.currentBid = player.precio;
    gameState.auction.currentBidder = null;
    gameState.auction.turn = 0;
    gameState.auction.passed = new Set();
    
    // Mostrar panel de subasta
    if (elements.auctionPanel) {
        elements.auctionPanel.style.display = 'block';
    }
    updateAuctionDisplay();
    
    updateAuctionStatus(`💰 Subasta iniciada por ${player.posicion} - Precio base: €${player.precio}M`);
    
    // Limpiar historial de pujas anterior
    if (elements.biddingHistory) {
        elements.biddingHistory.innerHTML = '';
    }
    
    // Comenzar el turno
    processTurn();
}

// Procesar turno de subasta
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
        // Resaltar el turno actual
        elements.currentTurn.style.backgroundColor = currentPlayer === 'human' ? '#28a745' : '#007bff';
        elements.currentTurn.style.color = 'white';
        elements.currentTurn.style.padding = '5px 10px';
        elements.currentTurn.style.borderRadius = '5px';
        elements.currentTurn.style.fontWeight = 'bold';
    }
    
    updateAuctionStatus(`🎯 Es el turno de ${getPlayerDisplayName(currentPlayer)}`);
    
    if (currentPlayer === 'human') {
        enableHumanControls();
    } else {
        setTimeout(() => processAITurn(currentPlayer), 1500);
    }
}

// Habilitar controles del jugador humano
function enableHumanControls() {
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const canBid = gameState.players.human.budget >= nextBid;
    
    if (elements.bidBtn) {
        elements.bidBtn.disabled = !canBid;
        elements.bidBtn.textContent = `Pujar (€${nextBid}M)`;
        
        if (canBid) {
            elements.bidBtn.style.opacity = '1';
            elements.bidBtn.style.cursor = 'pointer';
        } else {
            elements.bidBtn.style.opacity = '0.5';
            elements.bidBtn.style.cursor = 'not-allowed';
            updateAuctionStatus(`❌ Presupuesto insuficiente para pujar €${nextBid}M`);
        }
    }
    
    if (elements.passBtn) {
        elements.passBtn.disabled = false;
        elements.passBtn.style.opacity = '1';
        elements.passBtn.style.cursor = 'pointer';
    }
    
    // Verificar si es obligatorio pujar
    const remainingPlayers = gameState.currentPlayers.filter(p => !p.assigned);
    const remainingParticipants = gameState.auction.participants.filter(p => !gameState.auction.passed.has(p));
    
    if (remainingPlayers.length >= remainingParticipants.length && remainingParticipants.length <= 2) {
        if (elements.passBtn) {
            elements.passBtn.disabled = true;
            elements.passBtn.style.opacity = '0.5';
            elements.passBtn.style.cursor = 'not-allowed';
        }
        updateAuctionStatus("⚠️ No puedes pasar, debes quedarte con un jugador.");
    }
}

// Procesar turno de IA
function processAITurn(aiPlayer) {
    const player = gameState.auction.currentPlayer;
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const aiBudget = gameState.players[aiPlayer].budget;
    
    const interest = calculateAIInterest(player, aiPlayer);
    const maxBid = Math.min(aiBudget, player.precio * interest);
    
    if (nextBid <= maxBid && Math.random() < interest) {
        // IA decide pujar
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

// Calcular interés de IA en jugador
function calculateAIInterest(player, aiPlayer) {
    let baseInterest = 0.6;
    
    if (player.precio >= 80) baseInterest = 0.8;
    else if (player.precio >= 60) baseInterest = 0.7;
    else if (player.precio >= 40) baseInterest = 0.6;
    else baseInterest = 0.4;
    
    const variation = (Math.random() - 0.5) * 0.3;
    return Math.max(0.2, Math.min(0.9, baseInterest + variation));
}

// Jugador humano puja
function makeBid() {
    if (!gameState.auction.active) return;
    
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const humanBudget = gameState.players.human.budget;
    
    if (humanBudget >= nextBid) {
        gameState.auction.currentBid = nextBid;
        gameState.auction.currentBidder = 'human';
        gameState.players.human.budget = humanBudget - BID_INCREMENT;
        
        addBiddingAction(`TÚ pujas €${nextBid}M`, 'human');
        updateBudgetDisplay();
        updateAuctionDisplay();
        
        // Deshabilitar controles
        if (elements.bidBtn) {
            elements.bidBtn.disabled = true;
            elements.bidBtn.style.opacity = '0.5';
        }
        if (elements.passBtn) {
            elements.passBtn.disabled = true;
            elements.passBtn.style.opacity = '0.5';
        }
        
        gameState.auction.turn++;
        setTimeout(() => processTurn(), 1000);
    }
}

// Jugador humano pasa
function passTurn() {
    gameState.auction.passed.add('human');
    addBiddingAction(`TÚ pasas`, 'human');
    
    // Deshabilitar controles
    if (elements.bidBtn) elements.bidBtn.disabled = true;
    if (elements.passBtn) elements.passBtn.disabled = true;
    
    gameState.auction.turn++;
    setTimeout(() => processTurn(), 1000);
}

// Finalizar subasta
function endAuction() {
    const winner = gameState.auction.currentBidder;
    const player = gameState.auction.currentPlayer;
    const finalPrice = gameState.auction.currentBid;
    
    if (winner) {
        updateAuctionStatus(`🎉 ${getPlayerDisplayName(winner)} gana la puja por €${finalPrice}M`);
        
        player.assigned = true;
        player.winner = winner;
        player.finalPrice = finalPrice;
        
        gameState.auction.participants = gameState.auction.participants.filter(p => p !== winner);
        
        showPlayerReveal(player, winner, finalPrice);
    } else {
        updateAuctionStatus(`😔 Nadie quiso al jugador. Siguiente subasta...`);
        startNextAuction();
    }
}

// Mostrar revelación del jugador
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

// Agregar jugador a la plantilla
function addPlayerToSquad(player, winner) {
    gameState.players[winner].squad.push(player);
    
    if (winner === 'human') {
        updateFormationDisplay();
    }
    
    updateAuctionStatus(`✨ ${getPlayerDisplayName(winner)} fichó a ${player.nombre} por €${player.finalPrice}M`);
}

// Actualizar visualización de la formación
function updateFormationDisplay() {
    if (!elements.formation) return;
    
    const humanSquad = gameState.players.human.squad;
    const positionSlots = {
        porteros: elements.formation.querySelectorAll('[data-position="porteros"]'),
        defensa: elements.formation.querySelectorAll('[data-position="defensa"]'),
        laterales: elements.formation.querySelectorAll('[data-position="laterales"]'),
        mediocentrodefensibo: elements.formation.querySelectorAll('[data-position="mediocentrodefensibo"]'),
        mediocentros: elements.formation.querySelectorAll('[data-position="mediocentros"]'),
        mediocentroofensibo: elements.formation.querySelectorAll('[data-position="mediocentroofensibo"]'),
        extremoizquierdo: elements.formation.querySelectorAll('[data-position="extremoizquierdo"]'),
        extremoderecho: elements.formation.querySelectorAll('[data-position="extremoderecho"]'),
        delantero: elements.formation.querySelectorAll('[data-position="delantero"]')
    };
    
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
                const displayName = player.nombre.length > 10 ? player.nombre.split(' ')[0] : player.nombre.split(' ')[0];
                emptySlot.textContent = displayName;
                emptySlot.title = `${player.nombre} (€${player.finalPrice}M)`;
            }
        }
    });
}

// Mapear posición del jugador a posición de formación
function getPlayerFormationPosition(position) {
    const positionMap = {
        'POR': 'porteros',
        'DFC': 'defensa',
        'LI': 'laterales',
        'LD': 'laterales',
        'MCD': 'mediocentrodefensibo',
        'MC': 'mediocentros',
        'MCO': 'mediocentroofensibo',
        'EI': 'extremoizquierdo',
        'ED': 'extremoderecho',
        'DC': 'delantero'
    };
    
    return positionMap[position] || 'mediocentros';
}

// Iniciar siguiente subasta
function startNextAuction() {
    if (elements.auctionPanel) {
        elements.auctionPanel.style.display = 'none';
    }
    
    const nextPlayerIndex = gameState.currentPlayers.findIndex(p => !p.assigned);
    
    if (nextPlayerIndex !== -1) {
        setTimeout(() => startPlayerAuction(nextPlayerIndex), 1000);
    } else {
        checkRoundCompletion();
    }
}

// Verificar si la ronda está completa
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

// Finalizar juego
function endGame() {
    updateAuctionStatus(`🏆 ¡JUEGO COMPLETADO! Tu plantilla está lista.`);
    
    const humanSquad = gameState.players.human.squad;
    const totalSpent = INITIAL_BUDGET - gameState.players.human.budget;
    
    setTimeout(() => {
        updateAuctionStatus(`💰 Presupuesto gastado: €${totalSpent}M de €${INITIAL_BUDGET}M`);
        updateAuctionStatus(`⚽ Jugadores fichados: ${humanSquad.length}/11`);
    }, 1000);
}

// Actualizar visualización de presupuestos
function updateBudgetDisplay() {
    const humanBudget = document.getElementById('human-budget');
    const ia1Budget = document.getElementById('ia1-budget');
    const ia2Budget = document.getElementById('ia2-budget');
    const ia3Budget = document.getElementById('ia3-budget');
    
    if (humanBudget) humanBudget.textContent = `€${gameState.players.human.budget}M`;
    if (ia1Budget) ia1Budget.textContent = `€${gameState.players.ia1.budget}M`;
    if (ia2Budget) ia2Budget.textContent = `€${gameState.players.ia2.budget}M`;
    if (ia3Budget) ia3Budget.textContent = `€${gameState.players.ia3.budget}M`;
}

// Actualizar visualización de subasta - SIN BANDERAS
function updateAuctionDisplay() {
    const player = gameState.auction.currentPlayer;
    
    const auctionPosition = document.getElementById('auction-position');
    
    if (auctionPosition) auctionPosition.textContent = player.posicion;
    if (elements.currentBid) elements.currentBid.textContent = `€${gameState.auction.currentBid}M`;
}

// Obtener nombre de jugador para mostrar
function getPlayerDisplayName(player) {
    const names = {
        human: 'TÚ',
        ia1: 'IA 1',
        ia2: 'IA 2',
        ia3: 'IA 3'
    };
    return names[player] || player;
}

// NUEVA FUNCIÓN: Actualizar estado de la subasta (más visible)
function updateAuctionStatus(message) {
    if (elements.auctionStatus) {
        elements.auctionStatus.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        padding: 15px; 
                        border-radius: 10px; 
                        text-align: center; 
                        font-weight: bold; 
                        font-size: 16px; 
                        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                        margin: 10px 0;">
                ${message}
            </div>
        `;
    }
}

// NUEVA FUNCIÓN: Agregar acción de puja al historial visual
function addBiddingAction(action, player) {
    if (!elements.biddingHistory) return;
    
    const actionElement = document.createElement('div');
    actionElement.className = 'bidding-action';
    
    const playerColors = {
        human: '#28a745',
        ia1: '#007bff',
        ia2: '#fd7e14',
        ia3: '#6f42c1'
    };
    
    const color = playerColors[player] || '#6c757d';
    
    actionElement.innerHTML = `
        <div style="background-color: ${color}; 
                    color: white; 
                    padding: 8px 12px; 
                    margin: 3px 0; 
                    border-radius: 20px; 
                    font-size: 14px; 
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${action}
        </div>
    `;
    
    elements.biddingHistory.appendChild(actionElement);
    
    // Mantener solo las últimas 8 acciones
    const actions = elements.biddingHistory.children;
    if (actions.length > 8) {
        elements.biddingHistory.removeChild(actions[0]);
    }
    
    // Scroll al último elemento
    elements.biddingHistory.scrollTop = elements.biddingHistory.scrollHeight;
}

// Crear datos de ejemplo para testing
function createTestData() {
    playersData.porteros = [
        { nombre: 'Gianluigi Donnarumma', club: 'PSG', posicion: 'POR', precio: 60 },
        { nombre: 'Thibaut Courtois', club: 'Real Madrid', posicion: 'POR', precio: 65 },
        { nombre: 'Alisson Becker', club: 'Liverpool', posicion: 'POR', precio: 70 },
        { nombre: 'Jan Oblak', club: 'Atlético Madrid', posicion: 'POR', precio: 75 },
        { nombre: 'Marc-André ter Stegen', club: 'FC Barcelona', posicion: 'POR', precio: 55 }
    ];
    
    playersData.defensa = [
        { nombre: 'Virgil van Dijk', club: 'Liverpool', posicion: 'DFC', precio: 80 },
        { nombre: 'Ruben Dias', club: 'Manchester City', posicion: 'DFC', precio: 75 },
        { nombre: 'Kalidou Koulibaly', club: 'Chelsea', posicion: 'DFC', precio: 65 },
        { nombre: 'Marquinhos', club: 'PSG', posicion: 'DFC', precio: 70 },
        { nombre: 'Alessandro Bastoni', club: 'Inter Milan', posicion: 'DFC', precio: 55 }
    ];
    
    const positions = ['laterales', 'mediocentros', 'mediocentrodefensibo', 'mediocentroofensibo', 'extremoizquierdo', 'extremoderecho', 'delantero'];
    positions.forEach(pos => {
        if (playersData[pos].length === 0) {
            playersData[pos] = [
                { nombre: `Jugador ${pos} 1`, club: 'Club A', posicion: 'MC', precioTransferencia: 40 },
                { nombre: `Jugador ${pos} 2`, club: 'Club B', posicion: 'MC', precioTransferencia: 45 },
                { nombre: `Jugador ${pos} 3`, club: 'Club C', posicion: 'MC', precioTransferencia: 50 },
            ];
        }
    });
}

// Verificar si necesitamos datos de prueba
if (Object.values(playersData).every(arr => arr.length === 0)) {
    console.log('Creando datos de prueba...');
    createTestData();
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, inicializando...');
    initGame();
});
