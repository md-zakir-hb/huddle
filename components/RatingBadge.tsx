import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';
import { getCurrentStreak, getRatingScore } from '../lib/ratingApi';

export default function RatingBadge({ refreshKey }: { refreshKey?: unknown }) {
  const [score, setScore] = useState<number | null>(null);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([getRatingScore(30), getCurrentStreak()])
      .then(([nextScore, nextStreak]) => {
        if (cancelled) return;
        setScore(nextScore);
        setStreak(nextStreak);
      })
      .catch(() => {
        if (!cancelled) setScore(0);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (score === null) return null;

  const rounded = Math.round(score * 10) / 10;
  const color = rounded > 0 ? colors.success : rounded < 0 ? colors.error : colors.white;

  return (
    <View style={styles.card}>
      <Text style={[styles.score, { color }]}>
        {rounded > 0 ? '+' : ''}
        {rounded}
      </Text>
      <Text style={styles.label}>
        30-day rating{streak > 0 ? ` · ${streak} streak` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
  },
  score: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 14,
    color: '#dfdede',
    marginTop: 2,
  },
});
