import React from 'react';
import { Switch, Text, View } from 'react-native';
import { modalStyles } from './styles';

export default function ReminderToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={modalStyles.reminderRow}>
      <View>
        <Text style={modalStyles.fieldLabel}>Reminder</Text>
        <Text style={modalStyles.reminderHint}>Notify me at this time</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#e4e2e2', true: '#7692FF' }}
        thumbColor="#fff"
      />
    </View>
  );
}
