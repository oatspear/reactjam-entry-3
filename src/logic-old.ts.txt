// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------

import type { Players, RuneClient } from "rune-games-sdk/multiplayer"

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------


export const TIME_PER_TURN: number = 45;  // seconds
export const SQUADRONS_PER_LOCATION: number = 4;
export const MAX_SQUADRON_SIZE: number = 6;


export enum GameplayPhase {
  BATTLE_PLAN,
  BATTLE_RESULT,
}


export enum Role {
  NONE = 0,
  TANK,
  DAMAGE,
  // SUPPORT,
}


export enum EventType {
  
}


// -----------------------------------------------------------------------------
// Player State
// -----------------------------------------------------------------------------


export interface PlayerState {
  id: string,
  team: number,
  deck: Array<number>
}


function newPlayerState(id: string, team: number, deck?: Array<number>): PlayerState {
  deck = deck || [];
  return { id, team, deck };
}


// -----------------------------------------------------------------------------
// Minion State
// -----------------------------------------------------------------------------


export interface MinionData {
  // index: number;
  minionType: number;
  power: number;
  role: Role;
}


function newMinionData(minionType: number): MinionData {
  return {
    // index,
    minionType,
    power: 1,
    role: Role.TANK,
  };
}


// -----------------------------------------------------------------------------
// Squadron State
// -----------------------------------------------------------------------------


// Each army has a row of minions for each role.
export interface Squadron {
  minionType: number;
  role: Role;
  power: number;
  size: number;
}


function newSquadron(minion: MinionData, size: number): Squadron {
  return {
    minionType: minion.minionType,
    role: minion.role,
    power: minion.power,
    size,
  };
}


// -----------------------------------------------------------------------------
// Army State
// -----------------------------------------------------------------------------


export interface Army {
  squadrons: Squadron[];
}


function newArmy(): Army {
  return { squadrons: [] };
}


// sorted insertion (defensive order)
function addSquadron(army: Army, squadron: Squadron): void {
  const squadrons = army.squadrons;
  for (let i = squadrons.length; i > 0; i--) {
    const other: Squadron = squadrons[i-1];
    if (other.role <= squadron.role) {
      squadrons.splice(i, 0, squadron);
      return;
    }
  }
  squadrons.push(squadron);
}


// -----------------------------------------------------------------------------
// Location State
// -----------------------------------------------------------------------------


export interface Location {
  armies: Army[];
}


function newLocation(): Location {
  return { armies: [newArmy(), newArmy()] };
}


// -----------------------------------------------------------------------------
// Battlefield State
// -----------------------------------------------------------------------------


export interface Battlefield {
  locations: Location[];
  activeRole: Role;
}


function newBattlefield(): Battlefield {
  return {
    locations: [newLocation(), newLocation(), newLocation()],
    activeRole: Role.DAMAGE,
  };
}


function countLivingMinions(battle: Battlefield): number {
  let n: number = 0;
  for (const location of battle.locations) {
    for (const army of location.armies) {
      for (const squadron of army.squadrons) {
        n += squadron.size;
      }
    }
  }
  return n;
}


// -----------------------------------------------------------------------------
// Game State
// -----------------------------------------------------------------------------


export interface GameState {
  phase: GameplayPhase;
  turnsTaken: number;
  timer: number;
  battlefield: Battlefield;
  players: PlayerState[];
}


function resolveCombatPhase(game: GameState): void {
  game.phase = GameplayPhase.BATTLE_RESULT;
  const battle = game.battlefield;
  const attackingOrder = [Role.DAMAGE, Role.TANK];
  for (const role of attackingOrder) {
    if (countLivingMinions(battle) <= 0) {
      break;
    }
    for (const location of battle.locations) {
      resolveLocationCombat(game, location, role);
    }
  }
}


function resolveLocationCombat(game: GameState, location: Location, role: Role): void {
  const result: Squadron[][] = [];
  const n: number = location.armies.length;
  for (let i = 0; i < n; ++i) {
    const attackers: Squadron[] = filterSquadronsByRole(location.armies[i].squadrons, role);
    if (attackers.length === 0) { continue; }

    let power: number = 0;
    for (const squadron of attackers) {
      power += squadron.power * squadron.size;
    }

    const k: number = (i + 1) % n;
    const defenders: Squadron[] = location.armies[k].squadrons;
    for (const squadron of defenders) {
      
    }
  }
}


function filterSquadronsByRole(squadrons: Squadron[], role: Role): Squadron[] {
  const result: Squadron[] = [];
  for (const squadron of squadrons) {
    if (squadron.role === role) {
      result.push(squadron);
    }
  }
  return result;
}


// -----------------------------------------------------------------------------
// Game Actions
// -----------------------------------------------------------------------------


type GameActions = {
  spawnMinion: (params: { location: number, team: number, minionType: number }) => void
  clearMinions: () => void
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

  setup(): GameState {
    return {
      phase: GameplayPhase.BATTLE_PLAN,
      turnsTaken: 0,
      timer: TIME_PER_TURN,
      battlefield: newBattlefield(),
      players: [
        newPlayerState("1", 0),
        newPlayerState("2", 1),
      ],
    }
  },

  update: ({ game }) => {
    if (game.timer <= 0) {
      resolveCombatPhase(game);
      game.timer = TIME_PER_TURN;
    } else {
      --game.timer;
    }
  },

  actions: {
    spawnMinion({ location, team, minionType }, { game }) {
      const minions: MinionState[] = game.locations[location].minions[team];
      const index: number = minions.length
      if (minions.length < MINIONS_PER_LOCATION) {
        minions.push(newMinionState(index, minionType));
      }
    },

    clearMinions(_noargs, { game }) {
      for (const location of game.locations) {
        location.minions = [];
      }
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
