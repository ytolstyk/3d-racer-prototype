import { useState, useCallback, useRef, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import type { RacePhase, VersusSelections, Difficulty } from './types/game.js';
import { MainMenu } from './components/screens/MainMenu.js';
import { OptionsScreen } from './components/screens/OptionsScreen.js';
import { TrackSelect } from './components/screens/TrackSelect.js';
import { CarSelect } from './components/screens/CarSelect.js';
import { LapSelect } from './components/screens/LapSelect.js';
import { RaceScreen } from './components/screens/RaceScreen.js';
import { VersusCarSelect } from './components/screens/VersusCarSelect.js';
import { VersusRaceScreen } from './components/screens/VersusRaceScreen.js';
import { TrackEditor } from './components/screens/TrackEditor.js';
import { PracticeScreen } from './components/screens/PracticeScreen.js';
import { RandomizerSelect } from './components/screens/RandomizerSelect.js';
import { MenuMusicPlayer } from './game/audio/MenuMusicPlayer.js';
import type { RandomizerCardDef } from './constants/randomizer.js';
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

  // useState initializer creates the player once — stable, safe to read during render.
  const [musicPlayer] = useState(() => new MenuMusicPlayer());
  // Tracks whether music was stopped for a game phase, so we only resume on game→menu transitions.
  const musicStoppedForGameRef = useRef(fromEditor);

  useEffect(() => {
    // Don't start music if we opened directly into a game phase (fromEditor).
    if (!musicStoppedForGameRef.current) musicPlayer.play();
    return () => { musicPlayer.dispose(); };
  }, [musicPlayer]);

  const [phase, setPhase] = useState<RacePhase>(fromEditor ? 'racing' : 'menu');
  useEffect(() => {
    const isGame = phase === 'racing' || phase === 'versusRacing';
    if (isGame) {
      musicPlayer.stop();
      musicStoppedForGameRef.current = true;
    } else if (musicStoppedForGameRef.current) {
      // Only resume when transitioning back from a game phase.
      musicPlayer.play();
      musicStoppedForGameRef.current = false;
    }
    // Menu-to-menu transitions (menu→options→trackSelect etc.) do nothing.
  }, [phase, musicPlayer]);

  const [selectedTrackId, setSelectedTrackId] = useState(fromEditor ? '__editor__' : '');
  const [selectedCarId, setSelectedCarId] = useState(fromEditor ? 'racer-red' : '');
  const [totalLaps, setTotalLaps] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isEditorTest, setIsEditorTest] = useState(fromEditor);
  const [gameMode, setGameMode] = useState<'solo' | 'versus'>('solo');
  const [versusSelections, setVersusSelections] = useState<VersusSelections | null>(null);
  const [activeRandomizer, setActiveRandomizer] = useState<RandomizerCardDef | null>(null);
  const [reverse, setReverse] = useState(false);
  const [raceKey, setRaceKey] = useState(0);

  const handleTrackSelect = useCallback((trackId: string, rev = false) => {
    setSelectedTrackId(trackId);
    setReverse(rev);
    setPhase(gameMode === 'versus' ? 'versusCarSelect' : 'carSelect');
  }, [gameMode]);

  const handleCarSelect = useCallback((carId: string) => {
    setSelectedCarId(carId);
    setPhase('lapSelect');
  }, []);

  const handleLapSelect = useCallback((laps: number, diff: Difficulty) => {
    setTotalLaps(laps);
    setDifficulty(diff);
    setPhase('randomizerSelect');
  }, []);

  const handleRandomizerSelect = useCallback((card: RandomizerCardDef) => {
    setActiveRandomizer(card);
    setPhase('racing');
  }, []);

  const handleRandomizerSkip = useCallback(() => {
    setActiveRandomizer(null);
    setPhase('racing');
  }, []);

  const handleVersusRandomizerSelect = useCallback((card: RandomizerCardDef) => {
    setActiveRandomizer(card);
    setPhase('versusRacing');
  }, []);

  const handleVersusRandomizerSkip = useCallback(() => {
    setActiveRandomizer(null);
    setPhase('versusRacing');
  }, []);

  const handleMainMenu = useCallback(() => {
    setPhase('menu');
    setSelectedCarId('');
    setSelectedTrackId('');
    setGameMode('solo');
    setDifficulty('medium');
    setVersusSelections(null);
    setActiveRandomizer(null);
    setIsEditorTest(false);
    navigate('/', { replace: true, state: {} });
  }, [navigate]);

  const handleVersusStart = useCallback(() => {
    setGameMode('versus');
    setPhase('trackSelect');
  }, []);

  const handleVersusCarSelectReady = useCallback((sel: VersusSelections) => {
    setVersusSelections(sel);
    setPhase('versusRandomizerSelect');
  }, []);

  const handleVersusPlayAgain = useCallback(() => {
    setPhase('versusCarSelect');
    setTimeout(() => setPhase('versusRacing'), 0);
  }, []);

  const handleRaceAgain = useCallback(() => {
    setRaceKey(k => k + 1);
  }, []);

  const handleBackToEditor = useCallback(() => navigate('/track-editor'), [navigate]);

  switch (phase) {
    case 'menu':
      return (
        <MainMenu
          onStart={() => setPhase('trackSelect')}
          onVersus={handleVersusStart}
          onPractice={() => navigate('/practice')}
          onBackToEditor={isEditorTest ? handleBackToEditor : undefined}
          onOptions={() => setPhase('options')}
        />
      );
    case 'options':
      return <OptionsScreen onBack={() => setPhase('menu')} musicPlayer={musicPlayer} />;
    case 'trackSelect':
      return <TrackSelect onSelect={handleTrackSelect} onBack={handleMainMenu} />;
    case 'carSelect':
      return <CarSelect onSelect={handleCarSelect} onBack={() => setPhase('trackSelect')} />;
    case 'lapSelect':
      return <LapSelect onSelect={handleLapSelect} onBack={() => setPhase('carSelect')} />;
    case 'randomizerSelect':
      return <RandomizerSelect onSelect={handleRandomizerSelect} onSkip={handleRandomizerSkip} />;
    case 'racing':
      return (
        <RaceScreen
          key={raceKey}
          selectedTrackId={selectedTrackId}
          selectedCarId={selectedCarId}
          totalLaps={totalLaps}
          difficulty={difficulty}
          reverse={reverse}
          activeRandomizer={activeRandomizer}
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
    case 'versusRandomizerSelect':
      return <RandomizerSelect onSelect={handleVersusRandomizerSelect} onSkip={handleVersusRandomizerSkip} />;
    case 'versusRacing':
      return versusSelections ? (
        <VersusRaceScreen
          selections={versusSelections}
          reverse={reverse}
          activeRandomizer={activeRandomizer}
          onMainMenu={handleMainMenu}
          onPlayAgain={handleVersusPlayAgain}
        />
      ) : null;
    default:
      return <MainMenu onStart={() => setPhase('trackSelect')} onOptions={() => setPhase('options')} />;
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
