import { StyleSheet } from 'react-native';

export const modalStyles = StyleSheet.create({
  keyboardAvoider: {
    flex: 1,
  },
  modalContent: {
    width: '100%',
    flexGrow: 1,
    gap: 20,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 70,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'semibold',
    color: '#333',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 50,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,

    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#e5484d',
  },
  errorText: {
    color: '#e5484d',
    fontSize: 12,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  btn: {
    flex: 1,
    width: 20,
    paddingVertical: 12,
    borderRadius: 50,
    alignItems: 'center',
  },
  cancelBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#e46868',
  },
  saveBtn: {
    backgroundColor: '#000',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  timeBtnGroup: {
    flexDirection: 'row',
    gap: 10,
  },

  timeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 50,
    borderColor: '#ccc',
  },

  timeBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },

  timeBtnActive: {
    backgroundColor: '#091540',
    borderColor: '#091540',
  },

  timeBtnTextActive: {
    color: '#fff',
  },

  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pickerCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 12,
  },

  pickerCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ccc',
  },

  fieldGroup: {
    gap: 8,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b6b6f',
  },

  reminderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },

  reminderHint: {
    fontSize: 12,
    color: '#9a9a9e',
    marginTop: 2,
  },

  priorityGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  priorityBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },

  assigneeGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  assigneeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },

  assigneeChipActive: {
    backgroundColor: '#091540',
    borderColor: '#091540',
  },

  assigneeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },

  assigneeChipTextActive: {
    color: '#fff',
  },
});
