import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

import { sortPlayersDeterministic, PlayerScoreItem } from '../utils/playerSort';

export type PlayerScore = PlayerScoreItem & { locked: boolean };
export { sortPlayersDeterministic };

interface LeaderboardProps {
  players: PlayerScore[];
  isResultPhase?: boolean;
  currentUserId?: string;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  isResultPhase = false,
  currentUserId,
}) => {
  const sorted = sortPlayersDeterministic(players);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isResultPhase ? 'ROUND STANDINGS' : 'LIVE LEADERBOARD'}
      </Text>
      {sorted.map((player, idx) => {
        const isSelf = player.id === currentUserId;
        return (
          <View key={player.id} style={styles.row}>
            <Text style={styles.rank}>#{idx + 1}</Text>
            <Text
              style={[styles.name, isSelf && styles.selfName]}
              numberOfLines={1}
            >
              {player.name}
            </Text>
            <View style={styles.statusCol}>
              {isResultPhase ? (
                player.lastRoundScore !== undefined ? (
                  <>
                    <Text style={styles.roundPointsBadge}>+{player.lastRoundScore.toFixed(2)} pts</Text>
                    <Text style={styles.roundMetaText}>
                      {player.deltaE !== undefined ? `ΔE ${player.deltaE.toFixed(2)} • ` : ''}
                      {player.score.toFixed(2)} tot
                    </Text>
                  </>
                ) : (
                  <Text style={styles.score}>{player.score.toFixed(2)} pts</Text>
                )
              ) : (
                <>
                  {player.locked ? (
                    <Text style={styles.lockedText}>LOCKED</Text>
                  ) : (
                    <Text style={styles.pendingText}>PICKING...</Text>
                  )}
                  <Text style={styles.score}>{player.score.toFixed(2)} pts</Text>
                </>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardSurface,
    borderRadius: 16,
    padding: 10,
    minWidth: 180,
    maxWidth: 240,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  title: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.colors.surfaceBorder,
  },
  rank: {
    color: theme.colors.primaryAccent,
    fontSize: 11,
    fontWeight: '800',
    width: 22,
  },
  name: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    marginRight: 6,
  },
  selfName: {
    color: theme.colors.primaryAccent,
    fontWeight: '800',
  },
  statusCol: {
    alignItems: 'flex-end',
  },
  lockedText: {
    color: theme.colors.primaryAccent,
    fontSize: 8.5,
    fontWeight: '800',
  },
  pendingText: {
    color: theme.colors.textMuted,
    fontSize: 8.5,
    fontWeight: '600',
  },
  score: {
    color: theme.colors.primaryAccent,
    fontSize: 10.5,
    fontWeight: '800',
  },
  roundPointsBadge: {
    color: theme.colors.primaryAccent,
    fontSize: 10.5,
    fontWeight: '800',
  },
  roundMetaText: {
    color: theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: '600',
  },
});
