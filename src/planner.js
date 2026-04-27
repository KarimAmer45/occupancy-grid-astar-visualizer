(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GridPlanner = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var CARDINAL_COST = 10;
  var DIAGONAL_COST = 14;

  function pointKey(point) {
    return point.x + "," + point.y;
  }

  function parseKey(key) {
    var parts = key.split(",");
    return { x: Number(parts[0]), y: Number(parts[1]) };
  }

  function samePoint(a, b) {
    return a.x === b.x && a.y === b.y;
  }

  function inBounds(grid, point) {
    return (
      point.y >= 0 &&
      point.y < grid.length &&
      point.x >= 0 &&
      grid.length > 0 &&
      point.x < grid[0].length
    );
  }

  function isBlocked(grid, point) {
    return !inBounds(grid, point) || Number(grid[point.y][point.x]) > 0;
  }

  function assertGrid(grid) {
    if (!Array.isArray(grid) || grid.length === 0 || !Array.isArray(grid[0])) {
      throw new Error("Grid must be a non-empty 2D array.");
    }

    var width = grid[0].length;
    if (width === 0) {
      throw new Error("Grid rows must not be empty.");
    }

    for (var y = 1; y < grid.length; y += 1) {
      if (!Array.isArray(grid[y]) || grid[y].length !== width) {
        throw new Error("Grid must be rectangular.");
      }
    }
  }

  function heuristic(a, b, type, allowDiagonal) {
    var dx = Math.abs(a.x - b.x);
    var dy = Math.abs(a.y - b.y);

    if (type === "euclidean") {
      return Math.round(Math.sqrt(dx * dx + dy * dy) * CARDINAL_COST);
    }

    if (type === "chebyshev") {
      return Math.max(dx, dy) * CARDINAL_COST;
    }

    if (allowDiagonal) {
      return DIAGONAL_COST * Math.min(dx, dy) + CARDINAL_COST * Math.abs(dx - dy);
    }

    return (dx + dy) * CARDINAL_COST;
  }

  function reconstructPath(nodes, key) {
    var path = [];
    var cursor = key;

    while (cursor) {
      var node = nodes.get(cursor);
      if (!node) {
        break;
      }
      path.push({ x: node.point.x, y: node.point.y });
      cursor = node.parent;
    }

    path.reverse();
    return path;
  }

  function makeSnapshot(nodes, open, closed, currentKey) {
    return {
      current: currentKey ? parseKey(currentKey) : null,
      open: Array.from(open).map(parseKey),
      closed: Array.from(closed).map(parseKey),
      path: currentKey ? reconstructPath(nodes, currentKey) : [],
    };
  }

  function findBestOpenKey(open, nodes) {
    var bestKey = null;
    var bestNode = null;

    open.forEach(function (key) {
      var node = nodes.get(key);
      if (
        !bestNode ||
        node.f < bestNode.f ||
        (node.f === bestNode.f && node.h < bestNode.h) ||
        (node.f === bestNode.f && node.h === bestNode.h && node.g > bestNode.g)
      ) {
        bestNode = node;
        bestKey = key;
      }
    });

    return bestKey;
  }

  function getNeighbors(grid, point, options) {
    var directions = [
      { x: 1, y: 0, cost: CARDINAL_COST },
      { x: -1, y: 0, cost: CARDINAL_COST },
      { x: 0, y: 1, cost: CARDINAL_COST },
      { x: 0, y: -1, cost: CARDINAL_COST },
    ];

    if (options.allowDiagonal) {
      directions.push(
        { x: 1, y: 1, cost: DIAGONAL_COST },
        { x: 1, y: -1, cost: DIAGONAL_COST },
        { x: -1, y: 1, cost: DIAGONAL_COST },
        { x: -1, y: -1, cost: DIAGONAL_COST }
      );
    }

    var neighbors = [];

    directions.forEach(function (direction) {
      var next = { x: point.x + direction.x, y: point.y + direction.y };
      if (isBlocked(grid, next)) {
        return;
      }

      if (
        options.allowDiagonal &&
        options.preventCornerCutting &&
        direction.x !== 0 &&
        direction.y !== 0
      ) {
        var sideA = { x: point.x + direction.x, y: point.y };
        var sideB = { x: point.x, y: point.y + direction.y };
        if (isBlocked(grid, sideA) || isBlocked(grid, sideB)) {
          return;
        }
      }

      neighbors.push({
        point: next,
        cost: direction.cost,
      });
    });

    return neighbors;
  }

  function astar(grid, start, goal, options) {
    assertGrid(grid);

    var config = {
      allowDiagonal: Boolean(options && options.allowDiagonal),
      heuristic: options && options.heuristic ? options.heuristic : "grid",
      preventCornerCutting: !options || options.preventCornerCutting !== false,
      maxIterations: options && options.maxIterations ? options.maxIterations : 100000,
    };

    if (!inBounds(grid, start) || !inBounds(grid, goal)) {
      return {
        found: false,
        reason: "start-or-goal-out-of-bounds",
        path: [],
        steps: [],
        open: [],
        closed: [],
        explored: 0,
        visited: 0,
        cost: 0,
      };
    }

    if (isBlocked(grid, start) || isBlocked(grid, goal)) {
      return {
        found: false,
        reason: "start-or-goal-blocked",
        path: [],
        steps: [],
        open: [],
        closed: [],
        explored: 0,
        visited: 0,
        cost: 0,
      };
    }

    if (samePoint(start, goal)) {
      return {
        found: true,
        reason: "start-is-goal",
        path: [{ x: start.x, y: start.y }],
        steps: [
          {
            current: { x: start.x, y: start.y },
            open: [],
            closed: [{ x: start.x, y: start.y }],
            path: [{ x: start.x, y: start.y }],
          },
        ],
        open: [],
        closed: [{ x: start.x, y: start.y }],
        explored: 1,
        visited: 1,
        cost: 0,
      };
    }

    var startKey = pointKey(start);
    var goalKey = pointKey(goal);
    var nodes = new Map();
    var open = new Set([startKey]);
    var closed = new Set();
    var steps = [makeSnapshot(nodes, open, closed, null)];
    var startH = heuristic(start, goal, config.heuristic, config.allowDiagonal);

    nodes.set(startKey, {
      point: { x: start.x, y: start.y },
      g: 0,
      h: startH,
      f: startH,
      parent: null,
    });

    var iterations = 0;

    while (open.size > 0 && iterations < config.maxIterations) {
      iterations += 1;
      var currentKey = findBestOpenKey(open, nodes);
      var currentNode = nodes.get(currentKey);

      open.delete(currentKey);
      closed.add(currentKey);

      if (currentKey === goalKey) {
        var finalPath = reconstructPath(nodes, goalKey);
        steps.push(makeSnapshot(nodes, open, closed, currentKey));
        return {
          found: true,
          reason: "path-found",
          path: finalPath,
          steps: steps,
          open: Array.from(open).map(parseKey),
          closed: Array.from(closed).map(parseKey),
          explored: closed.size,
          visited: nodes.size,
          cost: nodes.get(goalKey).g / CARDINAL_COST,
        };
      }

      getNeighbors(grid, currentNode.point, config).forEach(function (neighbor) {
        var neighborKey = pointKey(neighbor.point);
        if (closed.has(neighborKey)) {
          return;
        }

        var tentativeG = currentNode.g + neighbor.cost;
        var existing = nodes.get(neighborKey);

        if (!existing || tentativeG < existing.g) {
          var h = heuristic(neighbor.point, goal, config.heuristic, config.allowDiagonal);
          nodes.set(neighborKey, {
            point: { x: neighbor.point.x, y: neighbor.point.y },
            g: tentativeG,
            h: h,
            f: tentativeG + h,
            parent: currentKey,
          });
          open.add(neighborKey);
        }
      });

      steps.push(makeSnapshot(nodes, open, closed, currentKey));
    }

    return {
      found: false,
      reason: iterations >= config.maxIterations ? "max-iterations" : "no-path",
      path: [],
      steps: steps,
      open: Array.from(open).map(parseKey),
      closed: Array.from(closed).map(parseKey),
      explored: closed.size,
      visited: nodes.size,
      cost: 0,
    };
  }

  return {
    astar: astar,
    pointKey: pointKey,
    parseKey: parseKey,
    inBounds: inBounds,
    isBlocked: isBlocked,
  };
});
