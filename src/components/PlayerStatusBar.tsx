import { PlayerState } from '../logic';
import './PlayerStatusBar.css';


// Define the type for component props
interface PlayerStatusBarProps {
  player: PlayerState;
  displayName: string;
  flip: boolean;
}


const PlayerStatusBar = ({ player, displayName, flip }: PlayerStatusBarProps): JSX.Element => {
  return (
    <div className="player-status-bar">
      { flip && <p className="nameplate top">{ displayName }</p> }
      <div className="status-labels">
        <span>B: {player.bench.length}</span>
        <span>T: {player.deck.spells.length}</span>
        <span>G: {player.graveyard.length}</span>
        <span>R: {player.resources}</span>
      </div>
      { !flip && <p className="nameplate bottom">{ displayName }</p> }
    </div>
  );
};

export default PlayerStatusBar;
