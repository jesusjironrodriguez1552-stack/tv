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
    formation: document.getElementById('formation')
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
    delantero: typeof delantero !== 'undefined' ? delantero : []
};

// Inicialización del juego
function initGame() {
    console.log('Inicializando juego...');
    
    // Verificar que los elementos existen
    if (!elements.startBtn) {
        console.error('Botón de inicio no encontrado');
        return;
    }
    
    elements.startBtn.addEventListener('click', startGame);
    
    // Verificar botones de subasta
    if (elements.bidBtn) {
        console.log('Botón de puja encontrado');
        elements.bidBtn.addEventListener('click', makeBid);
        elements.bidBtn.disabled = true; // Inicialmente deshabilitado
    } else {
        console.error('Botón de puja NO encontrado');
    }
    
    if (elements.passBtn) {
        console.log('Botón de pasar encontrado');  
        elements.passBtn.addEventListener('click', passTurn);
        elements.passBtn.disabled = true; // Inicialmente deshabilitado
    } else {
        console.error('Botón de pasar NO encontrado');
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
    
    addMessage(`🏆 ¡Nueva ronda! Buscando ${position.display}...`);
    
    // Seleccionar 5 jugadores aleatorios únicos
    gameState.currentPlayers = selectRandomPlayers(position.name);
    displayPlayers();
    
    // Resetear subasta
    gameState.auction.participants = ['human', 'ia1', 'ia2', 'ia3'];
    gameState.auction.passed = new Set();
    
    // Iniciar primera subasta
    setTimeout(() => startPlayerAuction(0), 1000);
}

// Seleccionar jugadores aleatorios
function selectRandomPlayers(position) {
    const availablePlayers = [...playersData[position]];
    const selectedPlayers = [];
    
    for (let i = 0; i < PLAYERS_PER_ROUND && availablePlayers.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availablePlayers.length);
        selectedPlayers.push(availablePlayers.splice(randomIndex, 1)[0]);
    }
    
    return selectedPlayers;
}

// Mostrar jugadores en el grid
function displayPlayers() {
    if (!elements.playersGrid) return;
    
    elements.playersGrid.innerHTML = '';
    
    gameState.currentPlayers.forEach((player, index) => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.innerHTML = `
            <div class="player-flag">${player.nacionalidad}</div>
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
    
    addMessage(`💰 ¡Subasta iniciada por ${player.nacionalidad} ${player.posicion}! Precio base: €${player.precio}M`);
    
    // Comenzar el turno
    processTurn();
}

// Procesar turno de subasta
function processTurn() {
    if (!gameState.auction.active) {
        console.log('Subasta no activa');
        return;
    }
    
    const activeParticipants = gameState.auction.participants.filter(p => !gameState.auction.passed.has(p));
    console.log(`Participantes activos: ${activeParticipants.join(', ')}`);
    
    if (activeParticipants.length <= 1) {
        console.log('Solo queda 1 participante o menos, terminando subasta');
        endAuction();
        return;
    }
    
    const currentPlayer = activeParticipants[gameState.auction.turn % activeParticipants.length];
    console.log(`Turno de: ${currentPlayer}`);
    
    if (elements.currentTurn) {
        elements.currentTurn.textContent = getPlayerDisplayName(currentPlayer);
    }
    
    if (currentPlayer === 'human') {
        console.log('Es turno del jugador humano');
        enableHumanControls();
    } else {
        console.log(`Es turno de ${currentPlayer}`);
        setTimeout(() => processAITurn(currentPlayer), 1500);
    }
}

// Habilitar controles del jugador humano
function enableHumanControls() {
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const canBid = gameState.players.human.budget >= nextBid;
    
    console.log(`Turno humano - Puja actual: €${gameState.auction.currentBid}M, Siguiente: €${nextBid}M, Presupuesto: €${gameState.players.human.budget}M, Puede pujar: ${canBid}`);
    
    if (elements.bidBtn) {
        elements.bidBtn.disabled = !canBid;
        elements.bidBtn.textContent = `Pujar (€${nextBid}M)`;
        
        // Debug: forzar habilitar si hay presupuesto suficiente
        if (canBid) {
            elements.bidBtn.style.opacity = '1';
            elements.bidBtn.style.cursor = 'pointer';
        } else {
            elements.bidBtn.style.opacity = '0.5';
            elements.bidBtn.style.cursor = 'not-allowed';
            addMessage(`❌ Presupuesto insuficiente para pujar €${nextBid}M`);
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
    
    console.log(`Jugadores restantes: ${remainingPlayers.length}, Participantes activos: ${remainingParticipants.length}`);
    
    if (remainingPlayers.length >= remainingParticipants.length && remainingParticipants.length <= 2) {
        if (elements.passBtn) {
            elements.passBtn.disabled = true;
            elements.passBtn.style.opacity = '0.5';
            elements.passBtn.style.cursor = 'not-allowed';
        }
        addMessage("⚠️ No puedes pasar, debes quedarte con un jugador.");
    }
    
    addMessage(`💡 Tu turno: Presupuesto €${gameState.players.human.budget}M`);
}

// Procesar turno de IA
function processAITurn(aiPlayer) {
    const player = gameState.auction.currentPlayer;
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const aiBudget = gameState.players[aiPlayer].budget;
    
    // Calcular "interés" de la IA en el jugador
    const interest = calculateAIInterest(player, aiPlayer);
    const maxBid = Math.min(aiBudget, player.precio * interest);
    
    if (nextBid <= maxBid && Math.random() < interest) {
        // IA decide pujar
        gameState.auction.currentBid = nextBid;
        gameState.auction.currentBidder = aiPlayer;
        gameState.players[aiPlayer].budget -= BID_INCREMENT;
        
        addMessage(`🤖 ${getPlayerDisplayName(aiPlayer)} sube la puja a €${nextBid}M`);
        updateBudgetDisplay();
        updateAuctionDisplay();
        
        gameState.auction.turn++;
        setTimeout(() => processTurn(), 1000);
    } else {
        // IA pasa
        gameState.auction.passed.add(aiPlayer);
        addMessage(`🤖 ${getPlayerDisplayName(aiPlayer)} pasa`);
        
        gameState.auction.turn++;
        setTimeout(() => processTurn(), 1000);
    }
}

// Calcular interés de IA en jugador
function calculateAIInterest(player, aiPlayer) {
    let baseInterest = 0.6;
    
    // Mayor interés por jugadores más caros
    if (player.precio >= 80) baseInterest = 0.8;
    else if (player.precio >= 60) baseInterest = 0.7;
    else if (player.precio >= 40) baseInterest = 0.6;
    else baseInterest = 0.4;
    
    // Variación aleatoria por IA
    const variation = (Math.random() - 0.5) * 0.3;
    
    return Math.max(0.2, Math.min(0.9, baseInterest + variation));
}

// Jugador humano puja
function makeBid() {
    console.log('Intentando hacer puja...');
    
    if (!gameState.auction.active) {
        console.log('Subasta no activa');
        addMessage('❌ No hay subasta activa');
        return;
    }
    
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const humanBudget = gameState.players.human.budget;
    
    console.log(`Puja: €${nextBid}M, Presupuesto: €${humanBudget}M`);
    
    if (humanBudget >= nextBid) {
        gameState.auction.currentBid = nextBid;
        gameState.auction.currentBidder = 'human';
        gameState.players.human.budget = humanBudget - BID_INCREMENT;
        
        console.log(`Puja realizada. Nuevo presupuesto: €${gameState.players.human.budget}M`);
        
        addMessage(`✅ Pujaste €${nextBid}M`);
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
    } else {
        console.log('Presupuesto insuficiente');
        addMessage(`❌ No tienes suficiente presupuesto. Necesitas €${nextBid}M pero tienes €${humanBudget}M`);
    }
}

// Jugador humano pasa
function passTurn() {
    gameState.auction.passed.add('human');
    addMessage(`❌ Pasaste tu turno`);
    
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
        addMessage(`🎉 ${getPlayerDisplayName(winner)} gana la puja por €${finalPrice}M`);
        
        // Marcar jugador como asignado
        player.assigned = true;
        player.winner = winner;
        player.finalPrice = finalPrice;
        
        // Remover al ganador de los participantes
        gameState.auction.participants = gameState.auction.participants.filter(p => p !== winner);
        
        // Mostrar revelación
        showPlayerReveal(player, winner, finalPrice);
    } else {
        addMessage(`😔 Nadie quiso al jugador. Siguiente subasta...`);
        startNextAuction();
    }
}

// Mostrar revelación del jugador
function showPlayerReveal(player, winner, price) {
    if (!elements.revealModal || !elements.countdown) {
        // Si no existe el modal, agregar directamente
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
            
            // Revelar información del jugador
            elements.countdown.textContent = '🎊';
            const revealText = document.querySelector('.reveal-text');
            if (revealText) {
                revealText.innerHTML = `
                    <div style="font-size: 28px; margin: 20px 0; color: #FFD700;">${player.nombre}</div>
                    <div style="font-size: 18px; margin: 10px 0;">${player.club}</div>
                    <div style="font-size: 16px; opacity: 0.8;">€${price}M</div>
                `;
            }
            
            // Agregar a la plantilla
            addPlayerToSquad(player, winner);
            
            // Cerrar modal después de 3 segundos
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
    
    addMessage(`✨ ${getPlayerDisplayName(winner)} fichó a ${player.nombre} por €${player.finalPrice}M`, true);
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
                emptySlot.textContent = player.nombre.split(' ')[0];
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
    
    // Buscar siguiente jugador no asignado
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
        // Posición completa, pasar a la siguiente
        gameState.currentPosition++;
        
        if (gameState.currentPosition >= POSITIONS_ORDER.length) {
            endGame();
        } else {
            // Nueva posición
            gameState.currentRound++;
            gameState.playersNeededInPosition = POSITIONS_ORDER[gameState.currentPosition].count;
            setTimeout(() => startNewRound(), 2000);
        }
    } else {
        // Necesitamos más jugadores de esta posición
        gameState.currentRound++;
        setTimeout(() => startNewRound(), 2000);
    }
}

// Finalizar juego
function endGame() {
    addMessage(`🏆 ¡JUEGO COMPLETADO! Tu plantilla está lista.`, true);
    
    const humanSquad = gameState.players.human.squad;
    const totalSpent = INITIAL_BUDGET - gameState.players.human.budget;
    
    setTimeout(() => {
        addMessage(`💰 Presupuesto gastado: €${totalSpent}M de €${INITIAL_BUDGET}M`, true);
        addMessage(`⚽ Jugadores fichados: ${humanSquad.length}/11`, true);
        
        // Listar jugadores fichados
        humanSquad.forEach(player => {
            addMessage(`• ${player.nombre} (${player.club}) - €${player.finalPrice}M`);
        });
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

// Actualizar visualización de subasta
function updateAuctionDisplay() {
    const player = gameState.auction.currentPlayer;
    
    const auctionFlag = document.getElementById('auction-flag');
    const auctionPosition = document.getElementById('auction-position');
    
    if (auctionFlag) auctionFlag.textContent = player.nacionalidad;
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

// Agregar mensaje al área de mensajes
function addMessage(text, highlight = false) {
    if (!elements.messagesContainer) return;
    
    const message = document.createElement('div');
    message.className = `message ${highlight ? 'highlight' : ''}`;
    message.textContent = text;
    
    elements.messagesContainer.appendChild(message);
    
    // Mantener solo los últimos 10 mensajes
    const messages = elements.messagesContainer.children;
    if (messages.length > 10) {
        elements.messagesContainer.removeChild(messages[0]);
    }
    
    // Scroll al último mensaje
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

// Crear datos de ejemplo para testing
function createTestData() {
    playersData.porteros = [
        { nombre: 'Gianluigi Donnarumma', club: 'PSG', nacionalidad: '🇮🇹', posicion: 'POR', precio: 60 },
        { nombre: 'Thibaut Courtois', club: 'Real Madrid', nacionalidad: '🇧🇪', posicion: 'POR', precio: 65 },
        { nombre: 'Alisson Becker', club: 'Liverpool', nacionalidad: '🇧🇷', posicion: 'POR', precio: 70 },
        { nombre: 'Jan Oblak', club: 'Atlético Madrid', nacionalidad: '🇸🇮', posicion: 'POR', precio: 75 },
        { nombre: 'Marc-André ter Stegen', club: 'FC Barcelona', nacionalidad: '🇩🇪', posicion: 'POR', precio: 55 }
    ];
    
    playersData.defensa = [
        { nombre: 'Virgil van Dijk', club: 'Liverpool', nacionalidad: '🇳🇱', posicion: 'DFC', precio: 80 },
        { nombre: 'Ruben Dias', club: 'Manchester City', nacionalidad: '🇵🇹', posicion: 'DFC', precio: 75 },
        { nombre: 'Kalidou Koulibaly', club: 'Chelsea', nacionalidad: '🇸🇳', posicion: 'DFC', precio: 65 },
        { nombre: 'Marquinhos', club: 'PSG', nacionalidad: '🇧🇷', posicion: 'DFC', precio: 70 },
        { nombre: 'Alessandro Bastoni', club: 'Inter Milan', nacionalidad: '🇮🇹', posicion: 'DFC', precio: 55 }
    ];
    
    // Agregar datos para otras posiciones
    const positions = ['laterales', 'mediocentros', 'mediocentrodefensibo', 'mediocentroofensibo', 'extremoizquierdo', 'extremoderecho', 'delantero'];
    positions.forEach(pos => {
        if (playersData[pos].length === 0) {
            playersData[pos] = [
                { nombre: `Jugador ${pos} 1`, club: 'Club A', nacionalidad: '🇪🇸', posicion: 'MC', precio: 40 },
                { nombre: `Jugador ${pos} 2`, club: 'Club B', nacionalidad: '🇫🇷', posicion: 'MC', precio: 45 },
                { nombre: `Jugador ${pos} 3`, club: 'Club C', nacionalidad: '🇩🇪', posicion: 'MC', precio: 50 },
                { nombre: `Jugador ${pos} 4`, club: 'Club D', nacionalidad: '🇮🇹', posicion: 'MC', precio: 55 },
                { nombre: `Jugador ${pos} 5`, club: 'Club E', nacionalidad: '🇧🇷', posicion: 'MC', precio: 60 }
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
