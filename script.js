// DOM references
const boardEl    = document.getElementById('board');
const infoEl     = document.getElementById('info');
const restartEl  = document.getElementById('restart');
const roleSelect = document.getElementById('role-selection');
const playAsGoat = document.getElementById('play-as-goat');
const playAsTiger= document.getElementById('play-as-tiger');

// Game settings
const gridSize   = 5;
const totalGoats = 20;

// Game state variables
let boardState    = []; // 2D array: each cell is null, 'goat', or 'tiger'
let goatsPlaced   = 0;
let goatsCaptured = 0;
let currentTurn   = 'goat';  // 'goat' or 'tiger'
let gameOver      = false;
let selectedPiece = null;    // For movement-phase selection
let playerRole    = null;    // Will be set to 'goat' or 'tiger'

// ============================
// Role Selection & Game Setup
// ============================
playAsGoat.addEventListener('click', () => {
  playerRole = 'goat';
  roleSelect.style.display = 'none';
  initBoard();
});
playAsTiger.addEventListener('click', () => {
  playerRole = 'tiger';
  roleSelect.style.display = 'none';
  initBoard();
});

// Restart button
restartEl.onclick = initBoard;

// ============================
// Initialize Board and State
// ============================
function initBoard() {
  boardEl.innerHTML = '';
  boardState    = [];
  goatsPlaced   = 0;
  goatsCaptured = 0;
  selectedPiece = null;
  gameOver      = false;
  
  // Standard rule: goats always move first.
  currentTurn   = 'goat';
  updateInfo();
  restartEl.style.display = 'none';

  // Create grid and initialize board state
  for (let r = 0; r < gridSize; r++) {
    boardState[r] = [];
    for (let c = 0; c < gridSize; c++) {
      boardState[r][c] = null;
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }

  // Place four tigers in the corners (these never change)
  const tigerPositions = [
    { r: 0, c: 0 },
    { r: 0, c: gridSize - 1 },
    { r: gridSize - 1, c: 0 },
    { r: gridSize - 1, c: gridSize - 1 }
  ];
  tigerPositions.forEach(pos => {
    boardState[pos.r][pos.c] = 'tiger';
  });

  updateBoardUI();

  // If goats are controlled by AI (i.e. when playerRole === 'tiger'),
  // then let the AI make the goat move first.
  if (currentTurn !== playerRole) {
    setTimeout(() => {
      if (currentTurn === 'goat') goatAIMove();
      else tigerAIMove();
    }, 500);
  }
}

// ============================
// Board UI and Info Updates
// ============================
function updateBoardUI() {
  for (let cell of boardEl.children) {
    const r = cell.dataset.row;
    const c = cell.dataset.col;
    cell.innerHTML = ''; // Clear previous content
    cell.classList.remove('selected');
    const piece = boardState[r][c];
    if (piece) {
      const pieceEl = document.createElement('div');
      pieceEl.classList.add('piece');
      // Use emojis: goat emoji for goats, tiger emoji for tigers
      pieceEl.textContent = piece === 'goat' ? '🐐' : '🐯';
      cell.appendChild(pieceEl);
    }
  }
  // Highlight selected piece if one is chosen
  if (selectedPiece) {
    const { r, c } = selectedPiece;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) cell.classList.add('selected');
  }
}

function updateInfo() {
  if (gameOver) return;
  // Determine whose turn it is and whether it’s yours or the AI’s turn.
  let turnMsg = '';
  if (currentTurn === playerRole) {
    turnMsg += `Your turn as ${capitalize(playerRole)}. `;
  } else {
    turnMsg += `AI's turn as ${capitalize(currentTurn)}. `;
  }
  // For goat phase, show placement count.
  if (currentTurn === 'goat' && goatsPlaced < totalGoats) {
    turnMsg += `Place a goat (${goatsPlaced}/${totalGoats} placed).`;
  } else if (currentTurn === 'goat') {
    turnMsg += `Select and move a goat.`;
  } else {
    turnMsg += `Select and move a tiger.`;
  }
  infoEl.textContent = turnMsg;
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// ============================
// Helper Functions for Simulation
// ============================

// Clone a board (deep copy of the 2D array)
function cloneBoard(board) {
  return board.map(row => row.slice());
}

// Modified getValidMoves accepts an optional board parameter (defaulting to boardState)
function getValidMoves(r, c, piece, board = boardState) {
  const moves = [];
  // All eight directions (vertical, horizontal, diagonal)
  const directions = [
    { dx: -1, dy:  0 },
    { dx:  1, dy:  0 },
    { dx:  0, dy: -1 },
    { dx:  0, dy:  1 },
    { dx: -1, dy: -1 },
    { dx: -1, dy:  1 },
    { dx:  1, dy: -1 },
    { dx:  1, dy:  1 }
  ];
  for (const d of directions) {
    const newR = parseInt(r) + d.dx;
    const newC = parseInt(c) + d.dy;
    // Check boundaries
    if (newR < 0 || newR >= gridSize || newC < 0 || newC >= gridSize) continue;
    // Simple move: destination must be empty
    if (board[newR][newC] === null) {
      moves.push({
        from: { r: parseInt(r), c: parseInt(c) },
        to: { r: newR, c: newC },
        capture: false
      });
    }
    // For tigers, check for capture (jump) moves:
    if (piece === 'tiger') {
      const midR  = parseInt(r) + d.dx;
      const midC  = parseInt(c) + d.dy;
      const jumpR = parseInt(r) + 2 * d.dx;
      const jumpC = parseInt(c) + 2 * d.dy;
      // Check boundaries for jump destination
      if (jumpR < 0 || jumpR >= gridSize || jumpC < 0 || jumpC >= gridSize) continue;
      // For a capture, the adjacent cell must contain a goat and the landing cell must be empty.
      if (board[midR][midC] === 'goat' && board[jumpR][jumpC] === null) {
        moves.push({
          from: { r: parseInt(r), c: parseInt(c) },
          to: { r: jumpR, c: jumpC },
          capture: true,
          captured: { r: midR, c: midC }
        });
      }
    }
  }
  return moves;
}

// Evaluate a board state by summing the number of valid moves available to all tigers.
function evaluateTigerMoves(board) {
  let count = 0;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (board[r][c] === 'tiger') {
        const moves = getValidMoves(r, c, 'tiger', board);
        count += moves.length;
      }
    }
  }
  return count;
}

// ============================
// Handle Cell Clicks (Player Moves)
// ============================
function onCellClick(e) {
  // Ignore clicks if game over or if it’s not the player's turn.
  if (gameOver || currentTurn !== playerRole) return;
  
  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);

  // ----- GOAT MOVES -----
  if (currentTurn === 'goat') {
    // Placement Phase: if not all goats have been placed, clicking an empty cell places a goat.
    if (goatsPlaced < totalGoats) {
      if (boardState[r][c] !== null) return; // must be empty
      boardState[r][c] = 'goat';
      goatsPlaced++;
      updateBoardUI();
      if (checkWinConditions()) return;
      switchTurn();
      return;
    }
    // Movement Phase:
    if (!selectedPiece) {
      // Select a goat piece if one is present in the cell.
      if (boardState[r][c] === 'goat') {
        selectedPiece = { r, c };
        updateBoardUI();
      }
      return;
    } else {
      // If clicking on another goat, change selection.
      if (boardState[r][c] === 'goat') {
        selectedPiece = { r, c };
        updateBoardUI();
        return;
      }
      // Otherwise, attempt to move the selected goat.
      const validMoves = getValidMoves(selectedPiece.r, selectedPiece.c, 'goat');
      const move = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (move) {
        boardState[r][c] = 'goat';
        boardState[selectedPiece.r][selectedPiece.c] = null;
        selectedPiece = null;
        updateBoardUI();
        if (checkWinConditions()) return;
        switchTurn();
      }
    }
  }
  
  // ----- TIGER MOVES -----
  if (currentTurn === 'tiger') {
    // There is no placement phase for tigers.
    if (!selectedPiece) {
      // Select a tiger piece if present.
      if (boardState[r][c] === 'tiger') {
        selectedPiece = { r, c };
        updateBoardUI();
      }
      return;
    } else {
      // If a tiger is clicked again, change selection.
      if (boardState[r][c] === 'tiger') {
        selectedPiece = { r, c };
        updateBoardUI();
        return;
      }
      // Attempt to move the selected tiger.
      const validMoves = getValidMoves(selectedPiece.r, selectedPiece.c, 'tiger');
      const move = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (move) {
        boardState[r][c] = 'tiger';
        boardState[selectedPiece.r][selectedPiece.c] = null;
        if (move.capture) {
          boardState[move.captured.r][move.captured.c] = null;
          goatsCaptured++;
        }
        selectedPiece = null;
        updateBoardUI();
        if (checkWinConditions()) return;
        switchTurn();
      }
    }
  }
}

// ============================
// Switch Turn and Invoke AI if Needed
// ============================
function switchTurn() {
  // Alternate turns: goats always move first in a standard game.
  currentTurn = currentTurn === 'goat' ? 'tiger' : 'goat';
  updateInfo();
  // If it is now the AI’s turn, trigger the AI move.
  if (currentTurn !== playerRole && !gameOver) {
    setTimeout(() => {
      if (currentTurn === 'goat') goatAIMove();
      else tigerAIMove();
    }, 500);
  }
}

// ============================
// Tiger AI Move (for AI-controlled tiger)
// ============================
function tigerAIMove() {
  if (gameOver) return;
  let tigerMoves = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (boardState[r][c] === 'tiger') {
        const moves = getValidMoves(r, c, 'tiger');
        if (moves.length > 0) {
          tigerMoves.push(...moves);
        }
      }
    }
  }
  if (tigerMoves.length === 0) {
    gameOver = true;
    infoEl.textContent = "Goats win! Tigers are trapped!";
    showRestartButton();
    return;
  }
  // Prefer capture moves if available.
  const captureMoves = tigerMoves.filter(move => move.capture);
  let chosenMove;
  if (captureMoves.length > 0) {
    chosenMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
  } else {
    chosenMove = tigerMoves[Math.floor(Math.random() * tigerMoves.length)];
  }
  const { from, to, capture } = chosenMove;
  boardState[to.r][to.c] = 'tiger';
  boardState[from.r][from.c] = null;
  if (capture) {
    boardState[chosenMove.captured.r][chosenMove.captured.c] = null;
    goatsCaptured++;
  }
  updateBoardUI();
  if (checkWinConditions()) return;
  switchTurn();
}

// ============================
// Improved Goat AI Move (for AI-controlled goat)
// ============================
function goatAIMove() {
  if (gameOver) return;
  
  // ---------- Placement Phase ----------
  if (goatsPlaced < totalGoats) {
    const emptyCells = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (boardState[r][c] === null) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length > 0) {
      // Evaluate each empty cell by simulating the placement
      let bestScore = Infinity;
      let bestCells = [];
      for (const cell of emptyCells) {
        const simBoard = cloneBoard(boardState);
        simBoard[cell.r][cell.c] = 'goat';
        const score = evaluateTigerMoves(simBoard);
        if (score < bestScore) {
          bestScore = score;
          bestCells = [cell];
        } else if (score === bestScore) {
          bestCells.push(cell);
        }
      }
      const chosen = bestCells[Math.floor(Math.random() * bestCells.length)];
      boardState[chosen.r][chosen.c] = 'goat';
      goatsPlaced++;
      updateBoardUI();
    }
    if (checkWinConditions()) return;
    switchTurn();
    return;
  }
  
  // ---------- Movement Phase ----------
  // Gather all possible goat moves.
  let goatMoves = [];
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (boardState[r][c] === 'goat') {
        const moves = getValidMoves(r, c, 'goat');
        if (moves.length > 0) {
          // Tag each move with its origin (for simulation)
          moves.forEach(m => m.from = { r, c });
          goatMoves.push(...moves);
        }
      }
    }
  }
  if (goatMoves.length > 0) {
    // Evaluate each goat move by simulating the move and counting tiger moves.
    let bestScore = Infinity;
    let bestMoves = [];
    for (const move of goatMoves) {
      const simBoard = cloneBoard(boardState);
      // Execute the move on the simulated board.
      simBoard[move.to.r][move.to.c] = 'goat';
      simBoard[move.from.r][move.from.c] = null;
      const score = evaluateTigerMoves(simBoard);
      if (score < bestScore) {
        bestScore = score;
        bestMoves = [move];
      } else if (score === bestScore) {
        bestMoves.push(move);
      }
    }
    const chosenMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
    boardState[chosenMove.to.r][chosenMove.to.c] = 'goat';
    boardState[chosenMove.from.r][chosenMove.from.c] = null;
    updateBoardUI();
  }
  if (checkWinConditions()) return;
  switchTurn();
}

// ============================
// Check Win Conditions
// ============================
function checkWinConditions() {
  // Tiger wins if 5 goats have been captured.
  if (goatsCaptured >= 5) {
    gameOver = true;
    infoEl.textContent = `Tigers win! (Captured ${goatsCaptured} goats)`;
    showRestartButton();
    return true;
  }
  
  // Goats win if none of the tigers can move.
  let tigerCanMove = false;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (boardState[r][c] === 'tiger') {
        const moves = getValidMoves(r, c, 'tiger');
        if (moves.length > 0) {
          tigerCanMove = true;
          break;
        }
      }
    }
    if (tigerCanMove) break;
  }
  if (!tigerCanMove) {
    gameOver = true;
    infoEl.textContent = "Goats win! Tigers are trapped!";
    showRestartButton();
    return true;
  }
  return false;
}

// ============================
// Show Restart Button
// ============================
function showRestartButton() {
  restartEl.style.display = 'block';
}

// ============================
// End of Script: Game starts after role selection.
// ============================
