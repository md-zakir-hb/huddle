import React from 'react';
import { Keyboard, Text, TouchableOpacity, View } from 'react-native';
import { PRIORITY_COLORS, hexToRgba } from '../priorityColors';
import { Priority } from '../types';
import { modalStyles } from './styles';

const PRIORITIES = (
  Object.keys(PRIORITY_COLORS) as Priority[]
).map(label => ({ label, color: PRIORITY_COLORS[label] }));

export default function PrioritySelector({
  value,
  onChange,
}: {
  value: Priority | null;
  onChange: (priority: Priority | null) => void;
}) {
  return (
    <View style={modalStyles.priorityGroup}>
      {PRIORITIES.map(p => {
        const isSelected = value === p.label;
        return (
          <TouchableOpacity
            key={p.label}
            style={[
              modalStyles.priorityBtn,
              {
                backgroundColor: isSelected
                  ? hexToRgba(p.color, 0.12)
                  : '#F5F5F7',
                borderColor: isSelected ? p.color : 'transparent',
              },
            ]}
            onPress={() => {
              Keyboard.dismiss();
              onChange(isSelected ? null : p.label);
            }}
            activeOpacity={0.7}
          >
            <View
              style={[modalStyles.priorityDot, { backgroundColor: p.color }]}
            />
            <Text
              style={[
                modalStyles.priorityBtnText,
                { color: isSelected ? p.color : '#6b6b6f' },
              ]}
            >
              {p.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
