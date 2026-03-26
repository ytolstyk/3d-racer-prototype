import { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import type { RacePhase } from './types/game.js';
import { MainMenu } from './components/screens/MainMenu.js';
import { TrackSelect } from './components/screens/TrackSelect.js';
import { CarSelect } from './components/screens/CarSelect.js';
import { LapSelect } from './components/screens/LapSelect.js';
import { RaceScreen } from './components/screens/RaceScreen.js';
import { TrackEditor } from './components/screens/TrackEditor.js';
import { PracticeScreen } from './components/screens/PracticeScreen.js';
import './App.css';

function GameApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const fromEditor = !!(location.state as { fromEditor?: boolean } | null)?.fromEditor;

  const [phase, setPhase] = useState<RacePhase>(fromEditor ? 'racing' : 'menu');
  const [selectedTrackId, setSelectedTrackId] = useState(fromEditor ? '__editor__' : '');
  const [selectedCarId, setSelectedCarId] = useState(fromEditor ? 'racer-red' : '');
  const [totalLaps, setTotalLaps] = useState(3);
  const [isEditorTest] = useState(fromEditor);

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

  const handlePractice = () => setPhase('practice');

  const handleRaceAgain = () => {
    // Re-mount RaceScreen by going through lapSelect briefly
    setPhase('lapSelect');
    // Use setTimeout to ensure RaceScreen unmounts first
    setTimeout(() => setPhase('racing'), 0);
  };

  const handleBackToEditor = () => navigate('/track-editor');

  switch (phase) {
    case 'menu':
      return (
        <MainMenu
          onStart={() => setPhase('trackSelect')}
          onPractice={handlePractice}
          onBackToEditor={isEditorTest ? handleBackToEditor : undefined}
        />
      );
    case 'practice':
      return (
        <PracticeScreen
          selectedCarId="racer-red"
          onMainMenu={handleMainMenu}
          onOpenInEditor={() => navigate('/track-editor')}
        />
      );
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
          onBackToEditor={isEditorTest ? handleBackToEditor : undefined}
        />
      );
    default:
      return <MainMenu onStart={() => setPhase('trackSelect')} />;
  }
}

function App() {
  return (
    <Routes>
      <Route path="/track-editor" element={<TrackEditor />} />
      <Route path="/*" element={<GameApp />} />
    </Routes>
  );
}

export default App;
