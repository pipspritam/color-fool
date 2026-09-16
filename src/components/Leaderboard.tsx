import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface PlayerScore {
  id: string;
  name: string;
  score: number;
  locked: boolean;
  deltaE?: number;
  lastRoundScore?: number;
}

interface LeaderboardProps {
  players: PlayerScore[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ players }) => {
  const sorted = [...players].sort((a, b) => b.score - a.score);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LIVE LEADERBOARD</Text>
      {sorted.map((player, idx) => (
        <View key={player.id} style={styles.row}>
          <Text style={styles.rank}>#{idx + 1}</Text>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <View style={styles.statusCol}>
            {player.locked ? (
              <Text style={styles.lockedText}>✓ LOCKED</Text>
            ) : (
              <Text style={styles.pendingText}>PICKING...</Text>
            )}
            <Text style={styles.score}>{player.score} pts</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 12,
    minWidth: 190,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  title: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  rank: {
    color: '#FBBF24',
    fontSize: 12,
    fontWeight: '800',
    width: 24,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  lockedText: {
    color: '#4ADE80',
    fontSize: 8.5,
    fontWeight: '800',
  },
  pendingText: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 8.5,
    fontWeight: '600',
  },
  score: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
  },
});
