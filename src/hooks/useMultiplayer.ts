import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { HSLColor, calculateDeltaE, scoreFromDeltaE } from '../utils/colorScorer';
import { PlayerScore } from '../components/Leaderboard';
import { Difficulty, generateRandomTarget } from './useColorState';
import { generateAutoPlayerName } from '../utils/storage';
import { triggerHaptic } from '../utils/haptics';

export interface RoundResultData {
  id: string;
  name: string;
  guess: HSLColor;
  deltaE: number;
  points: number;
  totalScore: number;
}

export interface MultiplayerRoomSettings {
  difficulty: Difficulty;
  previewSeconds: number;
  guessSeconds: number;
  totalRounds: number;
}

export function useMultiplayer() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [gameState, setGameState] = useState<
    'lobby' | 'preview' | 'guessing' | 'result' | 'summary'
  >('lobby');
  const gameStateRef = useRef<'lobby' | 'preview' | 'guessing' | 'result' | 'summary'>('lobby');

  const updateGameState = useCallback(
    (newState: 'lobby' | 'preview' | 'guessing' | 'result' | 'summary') => {
      gameStateRef.current = newState;
      setGameState(newState);
    },
    []
  );

  const [currentTarget, setCurrentTarget] = useState<HSLColor>({ h: 0, s: 0, l: 50 });
  const [round, setRound] = useState(1);
  const [previewDuration, setPreviewDuration] = useState(3.0);
  const [roundResults, setRoundResults] = useState<RoundResultData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readyPlayerIds, setReadyPlayerIds] = useState<string[]>([]);
  const [roomSettings, setRoomSettings] = useState<MultiplayerRoomSettings>({
    difficulty: 'medium',
    previewSeconds: 3.0,
    guessSeconds: 0,
    totalRounds: 5,
  });

  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string>(`user_${Math.random().toString(36).slice(2, 9)}`);
  const playerNameRef = useRef<string>(generateAutoPlayerName());
  const isHostRef = useRef(false);
  const roundTimerRef = useRef<any>(null);
  const autoAdvanceTimerRef = useRef<any>(null);
  const previewTimerRef = useRef<any>(null);
  const updateGuessDebounceTimerRef = useRef<any>(null);
  const currentTargetRef = useRef<HSLColor>({ h: 0, s: 0, l: 50 });
  const roundRef = useRef(1);
  const roomSettingsRef = useRef<MultiplayerRoomSettings>({
    difficulty: 'medium',
    previewSeconds: 3.0,
    guessSeconds: 0,
    totalRounds: 5,
  });
  const lockedSubmissionsRef = useRef<Map<string, HSLColor>>(new Map());
  const liveGuessesRef = useRef<Map<string, HSLColor>>(new Map());
  const scoresRef = useRef<Map<string, number>>(new Map());
  const readyPlayerIdsRef = useRef<Set<string>>(new Set());
  const playersRef = useRef<PlayerScore[]>([]);

  const advanceRoundRef = useRef<() => void>(() => {});
  const resolveRoundRef = useRef<() => void>(() => {});

  // Check Supabase connection
  useEffect(() => {
    setConnected(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (roundTimerRef.current) {
        clearTimeout(roundTimerRef.current);
        roundTimerRef.current = null;
      }
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      if (updateGuessDebounceTimerRef.current) {
        clearTimeout(updateGuessDebounceTimerRef.current);
        updateGuessDebounceTimerRef.current = null;
      }
    };
  }, []);

  // Host: resolve round
  const resolveRound = useCallback(() => {
    if (!channelRef.current || !isHostRef.current || gameStateRef.current !== 'guessing') return;

    if (roundTimerRef.current) {
      clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    const results: RoundResultData[] = [];
    const channel = channelRef.current;
    const target = currentTargetRef.current;

    // Reset ready-ups for this result phase
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);

    // Build results from latest player presence and local roster
    const state = channel.presenceState();
    const currentPresences = Object.values(state).flat() as any[];

    // Collect all active player identities
    const playerMap = new Map<string, { id: string; name: string }>();
    for (const p of currentPresences) {
      if (p && p.id) playerMap.set(p.id, { id: p.id, name: p.name || 'Player' });
    }
    for (const p of playersRef.current) {
      if (p && p.id && !playerMap.has(p.id)) playerMap.set(p.id, { id: p.id, name: p.name || 'Player' });
    }
    if (!playerMap.has(userIdRef.current)) {
      playerMap.set(userIdRef.current, { id: userIdRef.current, name: playerNameRef.current });
    }

    const updatedPlayers: PlayerScore[] = [];

    for (const p of playerMap.values()) {
      const pGuess =
        lockedSubmissionsRef.current.get(p.id) ||
        liveGuessesRef.current.get(p.id) ||
        { h: 180, s: 50, l: 50 };
      const deltaE = calculateDeltaE(target, pGuess);
      const points = scoreFromDeltaE(deltaE);
      const prevScore = scoresRef.current.get(p.id) || 0;
      const newScore = Math.round((prevScore + points) * 100) / 100;
      scoresRef.current.set(p.id, newScore);

      results.push({
        id: p.id,
        name: p.name,
        guess: pGuess,
        deltaE,
        points,
        totalScore: newScore,
      });

      updatedPlayers.push({
        id: p.id,
        name: p.name,
        score: newScore,
        locked: true,
        deltaE,
        lastRoundScore: points,
      });
    }

    results.sort((a, b) => b.points - a.points);
    updatedPlayers.sort((a, b) => b.score - a.score);

    setRoundResults(results);
    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;
    updateGameState('result');

    // Broadcast results to all players
    channel.send({
      type: 'broadcast',
      event: 'ROUND_RESULTS',
      payload: { results, players: updatedPlayers },
    });

    // Auto-advance safety timer (6 seconds): advances to next color if players don't manually tap
    autoAdvanceTimerRef.current = setTimeout(() => {
      advanceRoundRef.current();
    }, 6000);
  }, []);

  // Host: advance or start round
  const advanceRound = useCallback(() => {
    if (!channelRef.current || !isHostRef.current) return;
    const channel = channelRef.current;

    if (roundTimerRef.current) {
      clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    // Reset ready tracking for the upcoming round
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);

    const nextRound = roundRef.current + 1;
    roundRef.current = nextRound;
    setRound(nextRound);

    const maxRounds = roomSettingsRef.current.totalRounds || 5;

    if (nextRound > maxRounds) {
      updateGameState('summary');
      const state = channel.presenceState();
      const currentPresences = Object.values(state).flat() as any[];

      const playerMap = new Map<string, { id: string; name: string }>();
      for (const p of currentPresences) {
        if (p && p.id) playerMap.set(p.id, { id: p.id, name: p.name || 'Player' });
      }
      for (const p of playersRef.current) {
        if (p && p.id && !playerMap.has(p.id)) playerMap.set(p.id, { id: p.id, name: p.name || 'Player' });
      }
      if (!playerMap.has(userIdRef.current)) {
        playerMap.set(userIdRef.current, { id: userIdRef.current, name: playerNameRef.current });
      }

      const finalPlayers = Array.from(playerMap.values())
        .map((p) => ({
          id: p.id,
          name: p.name,
          score: scoresRef.current.get(p.id) || 0,
          locked: false,
        }))
        .sort((a, b) => b.score - a.score);

      setPlayers(finalPlayers);
      playersRef.current = finalPlayers;

      channel.send({
        type: 'broadcast',
        event: 'MATCH_SUMMARY',
        payload: { players: finalPlayers },
      });
      return;
    }

    // Reset submissions and locked status
    lockedSubmissionsRef.current.clear();
    liveGuessesRef.current.clear();
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        locked: false,
        score: nextRound === 1 ? 0 : (scoresRef.current.get(p.id) ?? p.score),
        lastRoundScore: undefined,
        deltaE: undefined,
      }))
    );
    if (playersRef.current) {
      playersRef.current = playersRef.current.map((p) => ({
        ...p,
        locked: false,
        score: nextRound === 1 ? 0 : (scoresRef.current.get(p.id) ?? p.score),
        lastRoundScore: undefined,
        deltaE: undefined,
      }));
    }

    // Generate random target with selected room difficulty
    const newTarget = generateRandomTarget(roomSettingsRef.current.difficulty);
    currentTargetRef.current = newTarget;
    setCurrentTarget(newTarget);
    updateGameState('preview');

    const previewSec = roomSettingsRef.current.previewSeconds || 3.0;
    const previewMs = Math.round(previewSec * 1000);
    setPreviewDuration(previewSec);
    const isUnlimitedGuess =
      !roomSettingsRef.current.guessSeconds || roomSettingsRef.current.guessSeconds <= 0;
    const guessMs = isUnlimitedGuess ? 0 : Math.round(roomSettingsRef.current.guessSeconds * 1000);

    // Broadcast preview to room with active match settings
    channel.send({
      type: 'broadcast',
      event: 'ROUND_PREVIEW',
      payload: {
        target: newTarget,
        duration: previewMs,
        guessTimeout: guessMs,
        round: nextRound,
        totalRounds: maxRounds,
        difficulty: roomSettingsRef.current.difficulty,
      },
    });

    // After preview, broadcast guess start
    previewTimerRef.current = setTimeout(() => {
      previewTimerRef.current = null;
      updateGameState('guessing');
      channel.send({
        type: 'broadcast',
        event: 'START_GUESSING',
        payload: { timeout: guessMs },
      });

      // guess timer
      if (roundTimerRef.current) {
        clearTimeout(roundTimerRef.current);
        roundTimerRef.current = null;
      }
      if (guessMs > 0) {
        // Add 800ms network buffer so all client auto-locks have time to arrive
        roundTimerRef.current = setTimeout(() => {
          resolveRoundRef.current();
        }, guessMs + 800);
      } else {
        // Safety timeout for unlimited mode (120s) so match never hangs if a player device sleeps
        roundTimerRef.current = setTimeout(() => {
          resolveRoundRef.current();
        }, 120000);
      }
    }, previewMs);
  }, [updateGameState]);

  resolveRoundRef.current = resolveRound;
  advanceRoundRef.current = advanceRound;

  const checkAllSubmitted = useCallback((channel: RealtimeChannel) => {
    if (!isHostRef.current || gameStateRef.current !== 'guessing') return;
    const state = channel.presenceState();
    const presences = Object.values(state).flat() as any[];
    const activeIds = new Set<string>();
    for (const p of presences) {
      if (p && p.id) activeIds.add(p.id);
    }
    for (const p of playersRef.current) {
      if (p && p.id) activeIds.add(p.id);
    }
    activeIds.add(userIdRef.current);

    if (activeIds.size === 0) return;

    const allSubmitted = Array.from(activeIds).every((id) => lockedSubmissionsRef.current.has(id));

    if (allSubmitted) {
      if (roundTimerRef.current) {
        clearTimeout(roundTimerRef.current);
        roundTimerRef.current = null;
      }
      resolveRoundRef.current();
    }
  }, []);

  const checkAllReady = useCallback((channel: RealtimeChannel) => {
    if (!isHostRef.current || gameStateRef.current !== 'result') return;
    const state = channel.presenceState();
    const presences = Object.values(state).flat() as any[];
    const activeIds = new Set<string>();
    for (const p of presences) {
      if (p && p.id) activeIds.add(p.id);
    }
    for (const p of playersRef.current) {
      if (p && p.id) activeIds.add(p.id);
    }
    activeIds.add(userIdRef.current);

    if (activeIds.size > 0 && Array.from(activeIds).every((id) => readyPlayerIdsRef.current.has(id))) {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
      advanceRoundRef.current();
    }
  }, []);

  // Connect to room channel
  const setupChannel = useCallback(
    (code: string, asHost: boolean, pName: string, hostSettings?: MultiplayerRoomSettings) => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (hostSettings) {
        setRoomSettings(hostSettings);
        roomSettingsRef.current = hostSettings;
        setPreviewDuration(hostSettings.previewSeconds || 3.0);
      }

      const channelName = `room-${code}`;
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: userIdRef.current },
        },
      });

      channelRef.current = channel;

      // 1. Presence: sync players list and host settings
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];

        // DUPLICATE NAME ENFORCEMENT
        // A) Guest-side check: if any other connected player already has our chosen name
        if (!asHost && !isHostRef.current) {
          const myNameLower = pName.trim().toLowerCase();
          const duplicate = presences.find(
            (p) => p.id !== userIdRef.current && (p.name || '').trim().toLowerCase() === myNameLower
          );
          if (duplicate) {
            channel.untrack();
            channel.unsubscribe();
            channelRef.current = null;
            setRoomCode(null);
            setIsHost(false);
            isHostRef.current = false;
            setPlayers([]);
            setErrorMessage(
              `The name "${pName}" is already taken in this room. Please choose a different name.`
            );
            triggerHaptic('warning');
            return;
          }
        }

        // B) Host-side check: detect if any joiner matches an existing player's name
        if (isHostRef.current) {
          const nameMap = new Map<string, string[]>();
          for (const p of presences) {
            const lower = (p.name || '').trim().toLowerCase();
            if (!lower) continue;
            if (!nameMap.has(lower)) nameMap.set(lower, []);
            nameMap.get(lower)!.push(p.id);
          }
          for (const [, ids] of nameMap.entries()) {
            if (ids.length > 1) {
              const duplicateId = ids.find((id) => id !== userIdRef.current) || ids[ids.length - 1];
              const duplicatePresence = presences.find((p) => p.id === duplicateId);
              const duplicateName = duplicatePresence?.name || pName;
              channel.send({
                type: 'broadcast',
                event: 'DUPLICATE_NAME_REJECTED',
                payload: { rejectedUserId: duplicateId, name: duplicateName },
              });
            }
          }
        }

        const roster: PlayerScore[] = presences.map((p) => {
          const existing = playersRef.current.find((pl) => pl.id === p.id);
          const score = scoresRef.current.get(p.id) ?? existing?.score ?? p.score ?? 0;
          return {
            id: p.id,
            name: p.name,
            score,
            locked: lockedSubmissionsRef.current.has(p.id) || (existing?.locked ?? false),
            deltaE: existing?.deltaE,
            lastRoundScore: existing?.lastRoundScore,
          };
        });

        // Ensure self is in roster if presence hasn't reflected local user yet
        if (!roster.some((p) => p.id === userIdRef.current)) {
          const existing = playersRef.current.find((pl) => pl.id === userIdRef.current);
          roster.push({
            id: userIdRef.current,
            name: playerNameRef.current,
            score: scoresRef.current.get(userIdRef.current) ?? existing?.score ?? 0,
            locked: lockedSubmissionsRef.current.has(userIdRef.current) || (existing?.locked ?? false),
            deltaE: existing?.deltaE,
            lastRoundScore: existing?.lastRoundScore,
          });
        }

        setPlayers(roster);
        playersRef.current = roster;

        // First presence is host if current host leaves
        if (presences.length > 0 && presences[0].id === userIdRef.current) {
          setIsHost(true);
          isHostRef.current = true;
        }

        // Sync roomSettings from host presence if present
        const hostPresence = presences.find((p) => p.isHost && p.roomSettings);
        if (hostPresence && hostPresence.roomSettings) {
          setRoomSettings(hostPresence.roomSettings);
          roomSettingsRef.current = hostPresence.roomSettings;
          setPreviewDuration(hostPresence.roomSettings.previewSeconds || 3.0);
        }

        // If host and players disconnected during guessing or results, check if remaining are done
        checkAllSubmitted(channel);
        checkAllReady(channel);
      });

      // 2. Broadcasts
      channel.on('broadcast', { event: 'DUPLICATE_NAME_REJECTED' }, ({ payload }) => {
        if (payload.rejectedUserId === userIdRef.current) {
          channel.untrack();
          channel.unsubscribe();
          channelRef.current = null;
          setRoomCode(null);
          setIsHost(false);
          isHostRef.current = false;
          setPlayers([]);
          setErrorMessage(
            `The name "${payload.name}" is already taken in this room. Please choose a different name.`
          );
          triggerHaptic('warning');
        }
      });

      channel.on('broadcast', { event: 'ROUND_PREVIEW' }, ({ payload }) => {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
        readyPlayerIdsRef.current.clear();
        setReadyPlayerIds([]);
        lockedSubmissionsRef.current.clear();
        liveGuessesRef.current.clear();

        // If starting a fresh match (round 1), reset score map and previous round results
        if (payload.round === 1) {
          scoresRef.current.clear();
          setRoundResults([]);
        }

        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            locked: false,
            score: payload.round === 1 ? 0 : (scoresRef.current.get(p.id) ?? p.score),
            lastRoundScore: undefined,
            deltaE: undefined,
          }))
        );
        if (playersRef.current) {
          playersRef.current = playersRef.current.map((p) => ({
            ...p,
            locked: false,
            score: payload.round === 1 ? 0 : (scoresRef.current.get(p.id) ?? p.score),
            lastRoundScore: undefined,
            deltaE: undefined,
          }));
        }
        setCurrentTarget(payload.target);
        currentTargetRef.current = payload.target;
        setPreviewDuration(payload.duration / 1000);
        setRound(payload.round);
        roundRef.current = payload.round;
        if (payload.totalRounds) {
          const syncedSettings: MultiplayerRoomSettings = {
            totalRounds: payload.totalRounds,
            previewSeconds: payload.duration / 1000,
            guessSeconds:
              payload.guessTimeout && payload.guessTimeout > 0 ? payload.guessTimeout / 1000 : 0,
            difficulty: payload.difficulty || 'medium',
          };
          setRoomSettings(syncedSettings);
          roomSettingsRef.current = syncedSettings;
        }
        updateGameState('preview');

        // On guest, set a safety fallback timer: if START_GUESSING is delayed/dropped, auto-advance to guessing
        if (!isHostRef.current) {
          if (previewTimerRef.current) {
            clearTimeout(previewTimerRef.current);
            previewTimerRef.current = null;
          }
          previewTimerRef.current = setTimeout(() => {
            previewTimerRef.current = null;
            if (gameStateRef.current === 'preview') {
              updateGameState('guessing');
            }
          }, payload.duration + 1500);
        }
      });

      channel.on('broadcast', { event: 'START_GUESSING' }, () => {
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        updateGameState('guessing');
      });

      channel.on('broadcast', { event: 'PLAYER_GUESS_UPDATE' }, ({ payload }) => {
        liveGuessesRef.current.set(payload.userId, payload.guess);
      });

      channel.on('broadcast', { event: 'SUBMIT_GUESS' }, ({ payload }) => {
        lockedSubmissionsRef.current.set(payload.userId, payload.guess);
        liveGuessesRef.current.set(payload.userId, payload.guess);

        // Update locked status in UI and ref
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.userId ? { ...p, locked: true } : p))
        );
        if (playersRef.current) {
          playersRef.current = playersRef.current.map((p) =>
            p.id === payload.userId ? { ...p, locked: true } : p
          );
        }

        // Host checks if all players locked in
        checkAllSubmitted(channel);
      });

      channel.on('broadcast', { event: 'PLAYER_READY_NEXT' }, ({ payload }) => {
        readyPlayerIdsRef.current.add(payload.userId);
        setReadyPlayerIds(Array.from(readyPlayerIdsRef.current));
        checkAllReady(channel);
      });

      channel.on('broadcast', { event: 'ROUND_RESULTS' }, ({ payload }) => {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
        readyPlayerIdsRef.current.clear();
        setReadyPlayerIds([]);
        setRoundResults(payload.results);
        for (const p of payload.players) {
          scoresRef.current.set(p.id, p.score);
        }
        setPlayers(payload.players);
        playersRef.current = payload.players;
        updateGameState('result');
      });

      channel.on('broadcast', { event: 'MATCH_SUMMARY' }, ({ payload }) => {
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
        for (const p of payload.players) {
          scoresRef.current.set(p.id, p.score);
        }
        setPlayers(payload.players);
        playersRef.current = payload.players;
        updateGameState('summary');
      });

      channel.on('broadcast', { event: 'RETURN_TO_LOBBY' }, () => {
        if (roundTimerRef.current) {
          clearTimeout(roundTimerRef.current);
          roundTimerRef.current = null;
        }
        if (previewTimerRef.current) {
          clearTimeout(previewTimerRef.current);
          previewTimerRef.current = null;
        }
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
        roundRef.current = 0;
        setRound(1);
        scoresRef.current.clear();
        lockedSubmissionsRef.current.clear();
        liveGuessesRef.current.clear();
        readyPlayerIdsRef.current.clear();
        setReadyPlayerIds([]);
        setRoundResults([]);
        setPlayers((prev) =>
          prev.map((p) => ({
            ...p,
            score: 0,
            locked: false,
            lastRoundScore: undefined,
            deltaE: undefined,
          }))
        );
        if (playersRef.current) {
          playersRef.current = playersRef.current.map((p) => ({
            ...p,
            score: 0,
            locked: false,
            lastRoundScore: undefined,
            deltaE: undefined,
          }));
        }
        updateGameState('lobby');
      });

      // Subscribe and track presence
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              id: userIdRef.current,
              name: pName,
              isHost: asHost,
              score: 0,
              locked: false,
              roomSettings: asHost ? (hostSettings || roomSettingsRef.current) : undefined,
            });
          } catch (err) {
            console.warn('Failed to track presence in room:', err);
          }
          setRoomCode(code);
          setIsHost(asHost);
          isHostRef.current = asHost;
          setErrorMessage(null);
        } else if (status === 'CHANNEL_ERROR') {
          setErrorMessage('Could not connect to room. Check internet connection.');
        }
      });
    },
    [checkAllReady, checkAllSubmitted]
  );

  // 1. Create Room (Generates 6-digit code with host settings)
  const createRoom = useCallback(
    (name: string, settings?: MultiplayerRoomSettings) => {
      const pName = name.trim() || generateAutoPlayerName();
      playerNameRef.current = pName;
      if (settings) {
        setRoomSettings(settings);
        roomSettingsRef.current = settings;
        setPreviewDuration(settings.previewSeconds || 3.0);
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setupChannel(code, true, pName, settings);
    },
    [setupChannel]
  );

  // 2. Join Room (with 6-digit code)
  const joinRoom = useCallback(
    (code: string, name: string) => {
      const cleanCode = code.trim();
      const pName = name.trim() || generateAutoPlayerName();
      playerNameRef.current = pName;

      if (cleanCode.length !== 6) {
        setErrorMessage('Room code must be 6 digits.');
        return;
      }

      setupChannel(cleanCode, false, pName);
    },
    [setupChannel]
  );

  // 3. Host starts match
  const startMatch = useCallback(() => {
    if (!isHostRef.current || !channelRef.current) return;
    if (roundTimerRef.current) {
      clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    roundRef.current = 0;
    scoresRef.current.clear();
    lockedSubmissionsRef.current.clear();
    liveGuessesRef.current.clear();
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);
    setRoundResults([]);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        score: 0,
        locked: false,
        lastRoundScore: undefined,
        deltaE: undefined,
      }))
    );
    if (playersRef.current) {
      playersRef.current = playersRef.current.map((p) => ({
        ...p,
        score: 0,
        locked: false,
        lastRoundScore: undefined,
        deltaE: undefined,
      }));
    }
    advanceRoundRef.current();
  }, []);

  // 4. Update Current Guess (Live sync while moving sliders)
  const updateCurrentGuess = useCallback((guess: HSLColor) => {
    // Save in local live guesses immediately
    liveGuessesRef.current.set(userIdRef.current, guess);

    // Debounced broadcast to peers (100ms)
    if (updateGuessDebounceTimerRef.current) {
      clearTimeout(updateGuessDebounceTimerRef.current);
    }
    updateGuessDebounceTimerRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'PLAYER_GUESS_UPDATE',
          payload: { userId: userIdRef.current, guess },
        });
      }
    }, 100);
  }, []);

  // 5. Submit Guess
  const submitGuess = useCallback(
    (guess: HSLColor) => {
      if (!channelRef.current) return;
      const channel = channelRef.current;

      lockedSubmissionsRef.current.set(userIdRef.current, guess);
      liveGuessesRef.current.set(userIdRef.current, guess);

      // Immediately mark locked for self in UI and ref
      setPlayers((prev) =>
        prev.map((p) => (p.id === userIdRef.current ? { ...p, locked: true } : p))
      );
      if (playersRef.current) {
        playersRef.current = playersRef.current.map((p) =>
          p.id === userIdRef.current ? { ...p, locked: true } : p
        );
      }

      // Broadcast guess to host and other players
      channel.send({
        type: 'broadcast',
        event: 'SUBMIT_GUESS',
        payload: { userId: userIdRef.current, guess },
      });

      // If host, check if all locked
      checkAllSubmitted(channel);
    },
    [checkAllSubmitted]
  );

  // 6. Player Ready for Next Round
  const readyNextRound = useCallback(() => {
    if (!channelRef.current) return;
    const channel = channelRef.current;
    const uid = userIdRef.current;

    readyPlayerIdsRef.current.add(uid);
    setReadyPlayerIds(Array.from(readyPlayerIdsRef.current));

    channel.send({
      type: 'broadcast',
      event: 'PLAYER_READY_NEXT',
      payload: { userId: uid },
    });

    checkAllReady(channel);
  }, [checkAllReady]);

  // 7. Return to Room Lobby (Resets round & score state without disconnecting)
  const returnToLobby = useCallback(() => {
    if (roundTimerRef.current) {
      clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    roundRef.current = 0;
    setRound(1);
    scoresRef.current.clear();
    lockedSubmissionsRef.current.clear();
    liveGuessesRef.current.clear();
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);
    setRoundResults([]);
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        score: 0,
        locked: false,
        lastRoundScore: undefined,
        deltaE: undefined,
      }))
    );
    if (playersRef.current) {
      playersRef.current = playersRef.current.map((p) => ({
        ...p,
        score: 0,
        locked: false,
        lastRoundScore: undefined,
        deltaE: undefined,
      }));
    }
    updateGameState('lobby');

    if (channelRef.current && isHostRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'RETURN_TO_LOBBY',
        payload: {},
      });
    }
  }, [updateGameState]);

  // 8. Leave Room
  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (roundTimerRef.current) {
      clearTimeout(roundTimerRef.current);
      roundTimerRef.current = null;
    }
    if (previewTimerRef.current) {
      clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (updateGuessDebounceTimerRef.current) {
      clearTimeout(updateGuessDebounceTimerRef.current);
      updateGuessDebounceTimerRef.current = null;
    }
    setRoomCode(null);
    setIsHost(false);
    isHostRef.current = false;
    setPlayers([]);
    playersRef.current = [];
    updateGameState('lobby');
    setRoundResults([]);
    lockedSubmissionsRef.current.clear();
    liveGuessesRef.current.clear();
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);
  }, [updateGameState]);

  return {
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
    userId: userIdRef.current,
    createRoom,
    joinRoom,
    startMatch,
    updateCurrentGuess,
    submitGuess,
    readyNextRound,
    returnToLobby,
    leaveRoom,
  };
}
