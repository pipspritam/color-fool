import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  ScrollView,
  BackHandler,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { VerticalSlider } from '../components/VerticalSlider';
import { CountdownRing } from '../components/CountdownRing';
import { ResultSplit } from '../components/ResultSplit';
import { Leaderboard } from '../components/Leaderboard';
import { SettingsModal } from '../components/SettingsModal';
import {
  useColorState,
  Difficulty,
  CustomGameConfig,
  DIFFICULTY_CONFIG,
} from '../hooks/useColorState';
import { MultiplayerRoomSettings } from '../hooks/useMultiplayer';
import { hslToString } from '../utils/colorScorer';
import { triggerHaptic } from '../utils/haptics';
import { loadSavedSettings, savePlayerName, generateAutoPlayerName } from '../utils/storage';

interface LobbyScreenProps {
  difficulty: Difficulty;
  customConfig?: CustomGameConfig;
  sliderPosition?: 'left' | 'right';
  onUpdateSliderPosition?: (pos: 'left' | 'right') => void;
  onBack: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  difficulty,
  customConfig,
  sliderPosition = 'left',
  onUpdateSliderPosition,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const [playerName, setPlayerName] = useState(generateAutoPlayerName);
  const [isCustomName, setIsCustomName] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [lockedIn, setLockedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Load cached player name on mount
  useEffect(() => {
    loadSavedSettings()
      .then((settings) => {
        if (settings.playerName) {
          setPlayerName(settings.playerName);
        }
        setIsCustomName(settings.hasCustomName);
      })
      .catch((err) => {
        console.warn('Failed to load saved settings in lobby:', err);
      });
  }, []);

  const handlePlayerNameChange = (text: string) => {
    setPlayerName(text);
    setIsCustomName(true);
    savePlayerName(text, true);
  };

  const handleRandomizeName = () => {
    triggerHaptic('light');
    const autoName = generateAutoPlayerName();
    setPlayerName(autoName);
    setIsCustomName(false);
    savePlayerName(autoName, false);
  };

  const homeConfigSettings: MultiplayerRoomSettings = {
    difficulty,
    previewSeconds:
      difficulty === 'custom' && customConfig
        ? customConfig.previewSeconds
        : DIFFICULTY_CONFIG[difficulty as Exclude<Difficulty, 'custom'>].previewSeconds,
    guessSeconds: difficulty === 'custom' && customConfig ? customConfig.guessSeconds : 0,
    totalRounds: difficulty === 'custom' && customConfig ? customConfig.rounds : 5,
  };

  const {
    connected,
    roomCode,
    isHost,
    players,
    gameState,
    currentTarget,
    round,
    previewDuration,
    roundResults,
    errorMessage,
    readyPlayerIds,
    roomSettings,
    userId,
    createRoom,
    joinRoom,
    startMatch,
    updateCurrentGuess,
    submitGuess,
    readyNextRound,
    returnToLobby,
    leaveRoom,
  } = useMultiplayer();

  const { guess, setHue, setSaturation, setLightness, resetGuess } = useColorState();

  const guessRef = useRef(guess);
  guessRef.current = guess;

  // Intercept Android hardware back button
  useEffect(() => {
    const onBackPress = () => {
      if (gameState === 'summary') {
        // Return to room lobby, do not navigate back to HomeScreen
        triggerHaptic('light');
        returnToLobby();
        return true;
      }
      if (roomCode) {
        Alert.alert(
          'Leave Room?',
          'You will be disconnected from the multiplayer match.',
          [
            { text: 'Stay', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: leaveRoom },
          ]
        );
        return true;
      }
      onBack();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [gameState, roomCode, returnToLobby, leaveRoom, onBack]);

  // Reset guess and lock-in state when guessing starts, and register initial guess
  useEffect(() => {
    if (gameState === 'guessing') {
      resetGuess();
      setLockedIn(false);
      updateCurrentGuess({ h: 180, s: 50, l: 50 });
    } else if (gameState === 'preview') {
      setLockedIn(false);
    }
  }, [gameState, resetGuess, updateCurrentGuess]);

  // Live sync current slider values to room / host while adjusting
  useEffect(() => {
    if (gameState === 'guessing' && !lockedIn) {
      updateCurrentGuess(guess);
    }
  }, [guess, gameState, lockedIn, updateCurrentGuess]);

  const handleLockIn = useCallback(() => {
    triggerHaptic('success');
    setLockedIn(true);
    submitGuess(guessRef.current);
  }, [submitGuess]);

  // If round resolves before player manually clicked lock, ensure local locked status is marked true
  useEffect(() => {
    if (gameState === 'result' && !lockedIn) {
      setLockedIn(true);
    }
  }, [gameState, lockedIn]);

  const handleShareCode = async () => {
    triggerHaptic('light');
    const message = `Join my room in color-fool! Room code: ${roomCode}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(roomCode || '');
          Alert.alert('Copied!', `Room code ${roomCode} copied to clipboard!`);
        } catch {
          // Clipboard write failed
        }
      }
    } else {
      try {
        await Share.share({ message });
      } catch {}
    }
  };

  const hueColors = [
    '#ff0000',
    '#ffff00',
    '#00ff00',
    '#00ffff',
    '#0000ff',
    '#ff00ff',
    '#ff0000',
  ];

  const satColors = [
    `hsl(${guess.h}, 0%, ${guess.l}%)`,
    `hsl(${guess.h}, 100%, ${guess.l}%)`,
  ];

  const lightColors = [
    '#000000',
    `hsl(${guess.h}, ${guess.s}%, 50%)`,
    '#ffffff',
  ];

  // 1. IN-GAME MULTIPLAYER SCREENS
  if (gameState !== 'lobby') {
    const isPreview = gameState === 'preview';
    const isGuessing = gameState === 'guessing';
    const isResult = gameState === 'result';
    const isSummary = gameState === 'summary';

    const myResult =
      roundResults.find((r) => r.id === userId || r.name === playerName) || roundResults[0];

    const backgroundColor = isPreview
      ? hslToString(currentTarget)
      : hslToString(guess);

    return (
      <View style={[styles.canvas, { backgroundColor }]}>
        {/* Top HUD */}
        <View
          style={[
            styles.gameTopHud,
            {
              paddingTop: Math.max(insets.top, 24) + 8,
            },
          ]}
        >
          <View style={styles.hudLeftGroup}>
            <TouchableOpacity
              onPress={leaveRoom}
              style={styles.leaveBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.leaveText}>EXIT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setShowSettings(true);
              }}
              style={styles.inGameSettingsBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.inGameSettingsIcon}>⚙</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerHud}>
            <Text style={styles.gameTitle}>color-fool</Text>
            <Text style={styles.gameRound}>
              ROOM {roomCode} • ROUND {round} / {roomSettings.totalRounds}
            </Text>
          </View>

          <Leaderboard
            players={players}
            isResultPhase={isResult}
            currentUserId={userId}
          />
        </View>

        {/* Preview Phase */}
        {isPreview && (
          <View style={styles.previewCenter}>
            <CountdownRing
              key={`preview-${round}`}
              durationSeconds={previewDuration}
              label="MEMORIZE COLOR"
            />
          </View>
        )}

        {/* Guessing Phase */}
        {isGuessing && (
          <View style={styles.guessArea}>
            {/* Real-time Guess Timer or Unlimited Indicator */}
            {roomSettings.guessSeconds > 0 ? (
              <View style={styles.guessTimerWrap} pointerEvents="none">
                <CountdownRing
                  key={`guess-${round}`}
                  durationSeconds={roomSettings.guessSeconds}
                  label="TIME REMAINING"
                  size="compact"
                  onFinish={!lockedIn ? handleLockIn : undefined}
                />
              </View>
            ) : (
              <View style={styles.guessTimerWrap} pointerEvents="none">
                <View style={styles.unlimitedTimerBadge}>
                  <Text style={styles.unlimitedTimerTitle}>∞ UNLIMITED TIME</Text>
                  <Text style={styles.unlimitedTimerSub}>
                    {players.filter((p) => p.locked).length} / {players.length} LOCKED IN
                  </Text>
                </View>
              </View>
            )}

            <View
              style={[
                styles.sliderRail,
                sliderPosition === 'right' ? styles.sliderRailRight : styles.sliderRailLeft,
                {
                  top: Math.max(insets.top, 24) + 70,
                  bottom: Math.max(insets.bottom, 20) + 80,
                },
              ]}
            >
              <View style={styles.sliderItem}>
                <VerticalSlider
                  value={guess.h}
                  min={0}
                  max={360}
                  colors={hueColors}
                  onChange={setHue}
                  width={34}
                />
                <Text style={styles.sliderLabel}>H</Text>
              </View>

              <View style={styles.sliderItem}>
                <VerticalSlider
                  value={guess.s}
                  min={0}
                  max={100}
                  colors={satColors}
                  onChange={setSaturation}
                  width={34}
                />
                <Text style={styles.sliderLabel}>S</Text>
              </View>

              <View style={styles.sliderItem}>
                <VerticalSlider
                  value={guess.l}
                  min={0}
                  max={100}
                  colors={lightColors}
                  onChange={setLightness}
                  width={34}
                />
                <Text style={styles.sliderLabel}>L</Text>
              </View>
            </View>

            <View
              style={[
                styles.bottomHud,
                {
                  bottom: Math.max(insets.bottom, 20) + 16,
                },
              ]}
            >
              {lockedIn ? (
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>
                    ✓ GUESS LOCKED IN! WAITING FOR OTHERS ({players.filter((p) => p.locked).length} / {players.length})...
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.lockInBtn}
                  onPress={handleLockIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.lockInText}>LOCK IN GUESS</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Round Results */}
        {isResult && myResult && (
          <ResultSplit
            target={currentTarget}
            guess={myResult.guess}
            deltaE={myResult.deltaE}
            score={myResult.points}
            roundNumber={round}
            onNextRound={readyNextRound}
            isLastRound={round >= roomSettings.totalRounds}
            readyCount={readyPlayerIds.length}
            totalPlayers={players.length}
            hasReadied={readyPlayerIds.includes(userId)}
          />
        )}

          {/* Match Summary Podium */}
          {isSummary && (
            <View style={styles.podiumOverlay}>
              <Text style={styles.podiumTitle}>🏆 MATCH FINISHED</Text>
              <Text style={styles.podiumSub}>FINAL PODIUM</Text>

              <View style={styles.podiumCard}>
                {players
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((p, idx) => {
                    const isSelf = p.id === userId;
                    return (
                      <View
                        key={p.id}
                        style={[styles.podiumRow, isSelf && styles.podiumRowSelf]}
                      >
                        <Text style={styles.podiumRank}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </Text>
                        <Text
                          style={[styles.podiumName, isSelf && styles.podiumNameSelf]}
                          numberOfLines={1}
                        >
                          {p.name} {isSelf ? '★' : ''}
                        </Text>
                        <Text style={styles.podiumScore}>{p.score.toFixed(2)} pts</Text>
                      </View>
                    );
                  })}
              </View>

              <TouchableOpacity style={styles.returnLobbyBtn} onPress={returnToLobby}>
                <Text style={styles.returnLobbyText}>RETURN TO LOBBY</Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Settings Modal (In-Game) */}
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
          sliderPosition={sliderPosition}
          onUpdateSliderPosition={onUpdateSliderPosition}
        />
      </View>
    );
  }

  // 2. LOBBY SETUP SCREEN
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View
        style={[
          styles.lobbyContainer,
          {
            paddingTop: Math.max(insets.top, 24) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 8,
          },
        ]}
      >
      <View style={styles.lobbyHeader}>
        <TouchableOpacity
          onPress={() => {
            if (roomCode) {
              Alert.alert(
                'Leave Room?',
                'You will be disconnected from the multiplayer room.',
                [
                  { text: 'Stay', style: 'cancel' },
                  { text: 'Leave', style: 'destructive', onPress: leaveRoom },
                ]
              );
            } else {
              onBack();
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={roomCode ? 'Leave room' : 'Back to home screen'}
        >
          <Text style={styles.backText}>{roomCode ? '← LEAVE ROOM' : '← BACK'}</Text>
        </TouchableOpacity>
        <View style={styles.headerRightRow}>
          <View style={styles.statusIndicator}>
            <View
              style={[styles.statusDot, { backgroundColor: connected ? '#4ADE80' : '#EF4444' }]}
            />
            <Text style={styles.statusText}>{connected ? 'ONLINE' : 'CONNECTING...'}</Text>
          </View>
          <TouchableOpacity
            style={styles.lobbySettingsBtn}
            onPress={() => {
              triggerHaptic('light');
              setShowSettings(true);
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Game settings"
          >
            <Text style={styles.lobbySettingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {errorMessage}</Text>
        </View>
      )}

      {!roomCode ? (
        <ScrollView
          style={styles.lobbyScroll}
          contentContainerStyle={styles.lobbyScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 0: Selected Mode & Settings from Home */}
          <View style={styles.selectedConfigCard}>
            <View style={styles.selectedConfigHeader}>
              <View style={styles.configBadge}>
                <Text style={styles.configBadgeText}>
                  MODE: {difficulty.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.railBadge}
                onPress={() => {
                  triggerHaptic('light');
                  setShowSettings(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.railBadgeText}>
                  SLIDERS: {sliderPosition.toUpperCase()} ⚙
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.selectedConfigTitle}>ROOM CONFIGURATION</Text>
            <Text style={styles.selectedConfigSub}>
              Rooms you create will host with this exact mode and settings selected from Home.
            </Text>

            <View style={styles.selectedPillRow}>
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillVal}>{homeConfigSettings.totalRounds}</Text>
                <Text style={styles.selectedPillLbl}>ROUNDS</Text>
              </View>
              <View style={styles.selectedPillDivider} />
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillVal}>
                  {homeConfigSettings.previewSeconds.toFixed(2)}s
                </Text>
                <Text style={styles.selectedPillLbl}>PREVIEW</Text>
              </View>
              <View style={styles.selectedPillDivider} />
              <View style={styles.selectedPill}>
                <Text
                  style={[
                    styles.selectedPillVal,
                    homeConfigSettings.guessSeconds <= 0 && { fontSize: 11 },
                  ]}
                >
                  {homeConfigSettings.guessSeconds > 0
                    ? `${homeConfigSettings.guessSeconds.toFixed(2)}s`
                    : 'UNLIMITED'}
                </Text>
                <Text style={styles.selectedPillLbl}>GUESS TIME</Text>
              </View>
              <View style={styles.selectedPillDivider} />
              <View style={styles.selectedPill}>
                <Text style={styles.selectedPillVal}>{homeConfigSettings.totalRounds * 10}</Text>
                <Text style={styles.selectedPillLbl}>MAX PTS</Text>
              </View>
            </View>
          </View>

          {/* Card 1: Host or Join */}
          <View style={styles.card}>
            <Text style={styles.title}>MULTIPLAYER LOBBY</Text>
            <Text style={styles.subtitle}>Host or join a room (Up to 10 players)</Text>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>YOUR DISPLAY NAME</Text>
                <Text
                  style={[
                    styles.nameStatusBadge,
                    isCustomName ? styles.nameCustomBadge : styles.nameAutoBadge,
                  ]}
                >
                  {isCustomName ? 'CUSTOM (CACHED)' : 'AUTO-GENERATED'}
                </Text>
              </View>

              <View style={styles.nameInputRow}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  value={playerName}
                  onChangeText={handlePlayerNameChange}
                  maxLength={12}
                  placeholder="e.g. ColorMaster"
                  placeholderTextColor="#64748B"
                />
                <TouchableOpacity
                  style={styles.diceBtn}
                  onPress={handleRandomizeName}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Generate random player name"
                >
                  <Text style={styles.diceIcon}>🎲</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.nameHint}>
                {isCustomName
                  ? 'Your custom name is saved and will be remembered.'
                  : 'Tap 🎲 to roll another name, or edit above to customize.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.hostBtn, !connected && styles.btnDisabled]}
              onPress={() => createRoom(playerName, homeConfigSettings)}
              disabled={!connected}
              activeOpacity={0.85}
            >
              <Text style={styles.hostBtnText}>
                CREATE NEW ROOM ({difficulty.toUpperCase()})
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR ENTER CODE</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.joinRow}>
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="6-DIGIT CODE"
                placeholderTextColor="#64748B"
                value={inputCode}
                onChangeText={setInputCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.joinBtn, inputCode.trim().length !== 6 && styles.btnDisabled]}
                onPress={() => joinRoom(inputCode.trim(), playerName)}
                disabled={inputCode.trim().length !== 6 || !connected}
                activeOpacity={0.85}
              >
                <Text style={styles.joinBtnText}>JOIN ROOM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Card 2: Multiplayer Mode Details */}
          <View style={styles.modeDetailsCard}>
            <View style={styles.modeHeaderRow}>
              <View style={styles.modeTag}>
                <Text style={styles.modeTagText}>{difficulty.toUpperCase()} BATTLE</Text>
              </View>
              <Text style={styles.modeCapacity}>UP TO 10 PLAYERS</Text>
            </View>

            <Text style={styles.modeTitle}>MULTIPLAYER MODE DETAILS</Text>
            <Text style={styles.modeSubtitle}>
              Real-time competitive color reconstruction on synchronized countdown timers.
            </Text>

            {/* 4-Item Grid with Dynamic Values */}
            <View style={styles.specsGrid}>
              <View style={styles.specBox}>
                <Text style={styles.specIcon}>🔄</Text>
                <Text style={styles.specValue}>{homeConfigSettings.totalRounds} ROUNDS</Text>
                <Text style={styles.specLabel}>Match Length</Text>
                <Text style={styles.specSub}>Synchronized for all</Text>
              </View>

              <View style={styles.specBox}>
                <Text style={styles.specIcon}>👁</Text>
                <Text style={styles.specValue}>
                  {homeConfigSettings.previewSeconds.toFixed(2)}s
                </Text>
                <Text style={styles.specLabel}>Preview Time</Text>
                <Text style={styles.specSub}>Memorize target color</Text>
              </View>

              <View style={styles.specBox}>
                <Text style={styles.specIcon}>⏱</Text>
                <Text
                  style={[
                    styles.specValue,
                    homeConfigSettings.guessSeconds <= 0 && { fontSize: 13 },
                  ]}
                >
                  {homeConfigSettings.guessSeconds > 0
                    ? `${homeConfigSettings.guessSeconds.toFixed(2)}s`
                    : 'UNLIMITED'}
                </Text>
                <Text style={styles.specLabel}>Guess Limit</Text>
                <Text style={styles.specSub}>
                  {homeConfigSettings.guessSeconds > 0
                    ? 'Auto locks on timeout'
                    : 'Locks when all submit'}
                </Text>
              </View>

              <View style={styles.specBox}>
                <Text style={styles.specIcon}>🎯</Text>
                <Text style={styles.specValue}>{homeConfigSettings.totalRounds * 10} PTS</Text>
                <Text style={styles.specLabel}>Max Score</Text>
                <Text style={styles.specSub}>CIE ΔE accuracy</Text>
              </View>
            </View>

            {/* Rules Breakdown */}
            <View style={styles.rulesSection}>
              <Text style={styles.rulesHeader}>HOW MULTIPLAYER WORKS</Text>

              <View style={styles.ruleRow}>
                <Text style={styles.ruleNumber}>1</Text>
                <View style={styles.ruleCol}>
                  <Text style={styles.ruleHeading}>Host Creates Room</Text>
                  <Text style={styles.ruleDetail}>
                    Host creates a room with the selected {difficulty.toUpperCase()} mode. Friends join instantly with the 6-digit code.
                  </Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={styles.ruleNumber}>2</Text>
                <View style={styles.ruleCol}>
                  <Text style={styles.ruleHeading}>Identical Target Colors</Text>
                  <Text style={styles.ruleDetail}>
                    Each round starts with a {homeConfigSettings.previewSeconds.toFixed(2)}s preview of the same secret color shown to all players simultaneously.
                  </Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={styles.ruleNumber}>3</Text>
                <View style={styles.ruleCol}>
                  <Text style={styles.ruleHeading}>Reconstruct & Lock In</Text>
                  <Text style={styles.ruleDetail}>
                    {homeConfigSettings.guessSeconds > 0
                      ? `Adjust sliders (${sliderPosition.toUpperCase()} dock). Lock in early or let the ${homeConfigSettings.guessSeconds.toFixed(2)}s timer auto lock your guess.`
                      : `Adjust sliders (${sliderPosition.toUpperCase()} dock) with unlimited time. Once every player locks in their guess, the round resolves immediately.`}
                  </Text>
                </View>
              </View>

              <View style={styles.ruleRow}>
                <Text style={styles.ruleNumber}>4</Text>
                <View style={styles.ruleCol}>
                  <Text style={styles.ruleHeading}>Live Leaderboard & Podium</Text>
                  <Text style={styles.ruleDetail}>
                    Side-by-side color swatches and ΔE scores are revealed after each round. Final 🥇 🥈 🥉 podium crowns the champion after {homeConfigSettings.totalRounds} rounds!
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.lobbyScroll}
          contentContainerStyle={styles.lobbyScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.roomActiveCard}>
            <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
            <Text style={styles.roomCodeValue}>{roomCode}</Text>

            {/* Active Room Mode Badges */}
            <View style={styles.roomBadgeRow}>
              <View style={styles.configBadge}>
                <Text style={styles.configBadgeText}>
                  MODE: {roomSettings.difficulty.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.railBadge}
                onPress={() => {
                  triggerHaptic('light');
                  setShowSettings(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.railBadgeText}>
                  SLIDERS: {sliderPosition.toUpperCase()} ⚙
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1-Tap Share Room Code */}
            <TouchableOpacity
              style={styles.shareCodeBtn}
              onPress={handleShareCode}
              activeOpacity={0.85}
            >
              <Text style={styles.shareCodeBtnText}>📤 SHARE 6-DIGIT CODE</Text>
            </TouchableOpacity>

            <Text style={styles.roomShareHint}>No login needed • Friends can join with this code</Text>

            {/* Match Specs Pill Row with Active Room Settings */}
            <View style={styles.roomSpecsRow}>
              <View style={styles.roomSpecBadge}>
                <Text style={styles.roomSpecBadgeVal}>{roomSettings.totalRounds}</Text>
                <Text style={styles.roomSpecBadgeLbl}>ROUNDS</Text>
              </View>
              <View style={styles.roomSpecDivider} />
              <View style={styles.roomSpecBadge}>
                <Text style={styles.roomSpecBadgeVal}>
                  {roomSettings.previewSeconds.toFixed(2)}s
                </Text>
                <Text style={styles.roomSpecBadgeLbl}>PREVIEW</Text>
              </View>
              <View style={styles.roomSpecDivider} />
              <View style={styles.roomSpecBadge}>
                <Text
                  style={[
                    styles.roomSpecBadgeVal,
                    roomSettings.guessSeconds <= 0 && { fontSize: 11 },
                  ]}
                >
                  {roomSettings.guessSeconds > 0
                    ? `${roomSettings.guessSeconds.toFixed(2)}s`
                    : 'UNLIMITED'}
                </Text>
                <Text style={styles.roomSpecBadgeLbl}>GUESS TIME</Text>
              </View>
              <View style={styles.roomSpecDivider} />
              <View style={styles.roomSpecBadge}>
                <Text style={styles.roomSpecBadgeVal}>{roomSettings.totalRounds * 10}</Text>
                <Text style={styles.roomSpecBadgeLbl}>POINTS</Text>
              </View>
            </View>

            {/* Mode Details Callout with Active Room Rules */}
            <View style={styles.activeModeDetailsBox}>
              <Text style={styles.activeModeDetailsTitle}>MATCH CONFIGURATION & RULES</Text>
              <Text style={styles.activeModeDetailsSub}>
                • Mode: {roomSettings.difficulty.toUpperCase()} ({roomSettings.totalRounds} Synchronized Rounds){'\n'}
                • Preview: {roomSettings.previewSeconds.toFixed(2)}s • Guess Limit: {roomSettings.guessSeconds > 0 ? `${roomSettings.guessSeconds.toFixed(2)}s (auto lock-in)` : 'Unlimited (locks when all submit)'}{'\n'}
                • Sliders Rail: Docked on {sliderPosition.toUpperCase()} side{'\n'}
                • Scoring: Perceptual CIE ΔE distance (0 to 10 points per round)
              </Text>
            </View>

            <View style={styles.rosterCard}>
              <Text style={styles.rosterTitle}>CONNECTED PLAYERS ({players.length} / 10)</Text>
              {players.map((item, index) => (
                <View key={item.id} style={styles.playerRow}>
                  <Text style={styles.playerIndex}>#{index + 1}</Text>
                  <Text style={styles.playerItemName}>{item.name}</Text>
                  {index === 0 && <Text style={styles.hostBadge}>HOST</Text>}
                </View>
              ))}
            </View>

            {isHost ? (
              <TouchableOpacity style={styles.startBtn} onPress={startMatch} activeOpacity={0.85}>
                <Text style={styles.startBtnText}>
                  START MATCH ({roomSettings.totalRounds} ROUNDS)
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.waitingCard}>
                <Text style={styles.waitingText}>Waiting for host to start the match...</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.cancelRoomBtn}
              onPress={() => {
                Alert.alert(
                  'Leave Room?',
                  'You will disconnect and return to the multiplayer menu.',
                  [
                    { text: 'Stay', style: 'cancel' },
                    { text: 'Leave Room', style: 'destructive', onPress: leaveRoom },
                  ]
                );
              }}
              activeOpacity={0.7}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Leave room"
            >
              <Text style={styles.cancelRoomText}>✕ LEAVE ROOM</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Settings Modal (Lobby) */}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        sliderPosition={sliderPosition}
        onUpdateSliderPosition={onUpdateSliderPosition}
      />
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
  },
  lobbyContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    padding: 20,
  },
  lobbyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  backText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 14,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#131D31',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lobbySettingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#131D31',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lobbySettingsIcon: {
    color: '#94A3B8',
    fontSize: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#131D31',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  nameStatusBadge: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  nameAutoBadge: {
    color: '#38BDF8',
  },
  nameCustomBadge: {
    color: '#10B981',
  },
  nameInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
  },
  diceBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  diceIcon: {
    fontSize: 20,
  },
  nameHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 6,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hostBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  hostBtnText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 12,
    letterSpacing: 1,
  },
  joinRow: {
    flexDirection: 'row',
    gap: 12,
  },
  codeInput: {
    flex: 1,
    letterSpacing: 4,
    textAlign: 'center',
    fontSize: 18,
  },
  joinBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 22,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  lobbyScroll: {
    flex: 1,
    width: '100%',
  },
  lobbyScrollContent: {
    paddingBottom: 32,
  },
  selectedConfigCard: {
    backgroundColor: '#131D31',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  selectedConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  configBadge: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  configBadgeText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1,
  },
  railBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  railBadgeText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  selectedConfigTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectedConfigSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  selectedPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'space-around',
  },
  selectedPill: {
    alignItems: 'center',
  },
  selectedPillVal: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '900',
  },
  selectedPillLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  selectedPillDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  roomBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  guessTimerWrap: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 18,
  },
  unlimitedTimerBadge: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  unlimitedTimerTitle: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  unlimitedTimerSub: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  modeDetailsCard: {
    backgroundColor: '#131D31',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modeTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  modeTagText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  modeCapacity: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
  },
  modeTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  modeSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  specBox: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  specIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  specValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  specLabel: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  specSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
  },
  rulesSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 16,
    gap: 12,
  },
  rulesHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  ruleNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E293B',
    color: '#38BDF8',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 11,
    fontWeight: '900',
  },
  ruleCol: {
    flex: 1,
  },
  ruleHeading: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  ruleDetail: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  roomSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: '100%',
    marginVertical: 14,
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  roomSpecBadge: {
    alignItems: 'center',
  },
  roomSpecBadgeVal: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '900',
  },
  roomSpecBadgeLbl: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  roomSpecDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeModeDetailsBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  activeModeDetailsTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  activeModeDetailsSub: {
    color: '#94A3B8',
    fontSize: 11,
    lineHeight: 17,
  },
  roomActiveCard: {
    backgroundColor: '#131D31',
    width: '100%',
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  roomCodeLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  roomCodeValue: {
    color: '#38BDF8',
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: 8,
    marginVertical: 6,
  },
  roomShareHint: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  shareCodeBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginVertical: 10,
  },
  shareCodeBtnText: {
    color: '#38BDF8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rosterCard: {
    backgroundColor: '#1E293B',
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginVertical: 14,
  },
  rosterTitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  playerIndex: {
    color: '#64748B',
    width: 28,
    fontWeight: '700',
  },
  playerItemName: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  hostBadge: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  startBtn: {
    backgroundColor: '#38BDF8',
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1,
  },
  waitingCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  waitingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  cancelRoomBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    width: '100%',
    alignItems: 'center',
  },
  cancelRoomText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gameTopHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 20,
  },
  hudLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  leaveBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  leaveText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  inGameSettingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inGameSettingsIcon: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  centerHud: {
    alignItems: 'center',
  },
  gameTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gameRound: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  previewCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guessArea: {
    flex: 1,
    position: 'relative',
  },
  sliderRail: {
    position: 'absolute',
    top: 40,
    bottom: 90,
    width: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 15,
  },
  sliderRailLeft: {
    left: 8,
  },
  sliderRailRight: {
    right: 8,
  },
  sliderItem: {
    height: '100%',
    alignItems: 'center',
  },
  sliderLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomHud: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  lockInBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    paddingHorizontal: 36,
    paddingVertical: 15,
    borderRadius: 30,
  },
  lockInText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.8,
  },
  lockedBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.9)',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  lockedBadgeText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  podiumOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 13, 22, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 100,
  },
  podiumTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 2,
  },
  podiumSub: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    marginVertical: 8,
  },
  podiumCard: {
    backgroundColor: '#131D31',
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginVertical: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  podiumRowSelf: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 8,
  },
  podiumRank: {
    width: 36,
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  podiumName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  podiumNameSelf: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  podiumScore: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
  },
  returnLobbyBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  returnLobbyText: {
    color: '#090D16',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
