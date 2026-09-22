import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
  color?: string;
}

export default function LoadingSpinner({
  fullScreen = true,
  color = colors.primary,
}: LoadingSpinnerProps) {
  return (
    <ActivityIndicator
      style={fullScreen ? styles.fullScreen : undefined}
      color={color}
    />
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
  },
});
