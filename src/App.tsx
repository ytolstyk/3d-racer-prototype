import { useState } from 'react';
import type { RacePhase } from './types/game.js';
import { MainMenu } from './components/screens/MainMenu.js';
import { TrackSelect } from './components/screens/TrackSelect.js';
import { CarSelect } from './components/screens/CarSelect.js';
import { LapSelect } from './components/screens/LapSelect.js';
import { RaceScreen } from './components/screens/RaceScreen.js';
import './App.css';

function App() {
  const [phase, setPhase] = useState<RacePhase>('menu');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [selectedCarId, setSelectedCarId] = useState('');
  const [totalLaps, setTotalLaps] = useState(3);

  const handleTrackSelect = (trackId: string) => {
    setSelectedTrackId(trackId);
    setPhase('carSelect');
  };

  const handleCarSelect = (carId: string) => {
    setSelectedCarId(carId);
    setPhase('lapSelect');
  };

  const handleLapSelect = (laps: number) => {
    setTotalLaps(laps);
    setPhase('racing');
  };

  const handleMainMenu = () => {
    setPhase('menu');
    setSelectedCarId('');
    setSelectedTrackId('');
  };

  const handleRaceAgain = () => {
    // Re-mount RaceScreen by going through lapSelect briefly
    setPhase('lapSelect');
    // Use setTimeout to ensure RaceScreen unmounts first
    setTimeout(() => setPhase('racing'), 0);
  };

  switch (phase) {
    case 'menu':
      return <MainMenu onStart={() => setPhase('trackSelect')} />;
    case 'trackSelect':
      return <TrackSelect onSelect={handleTrackSelect} onBack={handleMainMenu} />;
    case 'carSelect':
      return <CarSelect onSelect={handleCarSelect} onBack={() => setPhase('trackSelect')} />;
    case 'lapSelect':
      return <LapSelect onSelect={handleLapSelect} onBack={() => setPhase('carSelect')} />;
    case 'racing':
      return (
        <RaceScreen
          selectedTrackId={selectedTrackId}
          selectedCarId={selectedCarId}
          totalLaps={totalLaps}
          onMainMenu={handleMainMenu}
          onRaceAgain={handleRaceAgain}
        />
      );
    default:
      return <MainMenu onStart={() => setPhase('trackSelect')} />;
  }
}

export default App;
