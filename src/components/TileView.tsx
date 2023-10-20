import './TileView.css';
import { Minion, PlayerIndex, Tile, TileType } from '../logic.ts';
import MinionPin from './MinionPin.tsx';


// Define the type for component props
interface TileProps {
  tile: Tile;
  minion: Minion | undefined;
  handleClick: () => void;
}


const TileView = ({ tile, minion, handleClick }: TileProps): JSX.Element => {
  if (tile.type === TileType.UNPATHABLE) {
    return (
      <div className="tile"></div>
    );
  }

  let className = "tile";
  if (tile.type === TileType.BASE) {
    className += " tile-base";
  } else if (tile.type === TileType.SPAWN) {
    className += " tile-spawn";
  } else if (tile.type === TileType.NORMAL) {
    className += " tile-normal";
  }

  if (tile.owner === PlayerIndex.PLAYER1) {
    className += " player-1";
  } else if (tile.owner === PlayerIndex.PLAYER2) {
    className += " player-2";
  }

  if (minion == null) {
    return (<div className={className} onClick={handleClick}></div>);
  }

  return (
    <div className={className} onClick={handleClick}>
      <MinionPin minion={minion} />
      <div className="minion-stats">
        <span>{minion.power}</span> | <span>{minion.health}</span>
      </div>
    </div>
  );
};

export default TileView;
