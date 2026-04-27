const assert = require("node:assert/strict");
const { astar } = require("../src/planner");

function makeGrid(width, height) {
  return Array.from({ length: height }, () => Array(width).fill(0));
}

function addVerticalWall(grid, x, gapY) {
  for (let y = 0; y < grid.length; y += 1) {
    if (y !== gapY) {
      grid[y][x] = 1;
    }
  }
}

{
  const grid = makeGrid(8, 6);
  addVerticalWall(grid, 3, 2);
  const result = astar(grid, { x: 0, y: 0 }, { x: 7, y: 5 });

  assert.equal(result.found, true);
  assert.deepEqual(result.path[0], { x: 0, y: 0 });
  assert.deepEqual(result.path[result.path.length - 1], { x: 7, y: 5 });
  assert.equal(result.path.some((point) => point.x === 3 && point.y === 2), true);
}

{
  const grid = makeGrid(4, 4);
  addVerticalWall(grid, 1, -1);
  const result = astar(grid, { x: 0, y: 0 }, { x: 3, y: 3 });

  assert.equal(result.found, false);
  assert.equal(result.reason, "no-path");
}

{
  const grid = makeGrid(2, 2);
  grid[0][1] = 1;
  grid[1][0] = 1;

  const blockedCorner = astar(grid, { x: 0, y: 0 }, { x: 1, y: 1 }, { allowDiagonal: true });
  const openCorner = astar(grid, { x: 0, y: 0 }, { x: 1, y: 1 }, {
    allowDiagonal: true,
    preventCornerCutting: false,
  });

  assert.equal(blockedCorner.found, false);
  assert.equal(openCorner.found, true);
}

{
  const grid = makeGrid(3, 3);
  grid[0][0] = 1;
  const result = astar(grid, { x: 0, y: 0 }, { x: 2, y: 2 });

  assert.equal(result.found, false);
  assert.equal(result.reason, "start-or-goal-blocked");
}

console.log("Planner tests passed.");
