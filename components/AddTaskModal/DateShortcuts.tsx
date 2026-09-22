import React from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { formatDateTime } from '../dateUtils';
import { modalStyles } from './styles';

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default function DateShortcuts({
  selectedDate,
  onSelectDate,
  onOpenPicker,
}: {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  onOpenPicker: () => void;
}) {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const tomorrow = addDays(today, 1);

  const isTodaySelected = !!selectedDate && isSameDay(selectedDate, today);
  const isTomorrowSelected =
    !!selectedDate && isSameDay(selectedDate, tomorrow);

  const handleQuickSelect = (date: Date) => {
    Keyboard.dismiss();
    onSelectDate(date);
  };

  const handleOpenPicker = () => {
    Keyboard.dismiss();
    onOpenPicker();
  };

  return (
    <View style={modalStyles.timeBtnGroup}>
      <TouchableOpacity
        style={[modalStyles.timeBtn, isTodaySelected && modalStyles.timeBtnActive]}
        onPress={() => handleQuickSelect(today)}
      >
        <Text
          style={[
            modalStyles.timeBtnText,
            isTodaySelected && modalStyles.timeBtnTextActive,
          ]}
        >
          Today
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          modalStyles.timeBtn,
          isTomorrowSelected && modalStyles.timeBtnActive,
        ]}
        onPress={() => handleQuickSelect(tomorrow)}
      >
        <Text
          style={[
            modalStyles.timeBtnText,
            isTomorrowSelected && modalStyles.timeBtnTextActive,
          ]}
        >
          Tomorrow
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={modalStyles.timeBtn} onPress={handleOpenPicker}>
        <Icon name="access-time" size={14} color="#000" />
        <Text style={modalStyles.timeBtnText}>
          {selectedDate ? formatDateTime(selectedDate) : 'Select Date'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
