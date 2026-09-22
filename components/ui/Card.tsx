import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '../../constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
}

export default function Card({
  style,
  elevated = false,
  children,
  ...rest
}: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.elevated, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  elevated: {
    backgroundColor: colors.background,
    ...shadow.card,
  },
});
