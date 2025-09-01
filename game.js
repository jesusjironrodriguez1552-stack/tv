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
        human: { budget: INITIAL_BUDGET, squad: [], spent: 0, boughtThisRound: false },
        ia1: { budget: INITIAL_BUDGET, squad: [], spent: 0, boughtThisRound: false },
        ia2: { budget: INITIAL_BUDGET, squad: [], spent: 0, boughtThisRound: false },
        ia3: { budget: INITIAL_BUDGET, squad: [], spent: 0, boughtThisRound: false }
    },
    currentPlayers: [],
    currentPlayerIndex: 0,
    auction: {
        active: false,
        currentPlayer: null,
        currentBid: 0,
        currentBidder: null,
        participants: ['human', 'ia1', 'ia2', 'ia3'],
        passed: new Set(),
        winningCountdown: null,
        countdownActive: false,
        aiThinking: false
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

// Función para verificar si un jugador puede participar en la subasta
function canPlayerParticipate(playerId, positionName) {
    const player = gameState.players[playerId];
    
    // Verificar si ya compró en esta posición
    const hasPositionPlayer = player.squad.some(p => {
        const playerPosition = getPlayerFormationPosition(p.posicion);
        return playerPosition === positionName;
    });
    
    if (hasPositionPlayer) {
        return false;
    }
    
    // Verificar si necesita exactamente esta posición
    const currentPositionData = POSITIONS_ORDER[gameState.currentPosition];
    const neededCount = currentPositionData.count;
    const hasCount = player.squad.filter(p => {
        const playerPosition = getPlayerFormationPosition(p.posicion);
        return playerPosition === positionName;
    }).length;
    
    return hasCount < neededCount;
}

// Inicialización
function initGame() {
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
    gameState.currentPlayerIndex = 0;
    gameState.playersNeededInPosition = POSITIONS_ORDER[0].count;
    
    // Resetear flags de compra
    Object.values(gameState.players).forEach(player => {
        player.boughtThisRound = false;
    });
    
    startNewRound();
}

function startNewRound() {
    const position = POSITIONS_ORDER[gameState.currentPosition];
    
    elements.roundTitle.textContent = `Ronda ${gameState.currentRound}: ${position.display}`;
    elements.roundSubtitle.textContent = `Selecciona ${position.count} ${position.display.toLowerCase()}`;
    
    gameState.currentPlayers = selectRandomPlayers(position.name);
    displayPlayers();
    gameState.currentPlayerIndex = 0;
    
    // Resetear flags de compra para nueva ronda
    Object.values(gameState.players).forEach(player => {
        player.boughtThisRound = false;
    });
    
    setTimeout(() => startPlayerAuction(), 1000);
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

// Sistema de subastas mejorado
function startPlayerAuction() {
    if (gameState.currentPlayerIndex >= gameState.currentPlayers.length) {
        checkRoundCompletion();
        return;
    }
    
    const player = gameState.currentPlayers[gameState.currentPlayerIndex];
    const currentPositionName = POSITIONS_ORDER[gameState.currentPosition].name;
    
    // Filtrar participantes que pueden comprar en esta posición
    const eligibleParticipants = ['human', 'ia1', 'ia2', 'ia3'].filter(playerId => 
        canPlayerParticipate(playerId, currentPositionName)
    );
    
    if (eligibleParticipants.length === 0) {
        updateAuctionStatus(`❌ Ningún jugador necesita esta posición. Saltando...`);
        setTimeout(() => continueToNextPlayer(), 2000);
        return;
    }
    
    gameState.auction = {
        active: true,
        currentPlayer: player,
        currentBid: Math.round(player.precio),
        currentBidder: null,
        participants: eligibleParticipants,
        passed: new Set(),
        winningCountdown: null,
        countdownActive: false,
        aiThinking: false
    };
    
    if (elements.auctionPanel) elements.auctionPanel.style.display = 'block';
    updateAuctionDisplay();
    updateAuctionStatus(`💰 Subasta por ${player.posicion} - Precio base: €${Math.round(player.precio)}M`);
    
    if (elements.biddingHistory) elements.biddingHistory.innerHTML = '';
    
    // Actualizar controles del humano
    updateHumanControls();
    
    // Iniciar proceso de pujas de IA
    setTimeout(() => processAIActions(), 1500);
}

function processAIActions() {
    if (!gameState.auction.active || gameState.auction.countdownActive || gameState.auction.aiThinking) {
        return;
    }
    
    const activeAIs = gameState.auction.participants.filter(p => 
        p !== 'human' && !gameState.auction.passed.has(p)
    );
    
    if (activeAIs.length === 0) {
        // Solo el humano queda o nadie queda
        const humanActive = gameState.auction.participants.includes('human') && !gameState.auction.passed.has('human');
        if (!humanActive) {
            endAuction();
        }
        return;
    }
    
    // Marcar que la IA está "pensando"
    gameState.auction.aiThinking = true;
    updateAuctionStatus(`🤖 Las IAs están evaluando...`);
    
    // Decidir qué IA va a actuar
    const actingAI = activeAIs[Math.floor(Math.random() * activeAIs.length)];
    const player = gameState.auction.currentPlayer;
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const aiBudget = gameState.players[actingAI].budget;
    
    // Calcular interés de la IA
    const baseInterest = player.precio >= 60 ? 0.6 : 0.4;
    const budgetFactor = aiBudget > 100 ? 1.1 : 0.9;
    const interest = Math.min(0.8, baseInterest * budgetFactor);
    const maxAffordable = Math.min(aiBudget, player.precio * 1.8);
    
    const shouldBid = nextBid <= maxAffordable && Math.random() < interest;
    
    setTimeout(() => {
        gameState.auction.aiThinking = false;
        
        if (shouldBid) {
            makeAIBid(actingAI);
        } else {
            makeAIPass(actingAI);
        }
    }, 1500 + Math.random() * 1500); // Tiempo de "pensamiento" variable
}

function makeAIBid(aiPlayer) {
    if (!gameState.auction.active || gameState.auction.countdownActive) return;
    
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    
    // Detener cualquier cuenta regresiva anterior
    stopWinningCountdown();
    
    gameState.auction.currentBid = nextBid;
    gameState.auction.currentBidder = aiPlayer;
    
    addBiddingAction(`${getPlayerDisplayName(aiPlayer)} puja €${nextBid}M`, aiPlayer);
    updateAuctionDisplay();
    updateHumanControls();
    
    // Iniciar cuenta regresiva solo si esta puja puede ganar
    const activeParticipants = gameState.auction.participants.filter(p => !gameState.auction.passed.has(p));
    if (activeParticipants.length > 1) {
        startWinningCountdown(aiPlayer, nextBid);
    } else {
        // Si solo queda este participante, terminar subasta inmediatamente
        endAuction();
    }
}

function makeAIPass(aiPlayer) {
    if (!gameState.auction.active) return;
    
    gameState.auction.passed.add(aiPlayer);
    addBiddingAction(`${getPlayerDisplayName(aiPlayer)} pasa`, aiPlayer);
    
    // Verificar si quedan participantes activos
    const activeParticipants = gameState.auction.participants.filter(p => !gameState.auction.passed.has(p));
    
    if (activeParticipants.length <= 1) {
        endAuction();
    } else {
        setTimeout(() => processAIActions(), 1000);
    }
}

function makeBid() {
    if (!gameState.auction.active || gameState.auction.countdownActive) return;
    
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    
    if (gameState.players.human.budget >= nextBid) {
        stopWinningCountdown();
        
        gameState.auction.currentBid = nextBid;
        gameState.auction.currentBidder = 'human';
        
        addBiddingAction(`TÚ pujas €${nextBid}M`, 'human');
        updateAuctionDisplay();
        updateHumanControls();
        
        // Verificar si quedan otros participantes activos
        const activeParticipants = gameState.auction.participants.filter(p => 
            p !== 'human' && !gameState.auction.passed.has(p)
        );
        
        if (activeParticipants.length > 0) {
            startWinningCountdown('human', nextBid);
            setTimeout(() => processAIActions(), 1000);
        } else {
            // El humano es el único participante activo
            endAuction();
        }
    }
}

function passTurn() {
    if (!gameState.auction.active) return;
    
    gameState.auction.passed.add('human');
    addBiddingAction(`TÚ pasas`, 'human');
    
    if (elements.bidBtn) elements.bidBtn.disabled = true;
    if (elements.passBtn) elements.passBtn.disabled = true;
    
    const activeParticipants = gameState.auction.participants.filter(p => 
        !gameState.auction.passed.has(p)
    );
    
    if (activeParticipants.length <= 1) {
        endAuction();
    } else {
        setTimeout(() => processAIActions(), 1000);
    }
}

function startWinningCountdown(bidder, bid) {
    if (gameState.auction.winningCountdown) {
        clearInterval(gameState.auction.winningCountdown);
    }
    
    gameState.auction.countdownActive = true;
    
    let seconds = 5;
    updateAuctionStatus(`⏰ ${getPlayerDisplayName(bidder)} ganando con €${bid}M - ${seconds}s restantes`);
    
    gameState.auction.winningCountdown = setInterval(() => {
        seconds--;
        if (seconds > 0) {
            updateAuctionStatus(`⏰ ${getPlayerDisplayName(bidder)} ganando con €${bid}M - ${seconds}s restantes`);
        } else {
            clearInterval(gameState.auction.winningCountdown);
            gameState.auction.countdownActive = false;
            endAuction();
        }
    }, 1000);
}

function stopWinningCountdown() {
    if (gameState.auction.winningCountdown) {
        clearInterval(gameState.auction.winningCountdown);
        gameState.auction.winningCountdown = null;
        gameState.auction.countdownActive = false;
    }
}

function endAuction() {
    stopWinningCountdown();
    gameState.auction.active = false;
    
    const winner = gameState.auction.currentBidder;
    const player = gameState.auction.currentPlayer;
    const finalPrice = gameState.auction.currentBid;
    
    if (winner) {
        // Actualizar presupuesto y gasto del ganador
        gameState.players[winner].budget -= finalPrice;
        gameState.players[winner].spent += finalPrice;
        gameState.players[winner].boughtThisRound = true;
        
        updateAuctionStatus(`🎉 ${getPlayerDisplayName(winner)} compra por €${finalPrice}M`);
        
        player.assigned = true;
        player.winner = winner;
        player.finalPrice = finalPrice;
        
        gameState.players[winner].squad.push(player);
        
        showPlayerReveal(player, winner, finalPrice);
        updateBudgetDisplay();
    } else {
        updateAuctionStatus(`😔 Nadie compró el jugador`);
        continueToNextPlayer();
    }
}

function showPlayerReveal(player, winner, price) {
    if (!elements.revealModal || !elements.countdown) {
        updateFormationDisplay();
        continueToNextPlayer();
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
                    <div style="font-size: 16px; opacity: 0.8;">€${price}M - ${getPlayerDisplayName(winner)}</div>
                `;
            }
            
            updateFormationDisplay();
            
            setTimeout(() => {
                elements.revealModal.style.display = 'none';
                continueToNextPlayer();
            }, 2000);
        }
    }, 1000);
}

function continueToNextPlayer() {
    if (elements.auctionPanel) elements.auctionPanel.style.display = 'none';
    
    gameState.currentPlayerIndex++;
    
    if (gameState.currentPlayerIndex >= gameState.currentPlayers.length) {
        checkRoundCompletion();
    } else {
        setTimeout(() => startPlayerAuction(), 1000);
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
    
    updateAuctionStatus(`🏆 ¡JUEGO COMPLETADO! Plantilla finalizada.`);
    
    setTimeout(() => {
        const finalStats = `
            💰 Gastaste: €${gameState.players.human.spent}M<br>
            ⚽ Fichaste: ${humanSquad.length} jugadores<br>
            💎 Mejor fichaje: ${humanSquad.length > 0 ? humanSquad.reduce((max, p) => p.finalPrice > max.finalPrice ? p : max).nombre : 'Ninguno'}
        `;
        updateAuctionStatus(finalStats);
        
        if (elements.startBtn) {
            elements.startBtn.textContent = 'Jugar de Nuevo';
            elements.startBtn.style.display = 'block';
            elements.startBtn.onclick = () => location.reload();
        }
    }, 1500);
}

function updateHumanControls() {
    if (!gameState.auction.active) {
        if (elements.bidBtn) elements.bidBtn.disabled = true;
        if (elements.passBtn) elements.passBtn.disabled = true;
        return;
    }
    
    const currentPositionName = POSITIONS_ORDER[gameState.currentPosition].name;
    const canParticipate = canPlayerParticipate('human', currentPositionName);
    const nextBid = gameState.auction.currentBid + BID_INCREMENT;
    const canAfford = gameState.players.human.budget >= nextBid;
    const hasNotPassed = !gameState.auction.passed.has('human');
    const isEligible = gameState.auction.participants.includes('human');
    
    if (elements.bidBtn) {
        const canBid = canParticipate && canAfford && hasNotPassed && isEligible && !gameState.auction.countdownActive;
        elements.bidBtn.disabled = !canBid;
        elements.bidBtn.textContent = canParticipate ? `Pujar (€${nextBid}M)` : 'Ya tienes esta posición';
        elements.bidBtn.style.opacity = canBid ? '1' : '0.5';
    }
    
    if (elements.passBtn) {
        const canPass = hasNotPassed && isEligible && !gameState.auction.countdownActive;
        elements.passBtn.disabled = !canPass;
        elements.passBtn.style.opacity = canPass ? '1' : '0.5';
    }
}

// Funciones de interfaz
function updateBudgetDisplay() {
    ['human', 'ia1', 'ia2', 'ia3'].forEach(player => {
        const budgetEl = document.getElementById(`${player}-budget`);
        if (budgetEl) {
            budgetEl.innerHTML = `€${gameState.players[player].budget}M<br><small>Gastado: €${gameState.players[player].spent}M</small>`;
        }
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
    
    const actions = elements.biddingHistory.children;
    if (actions.length > 8) {
        elements.biddingHistory.removeChild(actions[0]);
    }
    
    elements.biddingHistory.scrollTop = elements.biddingHistory.scrollHeight;
}

function updateFormationDisplay() {
    if (!elements.formation) return;
    
    const humanSquad = gameState.players.human.squad;
    const positionSlots = {};
    
    POSITIONS_ORDER.forEach(pos => {
        positionSlots[pos.name] = elements.formation.querySelectorAll(`[data-position="${pos.name}"]`);
    });
    
    Object.values(positionSlots).forEach(slots => {
        slots.forEach(slot => {
            slot.classList.remove('filled');
            slot.textContent = slot.getAttribute('data-position').substring(0, 3).toUpperCase();
        });
    });
    
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
