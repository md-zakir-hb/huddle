import React from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors } from '../../constants/theme';
import { getInitials } from '../profileUtils';

interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  email?: string | null;
  size?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
}

export default function Avatar({
  uri,
  name,
  email,
  size = 40,
  backgroundColor = colors.primary,
  style,
}: AvatarProps) {
  const initials = getInitials(name, email);
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, dimension, { backgroundColor }, style]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, dimension]} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
  },
});
