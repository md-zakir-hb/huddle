import { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { NewTaskInput } from '../../lib/tasksApi';
import { TeamMemberProfile } from '../../lib/teamsApi';
import { Priority, Task } from '../types';
import DateShortcuts from './DateShortcuts';
import DateTimePickerField from './DateTimePickerField';
import PrioritySelector from './PrioritySelector';
import ReminderToggle from './ReminderToggle';
import { modalStyles } from './styles';

export default function AddTaskModal({
  visible,
  onClose,
  task = null,
  teamMembers,
  initialAssigneeIds = [],
  onCreate,
  onUpdate,
}: {
  visible: boolean;
  onClose: () => void;
  task?: Task | null;
  teamMembers?: TeamMemberProfile[];
  initialAssigneeIds?: string[];
  onCreate?: (input: NewTaskInput) => Promise<void>;
  onUpdate?: (id: string, input: NewTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState<string>('');
  const [titleError, setTitleError] = useState<boolean>(false);
  const [description, setDescription] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [priority, setPriority] = useState<Priority | null>(null);
  const [reminder, setReminder] = useState<boolean>(false);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [draftDate, setDraftDate] = useState<Date>(new Date());

  useEffect(() => {
    if (!visible) return;

    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setSelectedDate(task.date ? new Date(task.date) : null);
      setPriority(task.priority ?? null);
      setReminder(task.reminder ?? false);
    } else {
      setTitle('');
      setDescription('');
      setSelectedDate(null);
      setPriority(null);
      setReminder(false);
    }
    setSelectedAssigneeIds(initialAssigneeIds);
    setTitleError(false);
    setSubmitError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, task]);

  const handleTitleChange = (text: string) => {
    setTitle(text);
    if (titleError && text.trim() !== '') setTitleError(false);
  };

  const handleSubmit = async () => {
    if (title.trim() === '') {
      setTitleError(true);
      return;
    }

    const input: NewTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      date: selectedDate ? selectedDate.toISOString() : undefined,
      priority: priority ?? undefined,
      reminder: selectedDate ? reminder : undefined,
      assigneeIds: teamMembers ? selectedAssigneeIds : undefined,
    };

    setSubmitError(null);
    setSubmitting(true);
    try {
      if (task) {
        await onUpdate?.(task.id, input);
      } else {
        await onCreate?.(input);
      }
      onClose();
    } catch (e) {
      const reason = e instanceof Error ? e.message : 'please try again';
      setSubmitError(`Couldn't save task: ${reason}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openDateTimePicker = () => {
    setDraftDate(selectedDate ?? new Date());
    setPickerMode('date');
    setPickerVisible(true);
  };

  const handlePickerChange = (
    _event: DateTimePickerChangeEvent,
    pickedDate: Date,
  ) => {
    if (pickerMode === 'date') {
      setDraftDate(pickedDate);
      setPickerMode('time');
    } else {
      setDraftDate(pickedDate);
      setSelectedDate(pickedDate);
      setPickerVisible(false);
    }
  };

  const handlePickerDismiss = () => {
    // Cancelling the time step still keeps the date already chosen in the
    // date step, instead of discarding the whole selection.
    if (pickerMode === 'time') {
      setSelectedDate(draftDate);
    }
    setPickerVisible(false);
  };

  return (
    <>
      {visible && <StatusBar barStyle="dark-content" />}

      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={modalStyles.keyboardAvoider}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={modalStyles.modalContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={modalStyles.modalTop}>
                <Text style={modalStyles.modalTitle}>
                  {task ? 'Edit Task' : 'Add New Task'}
                </Text>
                <TouchableOpacity
                  style={modalStyles.cancelBtn}
                  onPress={onClose}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                >
                  <Icon name="close" size={17} color="#e46868" />
                </TouchableOpacity>
              </View>

              <DateShortcuts
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onOpenPicker={openDateTimePicker}
              />

              {selectedDate && (
                <ReminderToggle value={reminder} onChange={setReminder} />
              )}

              <View style={modalStyles.fieldGroup}>
                <Text style={modalStyles.fieldLabel}>Title</Text>
                <TextInput
                  style={[
                    modalStyles.input,
                    titleError && modalStyles.inputError,
                  ]}
                  placeholder="task title..."
                  placeholderTextColor="#888"
                  value={title}
                  onChangeText={handleTitleChange}
                  autoFocus={true}
                />
                {titleError && (
                  <Text style={modalStyles.errorText}>Title is required</Text>
                )}
              </View>

              <View style={modalStyles.fieldGroup}>
                <Text style={modalStyles.fieldLabel}>Description</Text>
                <TextInput
                  style={modalStyles.input}
                  placeholder="task description..."
                  placeholderTextColor="#888"
                  value={description}
                  onChangeText={text => setDescription(text)}
                />
              </View>

              <View style={modalStyles.fieldGroup}>
                <Text style={modalStyles.fieldLabel}>Priority</Text>
                <PrioritySelector value={priority} onChange={setPriority} />
              </View>

              {teamMembers && (
                <View style={modalStyles.fieldGroup}>
                  <Text style={modalStyles.fieldLabel}>Assign to</Text>
                  <View style={modalStyles.assigneeGroup}>
                    {teamMembers.map(member => {
                      const selected = selectedAssigneeIds.includes(member.id);
                      return (
                        <TouchableOpacity
                          key={member.id}
                          style={[
                            modalStyles.assigneeChip,
                            selected && modalStyles.assigneeChipActive,
                          ]}
                          onPress={() =>
                            setSelectedAssigneeIds(prev =>
                              selected
                                ? prev.filter(id => id !== member.id)
                                : [...prev, member.id],
                            )
                          }
                        >
                          <Text
                            style={[
                              modalStyles.assigneeChipText,
                              selected && modalStyles.assigneeChipTextActive,
                            ]}
                          >
                            {member.name ?? 'Member'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {submitError && (
                <Text style={modalStyles.errorText}>{submitError}</Text>
              )}

              <View style={modalStyles.modalButtons}>
                <TouchableOpacity
                  style={[modalStyles.btn, modalStyles.saveBtn]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={modalStyles.btnText}>
                      {task ? 'Save Changes' : 'Create'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <DateTimePickerField
        visible={pickerVisible}
        mode={pickerMode}
        value={draftDate}
        onChange={handlePickerChange}
        onDismiss={handlePickerDismiss}
      />
    </>
  );
}
