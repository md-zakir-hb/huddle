import { StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { hexToRgba } from '../priorityColors';

export const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    width: '100%',
  },
  container: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    marginTop: 50,
    gap: spacing.sm,
  },
  header: {
    gap: 10,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.textPrimary,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  filterRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  card: {
    backgroundColor: colors.background,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overdueSection: {
    backgroundColor: hexToRgba(colors.error, 0.06),
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: hexToRgba(colors.error, 0.2),
    padding: 14,
    gap: spacing.md,
  },
  overdueToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: hexToRgba(colors.error, 0.08),
  },
  overdueToggleBtnActive: {
    borderColor: colors.error,
  },
  overdueToggleText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    color: colors.error,
  },
  overdueBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overdueBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  overdueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  overdueCheck: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.error,
  },
  overdueTaskInfo: {
    flex: 1,
    gap: 2,
  },
  overdueTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  overdueDate: {
    fontSize: typography.caption.fontSize,
    color: colors.error,
  },
  overdueEditBtn: {
    padding: 4,
  },
  completedSection: {
    paddingVertical: 14,
    gap: spacing.md,
  },
  completedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  completedCheck: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedTitle: {
    flex: 1,
    fontSize: 15,
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  details: {
    marginTop: 10,
    marginLeft: 34,
    gap: spacing.sm,
  },
  taskSubtitle: {
    fontSize: typography.caption.fontSize,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
  },
  taskActionBtn: {
    padding: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  assigneeStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  assigneeAvatarOverlap: {
    marginLeft: -6,
  },
  assigneeAvatarImage: {
    width: '100%',
    height: '100%',
  },
  assigneeInitial: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
  },
});
