(function () {
  "use strict";

  var ROWS = 24;
  var COLS = 36;
  var planner = window.GridPlanner;
  var canvas = document.getElementById("gridCanvas");
  var ctx = canvas.getContext("2d");

  var refs = {
    statusPill: document.getElementById("statusPill"),
    runBtn: document.getElementById("runBtn"),
    stepBtn: document.getElementById("stepBtn"),
    solveBtn: document.getElementById("solveBtn"),
    resetPlanBtn: document.getElementById("resetPlanBtn"),
    frameSlider: document.getElementById("frameSlider"),
    frameOutput: document.getElementById("frameOutput"),
    brushSelect: document.getElementById("brushSelect"),
    heuristicSelect: document.getElementById("heuristicSelect"),
    diagonalToggle: document.getElementById("diagonalToggle"),
    speedRange: document.getElementById("speedRange"),
    sampleBtn: document.getElementById("sampleBtn"),
    randomBtn: document.getElementById("randomBtn"),
    mazeBtn: document.getElementById("mazeBtn"),
    clearBtn: document.getElementById("clearBtn"),
    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importInput: document.getElementById("importInput"),
    cellsStat: document.getElementById("cellsStat"),
    occupiedStat: document.getElementById("occupiedStat"),
    exploredStat: document.getElementById("exploredStat"),
    costStat: document.getElementById("costStat"),
  };

  var colors = {
    page: "#f4f6ef",
    free: "#f9fbf8",
    grid: "rgba(31, 41, 38, 0.14)",
    wall: "#2b302d",
    open: "#f4c94d",
    closed: "#5f96c7",
    path: "#d85f3c",
    current: "#7d4ea3",
    start: "#0f7b6c",
    goal: "#bf472d",
    brush: "rgba(15, 123, 108, 0.24)",
  };

  var grid = createEmptyGrid();
  var start = { x: 2, y: 3 };
  var goal = { x: COLS - 3, y: ROWS - 4 };
  var mode = "wall";
  var brushSize = 1;
  var result = null;
  var frame = 0;
  var playing = false;
  var timerId = null;
  var pointerDown = false;
  var hoverCell = null;

  function createEmptyGrid() {
    var next = [];
    for (var y = 0; y < ROWS; y += 1) {
      var row = [];
      for (var x = 0; x < COLS; x += 1) {
        row.push(0);
      }
      next.push(row);
    }
    return next;
  }

  function addRect(target, x, y, width, height) {
    for (var yy = y; yy < y + height; yy += 1) {
      for (var xx = x; xx < x + width; xx += 1) {
        if (xx >= 0 && xx < COLS && yy >= 0 && yy < ROWS) {
          target[yy][xx] = 1;
        }
      }
    }
  }

  function clearEndpointCells() {
    grid[start.y][start.x] = 0;
    grid[goal.y][goal.x] = 0;
  }

  function setSampleMap() {
    grid = createEmptyGrid();
    start = { x: 2, y: 3 };
    goal = { x: 33, y: 20 };

    addRect(grid, 6, 2, 1, 17);
    addRect(grid, 11, 6, 17, 1);
    addRect(grid, 25, 9, 1, 12);
    addRect(grid, 12, 15, 10, 1);
    addRect(grid, 30, 3, 1, 11);
    addRect(grid, 16, 10, 4, 3);

    grid[10][6] = 0;
    grid[11][6] = 0;
    grid[6][18] = 0;
    grid[6][19] = 0;
    grid[16][25] = 0;
    grid[17][25] = 0;
    grid[15][20] = 0;
    grid[8][30] = 0;
    grid[9][30] = 0;
    clearEndpointCells();
    invalidatePlan("Sample map");
  }

  function setClearMap() {
    grid = createEmptyGrid();
    start = { x: 2, y: 3 };
    goal = { x: COLS - 3, y: ROWS - 4 };
    invalidatePlan("Map cleared");
  }

  function setRandomMap() {
    start = { x: 2, y: 3 };
    goal = { x: COLS - 3, y: ROWS - 4 };
    var candidate = createEmptyGrid();

    for (var attempt = 0; attempt < 35; attempt += 1) {
      candidate = createEmptyGrid();
      for (var y = 0; y < ROWS; y += 1) {
        for (var x = 0; x < COLS; x += 1) {
          var nearStart = Math.abs(x - start.x) + Math.abs(y - start.y) < 4;
          var nearGoal = Math.abs(x - goal.x) + Math.abs(y - goal.y) < 4;
          candidate[y][x] = !nearStart && !nearGoal && Math.random() < 0.27 ? 1 : 0;
        }
      }

      if (
        planner.astar(candidate, start, goal, {
          allowDiagonal: refs.diagonalToggle.checked,
          heuristic: refs.heuristicSelect.value,
        }).found
      ) {
        break;
      }
    }

    grid = candidate;
    clearEndpointCells();
    invalidatePlan("Random map");
  }

  function setMazeMap() {
    grid = createEmptyGrid();
    start = { x: 2, y: 2 };
    goal = { x: COLS - 3, y: ROWS - 3 };

    for (var x = 4; x < COLS - 3; x += 4) {
      var gapY = 2 + Math.floor(Math.random() * (ROWS - 5));
      for (var y = 1; y < ROWS - 1; y += 1) {
        if (y !== gapY && y !== gapY + 1) {
          grid[y][x] = 1;
        }
      }
    }

    for (var yy = 5; yy < ROWS - 3; yy += 5) {
      var gapX = 2 + Math.floor(Math.random() * (COLS - 5));
      for (var xx = 1; xx < COLS - 1; xx += 1) {
        if (xx !== gapX && xx !== gapX + 1) {
          grid[yy][xx] = 1;
        }
      }
    }

    clearEndpointCells();
    if (
      !planner.astar(grid, start, goal, {
        allowDiagonal: refs.diagonalToggle.checked,
        heuristic: refs.heuristicSelect.value,
      }).found
    ) {
      for (var i = 0; i < Math.min(COLS, ROWS); i += 1) {
        grid[i][i] = 0;
        if (i + 1 < COLS) {
          grid[i][i + 1] = 0;
        }
      }
    }
    clearEndpointCells();
    invalidatePlan("Maze map");
  }

  function setStatus(message, tone) {
    refs.statusPill.textContent = message;
    refs.statusPill.className = "status-pill";
    if (tone) {
      refs.statusPill.classList.add(tone);
    }
  }

  function stopRun() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
    playing = false;
    refs.runBtn.textContent = "Run";
  }

  function invalidatePlan(message) {
    stopRun();
    result = null;
    frame = 0;
    updateTimeline();
    updateStats();
    setStatus(message || "Ready");
    draw();
  }

  function computePlan() {
    stopRun();
    result = planner.astar(grid, start, goal, {
      allowDiagonal: refs.diagonalToggle.checked,
      heuristic: refs.heuristicSelect.value,
      preventCornerCutting: true,
    });
    frame = 0;
    updateTimeline();
    updateStats();
    setStatus(result.found ? "Path found" : "No path", result.found ? null : "warn");
    draw();
  }

  function ensurePlan() {
    if (!result) {
      computePlan();
    }
  }

  function maxFrame() {
    return result ? Math.max(0, result.steps.length - 1) : 0;
  }

  function updateTimeline() {
    refs.frameSlider.max = String(maxFrame());
    refs.frameSlider.value = String(frame);
    refs.frameOutput.value = frame + " / " + maxFrame();
    refs.frameOutput.textContent = frame + " / " + maxFrame();
  }

  function updateStats() {
    var occupied = 0;
    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        occupied += grid[y][x] ? 1 : 0;
      }
    }

    refs.cellsStat.textContent = String(COLS * ROWS);
    refs.occupiedStat.textContent = Math.round((occupied / (COLS * ROWS)) * 100) + "%";
    refs.exploredStat.textContent = result ? String(result.explored) : "0";
    refs.costStat.textContent = result && result.found ? result.cost.toFixed(1) : result ? "-" : "0";
  }

  function play() {
    ensurePlan();
    if (frame >= maxFrame()) {
      frame = 0;
    }

    playing = true;
    refs.runBtn.textContent = "Pause";
    schedulePlayback();
  }

  function schedulePlayback() {
    if (timerId) {
      window.clearInterval(timerId);
    }

    var delay = Math.max(24, 560 - Number(refs.speedRange.value) * 5);
    timerId = window.setInterval(function () {
      if (!playing) {
        return;
      }

      if (frame < maxFrame()) {
        frame += 1;
        updateTimeline();
        draw();
      } else {
        stopRun();
      }
    }, delay);
  }

  function getGridBox() {
    var aspect = COLS / ROWS;
    var width = canvas.width;
    var height = canvas.height;
    var boxWidth = width;
    var boxHeight = width / aspect;
    var x = 0;
    var y = 0;

    if (boxHeight > height) {
      boxHeight = height;
      boxWidth = height * aspect;
      x = (width - boxWidth) / 2;
    } else {
      y = (height - boxHeight) / 2;
    }

    return {
      x: x,
      y: y,
      width: boxWidth,
      height: boxHeight,
      cellW: boxWidth / COLS,
      cellH: boxHeight / ROWS,
    };
  }

  function resizeCanvas() {
    var rect = canvas.getBoundingClientRect();
    var ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(540, Math.floor(rect.width * ratio));
    canvas.height = Math.max(360, Math.floor(rect.height * ratio));
    draw();
  }

  function keySet(points) {
    var set = new Set();
    points.forEach(function (point) {
      set.add(planner.pointKey(point));
    });
    return set;
  }

  function drawCell(point, fill, inset) {
    var box = getGridBox();
    var gap = Math.max(0.7, Math.min(box.cellW, box.cellH) * (inset || 0.06));
    var x = box.x + point.x * box.cellW + gap;
    var y = box.y + point.y * box.cellH + gap;
    var width = Math.max(1, box.cellW - gap * 2);
    var height = Math.max(1, box.cellH - gap * 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, width, height);
  }

  function drawEndpoint(point, fill, label) {
    var box = getGridBox();
    var cx = box.x + point.x * box.cellW + box.cellW / 2;
    var cy = box.y + point.y * box.cellH + box.cellH / 2;
    var radius = Math.max(5, Math.min(box.cellW, box.cellH) * 0.36);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 " + Math.max(10, Math.floor(radius * 0.9)) + "px Inter, sans-serif";
    ctx.fillText(label, cx, cy + 0.5);
  }

  function draw() {
    if (!ctx) {
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = colors.page;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var box = getGridBox();
    ctx.fillStyle = colors.free;
    ctx.fillRect(box.x, box.y, box.width, box.height);

    var snapshot = result ? result.steps[Math.min(frame, result.steps.length - 1)] : null;
    var open = snapshot ? keySet(snapshot.open) : new Set();
    var closed = snapshot ? keySet(snapshot.closed) : new Set();
    var path = snapshot ? keySet(snapshot.path) : new Set();

    for (var y = 0; y < ROWS; y += 1) {
      for (var x = 0; x < COLS; x += 1) {
        var point = { x: x, y: y };
        var key = planner.pointKey(point);
        if (grid[y][x]) {
          drawCell(point, colors.wall, 0.05);
        } else if (path.has(key)) {
          drawCell(point, colors.path, 0.11);
        } else if (closed.has(key)) {
          drawCell(point, colors.closed, 0.12);
        } else if (open.has(key)) {
          drawCell(point, colors.open, 0.12);
        }
      }
    }

    if (snapshot && snapshot.current) {
      drawCell(snapshot.current, colors.current, 0.22);
    }

    if (hoverCell) {
      drawCell(hoverCell, colors.brush, 0.02);
    }

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var gx = 0; gx <= COLS; gx += 1) {
      var px = box.x + gx * box.cellW;
      ctx.moveTo(px, box.y);
      ctx.lineTo(px, box.y + box.height);
    }
    for (var gy = 0; gy <= ROWS; gy += 1) {
      var py = box.y + gy * box.cellH;
      ctx.moveTo(box.x, py);
      ctx.lineTo(box.x + box.width, py);
    }
    ctx.stroke();

    drawEndpoint(start, colors.start, "S");
    drawEndpoint(goal, colors.goal, "G");
  }

  function cellFromEvent(event) {
    var rect = canvas.getBoundingClientRect();
    var box = getGridBox();
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    var px = (event.clientX - rect.left) * scaleX;
    var py = (event.clientY - rect.top) * scaleY;

    if (px < box.x || py < box.y || px >= box.x + box.width || py >= box.y + box.height) {
      return null;
    }

    return {
      x: Math.min(COLS - 1, Math.max(0, Math.floor((px - box.x) / box.cellW))),
      y: Math.min(ROWS - 1, Math.max(0, Math.floor((py - box.y) / box.cellH))),
    };
  }

  function isEndpoint(point) {
    return (
      (point.x === start.x && point.y === start.y) || (point.x === goal.x && point.y === goal.y)
    );
  }

  function paintAt(cell) {
    if (!cell) {
      return;
    }

    if (mode === "start") {
      start = { x: cell.x, y: cell.y };
      clearEndpointCells();
      invalidatePlan("Start moved");
      return;
    }

    if (mode === "goal") {
      goal = { x: cell.x, y: cell.y };
      clearEndpointCells();
      invalidatePlan("Goal moved");
      return;
    }

    var offset = Math.floor(brushSize / 2);
    for (var dy = 0; dy < brushSize; dy += 1) {
      for (var dx = 0; dx < brushSize; dx += 1) {
        var point = {
          x: cell.x + dx - offset,
          y: cell.y + dy - offset,
        };
        if (!planner.inBounds(grid, point) || isEndpoint(point)) {
          continue;
        }
        grid[point.y][point.x] = mode === "wall" ? 1 : 0;
      }
    }

    invalidatePlan(mode === "wall" ? "Wall edited" : "Cell cleared");
  }

  function exportMap() {
    var payload = {
      name: "occupancy-grid-astar-map",
      rows: ROWS,
      columns: COLS,
      start: start,
      goal: goal,
      grid: grid,
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "occupancy-grid-map.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Map exported");
  }

  function importMap(file) {
    if (!file) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(String(reader.result));
        if (
          payload.rows !== ROWS ||
          payload.columns !== COLS ||
          !Array.isArray(payload.grid) ||
          payload.grid.length !== ROWS
        ) {
          throw new Error("Map dimensions must be " + COLS + " x " + ROWS + ".");
        }

        var imported = payload.grid.map(function (row) {
          if (!Array.isArray(row) || row.length !== COLS) {
            throw new Error("Map rows must be rectangular.");
          }
          return row.map(function (cell) {
            return Number(cell) > 0 ? 1 : 0;
          });
        });

        var importedStart = {
          x: Number(payload.start && payload.start.x),
          y: Number(payload.start && payload.start.y),
        };
        var importedGoal = {
          x: Number(payload.goal && payload.goal.x),
          y: Number(payload.goal && payload.goal.y),
        };

        if (
          !Number.isInteger(importedStart.x) ||
          !Number.isInteger(importedStart.y) ||
          !Number.isInteger(importedGoal.x) ||
          !Number.isInteger(importedGoal.y) ||
          !planner.inBounds(imported, importedStart) ||
          !planner.inBounds(imported, importedGoal)
        ) {
          throw new Error("Start and goal must be inside the map.");
        }

        grid = imported;
        start = importedStart;
        goal = importedGoal;
        clearEndpointCells();
        invalidatePlan("Map imported");
      } catch (error) {
        setStatus("Import failed", "error");
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    document.querySelectorAll(".tool-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        document.querySelectorAll(".tool-btn").forEach(function (item) {
          item.classList.remove("active");
        });
        button.classList.add("active");
        mode = button.dataset.mode;
      });
    });

    refs.brushSelect.addEventListener("change", function () {
      brushSize = Number(refs.brushSelect.value);
    });

    refs.heuristicSelect.addEventListener("change", function () {
      invalidatePlan("Planner changed");
    });

    refs.diagonalToggle.addEventListener("change", function () {
      invalidatePlan("Planner changed");
    });

    refs.speedRange.addEventListener("input", function () {
      if (playing) {
        schedulePlayback();
      }
    });

    refs.runBtn.addEventListener("click", function () {
      if (playing) {
        stopRun();
      } else {
        play();
      }
    });

    refs.stepBtn.addEventListener("click", function () {
      ensurePlan();
      stopRun();
      frame = Math.min(maxFrame(), frame + 1);
      updateTimeline();
      draw();
    });

    refs.solveBtn.addEventListener("click", function () {
      ensurePlan();
      stopRun();
      frame = maxFrame();
      updateTimeline();
      draw();
    });

    refs.resetPlanBtn.addEventListener("click", function () {
      invalidatePlan("Planner reset");
    });

    refs.frameSlider.addEventListener("input", function () {
      ensurePlan();
      stopRun();
      frame = Number(refs.frameSlider.value);
      updateTimeline();
      draw();
    });

    refs.sampleBtn.addEventListener("click", setSampleMap);
    refs.randomBtn.addEventListener("click", setRandomMap);
    refs.mazeBtn.addEventListener("click", setMazeMap);
    refs.clearBtn.addEventListener("click", setClearMap);
    refs.exportBtn.addEventListener("click", exportMap);
    refs.importBtn.addEventListener("click", function () {
      refs.importInput.click();
    });
    refs.importInput.addEventListener("change", function () {
      importMap(refs.importInput.files[0]);
      refs.importInput.value = "";
    });

    canvas.addEventListener("pointerdown", function (event) {
      if (event.button !== 0) {
        return;
      }
      pointerDown = true;
      canvas.setPointerCapture(event.pointerId);
      hoverCell = cellFromEvent(event);
      paintAt(hoverCell);
    });

    canvas.addEventListener("pointermove", function (event) {
      hoverCell = cellFromEvent(event);
      if (pointerDown) {
        paintAt(hoverCell);
      } else {
        draw();
      }
    });

    canvas.addEventListener("pointerup", function (event) {
      pointerDown = false;
      canvas.releasePointerCapture(event.pointerId);
    });

    canvas.addEventListener("pointerleave", function () {
      pointerDown = false;
      hoverCell = null;
      draw();
    });

    window.addEventListener("resize", resizeCanvas);
  }

  bindEvents();
  setSampleMap();
  window.requestAnimationFrame(resizeCanvas);
})();
