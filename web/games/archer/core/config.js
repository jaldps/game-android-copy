// Core tuning constants. Specialists read these; only the core owner edits them.
export const CELL = 0.25;                         // world units per terrain field cell
export const FIELD = { x0: -60, y0: -14, width: 120, height: 46 }; // terrain field bounds (world units)
export const CHUNK_COLS = 60;                     // field columns per terrain mesh chunk
export const DEPTH = { front: 2.6, back: -2.6, bevel: 0.1 }; // terrain extrusion along z (actors live at z=0)

export const PHYS = {
  gravity: 24,            // world units / s^2
  maxSpeed: 54,           // launch speed at power 100 (flat range ~121, enough to cross the widest arena)
  windAccel: 0.34,        // acceleration per wind unit for a mass-1 arrow
  substep: 1 / 240,       // projectile integration step
  maxFlight: 9,           // seconds before a projectile is culled
};

export const TURN = {
  time: 20,               // seconds per turn
  walkSpeed: 3.0,         // world units / s
  stepUp: 0.55,           // max climb per step without blocking
  moveGauge: 9,           // base walking budget per turn (world units on flat ground)
  slopeCost: 1.6,         // extra gauge per unit of climb
  baseDelay: 600,         // Gunbound-style turn delay added after every turn
  moveDelay: 22,          // delay per unit walked
  idleDelay: 250,         // extra delay when the timer runs out without shooting
  chargeTime: 1.5,        // seconds for the power bar to go 0 -> 100 (scaled by drawSpeed)
  windMax: 12,
};

export const COMBAT = {
  directBonus: 1.25,      // multiplier for an arrow that strikes the body directly
  headshotBonus: 1.6,     // multiplier for a head strike (stacks with crit perks)
  falloffPow: 1.15,       // damage falloff exponent over blast radius
  maxHitFrac: 0.7,        // one hit never deals more than this share of the target's max HP, so no one-shot kills
};

export const ACTOR_RADIUS = 0.42;                 // body half-width used for walking collisions
