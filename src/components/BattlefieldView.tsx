import './BattlefieldView.css';
import { GameState, PlayerIndex, Tile } from '../logic.ts';
import TileView from './TileView.tsx';


export interface BattlefieldCallbacks {
  onTileSelected: (i: number) => void;
}


// Define the type for component props
interface BattlefieldProps {
  game: GameState;
  player: PlayerIndex;
  callbacks: BattlefieldCallbacks;
}


const BattlefieldView = ({game, callbacks}: BattlefieldProps): JSX.Element => {
  function newTileView(tile: Tile, i: number): JSX.Element {
    if (i === 12) { return (<div></div>) }

    function handleClick() { callbacks.onTileSelected(tile.index) }
    return (<TileView key={i} tile={tile} handleClick={handleClick} />);
  }

  return (
    <div className="battlefield">
      { game.tiles.map(newTileView) }
    </div>
  );
};

export default BattlefieldView;
