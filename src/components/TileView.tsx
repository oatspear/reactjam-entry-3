import './TileView.css';
import { PlayerIndex, Tile } from '../logic.ts';


// Define the type for component props
interface TileProps {
  tile: Tile;
  handleClick: () => void;
}


const TileView = ({ tile, handleClick }: TileProps): JSX.Element => {
  if (!tile.usable) {
    return (
      <div></div>
    );
  }

  let className = "tile tile-normal";
  if (tile.owner === PlayerIndex.PLAYER1) {
    className += " player-1";
  } else if (tile.owner === PlayerIndex.PLAYER2) {
    className += " player-2";
  } else if (tile.owner === PlayerIndex.PLAYER3) {
    className += " player-3";
  } else if (tile.owner === PlayerIndex.PLAYER4) {
    className += " player-4";
  }

  const total = tile.power + tile.speed + tile.technical;

  return (
    <div className={className} onClick={handleClick}>
      <span>{total}</span>
    </div>
  );
};

export default TileView;
