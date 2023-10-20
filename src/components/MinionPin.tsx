import './MinionPin.css';
import { Minion, PlayerIndex } from '../logic.ts';
import iconPin from "../assets/pin.png";


// Define the type for component props
interface MinionPinProps {
  minion: Minion;
}


const MinionPin = ({minion}: MinionPinProps): JSX.Element => {
  if (minion.owner === PlayerIndex.PLAYER1) {

  } else if (minion.owner === PlayerIndex.PLAYER2) {

  }

  return (
    <div className="minion">
      <img src={iconPin} width="32" height="32" />
    </div>
  );
};

export default MinionPin;
