import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { hexToRgba } from '../priorityColors';

export type BadgeVariant = 'soft' | 'solid';

interface BadgeProps {
  label: string;
  color?: string;
  variant?: BadgeVariant;
  dot?: boolean;
}

export default function Badge({
  label,
  color = colors.primary,
  variant = 'soft',
  dot = false,
}: BadgeProps) {
  const isSolid = variant === 'solid';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isSolid ? color : hexToRgba(color, 0.12) },
      ]}
    >
      {dot && <View style={[styles.dot, { backgroundColor: color }]} />}
      <Text
        style={[styles.text, { color: isSolid ? colors.white : color }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: typography.caption.fontSize,
    fontWeight: '700',
  },
});
