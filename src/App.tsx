import { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import type { RacePhase, VersusSelections, Difficulty } from './types/game.js';
import { MainMenu } from './components/screens/MainMenu.js';
import { TrackSelect } from './components/screens/TrackSelect.js';
import { CarSelect } from './components/screens/CarSelect.js';
import { LapSelect } from './components/screens/LapSelect.js';
import { RaceScreen } from './components/screens/RaceScreen.js';
import { VersusCarSelect } from './components/screens/VersusCarSelect.js';
import { VersusRaceScreen } from './components/screens/VersusRaceScreen.js';
import { TrackEditor } from './components/screens/TrackEditor.js';
import { PracticeScreen } from './components/screens/PracticeScreen.js';
import './App.css';

function PracticeRoute() {
  const navigate = useNavigate();
  return (
    <PracticeScreen
      onMainMenu={() => navigate('/')}
      onOpenInEditor={() => navigate('/track-editor')}
    />
  );
}

function GameApp() {
  const location = useLocation();
  const navigate = useNavigate();
  const fromEditor = !!(location.state as { fromEditor?: boolean } | null)?.fromEditor;

  const [phase, setPhase] = useState<RacePhase>(fromEditor ? 'racing' : 'menu');
  const [selectedTrackId, setSelectedTrackId] = useState(fromEditor ? '__editor__' : '');
  const [selectedCarId, setSelectedCarId] = useState(fromEditor ? 'racer-red' : '');
  const [totalLaps, setTotalLaps] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isEditorTest] = useState(fromEditor);
  const [gameMode, setGameMode] = useState<'solo' | 'versus'>('solo');
  const [versusSelections, setVersusSelections] = useState<VersusSelections | null>(null);
  const [reverse, setReverse] = useState(false);

  const handleTrackSelect = (trackId: string, rev = false) => {
    setSelectedTrackId(trackId);
    setReverse(rev);
    setPhase(gameMode === 'versus' ? 'versusCarSelect' : 'carSelect');
  };

  const handleCarSelect = (carId: string) => {
    setSelectedCarId(carId);
    setPhase('lapSelect');
  };

  const handleLapSelect = (laps: number, diff: Difficulty) => {
    setTotalLaps(laps);
    setDifficulty(diff);
    setPhase('racing');
  };

  const handleMainMenu = () => {
    setPhase('menu');
    setSelectedCarId('');
    setSelectedTrackId('');
    setGameMode('solo');
    setDifficulty('medium');
    setVersusSelections(null);
  };

  const handleVersusStart = () => {
    setGameMode('versus');
    setPhase('trackSelect');
  };

  const handleVersusCarSelectReady = (sel: VersusSelections) => {
    setVersusSelections(sel);
    setPhase('versusRacing');
  };

  const handleVersusPlayAgain = () => {
    setPhase('versusCarSelect');
    setTimeout(() => setPhase('versusRacing'), 0);
  };

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
          onVersus={handleVersusStart}
          onPractice={() => navigate('/practice')}
          onBackToEditor={isEditorTest ? handleBackToEditor : undefined}
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
          difficulty={difficulty}
          reverse={reverse}
          onMainMenu={handleMainMenu}
          onRaceAgain={handleRaceAgain}
          onBackToEditor={isEditorTest ? handleBackToEditor : undefined}
        />
      );
    case 'versusCarSelect':
      return (
        <VersusCarSelect
          trackId={selectedTrackId}
          onReady={handleVersusCarSelectReady}
          onBack={() => setPhase('trackSelect')}
        />
      );
    case 'versusRacing':
      return versusSelections ? (
        <VersusRaceScreen
          selections={versusSelections}
          reverse={reverse}
          onMainMenu={handleMainMenu}
          onPlayAgain={handleVersusPlayAgain}
        />
      ) : null;
    default:
      return <MainMenu onStart={() => setPhase('trackSelect')} />;
  }
}

function App() {
  return (
    <Routes>
      <Route path="/track-editor" element={<TrackEditor />} />
      <Route path="/practice" element={<PracticeRoute />} />
      <Route path="/*" element={<GameApp />} />
    </Routes>
  );
}

export default App;
