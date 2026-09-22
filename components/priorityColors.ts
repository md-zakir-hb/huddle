import { colors } from '../constants/theme';
import { Priority } from './types';

export const PRIORITY_COLORS: Record<Priority, string> = {
  High: colors.error,
  Medium: colors.warning,
  Low: colors.success,
};

export const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};
