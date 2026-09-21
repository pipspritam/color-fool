import React, { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { GameScreen, RoundRecord } from './src/screens/GameScreen';
import { LobbyScreen } from './src/screens/LobbyScreen';
import { SummaryScreen } from './src/screens/SummaryScreen';
import { Difficulty, CustomGameConfig } from './src/hooks/useColorState';
import {
  loadSavedSettings,
  saveSliderPosition,
  saveDifficulty,
  saveCustomConfig,
} from './src/utils/storage';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'game' | 'lobby' | 'summary'>(
    'home'
  );
  const [activeDifficulty, setActiveDifficulty] = useState<Difficulty>('medium');
  const [finishedRecords, setFinishedRecords] = useState<RoundRecord[]>([]);
  const [sliderPosition, setSliderPosition] = useState<'left' | 'right'>('left');
  const [customConfig, setCustomConfig] = useState<CustomGameConfig>({
    previewSeconds: 3.0,
    guessSeconds: 15.0,
    rounds: 5,
  });

  // Load cached settings on app launch
  useEffect(() => {
    loadSavedSettings()
      .then((settings) => {
        setSliderPosition(settings.sliderPosition);
        setActiveDifficulty(settings.difficulty);
        setCustomConfig(settings.customConfig);
      })
      .catch((err) => {
        console.warn('Failed to load saved settings:', err);
      });
  }, []);

  const handleUpdateSliderPosition = useCallback((pos: 'left' | 'right') => {
    setSliderPosition(pos);
    saveSliderPosition(pos);
  }, []);

  const handleUpdateDifficulty = useCallback((diff: Difficulty) => {
    setActiveDifficulty(diff);
    saveDifficulty(diff);
  }, []);

  const handleUpdateCustomConfig = useCallback((config: CustomGameConfig) => {
    setCustomConfig(config);
    saveCustomConfig(config);
  }, []);

  const handleStartSolo = (diff: Difficulty, custom?: CustomGameConfig) => {
    handleUpdateDifficulty(diff);
    if (custom) {
      handleUpdateCustomConfig(custom);
    }
    setCurrentScreen('game');
  };

  const handleStartMultiplayer = (diff: Difficulty, custom?: CustomGameConfig) => {
    handleUpdateDifficulty(diff);
    if (custom) {
      handleUpdateCustomConfig(custom);
    }
    setCurrentScreen('lobby');
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
          onStartMultiplayer={handleStartMultiplayer}
          sliderPosition={sliderPosition}
          onUpdateSliderPosition={handleUpdateSliderPosition}
          initialDifficulty={activeDifficulty}
          initialCustomConfig={customConfig}
          onDifficultyChange={handleUpdateDifficulty}
          onCustomConfigChange={handleUpdateCustomConfig}
        />
      )}
      {currentScreen === 'game' && (
        <GameScreen
          difficulty={activeDifficulty}
          customConfig={customConfig}
          sliderPosition={sliderPosition}
          onUpdateSliderPosition={handleUpdateSliderPosition}
          onFinishGame={handleGameFinish}
          onExit={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'lobby' && (
        <LobbyScreen
          difficulty={activeDifficulty}
          customConfig={customConfig}
          sliderPosition={sliderPosition}
          onUpdateSliderPosition={handleUpdateSliderPosition}
          onBack={() => setCurrentScreen('home')}
        />
      )}
      {currentScreen === 'summary' && (
        <SummaryScreen records={finishedRecords} onRestart={handleRestart} />
      )}
    </SafeAreaProvider>
  );
}
