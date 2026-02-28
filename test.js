'use strict';

const fs = require('fs');
const vm = require('vm');

// ── Load game code from HTML, strip browser-only initialization ──
const html = fs.readFileSync('index.html', 'utf-8');
const [, gameScript] = html.match(/<script>([\s\S]*?)<\/script>/);
const gameCode = gameScript.replace(/\/\/ ═+\n\/\/ INITIALIZATION[\s\S]*$/, '');

// ── Minimal browser mocks (only needed for class definitions, not called) ──
const noop = () => {};
const sandbox = vm.createContext({
  console,
  process: { exit: process.exit },
  performance: { now: Date.now },
  requestAnimationFrame: noop,
  window: { devicePixelRatio: 1, innerWidth: 375, innerHeight: 812, addEventListener: noop },
  document: {
    getElementById: () => ({
      offsetHeight: 44, style: {}, classList: { add: noop, remove: noop, toggle: noop },
      textContent: '', innerHTML: '', disabled: false, dataset: {},
      addEventListener: noop, getContext: () => new Proxy({}, { get: () => noop, set: () => true }),
    }),
    querySelectorAll: () => ({ forEach: noop }),
  },
});

// Run game definitions in sandbox
vm.runInContext(gameCode, sandbox);

// ── Test suite runs entirely inside the sandbox so all game vars are in scope ──
const SUITE = `
(function() {
  cellSize = 32;
  computePath();

  var pass = 0, fail = 0;

  function test(name, fn) {
    try { fn(); console.log('  \u2713', name); pass++; }
    catch (e) { console.error('  \u2717', name + '\\n    ' + e.message); fail++; }
  }
  function eq(a, b, msg) {
    if (a !== b) throw new Error(msg || ('Expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)));
  }
  function ok(v, msg) {
    if (!v) throw new Error(msg || ('Expected truthy, got ' + v));
  }
  function near(a, b, eps) {
    eps = eps === undefined ? 0.01 : eps;
    if (Math.abs(a - b) > eps) throw new Error('Expected ~' + b + ', got ' + a);
  }

  // ────────────────────────────────────────────────
  console.log('\\nPath System');

  test('total path length is 45 cells', function() {
    eq(totalPathLength, 45);
  });

  test('path covers 44 grid cells', function() {
    eq(pathCells.size, 44);
  });

  test('entry cell (0,1) is on path', function() {
    ok(isPathCell(0, 1));
  });

  test('turn cell (7,1) is on path', function() {
    ok(isPathCell(7, 1));
  });

  test('turn cell (2,4) is on path', function() {
    ok(isPathCell(2, 4));
  });

  test('corner (0,0) is NOT on path', function() {
    ok(!isPathCell(0, 0));
  });

  test('cell (5,0) is NOT on path', function() {
    ok(!isPathCell(5, 0));
  });

  test('posAtProgress(0) is off-screen left', function() {
    var pos = posAtProgress(0);
    ok(pos.x < 0, 'x=' + pos.x + ' should be negative');
  });

  test('posAtProgress(8) lands at turn (7,1)', function() {
    var pos = posAtProgress(8);
    near(pos.x, 7.5 * cellSize);
    near(pos.y, 1.5 * cellSize);
  });

  test('posAtProgress(totalPathLength) is off-screen right', function() {
    var pos = posAtProgress(totalPathLength);
    ok(pos.x > GRID_COLS * cellSize, 'x=' + pos.x + ' should exceed right edge');
  });

  // ────────────────────────────────────────────────
  console.log('\\nWave Generation');

  test('wave 1 has only soldiers', function() {
    var wave = generateWave(1);
    ok(wave.length > 0, 'wave should not be empty');
    for (var i = 0; i < wave.length; i++) eq(wave[i].type, 'soldier');
  });

  test('wave 2 has only soldiers', function() {
    var wave = generateWave(2);
    for (var i = 0; i < wave.length; i++) eq(wave[i].type, 'soldier');
  });

  test('wave 3 introduces toy cars', function() {
    var wave = generateWave(3);
    ok(wave.some(function(e) { return e.type === 'car'; }), 'should have cars');
    ok(wave.some(function(e) { return e.type === 'soldier'; }), 'should still have soldiers');
  });

  test('wave 5 introduces teddy bears', function() {
    var wave = generateWave(5);
    ok(wave.some(function(e) { return e.type === 'bear'; }), 'should have bears');
  });

  test('wave 10 includes duck boss', function() {
    var wave = generateWave(10);
    ok(wave.some(function(e) { return e.type === 'duck'; }), 'should have a duck boss');
  });

  test('wave 11 has no duck boss', function() {
    var wave = generateWave(11);
    ok(!wave.some(function(e) { return e.type === 'duck'; }), 'no duck on wave 11');
  });

  test('wave 20 has exactly 2 duck bosses', function() {
    var wave = generateWave(20);
    eq(wave.filter(function(e) { return e.type === 'duck'; }).length, 2);
  });

  test('enemy count grows: wave1 < wave5 < wave10', function() {
    var c1 = generateWave(1).length;
    var c5 = generateWave(5).length;
    var c10 = generateWave(10).length;
    ok(c1 < c5 && c5 < c10, c1 + ' < ' + c5 + ' < ' + c10);
  });

  test('HP multiplier is 1.0 for wave 1', function() {
    eq(generateWave(1)[0].hpMul, 1.0);
  });

  test('HP multiplier increases by wave', function() {
    var m1 = generateWave(1)[0].hpMul;
    var m5 = generateWave(5)[0].hpMul;
    ok(m5 > m1, 'wave5=' + m5 + ' should exceed wave1=' + m1);
  });

  // ────────────────────────────────────────────────
  console.log('\\nEnemy Class');

  var e1 = new Enemy('soldier', 1.0);

  test('soldier starts at 50 HP', function() {
    eq(e1.hp, 50);
    eq(e1.maxHp, 50);
  });

  test('enemy starts alive at progress 0', function() {
    ok(e1.alive);
    eq(e1.progress, 0);
  });

  test('hit() reduces HP', function() {
    e1.hit(15, 0, 0);
    eq(e1.hp, 35);
  });

  test('hit() kills enemy when HP reaches 0', function() {
    e1.hit(35, 0, 0);
    eq(e1.hp, 0);
    ok(!e1.alive);
  });

  test('HP multiplier scales maxHp correctly', function() {
    var e = new Enemy('soldier', 2.0);
    eq(e.maxHp, 100);
    eq(e.hp, 100);
  });

  var e2 = new Enemy('soldier', 1.0);

  test('hit() applies slow amount and timer', function() {
    e2.hit(0, 0.3, 1.5);
    near(e2.slowAmount, 0.3);
    ok(e2.slowTimer > 0, 'slowTimer should be positive');
  });

  test('update() reduces speed by slow factor', function() {
    e2.update(0.01);
    near(e2.speed, 1.2 * 0.7, 0.01);
  });

  test('update() advances progress', function() {
    var before = e2.progress;
    e2.update(1.0);
    ok(e2.progress > before, 'progress should increase');
  });

  test('update() does nothing when enemy is dead', function() {
    var dead = new Enemy('soldier', 1.0);
    dead.alive = false;
    dead.progress = 0;
    dead.update(10.0);
    eq(dead.progress, 0);
  });

  var e3 = new Enemy('soldier', 1.0);
  e3.progress = totalPathLength - 0.1;

  test('enemy sets reachedEnd when progress exceeds path length', function() {
    e3.update(1.0);
    ok(e3.reachedEnd, 'reachedEnd should be true');
    ok(!e3.alive, 'should no longer be alive');
  });

  // ────────────────────────────────────────────────
  console.log('\\nTower Class');

  var t1 = new Tower('block', 3, 3);

  test('block tower starts at level 1 with base stats', function() {
    eq(t1.level, 1);
    eq(t1.damage, 15);
    near(t1.range, 2.5);
    near(t1.fireRate, 1.0);
  });

  test('block tower upgrade cost at level 1 is $30', function() {
    eq(t1.upgradeCost(), 30);
  });

  test('block tower sell price at level 1 is $30 (60% of $50)', function() {
    eq(t1.sellPrice(), 30);
  });

  test('upgrade() returns true and advances to level 2', function() {
    ok(t1.upgrade());
    eq(t1.level, 2);
  });

  test('damage after first upgrade: Math.round(15 * 1.5) = 23', function() {
    eq(t1.damage, 23);
  });

  test('totalCost after first upgrade is $80', function() {
    eq(t1.totalCost, 80);
  });

  test('upgrade cost at level 2 is $55', function() {
    eq(t1.upgradeCost(), 55);
  });

  test('second upgrade() reaches level 3', function() {
    ok(t1.upgrade());
    eq(t1.level, 3);
  });

  test('damage after second upgrade: Math.round(23 * 1.5) = 35', function() {
    eq(t1.damage, 35);
  });

  test('upgradeCost() returns null at max level', function() {
    ok(t1.upgradeCost() === null);
  });

  test('upgrade() returns false at max level, level unchanged', function() {
    ok(!t1.upgrade());
    eq(t1.level, 3);
  });

  test('sellPrice() after full upgrade: floor(135 * 0.6) = $81', function() {
    eq(t1.sellPrice(), 81);
  });

  test('water gun has slow factor and duration > 0', function() {
    var wt = new Tower('water', 0, 0);
    ok(wt.slowFactor > 0, 'slowFactor should be positive');
    ok(wt.slowDuration > 0, 'slowDuration should be positive');
  });

  test('rubber band sniper has greater range than block tower', function() {
    var rb = new Tower('rubber', 0, 0);
    var bl = new Tower('block', 0, 0);
    ok(rb.range > bl.range, rb.range + ' > ' + bl.range);
  });

  test('tower cx/cy are cell center pixel coords', function() {
    var t = new Tower('block', 4, 6);
    near(t.cx, 4.5 * cellSize);
    near(t.cy, 6.5 * cellSize);
  });

  // ────────────────────────────────────────────────
  console.log('\\nProjectile Class');

  var ptarget1 = new Enemy('soldier', 1.0);
  ptarget1.progress = 5;
  var tpos1 = ptarget1.pos();
  var proj1 = new Projectile(tpos1.x, tpos1.y, ptarget1, 20, '#f00', 0, 0);

  test('projectile placed on target hits immediately', function() {
    proj1.update(0.016);
    ok(!proj1.alive || ptarget1.hp < 50, 'hit should have occurred');
  });

  var ptarget2 = new Enemy('soldier', 1.0);
  ptarget2.progress = 5;
  ptarget2.alive = false;
  var proj2 = new Projectile(0, 0, ptarget2, 20, '#f00', 0, 0);

  test('projectile targeting dead enemy self-destructs', function() {
    proj2.update(0.016);
    ok(!proj2.alive, 'projectile should be dead');
  });

  var ptarget3 = new Enemy('car', 1.0);
  ptarget3.progress = 5;
  var tpos3 = ptarget3.pos();
  var proj3 = new Projectile(tpos3.x, tpos3.y, ptarget3, 5, '#00f', 0.4, 2.0);

  test('projectile applies slow on hit', function() {
    proj3.update(0.016);
    if (!proj3.alive) {
      ok(ptarget3.slowAmount > 0 || ptarget3.slowTimer > 0, 'slow should be applied after hit');
    }
  });

  var ptarget4 = new Enemy('soldier', 1.0);
  ptarget4.progress = 5;
  var tpos4 = ptarget4.pos();
  // Place projectile far away
  var proj4 = new Projectile(tpos4.x + 200, tpos4.y + 200, ptarget4, 10, '#fff', 0, 0);

  test('projectile moves toward target each frame', function() {
    var dx0 = Math.hypot(proj4.x - tpos4.x, proj4.y - tpos4.y);
    proj4.update(0.016);
    var dx1 = Math.hypot(proj4.x - ptarget4.pos().x, proj4.y - ptarget4.pos().y);
    ok(dx1 < dx0, 'distance to target should decrease');
  });

  // ────────────────────────────────────────────────
  console.log('\\n' + pass + ' passed, ' + fail + ' failed\\n');
  if (fail > 0) process.exit(1);
})();
`;

vm.runInContext(SUITE, sandbox);
