// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import type { Players, RuneClient } from "rune-games-sdk/multiplayer"

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------


export const TIME_PER_TURN: number = 45;  // seconds
export const MAX_MOVEMENT: number = 3;

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


// Builds a path from tiles `i` to `j` in a given `battlefield`, with length <= `n`.
// Assumes there is at most one possible path.
// Assumes valid tile indices.
// Returns an empty array if there is no possible path.
export function getPath(i: number, j: number, n: number): number[] {
  // const paths: Record<number, number[]> = getPaths(battlefield, i, n);
  // return paths[j] || [];

  // already there?
  if (i === j) { return [] }
  const rowA = (i / BOARD_NUM_COLUMNS) | 0;
  const colA = i % BOARD_NUM_COLUMNS;
  const rowB = (j / BOARD_NUM_COLUMNS) | 0;
  const colB = j % BOARD_NUM_COLUMNS;
  // too far away?
  if (Math.abs(rowB - rowA) + Math.abs(colB - colA) > n) { return [] }

  let k = i;
  let row = rowA;
  let col = colA;
  const path: number[] = [];
  for (; n > 0; n--) {
    // figure out in which direction to move
    if (rowB < row) {
      k -= BOARD_NUM_COLUMNS;
    } else if (rowB > row) {
      k += BOARD_NUM_COLUMNS;
    } else if (colB < col) {
      k--;
    } else if (colB > col) {
      k++;
    }
    // is the new tile traversable?
    if (k === UNUSABLE_TILE) { return [] }
    // if (!!tile.minion) { return [] }
    path.push(k);
    // have we reached the target?
    if (k === j) { return path }
    row = (k / BOARD_NUM_COLUMNS) | 0;
    col = k % BOARD_NUM_COLUMNS;
  }
  // end of loop, did not reach target
  return [];
}


// Builds a path from tiles `i` to `j` in a given `battlefield`, with length <= `n`.
// Assumes there is at most one possible path.
// Assumes valid tile indices.
// Returns an empty array if there is no possible path.
// Also returns an empty array if there are minions along the path.
export function getFreePath(tiles: Tile[], i: number, j: number, n: number): number[] {
  const path: number[] = getPath(i, j, n);
  for (const k of path) {
    const tile: Tile = tiles[k];
    if (!!tile.power || !!tile.speed || !!tile.technical) { return [] }
  }
  return path;
}


// Given a `battlefield`, a tile number `i` and a movement capacity `n`,
// calculate which tiles are reachable from `i`.
export function getReach(tiles: Tile[], i: number, n: number): number[] {
  if (n <= 0) { return [] }
  let reachable: number[] = [i];
  buildReach(tiles, reachable, i, n);
  removeItem(reachable, i);
  return reachable;
}


function buildReach(tiles: Tile[], reach: number[], i: number, n: number): void {
  if (n <= 0) { return }
  const adjacent: number[] = getAdjacentTiles(tiles, i);
  for (const k of adjacent) {
    // already visited?
    if (reach.includes(k)) { continue }
    const tile: Tile = tiles[k];
    // is this tile pathable?
    if (k == UNUSABLE_TILE) { continue }
    // is it already occupied?
    if (!!tile.power || !!tile.speed || !!tile.technical) { continue }
    // reachable, keep going
    reach.push(k);
    buildReach(tiles, reach, k, n-1);
  }
}


// Returns all possible adjacent tile numbers,
// given a `battlefield` and a tile number `i`.
// Does not perform occupancy checks, just board boundary checks.
function getAdjacentTiles(tiles: Tile[], i: number): number[] {
  const n = tiles.length;
  const rows = (n / BOARD_NUM_COLUMNS) | 0;
  const maxRow = rows - 1;
  const maxColumn = BOARD_NUM_COLUMNS - 1;
  if (i <= 0 || i >= n) { return []; }
  const adjacent: number[] = [];
  const row = (i / BOARD_NUM_COLUMNS) | 0;
  const column = i % BOARD_NUM_COLUMNS;
  if (row > 0) {
    adjacent.push(i - BOARD_NUM_COLUMNS);
  }
  if (row < maxRow) {
    adjacent.push(i + BOARD_NUM_COLUMNS);
  }
  if (column > 0) {
    adjacent.push(i - 1);
  }
  if (column < maxColumn) {
    adjacent.push(i + 1);
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
// Game Logic - Spawning
// -----------------------------------------------------------------------------


function trySpawnCommand(
  game: GameState,
  playerId: string,
  minion: MinionType,
  where: number
): boolean {
  const player: PlayerState = game.players[game.currentPlayer];
  console.log("Current player:", player.id)
  console.log("Action player:", playerId)
  console.log("Game Phase:", game.phase)
  console.log("Minion Type:", minion)
  console.log("Spawn Point:", where)
  // is it the player's turn?
  if (player.id != playerId) { return false }
  console.log("Check 1")
  // can the player issue spawn commands?
  if (game.phase != GameplayPhase.INPUT_ANY) { return false }
  console.log("Check 2")
  // is the tile index valid?
  const n = game.tiles.length;
  if (where < 0 || where >= n || where === UNUSABLE_TILE) { return false }
  console.log("Check 3")
  // does the player control the tile?
  if (game.tiles[where].owner != player.index) { return false }
  console.log("Check 4")
  // try to spawn the minion
  return trySpawnMinion(game, player, minion, where);
}


function trySpawnMinion(
  game: GameState,
  player: PlayerState,
  minion: MinionType,
  where: number
): boolean {
  console.log("Player Resources:", player.resources)
  // does the player have enough resources?
  if (player.resources <= 0) { return false }
  // can this player spawn minions on this tile?
  const tile: Tile = game.tiles[where];
  if (tile.owner != PlayerIndex.NONE && tile.owner != player.index) { return false }
  // try to place the minion on the battlefield
  if (!placeMinionOnBattlefield(game, minion, where, true)) { return false }
  console.log("Minion Spawned:", minion)
  // register the minion and the event
  player.resources--;
  emitMinionSpawned(game.events, minion, where);
  return true;
}


function placeMinionOnBattlefield(
  game: GameState,
  minion: Minion,
  at: number,
  spawn: boolean = false
): boolean {
  if (minion == null) { return false }
  // is the tile free?
  const tile: Tile = game.battlefield.tiles[at];
  console.log("Tile occupied?", !!tile.minion)
  if (!!tile.minion) { return false }
  // is a spawn point required?
  if (spawn) {
    console.log("Spawn Point?", tile.type === TileType.SPAWN)
    console.log("Tile owner:", tile.owner)
    console.log("Minion owner:", minion.owner)
    // is the tile a spawn point?
    if (tile.type != TileType.SPAWN) { return false }
    // is the spawn point owned by the same player?
    if (tile.owner != minion.owner) { return false }
  }
  const uid = minion.uid;
  tile.minion = uid;
  // minion.location = BoardLocation.BATTLEFIELD;
  minion.position = at;
  // emitMinionEnteredBattlefield(game, uid, tile);
  return true;
}


// -----------------------------------------------------------------------------
// Game Logic - Movement
// -----------------------------------------------------------------------------


function tryMoveCommand(game: GameState, playerId: string, from: number, to: number): boolean {
  const player: PlayerState = game.players[game.currentPlayer];
  // is it the player's turn?
  if (player.id != playerId) { return false }
  console.log("Move Check 1")
  // can the player issue spawn commands?
  if (game.phase != GameplayPhase.INPUT_ANY) { return false }
  console.log("Move Check 2")
  // is the tile index valid?
  const n = game.battlefield.tiles.length;
  if (from < 0 || from >= n) { return false }
  console.log("Move Check 3")
  // is the tile index valid?
  if (to < 0 || to >= n) { return false }
  console.log("Move Check 4")
  // does the origin tile have a minion?
  const tile: Tile = game.battlefield.tiles[from];
  if (!tile.minion) { return false }
  console.log("Move Check 5")
  // does the player control this minion?
  const minion: Minion = game.battlefield.minions[tile.minion];
  if (minion.owner != player.index) { return false }
  console.log("Move Check 6")
  // try to attack-move to the destination tile
  return tryAttackMove(game, minion, to);
}


function tryAttackMove(game: GameState, minion: Minion, to: number): boolean {
  const from: number = minion.position;
  // is it already there?
  if (from === to) { return true }
  // is there a path between the given tiles?
  const path: number[] = getPath(game.battlefield, from, to, minion.movement);
  if (path.length === 0) { return false }
  // are there minions along the way (excluding the last tile)?
  for (let i = path.length - 2; i >= 0; i--) {
    const k = path[i];
    const tile: Tile = game.battlefield.tiles[k];
    // TODO flying minions must use a different logic
    if (!!tile.minion) { return false }
  }
  // is the destination tile occupied?
  const tile: Tile = game.battlefield.tiles[to];
  if (!!tile.minion) {
    // is it friend or foe?
    const other: Minion = game.battlefield.minions[tile.minion];
    // cannot overlap with friendly minions
    if (minion.owner === other.owner) { return false }
    // move to the tile just before the enemy
    // `getPath()` ensures that there is a traversable path
    path.pop();
    moveAlongPath(game, from, path);
    // resolve combat
    // TODO
  } else {
    // move the minion to the desired spot
    // `getPath()` ensures that there is a traversable path
    moveAlongPath(game, from, path);
  }
  return true;
}


function moveAlongPath(game: GameState, i: number, path: number[]): void {
  let j = i;
  const tiles = game.battlefield.tiles;
  const uid = tiles[i].minion;
  const minion = game.battlefield.minions[uid];
  for (const k of path) {
    // emitMinionMoving(game, uid, j, k);
    tiles[j].minion = 0;
    tiles[k].minion = uid;
    minion.position = k;
    emitMinionMoved(game.events, uid, j, k);
    j = k;
  }
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


function addToBench(player: PlayerState, species: MinionData): boolean {
  const bench = player.bench;
  // is there free space?
  if (bench.length >= MAX_BENCH_SIZE) { return false }
  bench.push(species);
  // emitMinionEnteredBench(game, uid);
  return true;
}


function addToGraveyard(player: PlayerState, species: MinionData): boolean {
  const graveyard = player.graveyard;
  // is there free space?
  if (graveyard.length >= GRAVEYARD_SIZE) { return false }
  graveyard.push(species);
  // emitMinionEnteredBench(game, uid);
  return true;
}


function placeMinionOnBench(game: GameState, minion: Minion): boolean {
  if (minion == null) { return false }
  if (minion.owner == PlayerIndex.NONE) { return false }
  const player: PlayerState = game.players[minion.owner];
  const bench = player.bench;
  // is there free space?
  if (bench.length >= MAX_BENCH_SIZE) { return false }
  /*
  // is this minion already on the bench?
  const uid = minion.uid;
  for (const other of bench) {
    if (other.uid === uid) { return true }
  }
  minion.location = BoardLocation.BENCH;
  minion.position = bench.length;
  bench.push(minion);
  */
  bench.push(minion.baseData);
  // removeFromBattle(game, minion);
  // emitMinionEnteredBench(game, uid);
  return true;
}


function placeMinionOnGraveyard(game: GameState, minion: Minion): boolean {
  if (minion == null) { return false }
  if (minion.owner == PlayerIndex.NONE) { return false }
  const player: PlayerState = game.players[minion.owner];
  const graveyard = player.graveyard;
  // is there free space?
  if (graveyard.length >= GRAVEYARD_SIZE) { return false }
  /*
  const uid = minion.uid;
  // is this minion already on the graveyard?
  for (const other of graveyard) {
    if (other.uid === uid) { return true }
  }
  minion.location = BoardLocation.GRAVEYARD;
  minion.position = graveyard.length;
  graveyard.push(minion);
  */
  graveyard.push(minion.baseData);
  // removeFromBattle(game, minion);
  // emitMinionEnteredGraveyard(game, uid);
  return true;
}


function removeFromBattle(game: GameState, minion: Minion, emit: boolean = true): boolean {
  const i = minion.position;
  const uid = minion.uid;
  const tiles = game.battlefield.tiles;
  if (i < 0 || i >= tiles.length) { return false }
  const tile: Tile = tiles[i];
  if (tile.minion != uid) { return false }
  tile.minion = 0;
  delete game.battlefield.minions[uid];
  // emit_signal("minion_exited_battlefield", minion)
  return true;
}


function removeFromBattleByTile(game: GameState, i: number): Minion | null {
  const tiles = game.battlefield.tiles;
  if (i < 0 || i >= tiles.length) { return null }
  const tile: Tile = tiles[i];
  const uid = tile.minion;
  if (!uid) { return null }
  const minion = game.battlefield.minions[uid];
  if (minion == null) { return null }
  tile.minion = 0;
  delete game.battlefield.minions[uid];
  // emit_signal("minion_exited_battlefield", minion)
  return minion;
}


function removeFromBench(player: PlayerState, i: number): MinionData | null {
  const bench = player.bench;
  console.log("Player Bench:", player.bench);
  if (i < 0 || i >= bench.length) { return null }
  const species: MinionData[] = bench.splice(i, 1);
  // emit_signal("minion_exited_bench", minion)
  return species[0];
}


function removeFromGraveyard(player: PlayerState, i: number): MinionData | null {
  const graveyard = player.graveyard;
  if (i < 0 || i >= graveyard.length) { return null }
  const species: MinionData[] = graveyard.splice(i, 1);
  // emit_signal("minion_exited_graveyard", minion)
  return species[0];
}


function dequeueFromGraveyard(player: PlayerState): MinionData | null {
  return removeFromGraveyard(player, 0);
}


function isGraveyardFull(player: PlayerState): boolean {
  return player.graveyard.length >= GRAVEYARD_SIZE;
}


function killMinion(game: GameState, minion: Minion): void {
  // emit_signal("minion_died", pi, minion.index, minion.position)
  removeFromBattle(game, minion);
  if (minion.owner === PlayerIndex.NONE) { return }
  const player: PlayerState = game.players[minion.owner]
  if (isGraveyardFull(player)) {
    // emit_signal("minion_reviving", pi, 0, len(board.players[pi].bench))
    const other = dequeueFromGraveyard(player);
    if (other != null) {
      addToBench(player, other);
    }
  }
  addToGraveyard(player, minion.baseData);
}


// -----------------------------------------------------------------------------
// Game Actions
// -----------------------------------------------------------------------------


type MoveActionPayload = {
  from: number;
  to: number;
  power: number;
  speed: number;
  technical: number;
};

type SpawnActionPayload = {
  what: MinionType;
  where: number;
};


type GameActions = {
  move: (params: MoveActionPayload) => void;
  spawn: (params: SpawnActionPayload) => void;
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
    move({ from, to }, { game, playerId }) {
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

    spawn({ what, where }, { game, playerId }) {
      // empty the event queue
      game.events = [];
      // try to execute the command
      const success = trySpawnCommand(game, playerId, what, where);
      if (success) {
        // transition to the next player, ask for new input
        // swapTurns(game);
        console.log("FIXME - swapTurn() here")
      } else {
        // invalidate command, ask for new input
        game.events = [];
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
