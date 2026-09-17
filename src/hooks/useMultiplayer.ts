import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../utils/supabase';
import { HSLColor, calculateDeltaE, scoreFromDeltaE } from '../utils/colorScorer';
import { PlayerScore } from '../components/Leaderboard';

export interface RoundResultData {
  id: string;
  name: string;
  guess: HSLColor;
  deltaE: number;
  points: number;
  totalScore: number;
}

export function useMultiplayer() {
  const [connected, setConnected] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [gameState, setGameState] = useState<
    'lobby' | 'preview' | 'guessing' | 'result' | 'summary'
  >('lobby');
  const [currentTarget, setCurrentTarget] = useState<HSLColor>({ h: 0, s: 0, l: 50 });
  const [round, setRound] = useState(1);
  const [previewDuration, setPreviewDuration] = useState(3.0);
  const [roundResults, setRoundResults] = useState<RoundResultData[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readyPlayerIds, setReadyPlayerIds] = useState<string[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string>(`user_${Math.random().toString(36).slice(2, 9)}`);
  const playerNameRef = useRef<string>('Golumolu');
  const isHostRef = useRef(false);
  const roundTimerRef = useRef<any>(null);
  const currentTargetRef = useRef<HSLColor>({ h: 0, s: 0, l: 50 });
  const roundRef = useRef(1);
  const submissionsRef = useRef<Map<string, HSLColor>>(new Map());
  const scoresRef = useRef<Map<string, number>>(new Map());
  const readyPlayerIdsRef = useRef<Set<string>>(new Set());

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
        channelRef.current.unsubscribe();
      }
      if (roundTimerRef.current) {
        clearTimeout(roundTimerRef.current);
      }
    };
  }, []);

  // Host: resolve round
  const resolveRound = useCallback(() => {
    if (!channelRef.current || !isHostRef.current) return;

    const results: RoundResultData[] = [];
    const channel = channelRef.current;
    const target = currentTargetRef.current;

    // Reset ready-ups for this result phase
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);

    // Build results from latest player presence
    const state = channel.presenceState();
    const currentPresences = Object.values(state).flat() as any[];

    const updatedPlayers: PlayerScore[] = [];

    for (const p of currentPresences) {
      const pGuess = submissionsRef.current.get(p.id) || { h: 180, s: 50, l: 50 };
      const deltaE = calculateDeltaE(target, pGuess);
      const points = scoreFromDeltaE(deltaE);
      const prevScore = scoresRef.current.get(p.id) || 0;
      const newScore = prevScore + points;
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

    setRoundResults(results);
    setPlayers(updatedPlayers);
    setGameState('result');

    // Broadcast results to all players
    channel.send({
      type: 'broadcast',
      event: 'ROUND_RESULTS',
      payload: { results, players: updatedPlayers },
    });
  }, []);

  // Host: advance or start round
  const advanceRound = useCallback(() => {
    if (!channelRef.current || !isHostRef.current) return;
    const channel = channelRef.current;

    // Reset ready tracking for the upcoming round
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);

    const nextRound = roundRef.current + 1;
    roundRef.current = nextRound;
    setRound(nextRound);

    if (nextRound > 5) {
      setGameState('summary');
      const state = channel.presenceState();
      const currentPresences = Object.values(state).flat() as any[];
      const finalPlayers = currentPresences.map((p) => ({
        id: p.id,
        name: p.name,
        score: scoresRef.current.get(p.id) || 0,
        locked: false,
      }));

      channel.send({
        type: 'broadcast',
        event: 'MATCH_SUMMARY',
        payload: { players: finalPlayers },
      });
      return;
    }

    // Reset submissions
    submissionsRef.current.clear();

    // Generate random target
    const newTarget = {
      h: Math.floor(Math.random() * 360),
      s: Math.floor(20 + Math.random() * 75),
      l: Math.floor(20 + Math.random() * 65),
    };
    currentTargetRef.current = newTarget;
    setCurrentTarget(newTarget);
    setGameState('preview');

    // Broadcast preview to room
    channel.send({
      type: 'broadcast',
      event: 'ROUND_PREVIEW',
      payload: { target: newTarget, duration: 3000, round: nextRound },
    });

    // After 3s preview, broadcast guess start
    setTimeout(() => {
      setGameState('guessing');
      channel.send({
        type: 'broadcast',
        event: 'START_GUESSING',
        payload: { timeout: 15000 },
      });

      // 15-second guess timer
      roundTimerRef.current = setTimeout(() => {
        resolveRoundRef.current();
      }, 15000);
    }, 3000);
  }, []);

  resolveRoundRef.current = resolveRound;
  advanceRoundRef.current = advanceRound;

  const checkAllReady = useCallback((channel: RealtimeChannel) => {
    if (!isHostRef.current) return;
    const state = channel.presenceState();
    const presences = Object.values(state).flat() as any[];
    const count = presences.length;
    if (count > 0 && readyPlayerIdsRef.current.size >= count) {
      advanceRoundRef.current();
    }
  }, []);

  // Connect to room channel
  const setupChannel = useCallback(
    (code: string, asHost: boolean, pName: string) => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      const channelName = `room-${code}`;
      const channel = supabase.channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: userIdRef.current },
        },
      });

      channelRef.current = channel;

      // 1. Presence: sync players list
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const presences = Object.values(state).flat() as any[];

        const roster: PlayerScore[] = presences.map((p) => ({
          id: p.id,
          name: p.name,
          score: scoresRef.current.get(p.id) || p.score || 0,
          locked: submissionsRef.current.has(p.id),
        }));

        setPlayers(roster);

        // First presence is host if current host leaves
        if (presences.length > 0 && presences[0].id === userIdRef.current) {
          setIsHost(true);
          isHostRef.current = true;
        }

        // If host and players disconnected during results, check if remaining are ready
        checkAllReady(channel);
      });

      // 2. Broadcasts
      channel.on('broadcast', { event: 'ROUND_PREVIEW' }, ({ payload }) => {
        readyPlayerIdsRef.current.clear();
        setReadyPlayerIds([]);
        setCurrentTarget(payload.target);
        currentTargetRef.current = payload.target;
        setPreviewDuration(payload.duration / 1000);
        setRound(payload.round);
        roundRef.current = payload.round;
        setGameState('preview');
      });

      channel.on('broadcast', { event: 'START_GUESSING' }, () => {
        setGameState('guessing');
      });

      channel.on('broadcast', { event: 'SUBMIT_GUESS' }, ({ payload }) => {
        submissionsRef.current.set(payload.userId, payload.guess);

        // Update locked status in UI
        setPlayers((prev) =>
          prev.map((p) => (p.id === payload.userId ? { ...p, locked: true } : p))
        );

        // Host checks if all players locked in
        if (isHostRef.current) {
          const state = channel.presenceState();
          const count = (Object.values(state).flat() as any[]).length;
          if (submissionsRef.current.size >= count && count > 0) {
            if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
            resolveRoundRef.current();
          }
        }
      });

      channel.on('broadcast', { event: 'PLAYER_READY_NEXT' }, ({ payload }) => {
        readyPlayerIdsRef.current.add(payload.userId);
        setReadyPlayerIds(Array.from(readyPlayerIdsRef.current));
        checkAllReady(channel);
      });

      channel.on('broadcast', { event: 'ROUND_RESULTS' }, ({ payload }) => {
        readyPlayerIdsRef.current.clear();
        setReadyPlayerIds([]);
        setRoundResults(payload.results);
        setPlayers(payload.players);
        setGameState('result');
      });

      channel.on('broadcast', { event: 'MATCH_SUMMARY' }, ({ payload }) => {
        setPlayers(payload.players);
        setGameState('summary');
      });

      // Subscribe and track presence
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userIdRef.current,
            name: pName,
            isHost: asHost,
            score: 0,
            locked: false,
          });
          setRoomCode(code);
          setIsHost(asHost);
          isHostRef.current = asHost;
          setErrorMessage(null);
        } else if (status === 'CHANNEL_ERROR') {
          setErrorMessage('Could not connect to room. Check internet connection.');
        }
      });
    },
    [checkAllReady]
  );

  // 1. Create Room (Generates 6-digit code)
  const createRoom = useCallback(
    (name: string) => {
      const pName = name.trim() || 'Golumolu';
      playerNameRef.current = pName;

      // 6-digit numeric room code: 100000 - 999999
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setupChannel(code, true, pName);
    },
    [setupChannel]
  );

  // 2. Join Room (with 6-digit code)
  const joinRoom = useCallback(
    (code: string, name: string) => {
      const cleanCode = code.trim();
      const pName = name.trim() || 'Golumolu';
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
    roundRef.current = 0;
    scoresRef.current.clear();
    submissionsRef.current.clear();
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);
    advanceRoundRef.current();
  }, []);

  // 4. Submit Guess
  const submitGuess = useCallback(
    (guess: HSLColor) => {
      if (!channelRef.current) return;
      const channel = channelRef.current;

      submissionsRef.current.set(userIdRef.current, guess);

      // Broadcast guess to host and other players
      channel.send({
        type: 'broadcast',
        event: 'SUBMIT_GUESS',
        payload: { userId: userIdRef.current, guess },
      });

      // If host, check if all locked
      if (isHostRef.current) {
        const state = channel.presenceState();
        const count = (Object.values(state).flat() as any[]).length;
        if (submissionsRef.current.size >= count && count > 0) {
          if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
          resolveRoundRef.current();
        }
      }
    },
    []
  );

  // 5. Player Ready for Next Round
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

  // 6. Leave Room
  const leaveRoom = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (roundTimerRef.current) {
      clearTimeout(roundTimerRef.current);
    }
    setRoomCode(null);
    setIsHost(false);
    isHostRef.current = false;
    setPlayers([]);
    setGameState('lobby');
    setRoundResults([]);
    submissionsRef.current.clear();
    readyPlayerIdsRef.current.clear();
    setReadyPlayerIds([]);
  }, []);

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
    userId: userIdRef.current,
    createRoom,
    joinRoom,
    startMatch,
    submitGuess,
    readyNextRound,
    leaveRoom,
  };
}
