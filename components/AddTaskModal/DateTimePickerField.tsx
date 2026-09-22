import DateTimePicker, {
  DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import React from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { modalStyles } from './styles';

export default function DateTimePickerField({
  visible,
  mode,
  value,
  onChange,
  onDismiss,
}: {
  visible: boolean;
  mode: 'date' | 'time';
  value: Date;
  onChange: (event: DateTimePickerChangeEvent, date: Date) => void;
  onDismiss: () => void;
}) {
  if (!visible) return null;

  if (Platform.OS === 'android') {
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onValueChange={onChange}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={modalStyles.pickerOverlay}>
        <View style={modalStyles.pickerCard}>
          <Text style={modalStyles.modalTitle}>
            {mode === 'date' ? 'Select Date' : 'Select Time'}
          </Text>
          <DateTimePicker
            value={value}
            mode={mode}
            display="spinner"
            onValueChange={onChange}
          />
          <TouchableOpacity
            style={modalStyles.pickerCancelBtn}
            onPress={onDismiss}
          >
            <Text style={modalStyles.timeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
