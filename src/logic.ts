// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import type { Players, RuneClient } from "rune-games-sdk/multiplayer"

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------


export const TIME_PER_TURN: number = 45;  // seconds
export const MAX_MOVEMENT: number = 3;

const BOARD_SIZE: number = 25;
const BOARD_NUM_ROWS: number = 5;
const BOARD_NUM_COLUMNS: number = 5;
const INITIAL_RESOURCES: number = 1;
const INITIAL_ARMY: number = 6;
const UNUSABLE_TILE: number = 12;


export enum GameplayPhase {
  INPUT_ANY,
  INPUT_MOVEMENT,
}

export enum MinionType {
  POWER = 1,
  SPEED = 2,
  TECHNICAL = 3,
}

export enum Formation {
  POWER_SPEED_TECHNICAL = 1,
  POWER_TECHNICAL_SPEED,
  SPEED_POWER_TECHNICAL,
  SPEED_TECHNICAL_POWER,
  TECHNICAL_POWER_SPEED,
  TECHNICAL_SPEED_POWER,
}

export enum PlayerIndex {
  NONE = -1,
  PLAYER1 = 0,
  PLAYER2 = 1,
  PLAYER3 = 2,
  PLAYER4 = 3,
}

export enum CombatResult {
  LOSS = -1,
  DRAW = 0,
  WIN = 1,
}

export enum EventType {
  REQUIRE_INPUT,
  MINION_MOVING,
  MINION_MOVED,
  MINION_SPAWNED,
}


function removeItem<T>(array: Array<T>, value: T): Array<T> { 
  const index = array.indexOf(value);
  if (index > -1) {
    array.splice(index, 1);
  }
  return array;
}


// -----------------------------------------------------------------------------
// Tile State
// -----------------------------------------------------------------------------


export interface Tile {
  // adjacent: Array = []
  index: number;
  owner: PlayerIndex;
  power: number;
  speed: number;
  technical: number;
}


function newTile(index: number): Tile {
  return {
    index,
    owner: PlayerIndex.NONE,
    power: 0,
    speed: 0,
    technical: 0,
  };
}


function newSpawnTile(index: number, owner: PlayerIndex): Tile {
  return {
    index,
    owner,
    power: 1,
    speed: 1,
    technical: 1,
  };
}


// -----------------------------------------------------------------------------
// Board State
// -----------------------------------------------------------------------------

// [♥ ■ ■ ■ ♦]
// [■ ■ ■ ■ ■]
// [■ ■   ■ ■]
// [■ ■ ■ ■ ■]
// [♣ ■ ■ ■ ♠]


function newBattlefield(): Tile[] {
  return [
    // row 1
    newSpawnTile(0, PlayerIndex.PLAYER1),
    newTile(1),
    newTile(2),
    newTile(3),
    newSpawnTile(4, PlayerIndex.PLAYER3),
    // row 2
    newTile(5),
    newTile(6),
    newTile(7),
    newTile(8),
    newTile(9),
    // row 3
    newTile(10),
    newTile(11),
    newTile(12),  // unusable
    newTile(13),
    newTile(14),
    // row 4
    newTile(15),
    newTile(16),
    newTile(17),
    newTile(18),
    newTile(19),
    // row 5
    newSpawnTile(20, PlayerIndex.PLAYER4),
    newTile(21),
    newTile(22),
    newTile(23),
    newSpawnTile(24, PlayerIndex.PLAYER2),
  ];
}


// Returns whether a path from tiles `a` to `b` exists in which the player owning
// the source tile also controls all the tiles in between.
export function hasControlledPathBetween(tiles: Tile[], a: number, b: number): boolean {
  // already there?
  if (a === b) { return false }

  // out of bounds?
  if (a <= 0 || a >= tiles.length || a === UNUSABLE_TILE) { return false }
  if (b <= 0 || b >= tiles.length || b === UNUSABLE_TILE) { return false }

  // check for a path
  return canPlayerGoFromAToB(tiles, a, b);
}


function canPlayerGoFromAToB(tiles: Tile[], a: number, b: number): boolean {
  const owner: PlayerIndex = tiles[a].owner;
  const stack: number[] = [a];
  const visited: number[] = [];
  while (stack.length > 0) {
    const i: number = stack.pop() as number;
    if (i === b) { return true }
    if (visited.includes(i)) { continue }
    visited.push(i);
    const tile: Tile = tiles[i];
    if (tile.owner != owner) { continue }
    for (const k of getAdjacentTiles(i)) {
      stack.push(k);
    }
  }
  return false;
}


// Given a battlefield and a player index,
// calculate which tiles are controlled by other players
// but adjacent to tiles controlled by the given player.
export function getAttackableTiles(tiles: Tile[], p: PlayerIndex): number[] {
  const targets: number[] = [];
  for (const tile of tiles) {
    if (tile.owner != p || tile.index === UNUSABLE_TILE) { continue }
    for (const i of getAdjacentTiles(tile.index)) {
      if (targets.includes(i)) { continue }
      if (tiles[i].owner != p) {
        targets.push(i);
      }
    }
  }
  return targets;
}


// Given a battlefield and a player index,
// calculate which tiles controlled by the given player
// have adjacent tiles controlled by another player.
export function getFrontier(tiles: Tile[], p: PlayerIndex): number[] {
  const frontier: number[] = [];
  for (const tile of tiles) {
    if (tile.owner != p || tile.index === UNUSABLE_TILE) { continue }
    for (const i of getAdjacentTiles(tile.index)) {
      if (tiles[i].owner != p) {
        frontier.push(tile.index);
        break;
      }
    }
  }
  return frontier;
}


// Returns all possible adjacent tile numbers, given a tile number `i`.
// Does not perform occupancy checks, just board boundary checks.
function getAdjacentTiles(i: number): number[] {
  const maxRow = BOARD_NUM_ROWS - 1;
  const maxColumn = BOARD_NUM_COLUMNS - 1;
  if (i <= 0 || i >= BOARD_SIZE || i === UNUSABLE_TILE) { return []; }
  const adjacent: number[] = [];
  const row = (i / BOARD_NUM_COLUMNS) | 0;
  const column = i % BOARD_NUM_COLUMNS;
  if (row > 0) {
    const k = i - BOARD_NUM_COLUMNS;
    if (k != UNUSABLE_TILE) {
      adjacent.push(k);
    }
  }
  if (row < maxRow) {
    const k = i + BOARD_NUM_COLUMNS;
    if (k != UNUSABLE_TILE) {
      adjacent.push(k);
    }
  }
  if (column > 0) {
    const k = i - 1;
    if (k != UNUSABLE_TILE) {
      adjacent.push(k);
    }
  }
  if (column < maxColumn) {
    const k = i + 1;
    if (k != UNUSABLE_TILE) {
      adjacent.push(k);
    }
  }
  return adjacent;
}


// -----------------------------------------------------------------------------
// Player State
// -----------------------------------------------------------------------------


export interface PlayerState {
  id: string;
  index: PlayerIndex;
  resources: number;
  formation: Formation;
}


function newPlayerState(id: string, index: PlayerIndex): PlayerState {
  return { id, index, resources: INITIAL_RESOURCES, formation: Formation.POWER_SPEED_TECHNICAL };
}


// -----------------------------------------------------------------------------
// Game State
// -----------------------------------------------------------------------------


type EventQueue = Record<string, number>[];


export interface GameState {
  phase: GameplayPhase;
  currentPlayer: number;
  turnsTaken: number;
  timer: number;
  tiles: Tile[];
  players: PlayerState[];
  events: EventQueue;
}


export function getPlayerIndex(game: GameState, playerId: string | undefined): PlayerIndex {
  if (!playerId) { return PlayerIndex.NONE }
  for (const player of game.players) {
    if (player.id === playerId) {
      return player.index;
    }
  }
  return PlayerIndex.NONE;
}


// -----------------------------------------------------------------------------
// Game Events
// -----------------------------------------------------------------------------


export interface GameEvent {
  type: EventType;
}


export interface InputRequiredEvent extends GameEvent {
  type: EventType.REQUIRE_INPUT;
  player: number;
  error: number;
}


function emitInputRequired(events: EventQueue, player: PlayerIndex, error: number = 0): void {
  events.push({
    type: EventType.REQUIRE_INPUT,
    player,
    error,
  });
}


export interface MinionMovedEvent extends GameEvent {
  type: EventType.MINION_MOVED;
  minion: number;
  from: number;
  to: number;
}


function emitMinionMoved(events: EventQueue, minion: number, from: number, to: number): void {
  events.push({
    type: EventType.MINION_MOVED,
    minion,
    from,
    to,
  });
}


export interface MinionSpawnedEvent extends GameEvent {
  type: EventType.MINION_SPAWNED;
  minion: number;
  tile: number;
}


function emitMinionSpawned(events: EventQueue, minion: number, tile: number): void {
  events.push({
    type: EventType.MINION_SPAWNED,
    minion,
    tile,
  });
}


// -----------------------------------------------------------------------------
// Game Logic - Deploying
// -----------------------------------------------------------------------------


function validateDeployCommand(
  game: GameState,
  playerId: string,
  minion: MinionType,
  where: number
): PlayerState {
  const player: PlayerState = game.players[game.currentPlayer];
  console.log("Current player:", player.id)
  console.log("Action player:", playerId)
  console.log("Game Phase:", game.phase)
  console.log("Minion Type:", minion)
  console.log("Spawn Point:", where)
  console.log("Player Resources:", player.resources)
  // is it the player's turn?
  if (player.id != playerId) { throw Rune.invalidAction() }
  console.log("Deploy Check 1")
  // can the player issue deploy commands?
  if (game.phase != GameplayPhase.INPUT_ANY) { throw Rune.invalidAction() }
  console.log("Deploy Check 2")
  // is the tile index valid?
  const n = game.tiles.length;
  if (where < 0 || where >= n || where === UNUSABLE_TILE) { throw Rune.invalidAction() }
  console.log("Deploy Check 3")
  // does the player have enough resources?
  if (player.resources <= 0) { throw Rune.invalidAction() }
  console.log("Deploy Check 4")
  // does the player control the tile?
  const tile: Tile = game.tiles[where];
  if (tile.owner != PlayerIndex.NONE && tile.owner != player.index) { throw Rune.invalidAction() }
  console.log("Deploy Check 5")
  // return the active player
  return player;
}


function deployMinion(game: GameState, player: PlayerState, minion: MinionType, where: number): void {
  // place the minion on the battlefield
  spawnMinion(game, minion, where);
  // spend the player's resources
  player.resources--;
}


function spawnMinion(game: GameState, minion: MinionType, where: number): void {
  // place the minion on the battlefield
  const tile: Tile = game.tiles[where];
  switch (minion) {
    case MinionType.POWER:
      tile.power++;
      break;
    case MinionType.SPEED:
      tile.speed++;
      break;
    case MinionType.TECHNICAL:
      tile.technical++;
      break;
  }
  // register the minion and the event
  console.log("Minion Spawned:", minion)
  emitMinionSpawned(game.events, minion, where);
}


// -----------------------------------------------------------------------------
// Game Logic - Attacking
// -----------------------------------------------------------------------------


function validateAttackCommand(
  game: GameState,
  playerId: string,
  from: number,
  to: number
): PlayerState {
  const player: PlayerState = game.players[game.currentPlayer];
  console.log("Current player:", player.id)
  console.log("Action player:", playerId)
  console.log("Game Phase:", game.phase)
  console.log("Attacker Tile:", from)
  console.log("Defender Tile:", to)
  // is it the player's turn?
  if (player.id != playerId) { throw Rune.invalidAction() }
  console.log("Attack Check 1")
  // can the player issue attack commands?
  if (game.phase != GameplayPhase.INPUT_ANY) { throw Rune.invalidAction() }
  console.log("Attack Check 2")
  // are the tile indices valid?
  const n = game.tiles.length;
  if (from < 0 || from >= n || from === UNUSABLE_TILE) { throw Rune.invalidAction() }
  if (to < 0 || to >= n || to === UNUSABLE_TILE) { throw Rune.invalidAction() }
  console.log("Attack Check 3")
  // does the player control the attacker's tile?
  if (game.tiles[from].owner != player.index) { throw Rune.invalidAction() }
  console.log("Attack Check 4")
  // does the player not control the defender's tile?
  if (game.tiles[to].owner === player.index) { throw Rune.invalidAction() }
  console.log("Attack Check 5")
  // return the active player
  return player;
}


function attackTile(game: GameState, player: PlayerState, from: number, to: number): boolean {
  return true;
}


// -----------------------------------------------------------------------------
// Game Logic - Movement
// -----------------------------------------------------------------------------


function validateMoveCommand(
  game: GameState,
  playerId: string,
  from: number,
  to: number,
  power: number,
  speed: number,
  technical: number
): PlayerState {
  const player: PlayerState = game.players[game.currentPlayer];
  // is it the player's turn?
  if (player.id != playerId) { throw Rune.invalidAction() }
  console.log("Move Check 1")
  // can the player issue move commands?
  if (game.phase != GameplayPhase.INPUT_ANY) { throw Rune.invalidAction() }
  console.log("Move Check 2")
  // is the tile index valid?
  const n = game.tiles.length;
  if (from < 0 || from >= n || from === UNUSABLE_TILE) { throw Rune.invalidAction() }
  console.log("Move Check 3")
  // is the tile index valid?
  if (to < 0 || to >= n || to === UNUSABLE_TILE) { throw Rune.invalidAction() }
  console.log("Move Check 4")
  // does the player control the source tile?
  const source: Tile = game.tiles[from];
  if (source.owner != player.index) { throw Rune.invalidAction() }
  console.log("Move Check 5")
  // does the player control the target tile?
  const target: Tile = game.tiles[from];
  if (target.owner != target.index) { throw Rune.invalidAction() }
  console.log("Move Check 6")
  // does the source tile have minions?
  const available = source.power + source.speed + source.technical;
  if (available <= 0) { throw Rune.invalidAction() }
  console.log("Move Check 7")
  // are the minions already there?
  if (from === to) { throw Rune.invalidAction() }
  console.log("Move Check 8")
  // is the player moving any minions?
  if (power < 0 || speed < 0 || technical < 0) { throw Rune.invalidAction() }
  const total = power + speed + technical;
  if (total <= 0) { throw Rune.invalidAction() }
  console.log("Move Check 9")
  // are there enough minions on the tile?
  // is at least one left behind to defend?
  if (available <= total) { throw Rune.invalidAction() }
  console.log("Move Check 10")
  // is there a path between the given tiles?
  if (!canPlayerGoFromAToB(game.tiles, from, to)) { throw Rune.invalidAction() }
  console.log("Move Check 11")
  // return the active player
  return player;
}


// -----------------------------------------------------------------------------
// Game Logic - Combat
// -----------------------------------------------------------------------------


function resolveCombat(game: GameState, attacker: Minion, defender: Minion): CombatResult {
  // emit_signal("combat_started", _arg_minion.position, _arg_target.position)
  // emit_signal("minion_attacking", _arg_minion.position, _arg_target.position)
  // emit_signal("minion_defending", _arg_target.position, _arg_minion.position)
  const ap = attacker.power;
  const dp = defender.power;
  const ah = attacker.health;
  const dh = defender.health;
  let attackerDied = false;
  let defenderDied = false;
  // emit_signal("minion_attacked", _arg_minion.position, _arg_target.position)
  defender.health -= ap;
  // emit_signal("minion_damaged", _arg_target.position, ap)
  // emit_signal("minion_defended", _arg_target.position, _arg_minion.position)
  attacker.health -= dp;
  // emit_signal("minion_damaged", _arg_minion.position, dp)
  if (defender.health <= 0) {
    defenderDied = true;
    killMinion(game, defender);
  } else {
    // emit_signal("minion_survived", _arg_target.position)
    defender.health = dh;
  }
  if (attacker.health <= 0) {
    attackerDied = true;
    killMinion(game, attacker);
  } else {
    // emit_signal("minion_survived", _arg_minion.position)
    attacker.health = ah;
  }
  // emit_signal("combat_ended", _arg_minion.position, _arg_target.position)
  if (attackerDied) {
    return defenderDied ? CombatResult.DRAW : CombatResult.LOSS;
  } else {
    return defenderDied ? CombatResult.WIN : CombatResult.DRAW;
  }
}


// -----------------------------------------------------------------------------
// Game Logic - Miscellaneous
// -----------------------------------------------------------------------------


function swapTurns(game: GameState): void {
  // shift player index
  game.currentPlayer = (game.currentPlayer + 1) % game.players.length;
  // reset resources
  const player: PlayerState = game.players[game.currentPlayer];
  player.resources = INITIAL_RESOURCES;
}


// -----------------------------------------------------------------------------
// Game Actions
// -----------------------------------------------------------------------------

type DeployActionPayload = {
  minion: MinionType;
  where: number;
};


type AttackActionPayload = {
  from: number;
  to: number;
};


type MoveActionPayload = {
  from: number;
  to: number;
  power: number;
  speed: number;
  technical: number;
};


type GameActions = {
  deploy: (params: DeployActionPayload) => void;
  attack: (params: AttackActionPayload) => void;
  move: (params: MoveActionPayload) => void;
};


// -----------------------------------------------------------------------------
// Rune Setup
// -----------------------------------------------------------------------------


declare global {
  const Rune: RuneClient<GameState, GameActions>
}


Rune.initLogic({
  minPlayers: 1,
  maxPlayers: 2,

  setup(allPlayerIds): GameState {
    const players: PlayerState[] = [newPlayerState(allPlayerIds[0], PlayerIndex.PLAYER1)];
    if (allPlayerIds.length > 1) {
      players.push(newPlayerState(allPlayerIds[1], PlayerIndex.PLAYER2));
    } else {
      players.push(newPlayerState("AI", PlayerIndex.PLAYER2))
    }
    const game: GameState = {
      phase: GameplayPhase.INPUT_ANY,
      turnsTaken: 0,
      timer: TIME_PER_TURN,
      tiles: newBattlefield(),
      players,
      events: [],
      // minions: {},
      currentPlayer: PlayerIndex.PLAYER1,
    };
    emitInputRequired(game.events, PlayerIndex.PLAYER1);
    return game;
  },

  update: ({ game }) => {
    if (game.timer <= 0) {
      // resolveCombatPhase(game);
      game.timer = TIME_PER_TURN;
    } else {
      --game.timer;
    }
  },

  actions: {
    deploy({ minion, where }, { game, playerId }) {
      // validate inputs
      const player: PlayerState = validateDeployCommand(game, playerId, minion, where);
      // empty the event queue
      game.events = [];
      // execute the command
      deployMinion(game, player, minion, where);
      // transition to the next player, ask for new input
      // swapTurns(game);
      console.log("FIXME - swapTurn() here")
      emitInputRequired(game.events, game.currentPlayer);
    },

    attack({ from, to }, { game, playerId }) {
      const player: PlayerState = validateAttackCommand(game, playerId, from, to);
      // empty the event queue
      game.events = [];
      // execute the command
      attackTile(game, player, from, to);
      // transition to the next player, ask for new input
      // swapTurns(game);
      console.log("FIXME - swapTurn() here")
      emitInputRequired(game.events, game.currentPlayer);
    },

    move({ from, to, power, speed, technical }, { game, playerId }) {
      const player: PlayerState = validateMoveCommand(game, playerId, from, to, power, speed, technical);
      // empty the event queue
      game.events = [];
      // try to execute the command
      const success = tryMoveCommand(game, playerId, from, to);
      if (success) {
        // TODO check if there is combat available
        // transition to the next player, ask for new input
        // swapTurns(game);
        console.log("FIXME - swapTurn() here")
      } else {
        // invalidate command, ask for new input
        game.events = [];
        console.log("Failed to execute move command", from, to)
      }
      emitInputRequired(game.events, game.currentPlayer);
    },
  },

  events: {
    playerJoined() {
      // Handle player joined
    },

    playerLeft() {
      // Handle player left
    },
  },
})
