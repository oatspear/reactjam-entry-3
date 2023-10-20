import { useCallback, useState } from 'react';
import { MinionData } from '../logic';
import './RecruitActionBar.css';

interface RecruitActionBarProps {
  bench: MinionData[];
  graveyard: MinionData[];
  playerResources: number;
  onBenchMinionSelected: (i: number) => void;
}


const RecruitActionBar = (
  {
    bench,
    graveyard,
    playerResources,
    onBenchMinionSelected
  }: RecruitActionBarProps
): JSX.Element => {
  const [selectedMinion, setSelectedMinion] = useState<number>(-1);
  const n = bench.length;

  const handleSelectMinion = useCallback((i: number): void => {
    setSelectedMinion(i);
    if (i >= 0 && i < n) {
      onBenchMinionSelected(i);
    }
  }, [bench]);

  const deselectMinion = useCallback(() => {
    setSelectedMinion(-1);
  }, []);

  if (selectedMinion >= 0) {
    const data: MinionData = selectedMinion < n ? bench[selectedMinion] : graveyard[selectedMinion - n];

    return (
      <div className="action-bar-check">
        <div className="details">
          <div className="portrait">
            <span>IMG</span>
            {
              data.cost > playerResources
              ? <span className="stat-badge negative">R: {data.cost}</span>
              : <span className="stat-badge">R: {data.cost}</span>
            }
          </div>
          <div className="stats">
            <div className="base-stats">
              <span className="stat-badge">P: {data.power}</span>
              <span className="stat-badge">H: {data.health}</span>
              <span className="stat-badge">M: {data.movement}</span>
            </div>
            <div className="effects"></div>
          </div>
        </div>

        <div className="button-row">
          <button className="action-button negative" onClick={deselectMinion}>
            X
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="action-bar-recruit roster">
      {
        bench.map((minion: MinionData, i: number) => (
          <div className="item" key={i} onClick={() => handleSelectMinion(i)}>{i+1}</div>
        ))
      }
      {
        graveyard.map((minion: MinionData, i: number) => (
          <div className="item" key={i+n} onClick={() => handleSelectMinion(i+n)}>{i+n+1}</div>
        ))
      }
    </div>
  );
};

export default RecruitActionBar;
