import { PlayerState } from '../logic';
import './TileView.css';


// Define the type for component props
interface EnemyActionPanelProps {
  player: PlayerState;
  isActive: boolean;
  handleShowBench: () => void;
  handleShowTech: () => void;
  handleShowGraveyard: () => void;
}


const EnemyActionPanel = (
  { player, isActive, handleShowBench, handleShowTech, handleShowGraveyard }: EnemyActionPanelProps
): JSX.Element => {
  return (
    <div className="enemy-action-panel">
      <div className="bench">B</div>
      <div className="tech">T</div>
      <div className="graveyard">G</div>
    </div>
  );
};

export default EnemyActionPanel;
