import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen, RoundRecord } from './src/screens/GameScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { Difficulty } from './src/hooks/useColorState';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'game' | 'lobby' | 'summary'>(
    'home'
  );
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>('medium');
  const [finishedRecords, setFinishedRecords] = useState<RoundRecord[]>([]);
  const [sliderPosition, setSliderPosition] = useState<'left' | 'right'>('left');

  const handleStartSolo = (diff: Difficulty) => {
    setActiveDifficulty(diff);
    setCurrentScreen('game');
  };

  const handleGameFinish = (records: RoundRecord[]) => {
    setFinishedRecords(records);
    setCurrentScreen('summary');
  };

  const handleRestart = () => {
    setFinishedRecords([]);
    setCurrentScreen('home');
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {currentScreen === 'home' && (
        <HomeScreen
          onStartSolo={handleStartSolo}
          onStartMultiplayer={() => setCurrentScreen('lobby')}
          sliderPosition={sliderPosition}
          onUpdateSliderPosition={setSliderPosition}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen
          difficulty={activeDifficulty}
          sliderPosition={sliderPosition}
          onFinishGame={handleGameFinish}
          onExit={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'lobby' && (
        <LobbyScreen
          sliderPosition={sliderPosition}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'summary' && (
        <SummaryScreen records={finishedRecords} onRestart={handleRestart} />
      )}
    </SafeAreaProvider>
  );
}
