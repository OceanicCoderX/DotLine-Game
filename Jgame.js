function goToPage(pageId) {
  const pages = document.querySelectorAll('.page');
  pages.forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  if (pageId === 'page3') renderPlayerInputs();
}

function renderPlayerInputs() {
  const num = parseInt(document.getElementById('numPlayers').value);
  const container = document.getElementById('playersInput');
  container.innerHTML = '';
  for (let i = 0; i < num; i++) {
    container.innerHTML += `
      <div>
        <input type="text" placeholder="Player ${i+1} Name" id="playerName${i}" required />
        <input type="text" placeholder="Symbol/Letter" id="playerSymbol${i}" maxlength="1" required />
      </div>
    `;
  }
}

// Add a list of colors for up to 5 players
const playerColors = ["#007bff", "#e83e8c", "#28a745", "#fd7e14", "#6f42c1"];

function startGame() {
  // Collect player info
  const num = parseInt(document.getElementById('numPlayers').value);
  players = [];
  let symbols = new Set();
  for (let i = 0; i < num; i++) {
    const name = document.getElementById(`playerName${i}`).value || `Player ${i+1}`;
    const symbol = (document.getElementById(`playerSymbol${i}`).value || String.fromCharCode(65+i)).toUpperCase();
    if (symbols.has(symbol)) {
      alert('Each player must have a unique symbol!');
      return;
    }
    symbols.add(symbol);
    players.push({ name, symbol, score: 0, color: playerColors[i % playerColors.length] }); // Assign color
  }
  numLines = Math.max(10, Math.min(50, parseInt(document.getElementById('numLines').value) || 10));
  setupGame();
  goToPage('gamePage');
}

function setupGame() {
  // Initialize game state
  const size = numLines;
  gameState = {
    size,
    hLines: Array(size+1).fill().map(()=>Array(size).fill(null)), // store player index or null
    vLines: Array(size).fill().map(()=>Array(size+1).fill(null)), // store player index or null
    boxes: Array(size).fill().map(()=>Array(size).fill(null)),
    turn: 0
  };
  currentPlayer = 0;
  drawGame();
  updateGameInfo();
}

function drawGame() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const size = gameState.size;
  const spacing = Math.min(canvas.width, canvas.height) / (size+1);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw dots
  for (let i = 0; i <= size; i++) {
    for (let j = 0; j <= size; j++) {
      ctx.beginPath();
      ctx.arc(spacing + j*spacing, spacing + i*spacing, 4, 0, 2*Math.PI);
      ctx.fillStyle = "#333";
      ctx.fill();
    }
  }

  // Draw lines with player colors
  ctx.lineWidth = 3;
  // Horizontal lines
  for (let i = 0; i <= size; i++) {
    for (let j = 0; j < size; j++) {
      const playerIdx = gameState.hLines[i][j];
      if (playerIdx !== null) {
        ctx.strokeStyle = players[playerIdx].color;
        ctx.beginPath();
        ctx.moveTo(spacing + j*spacing, spacing + i*spacing);
        ctx.lineTo(spacing + (j+1)*spacing, spacing + i*spacing);
        ctx.stroke();
      }
    }
  }
  // Vertical lines
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size; j++) {
      const playerIdx = gameState.vLines[i][j];
      if (playerIdx !== null) {
        ctx.strokeStyle = players[playerIdx].color;
        ctx.beginPath();
        ctx.moveTo(spacing + j*spacing, spacing + i*spacing);
        ctx.lineTo(spacing + j*spacing, spacing + (i+1)*spacing);
        ctx.stroke();
      }
    }
  }

  // Draw player symbols in completed boxes
  ctx.font = `${spacing/2}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (gameState.boxes[i][j] !== null) {
        ctx.fillStyle = "#222";
        ctx.fillText(players[gameState.boxes[i][j]].symbol, spacing + (j+0.5)*spacing, spacing + (i+0.5)*spacing);
      }
    }
  }
}

function updateGameInfo() {
  const info = document.getElementById('gameInfo');
  info.innerHTML = players.map((p, i) =>
    `<b style="color:${i===currentPlayer?'#007bff':'#222'}">${p.name} (${p.symbol}): ${p.score}</b>`
  ).join(' | ');
  document.getElementById('gameStatus').innerText = `${players[currentPlayer].name}'s turn (${players[currentPlayer].symbol})`;
}

function handleCanvasClick(e) {
  const canvas = document.getElementById('gameCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const size = gameState.size;
  const spacing = Math.min(canvas.width, canvas.height) / (size+1);

  // Find nearest line
  let minDist = 9999, lineType = null, lineIdx = null;
  // Horizontal lines
  for (let i = 0; i <= size; i++) {
    for (let j = 0; j < size; j++) {
      const x1 = spacing + j*spacing, y1 = spacing + i*spacing;
      const x2 = spacing + (j+1)*spacing, y2 = y1;
      const dist = pointToSegmentDist(x, y, x1, y1, x2, y2);
      if (dist < minDist && gameState.hLines[i][j] === null) {
        minDist = dist; lineType = 'h'; lineIdx = [i, j];
      }
    }
  }
  // Vertical lines
  for (let i = 0; i < size; i++) {
    for (let j = 0; j <= size; j++) {
      const x1 = spacing + j*spacing, y1 = spacing + i*spacing;
      const x2 = x1, y2 = spacing + (i+1)*spacing;
      const dist = pointToSegmentDist(x, y, x1, y1, x2, y2);
      if (dist < minDist && gameState.vLines[i][j] === null) {
        minDist = dist; lineType = 'v'; lineIdx = [i, j];
      }
    }
  }
  if (minDist > 15) return; // Only allow close clicks

  // Draw line if not already drawn
  let madeBox = false;
  if (lineType === 'h' && gameState.hLines[lineIdx[0]][lineIdx[1]] === null) {
    gameState.hLines[lineIdx[0]][lineIdx[1]] = currentPlayer;
    madeBox = checkBoxes(lineType, lineIdx[0], lineIdx[1]);
  } else if (lineType === 'v' && gameState.vLines[lineIdx[0]][lineIdx[1]] === null) {
    gameState.vLines[lineIdx[0]][lineIdx[1]] = currentPlayer;
    madeBox = checkBoxes(lineType, lineIdx[0], lineIdx[1]);
  } else {
    return;
  }
  drawGame();
  updateGameInfo();

  // Next turn logic
  if (!madeBox) {
    currentPlayer = (currentPlayer + 1) % players.length;
    updateGameInfo();
  }
  // Check for game end
  if (isGameOver()) {
    let maxScore = Math.max(...players.map(p=>p.score));
    let winners = players.filter(p=>p.score===maxScore).map(p=>p.name).join(', ');
    document.getElementById('gameStatus').innerText = `Game Over! Winner: ${winners}`;
    saveGameHistory(winners); // Save the game history
    canvas.removeEventListener('click', handleCanvasClick);
  }
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const len_sq = C * C + D * D;
  let param = -1;
  if (len_sq !== 0) param = dot / len_sq;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  const dx = px - xx, dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

function checkBoxes(type, i, j) {
  let madeBox = false;
  const size = gameState.size;
  // Check adjacent boxes
  const boxesToCheck = [];
  if (type === 'h') {
    if (i > 0) boxesToCheck.push([i-1, j]);
    if (i < size) boxesToCheck.push([i, j]);
  } else {
    if (j > 0) boxesToCheck.push([i, j-1]);
    if (j < size) boxesToCheck.push([i, j]);
  }
  boxesToCheck.forEach(([bi, bj]) => {
    if (
      bi >= 0 && bj >= 0 && bi < size && bj < size &&
      gameState.boxes[bi][bj] === null &&
      gameState.hLines[bi][bj] !== null &&
      gameState.hLines[bi+1][bj] !== null &&
      gameState.vLines[bi][bj] !== null &&
      gameState.vLines[bi][bj+1] !== null
    ) {
      gameState.boxes[bi][bj] = currentPlayer; // Store player index
      players[currentPlayer].score++;
      madeBox = true;
    }
  });
  return madeBox;
}

function isGameOver() {
  const size = gameState.size;
  for (let i = 0; i < size; i++)
    for (let j = 0; j < size; j++)
      if (gameState.boxes[i][j] === null) return false;
  return true;
}

function saveGameHistory(winners) {
  const history = JSON.parse(localStorage.getItem('dotline_history') || '[]');
  const entry = {
    date: new Date().toLocaleString(),
    players: players.map(p => ({ name: p.name, symbol: p.symbol, score: p.score })),
    winners: winners,
    size: gameState.size
  };
  history.push(entry);
  localStorage.setItem('dotline_history', JSON.stringify(history));
}

function showGameHistory() {
  const history = JSON.parse(localStorage.getItem('dotline_history') || '[]');
  let html = '<h3>Game History</h3>';
  if (history.length === 0) {
    html += '<p>No games played yet.</p>';
  } else {
    html += '<ul>';
    history.forEach(entry => {
      html += `<li>
        <b>${entry.date}</b> - Size: ${entry.size}x${entry.size} - Winner(s): ${entry.winners}<br>
        Players: ${entry.players.map(p=>`${p.name} (${p.symbol}): ${p.score}`).join(', ')}
      </li>`;
    });
    html += '</ul>';
  }
  // Show in a modal or a div
  alert(html); // For demo, use alert. You can use a modal or custom div.
}

window.onload = () => {
  goToPage('page1');
  document.getElementById('gameCanvas').addEventListener('click', handleCanvasClick);
};