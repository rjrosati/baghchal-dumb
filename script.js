// Get references to DOM elements
const boardEl   = document.getElementById('board');
const infoEl    = document.getElementById('info');
const restartEl = document.getElementById('restart');

const gridSize   = 5;
const totalGoats = 20;

let boardState   = []; // 2D array: each cell is null, 'goat', or 'tiger'
let goatsPlaced  = 0;
let goatsCaptured = 0;
let currentTurn  = 'goat'; // "goat" or "tiger"
let selectedGoat = null;  // For goat movement phase
let gameOver     = false;

// Initialize the board and game state
function initBoard() {
  // Reset state variables
  boardEl.innerHTML = '';
  boardState    = [];
  goatsPlaced   = 0;
  goatsCaptured = 0;
  currentTurn   = 'goat';
  selectedGoat  = null;
  gameOver      = false;
  restartEl.style.display = 'none';

  // Create grid cells and initialize boardState to null
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

  // Place the four tigers at the four corners
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
  updateInfo();
}

// Update the visual board to match boardState
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
      // Use emojis for pieces
      pieceEl.textContent = piece === 'goat' ? '🐐' : '🐯';
      cell.appendChild(pieceEl);
    }
  }
  // Highlight the selected goat (if any)
  if (selectedGoat) {
    const { r, c } = selectedGoat;
    const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
    if (cell) cell.classList.add('selected');
  }
}

// Update the information message (turn and phase)
function updateInfo() {
  if (gameOver) return; // Do not update info if game is over

  if (currentTurn === 'goat') {
    if (goatsPlaced < totalGoats) {
      infoEl.textContent = `Goat's turn: Place a goat (${goatsPlaced}/${totalGoats} placed)`;
    } else {
      infoEl.textContent = `Goat's turn: Select and move a goat`;
    }
  } else {
    infoEl.textContent = `Tiger's turn: AI is thinking...`;
  }
}

// Return an array of valid moves for a piece at (r, c)
// For goats: one step in any direction to an empty cell.
// For tigers: one step OR a jump (capture) move if an adjacent goat is in the way.
function getValidMoves(r, c, piece) {
  const moves = [];
  // Eight directions: up, down, left, right, and diagonals.
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
    // Check board boundaries
    if (newR < 0 || newR >= gridSize || newC < 0 || newC >= gridSize) continue;

    // Simple adjacent move (if destination is empty)
    if (boardState[newR][newC] === null) {
      moves.push({ 
        from: { r: parseInt(r), c: parseInt(c) },
        to: { r: newR, c: newC },
        capture: false 
      });
    }

    // For tigers, check for capture moves (jumping over a goat)
    if (piece === 'tiger') {
      const midR  = parseInt(r) + d.dx;
      const midC  = parseInt(c) + d.dy;
      const jumpR = parseInt(r) + 2 * d.dx;
      const jumpC = parseInt(c) + 2 * d.dy;
      // Ensure jump destination is on the board
      if (jumpR < 0 || jumpR >= gridSize || jumpC < 0 || jumpC >= gridSize) continue;
      // The adjacent cell must contain a goat and the landing cell must be empty
      if (boardState[midR][midC] === 'goat' && boardState[jumpR][jumpC] === null) {
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

// Handle clicks on board cells
function onCellClick(e) {
  if (gameOver || currentTurn !== 'goat') return;
  
  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.row);
  const c = parseInt(cell.dataset.col);

  // ----- Goat Placement Phase -----
  if (goatsPlaced < totalGoats) {
    if (boardState[r][c] !== null) return; // Cell already occupied
    boardState[r][c] = 'goat';
    goatsPlaced++;
    updateBoardUI();
    // Check win conditions in case a tiger is now trapped
    if (checkWinConditions()) return;
    // After placing a goat, switch to tiger's turn (AI move)
    currentTurn = 'tiger';
    updateInfo();
    setTimeout(tigerMove, 500);
    return;
  }

  // ----- Goat Movement Phase -----
  // If no goat is selected, try to select one.
  if (!selectedGoat) {
    if (boardState[r][c] === 'goat') {
      selectedGoat = { r, c };
      updateBoardUI();
    }
    return;
  } else {
    // If a goat is clicked again, change the selection.
    if (boardState[r][c] === 'goat') {
      selectedGoat = { r, c };
      updateBoardUI();
      return;
    }
    // Attempt to move the selected goat to the clicked empty cell.
    const validMoves = getValidMoves(selectedGoat.r, selectedGoat.c, 'goat');
    const move = validMoves.find(m => m.to.r === r && m.to.c === c);
    if (move) {
      boardState[r][c] = 'goat';
      boardState[selectedGoat.r][selectedGoat.c] = null;
      selectedGoat = null;
      updateBoardUI();
      if (checkWinConditions()) return;
      currentTurn = 'tiger';
      updateInfo();
      setTimeout(tigerMove, 500);
    }
  }
}

// Tiger (AI) move
function tigerMove() {
  if (gameOver) return;

  // Gather all valid moves for all tiger pieces
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

  // If no tiger moves exist, goats win.
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

  // Execute the chosen move.
  const { from, to, capture } = chosenMove;
  boardState[to.r][to.c] = 'tiger';
  boardState[from.r][from.c] = null;
  if (capture) {
    boardState[chosenMove.captured.r][chosenMove.captured.c] = null;
    goatsCaptured++;
  }
  updateBoardUI();

  // Check win conditions after tiger moves.
  if (checkWinConditions()) return;
  
  currentTurn = 'goat';
  updateInfo();
}

// Check if a win condition is met. Returns true if the game is over.
function checkWinConditions() {
  // Tiger wins if 5 goats have been captured.
  if (goatsCaptured >= 5) {
    gameOver = true;
    infoEl.textContent = `Tigers win! (Captured ${goatsCaptured} goats)`;
    showRestartButton();
    return true;
  }

  // Goats win if no tiger has any valid moves.
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

// Show the restart button and attach a click listener.
function showRestartButton() {
  restartEl.style.display = 'block';
  restartEl.onclick = initBoard;
}

// Initialize the game when the page loads
initBoard();
