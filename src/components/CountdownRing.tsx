import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CountdownRingProps {
  durationSeconds: number;
  onFinish?: () => void;
}

export const CountdownRing: React.FC<CountdownRingProps> = ({ durationSeconds, onFinish }) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    setTimeLeft(durationSeconds);
    const startTime = Date.now();
    const totalMs = durationSeconds * 1000;
    let finished = false;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (totalMs - elapsed) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0.05 && !finished) {
        finished = true;
        clearInterval(interval);
        onFinishRef.current?.();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [durationSeconds]);

  return (
    <View style={styles.badge}>
      <Text style={styles.timerText}>{timeLeft.toFixed(1)}s</Text>
      <Text style={styles.subText}>MEMORIZE COLOR</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 36,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 4,
  },
});
