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
const MAX_BENCH_SIZE: number = 6;
const GRAVEYARD_SIZE: number = 2;


export enum GameplayPhase {
  INPUT_ANY,
  INPUT_MOVEMENT,
}


export enum BoardLocation {
  NONE = 0,
  BENCH,
  BATTLEFIELD,
  GRAVEYARD
}

export enum TileType {
  UNPATHABLE = 0,
  NORMAL,
  SPAWN,
  BASE,
}

export enum PlayerIndex {
  NONE = -1,
  PLAYER1 = 0,
  PLAYER2 = 1,
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
// Player Deck
// -----------------------------------------------------------------------------


export interface Deck {
  id: number;
  minions: number[];
  spells: number[];
}


function newDeck(id: number): Deck {
  return { id, minions: [], spells: [] };
}


// -----------------------------------------------------------------------------
// Minion Data
// -----------------------------------------------------------------------------


export interface MinionData {
  species: number;
  power: number;
  health: number;
  movement: number;
  cost: number;
}


function newMinionData(species: number): MinionData {
  return {
    species,
    power: 1,
    health: 1,
    movement: 1,
    cost: 0,
  };
}


// -----------------------------------------------------------------------------
// Battle Minion State
// -----------------------------------------------------------------------------


export interface Minion {
  uid: number;
  owner: PlayerIndex;
  // species: number;
  baseData: MinionData;
  power: number;
  health: number;
  movement: number;
  cost: number;
  // location: BoardLocation;
  position: number;
  isToken: boolean;
}


function newMinion(
  uid: number,
  owner: number,
  baseData: MinionData,
  isToken: boolean = false
): Minion {
  return {
    uid,
    owner,
    baseData,
    // species: data.species,
    power: baseData.power,
    health: baseData.health,
    movement: baseData.movement,
    cost: baseData.cost,
    // location: BoardLocation.BENCH,
    position: -1,
    isToken,
  };
}


// -----------------------------------------------------------------------------
// Tile State
// -----------------------------------------------------------------------------


export interface Tile {
  // adjacent: Array = []
  index: number;
  type: TileType;
  owner: PlayerIndex;
  minion: number;
}


function newTile(index: number): Tile {
  return {
    index,
    type: TileType.NORMAL,
    owner: PlayerIndex.NONE,
    minion: 0,
  };
}


function newBaseTile(index: number, owner: PlayerIndex): Tile {
  return {
    index,
    type: TileType.BASE,
    owner,
    minion: 0,
  };
}


function newSpawnTile(index: number, owner: PlayerIndex): Tile {
  return {
    index,
    type: TileType.SPAWN,
    owner,
    minion: 0,
  };
}


function newUnpathableTile(index: number): Tile {
  return {
    index,
    type: TileType.UNPATHABLE,
    owner: PlayerIndex.NONE,
    minion: 0,
  };
}


// -----------------------------------------------------------------------------
// Board State
// -----------------------------------------------------------------------------


export interface Battlefield {
  tiles: Tile[];
  minions: Record<number, Minion>;
}


// With this board layout we can assume that, for movement speed N <= 3,
// there is, at most, one possible path between any two tiles.

// [S o B o S]
// [o   o   o]
// [R o R o R]
// [o   o   o]
// [S o B o S]


function newBattlefield(): Battlefield {
  return {
    minions: {},
    tiles: [
      // row 1
      newSpawnTile(0, PlayerIndex.PLAYER1),
      newTile(1),
      newBaseTile(2, PlayerIndex.PLAYER1),
      newTile(3),
      newSpawnTile(4, PlayerIndex.PLAYER1),
      // row 2
      newTile(5),
      newUnpathableTile(6),
      newTile(7),
      newUnpathableTile(8),
      newTile(9),
      // row 3
      newTile(10),
      newTile(11),
      newTile(12),
      newTile(13),
      newTile(14),
      // row 4
      newTile(15),
      newUnpathableTile(16),
      newTile(17),
      newUnpathableTile(18),
      newTile(19),
      // row 5
      newSpawnTile(20, PlayerIndex.PLAYER2),
      newTile(21),
      newBaseTile(22, PlayerIndex.PLAYER2),
      newTile(23),
      newSpawnTile(24, PlayerIndex.PLAYER2),
    ],
  };
}


// Builds a path from tiles `i` to `j` in a given `battlefield`, with length <= `n`.
// Assumes there is at most one possible path.
// Assumes valid tile indices.
// Returns an empty array if there is no possible path.
export function getPath(battlefield: Battlefield, i: number, j: number, n: number): number[] {
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
    const tile: Tile = battlefield.tiles[k];
    if (tile.type === TileType.UNPATHABLE) { return [] }
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
export function getFreePath(battlefield: Battlefield, i: number, j: number, n: number): number[] {
  const path: number[] = getPath(battlefield, i, j, n);
  for (const k of path) {
    const tile: Tile = battlefield.tiles[k];
    if (!!tile.minion) { return [] }
  }
  return path;
}


// Given a `battlefield`, a tile number `i` and a movement capacity `n`,
// calculate which tiles are reachable from `i`.
export function getReach(battlefield: Battlefield, i: number, n: number): number[] {
  if (n <= 0) { return [] }
  let reachable: number[] = [i];
  buildReach(battlefield, reachable, i, n);
  removeItem(reachable, i);
  return reachable;
}


function buildReach(battlefield: Battlefield, reach: number[], i: number, n: number): void {
  if (n <= 0) { return }
  const adjacent: number[] = getAdjacentTiles(battlefield, i);
  for (const k of adjacent) {
    // already visited?
    if (reach.includes(k)) { continue }
    const tile: Tile = battlefield.tiles[k];
    // is this tile pathable?
    if (tile.type == TileType.UNPATHABLE) { continue }
    // is it already occupied?
    if (!!tile.minion) { continue }
    // reachable, keep going
    reach.push(k);
    buildReach(battlefield, reach, k, n-1);
  }
}


// Returns all possible adjacent tile numbers,
// given a `battlefield` and a tile number `i`.
// Does not perform occupancy checks, just board boundary checks.
function getAdjacentTiles(battlefield: Battlefield, i: number): number[] {
  const n = battlefield.tiles.length;
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


function getAdjacentEnemies(game: GameState, i: number): number[] {
  let uid: number = game.battlefield.tiles[i].minion;
  let minion: Minion | undefined = game.battlefield.minions[uid];
  const enemies: number[] = [];
  if (minion != null) {
    const pi = minion.owner;
    for (const k of getAdjacentTiles(game.battlefield, i)) {
      uid = game.battlefield.tiles[k].minion;
      minion = game.battlefield.minions[uid];
      if (minion != null && minion.owner != pi) {
        enemies.push(k);
      }
    }
  }
  return enemies;
}


// -----------------------------------------------------------------------------
// Player State
// -----------------------------------------------------------------------------


export interface PlayerState {
  id: string;
  index: PlayerIndex;
  deck: Deck;
  resources: number;
  bench: MinionData[];
  graveyard: MinionData[];
}


function newPlayerState(id: string, index: PlayerIndex, deck: Deck): PlayerState {
  return { id, index, deck, resources: INITIAL_RESOURCES, bench: [], graveyard: [] };
}


// Prepares the players to have a valid initial battle state.
function setupPlayers(game: GameState): void {
  for (const player of game.players) {
    // FIXME: initialize decks
    player.deck.minions.push(1);
    player.deck.minions.push(1);
    player.deck.minions.push(1);
    // initialize benched minions
    const bench: MinionData[] = [];
    for (const speciesId of player.deck.minions) {
      const species = newMinionData(speciesId);
      bench.push(species);
      // const uid: number = ++game.minionIdGenerator;
      // const minion = newMinion(uid, player.index, species);
      // bench.push(minion);
    }
    player.bench = bench;
    // empty graveyard
    player.graveyard.length = 0;
    // second player gets an extra resource
    player.resources = INITIAL_RESOURCES + player.index;
  }
}


function getPlayerMinionData(player: PlayerState, speciesId: number): MinionData | null {
  for (const id of player.deck.minions) {
    if (id === speciesId) { return newMinionData(speciesId) }
  }
  return null
}


// -----------------------------------------------------------------------------
// Game State
// -----------------------------------------------------------------------------


type EventQueue = Record<string, number>[];


export interface GameState {
  phase: GameplayPhase;
  turnsTaken: number;
  timer: number;
  battlefield: Battlefield;
  players: PlayerState[];
  events: EventQueue;

  minionIdGenerator: number;
  // minions: Record<number, Minion>;
  currentPlayer: number;
}


export function getPlayerIndex(game: GameState, playerId: string | undefined): PlayerIndex {
  if (playerId == null) { return PlayerIndex.NONE }
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


function trySpawnMoveCommand(
  game: GameState,
  playerId: string,
  benchIndex: number,
  spawnPoint: number,
  moveTo: number
): boolean {
  const player: PlayerState = game.players[game.currentPlayer];
  console.log("Current player:", player.id)
  console.log("Action player:", playerId)
  console.log("Game Phase:", game.phase)
  console.log("Bench Index:", benchIndex)
  console.log("Spawn Point:", spawnPoint)
  console.log("Move To:", moveTo)
  // is it the player's turn?
  if (player.id != playerId) { return false }
  console.log("Check 1")
  // can the player issue spawn commands?
  if (game.phase != GameplayPhase.INPUT_ANY) { return false }
  console.log("Check 2")
  // is the tile index valid?
  const n = game.battlefield.tiles.length;
  if (spawnPoint < 0 || spawnPoint >= n) { return false }
  console.log("Check 3")
  // is the tile index valid?
  if (moveTo < 0 || moveTo >= n) { return false }
  console.log("Check 4")
  // does the player have this minion on the bench?
  const species: MinionData | null = removeFromBench(player, benchIndex);
  if (species == null) { return false }
  console.log("Check 5")
  // try to spawn the minion
  const minion: Minion | null = trySpawnMinion(game, player, species, spawnPoint);
  if (minion == null) {
    // rollback
    addToBench(player, species);
    return false;
  }
  console.log("Check 6")
  // minions have 1 less movement when they spawn
  minion.movement--;
  // try to move the minion to the desired spot
  if (!tryAttackMove(game, minion, moveTo)) {
    // rollback
    removeFromBattle(game, minion, false);
    placeMinionOnBench(game, minion);
    return false;
  }
  console.log("Check 7")
  // clean up
  minion.movement++;
  return true;
}


function trySpawnMinion(
  game: GameState,
  player: PlayerState,
  species: MinionData,
  at: number
): Minion | null {
  console.log("Player Resources:", player.resources)
  console.log("Minion Cost:", species.cost)
  // does the player have enough resources?
  if (player.resources < species.cost) { return null }
  // generate minion
  const uid: number = ++game.minionIdGenerator;
  const minion: Minion = newMinion(uid, player.index, species);
  // try to place it on the battlefield
  if (!placeMinionOnBattlefield(game, minion, at, true)) { return null }
  console.log("Minion UID:", uid)
  // register the minion and the event
  player.resources -= species.cost;
  game.battlefield.minions[uid] = minion;
  emitMinionSpawned(game.events, uid, at);
  return minion;
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
};

type SpawnActionPayload = {
  benchIndex: number;
  spawnPoint: number;
  moveTo: number;
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
    const players: PlayerState[] = [newPlayerState(allPlayerIds[0], PlayerIndex.PLAYER1, newDeck(1))];
    if (allPlayerIds.length > 1) {
      players.push(newPlayerState(allPlayerIds[1], PlayerIndex.PLAYER2, newDeck(2)));
    } else {
      players.push(newPlayerState("AI", PlayerIndex.PLAYER2, newDeck(2)))
    }
    const game: GameState = {
      phase: GameplayPhase.INPUT_ANY,
      turnsTaken: 0,
      timer: TIME_PER_TURN,
      battlefield: newBattlefield(),
      players,
      events: [],
      minionIdGenerator: 0,
      // minions: {},
      currentPlayer: PlayerIndex.PLAYER1,
    };
    setupPlayers(game);
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

    spawn({ benchIndex, spawnPoint, moveTo }, { game, playerId }) {
      // empty the event queue
      game.events = [];
      // try to execute the command
      const success = trySpawnMoveCommand(game, playerId, benchIndex, spawnPoint, moveTo);
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
