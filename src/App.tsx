import { useEffect, useState } from "react"

import "./App.css"
import { GameState, PlayerIndex, PlayerState, getPlayerIndex } from "./logic.ts"

import BattlefieldView, { BattlefieldCallbacks } from './components/BattlefieldView.tsx';
import PlayerActionBar from "./components/PlayerActionBar.tsx";

import iconAvatarPlaceholder from "./assets/avatar-placeholder.png";

type PlayersObject = Record<string, { playerId: string, displayName: string, avatarUrl: string }>;

interface ClientPlayerInfo {
  playerId: string;
  displayName: string;
  avatarUrl: string;
  index: PlayerIndex;
  resources: number;
}

interface DisplayMinionStats {
  power: number;
  health: number;
  movement: number;
}

enum UIState {
  INITIAL = 0,
  ANIMATING,
  INPUT_MAIN,
  INPUT_MOVE,
  INPUT_ATTACK,
  INPUT_PLAYER_BENCH,
  INPUT_PLAYER_TECH,
  INPUT_PLAYER_GRAVEYARD,
  INPUT_ENEMY_MINION,
  INPUT_ENEMY_BENCH,
  INPUT_ENEMY_TECH,
  INPUT_ENEMY_GRAVEYARD,
}


function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}


function getTopBottomPlayers(
  game: GameState,
  playerIndex: PlayerIndex,
  players: PlayersObject
): ClientPlayerInfo[] {
  const clientPlayers = [];
  for (const state of game.players) {
    clientPlayers.push({ ...players[state.id], index: state.index, resources: state.resources });
  }
  if (playerIndex === PlayerIndex.PLAYER1) {
    return clientPlayers.reverse();
  }
  return clientPlayers;
}


function App() {
  // game state
  const [game, setGame] = useState<GameState | undefined>();
  const [myPlayerId, setMyPlayerId] = useState<string | undefined>();
  const [players, setPlayers] = useState<PlayersObject>({});
  // layer visibility
  const [uiState, setUiState] = useState<UIState>(UIState.INITIAL);
  // UI state variables
  const [selectedTile, setSelectedTile] = useState<number>(-1);
  const [actionableTiles, setActionableTiles] = useState<number[]>([]);
  const [displayStats, setDisplayStats] = useState<DisplayMinionStats | undefined>();


  const spawnMinion = () => {
    if (game == null) { return; }
    const benchIndex: number = 0;
    const spawnPoint: number = 0;
    const moveTo: number = 0;
    // Rune.actions.spawn({ benchIndex, spawnPoint, moveTo });
  };

  useEffect(() => {
    Rune.initClient({
      onChange: ({ newGame, yourPlayerId, players }) => {
        setGame(newGame);
        setMyPlayerId(yourPlayerId);
        setPlayers({
          ...players,
          AI: {
            playerId: "AI",
            displayName: "AI (Bot)",
            avatarUrl: iconAvatarPlaceholder,
          },
        });
      },
    })
  }, []);  

  if (!game) {
    return <div>Loading...</div>
  }

  const { height, width } = getWindowDimensions();

  const playerIndex: PlayerIndex = getPlayerIndex(game, myPlayerId);
  const [enemy, player] = getTopBottomPlayers(game, playerIndex, players);

  const playerState: PlayerState = game.players[player.index];
  const enemyState: PlayerState = game.players[enemy.index];

  const battlefieldCallbacks: BattlefieldCallbacks = {
    onTileSelected(i: number) {
      if (uiState === UIState.ANIMATING) { return }
      setSelectedTile(i);
      const tile = game.tiles[i];
      if (tile.owner === playerIndex) {

      } else {

      }
    }
  };

  const showPlayerActionBar: boolean = uiState != UIState.ANIMATING;
  const tempEnemyDisplayName: string = `width: ${width} ~ height: ${height}`;

  return (
    <>
      <code>{tempEnemyDisplayName}</code>
      <BattlefieldView game={game} player={playerIndex} callbacks={battlefieldCallbacks} />
      <div className="main-action-container">
        {
          showPlayerActionBar &&
          <PlayerActionBar
            player={playerState}
            enemy={enemyState}
            playerAvatarUrl={player.avatarUrl}
            enemyAvatarUrl={enemy.avatarUrl}
          />
        }
      </div>
    </>
  )
}

export default App;
