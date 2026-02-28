# Toy Defense

A mobile-first tower defense game set in a toy playroom. No install needed — just open the link in your phone's browser.

**[Play now →](https://marcobarreno.github.io/toy-defense/)**

---

## How to Play

1. **Select a tower** from the palette at the bottom of the screen
2. **Tap any green-highlighted cell** on the grid to place it
3. **Press Start Wave** to release enemies down the colorful path
4. **Tap a placed tower** to upgrade it or sell it for 60% back
5. Survive as many waves as you can — don't let enemies reach the exit!

Enemies enter from the **green arrow** (left) and exit at the **red arrow** (right), following the winding colorful path. Between waves you can build and upgrade freely. Killing enemies earns money; a cash bonus is awarded after each wave clears.

---

## Towers

| Tower | Cost | Damage | Range | Fire Rate | Special |
|-------|-----:|-------:|------:|----------:|---------|
| 🧱 Block | $50 | 15 | 2.5 | 1/s | Reliable all-rounder |
| 💧 Water | $75 | 8 | 2.0 | 2/s | Slows enemies 30% |
| 🎯 Sniper | $100 | 40 | 4.0 | 0.5/s | Long-range burst damage |

Each tower can be **upgraded twice**. Upgrades multiply damage (~×1.4–1.5), extend range (~×1.15–1.2), and increase fire rate (~×1.15–1.2) per tier.

| Tower | Upgrade 1 | Upgrade 2 |
|-------|----------:|----------:|
| Block | $30 | $55 |
| Water | $45 | $75 |
| Sniper | $60 | $100 |

Sell any tower for **60% of total invested**.

---

## Enemies

| Enemy | HP | Speed | Reward | Appears |
|-------|---:|------:|-------:|---------|
| Wind-up Soldier | 50 | Normal | $10 | Wave 1+ |
| Toy Car | 35 | Fast (2×) | $15 | Wave 3+ |
| Teddy Bear | 150 | Slow | $25 | Wave 5+ |
| Duck Boss | 500 | Slow | $75 | Wave 10, 20, 30… |

Enemy HP scales up **+12% per wave** on top of base values. Duck Bosses stack — wave 20 sends two.

Wave completion bonus: **$20 + (wave × $5)**.

---

## Strategy Tips

- **Place towers at bends** in the path — they get more shots per enemy as it doubles back
- **Water Guns at chokepoints** slow enemies enough for other towers to finish them off
- **Upgrade before expanding** — a level-3 Block tower outperforms two level-1 Block towers
- Save $100 before **wave 10** so you can drop a Sniper for the Duck Boss
- The Sniper's range (4 cells) can cover two parallel path segments at once

---

## Development

### Run Tests

```bash
node test.js
```

Requires Node.js 14+. The test suite (49 tests) covers path computation, wave generation, enemy behavior, tower mechanics, and projectile physics — all without a browser, using Node's `vm` module to sandbox the game's JS.

### Local Dev

```bash
python3 -m http.server 8080
# then open http://localhost:8080 on your phone or desktop browser
```

Or just open `index.html` directly — no server required.

---

## Architecture

The entire game ships as a single **`index.html`** (~1,150 lines, ~39 KB). No build step, no dependencies, no frameworks.

| Section | Responsibility |
|---------|---------------|
| `CONFIGURATION` | Tower/enemy definitions, grid size, economy constants |
| `PATH` | Waypoint list, cell-marking, coordinate conversion for enemy positions |
| `Enemy` | HP, speed, slow effect, path-progress tracking |
| `Tower` | Target acquisition, firing cooldown, upgrades, sell price |
| `Projectile` | Homing movement, hit detection, slow application on contact |
| `Particle` | Death-burst visual effects |
| `Renderer` | All canvas drawing — background, path, towers, enemies, UI hints |
| `Game` | Game loop (`requestAnimationFrame`), state machine, input handling, UI |

**Grid:** 10×16 cells. The path is defined as 11 waypoints and covers 44 cells across 45 units of travel distance, giving towers ample time to fire.

**Mobile optimizations:** `touch-action: none` on the canvas, `viewport-fit=cover` for notched phones, `100dvh` for dynamic viewport height, retina-aware canvas scaling via `devicePixelRatio`.
