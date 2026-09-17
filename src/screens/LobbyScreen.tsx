import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { VerticalSlider } from '../components/VerticalSlider';
import { CountdownRing } from '../components/CountdownRing';
import { ResultSplit } from '../components/ResultSplit';
import { Leaderboard } from '../components/Leaderboard';
import { useColorState } from '../hooks/useColorState';
import { hslToString } from '../utils/colorScorer';
import { triggerHaptic } from '../utils/haptics';

interface LobbyScreenProps {
  onBack: () => void;
  sliderPosition?: 'left' | 'right';
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onBack, sliderPosition = 'left' }) => {
  const insets = useSafeAreaInsets();
  const [playerName, setPlayerName] = useState('Golumolu');
  const [inputCode, setInputCode] = useState('');
  const [lockedIn, setLockedIn] = useState(false);

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
    userId,
    createRoom,
    joinRoom,
    startMatch,
    submitGuess,
    readyNextRound,
    leaveRoom,
  } = useMultiplayer();

  const { guess, setHue, setSaturation, setLightness, resetGuess } = useColorState();

  // Reset guess and lock-in state when guessing starts
  React.useEffect(() => {
    if (gameState === 'guessing') {
      resetGuess();
      setLockedIn(false);
    }
  }, [gameState, resetGuess]);

  const handleLockIn = () => {
    triggerHaptic('success');
    setLockedIn(true);
    submitGuess(guess);
  };

  const handleShareCode = async () => {
    triggerHaptic('light');
    const message = `Join my room in color-fool! Room code: ${roomCode}`;
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(roomCode || '');
        alert(`Room code ${roomCode} copied to clipboard!`);
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

    const myResult = roundResults.find((r) => r.name === playerName) || roundResults[0];

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
          <TouchableOpacity
            onPress={leaveRoom}
            style={styles.leaveBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.leaveText}>EXIT</Text>
          </TouchableOpacity>

          <View style={styles.centerHud}>
            <Text style={styles.gameTitle}>color-fool</Text>
            <Text style={styles.gameRound}>
              ROOM {roomCode} • ROUND {round} / 5
            </Text>
          </View>

          <Leaderboard players={players} />
        </View>

        {/* Preview Phase */}
        {isPreview && (
          <View style={styles.previewCenter}>
            <CountdownRing durationSeconds={previewDuration} />
          </View>
        )}

        {/* Guessing Phase */}
        {isGuessing && (
          <View style={styles.guessArea}>
            <View
              style={[
                styles.sliderRail,
                sliderPosition === 'right'
                  ? { right: 8, left: undefined }
                  : { left: 8, right: undefined },
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
                    ✓ GUESS LOCKED IN! WAITING FOR OTHERS...
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
            isLastRound={round >= 5}
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
                  .map((p, idx) => (
                    <View key={p.id} style={styles.podiumRow}>
                      <Text style={styles.podiumRank}>
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                      </Text>
                      <Text style={styles.podiumName}>{p.name}</Text>
                      <Text style={styles.podiumScore}>{p.score} pts</Text>
                    </View>
                  ))}
              </View>

              <TouchableOpacity style={styles.returnLobbyBtn} onPress={leaveRoom}>
                <Text style={styles.returnLobbyText}>RETURN TO LOBBY</Text>
              </TouchableOpacity>
            </View>
          )}
      </View>
    );
  }

  // 2. LOBBY SETUP SCREEN
  return (
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
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <View style={styles.statusIndicator}>
          <View
            style={[styles.statusDot, { backgroundColor: '#4ADE80' }]}
          />
          <Text style={styles.statusText}>MULTIPLAYER READY</Text>
        </View>
      </View>

      {errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠ {errorMessage}</Text>
        </View>
      )}

      {!roomCode ? (
        <View style={styles.card}>
          <Text style={styles.title}>MULTIPLAYER LOBBY</Text>
          <Text style={styles.subtitle}>Host or join a room (Up to 10 players)</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>YOUR DISPLAY NAME</Text>
            <TextInput
              style={styles.input}
              value={playerName}
              onChangeText={setPlayerName}
              maxLength={12}
              placeholder="e.g. ColorMaster"
              placeholderTextColor="#64748B"
            />
          </View>

          <TouchableOpacity
            style={[styles.hostBtn, !connected && styles.btnDisabled]}
            onPress={() => createRoom(playerName)}
            disabled={!connected}
            activeOpacity={0.85}
          >
            <Text style={styles.hostBtnText}>CREATE NEW ROOM</Text>
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
      ) : (
        <View style={styles.roomActiveCard}>
          <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
          <Text style={styles.roomCodeValue}>{roomCode}</Text>

          {/* 1-Tap Share Room Code */}
          <TouchableOpacity
            style={styles.shareCodeBtn}
            onPress={handleShareCode}
            activeOpacity={0.85}
          >
            <Text style={styles.shareCodeBtnText}>📤 SHARE 6-DIGIT CODE</Text>
          </TouchableOpacity>

          <Text style={styles.roomShareHint}>No login needed • Friends can join with this code</Text>

          <View style={styles.rosterCard}>
            <Text style={styles.rosterTitle}>CONNECTED PLAYERS ({players.length} / 10)</Text>
            <FlatList
              data={players}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <View style={styles.playerRow}>
                  <Text style={styles.playerIndex}>#{index + 1}</Text>
                  <Text style={styles.playerItemName}>{item.name}</Text>
                  {index === 0 && <Text style={styles.hostBadge}>HOST</Text>}
                </View>
              )}
            />
          </View>

          {isHost ? (
            <TouchableOpacity style={styles.startBtn} onPress={startMatch} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>START MATCH (5 ROUNDS)</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.waitingCard}>
              <Text style={styles.waitingText}>Waiting for host to start the match...</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
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
  label: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
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
  roomActiveCard: {
    backgroundColor: '#131D31',
    flex: 1,
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
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginVertical: 20,
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
  gameTopHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 20,
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
    left: 8,
    top: 40,
    bottom: 90,
    width: 140,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 15,
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
