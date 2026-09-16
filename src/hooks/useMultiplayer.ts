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

  const channelRef = useRef<RealtimeChannel | null>(null);
  const userIdRef = useRef<string>(`user_${Math.random().toString(36).slice(2, 9)}`);
  const playerNameRef = useRef<string>('Player');
  const isHostRef = useRef(false);
  const roundTimerRef = useRef<any>(null);
  const currentTargetRef = useRef<HSLColor>({ h: 0, s: 0, l: 50 });
  const roundRef = useRef(1);
  const submissionsRef = useRef<Map<string, HSLColor>>(new Map());
  const scoresRef = useRef<Map<string, number>>(new Map());

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

    // Auto-advance to next round after 6 seconds
    setTimeout(() => {
      advanceRound();
    }, 6000);
  }, []);

  // Host: advance or start round
  const advanceRound = useCallback(() => {
    if (!channelRef.current || !isHostRef.current) return;
    const channel = channelRef.current;

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
        resolveRound();
      }, 15000);
    }, 3000);
  }, [resolveRound]);

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
      });

      // 2. Broadcasts
      channel.on('broadcast', { event: 'ROUND_PREVIEW' }, ({ payload }) => {
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
            resolveRound();
          }
        }
      });

      channel.on('broadcast', { event: 'ROUND_RESULTS' }, ({ payload }) => {
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
    [resolveRound]
  );

  // 1. Create Room (Generates 6-digit code)
  const createRoom = useCallback(
    (name: string) => {
      const pName = name.trim() || 'Host';
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
      const pName = name.trim() || 'Player';
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
    advanceRound();
  }, [advanceRound]);

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
          resolveRound();
        }
      }
    },
    [resolveRound]
  );

  // 5. Leave Room
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
    createRoom,
    joinRoom,
    startMatch,
    submitGuess,
    leaveRoom,
  };
}
