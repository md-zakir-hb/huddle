import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors, radius, shadow, spacing } from '../../constants/theme';

export type ModalSheetVariant = 'sheet' | 'center';

interface ModalSheetProps {
  visible: boolean;
  onClose: () => void;
  variant?: ModalSheetVariant;
  children: React.ReactNode;
}

export default function ModalSheet({
  visible,
  onClose,
  variant = 'sheet',
  children,
}: ModalSheetProps) {
  const closeButton = (
    <TouchableOpacity
      style={styles.closeBtn}
      onPress={onClose}
      accessibilityLabel="Close"
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name="close" size={17} color={colors.textMuted} />
    </TouchableOpacity>
  );

  if (variant === 'center') {
    return (
      <Modal
        animationType="fade"
        transparent
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        {visible && <StatusBar barStyle="dark-content" />}
        <View style={styles.backdropCenter}>
          <View style={styles.centerCard}>
            {closeButton}
            {children}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {visible && <StatusBar barStyle="dark-content" />}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.sheetScrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.sheetCard}>
              {closeButton}
              {children}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerCard: {
    width: '85%',
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: 40,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow.card,
  },
  sheetScrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingTop: 40,
    gap: spacing.lg,
    ...shadow.card,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
