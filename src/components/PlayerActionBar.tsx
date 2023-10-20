import { MinionData, PlayerState } from '../logic';
import './PlayerActionBar.css';

import iconPlayerFlag from "../assets/flag-player.png";
import iconEnemyFlag from "../assets/flag-enemy.png";
import { useState } from 'react';
import RecruitActionBar from './RecruitActionBar';

// Define the type for component props
interface PlayerActionBarProps {
  player: PlayerState;
  enemy: PlayerState;
  playerAvatarUrl: string;
  enemyAvatarUrl: string;
}


function renderMinions(player: PlayerState, handleSelectMinion: (i: number) => void): JSX.Element {
  return (
    <RecruitActionBar
      bench={player.bench}
      graveyard={player.graveyard}
      playerResources={player.resources}
      onBenchMinionSelected={handleSelectMinion}
    />
  );
}


function renderTech(player: PlayerState, handleSelectTech: (i: number) => void): JSX.Element {
  return (
    <div className="roster">
      {
        player.deck.spells.map((spell: number, i: number) => (
          <div className="item" key={i} onClick={() => handleSelectTech(i)}>{i+1}</div>
        ))
      }
    </div>
  );
}


const PlayerActionBar = ({ player, enemy, playerAvatarUrl, enemyAvatarUrl }: PlayerActionBarProps): JSX.Element => {
  const [showMinionDeck, setShowMinionDeck] = useState<boolean>(true);
  const [isThisPlayer, setIsThisPlayer] = useState<boolean>(true);

  const swichActionPlayer = () => { setIsThisPlayer(!isThisPlayer) };
  const setDeckViewToMinions = () => { setShowMinionDeck(true) };
  const setDeckViewToTech = () => { setShowMinionDeck(false) };

  const activePlayer: PlayerState = isThisPlayer ? player : enemy;
  const avatarUrl: string = isThisPlayer ? playerAvatarUrl : enemyAvatarUrl;

  function handleSelectMinion(i: number): void {
    alert(`Deploy Minion ${i}`)
  }

  function handleSelectTech(i: number): void {
    alert(`Use Tech ${i}`)
  }

  return (
    <div className="player-action-bar">
      <div className="switch-controls">
        <input
          className="hidden radio-label"
          type="radio"
          name="deck-menu"
          id="button-minion-deck"
          onChange={setDeckViewToMinions}
          checked={showMinionDeck}
        />
        <label className="button-label" htmlFor="button-minion-deck">&#9876;</label>

        <div className="player-switch" onClick={swichActionPlayer}>
          { isThisPlayer && <img className="flag" src={iconPlayerFlag} /> }
          <div className="player-avatar">
            <img src={avatarUrl} />
          </div>
          { !isThisPlayer && <img className="flag" src={iconEnemyFlag} /> }
        </div>

        <input
          className="hidden radio-label"
          type="radio"
          name="deck-menu"
          id="button-tech-deck"
          onChange={setDeckViewToTech}
          checked={!showMinionDeck}
        />
        <label className="button-label" htmlFor="button-tech-deck">&#128736;</label>
      </div>

      {
        showMinionDeck
        ? renderMinions(activePlayer, handleSelectMinion)
        : renderTech(activePlayer, handleSelectTech)
      }
    </div>
  );
};

export default PlayerActionBar;
