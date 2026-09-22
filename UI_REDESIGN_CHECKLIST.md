# UI Redesign Checklist

Tracks the screen-by-screen visual overhaul to a modern, minimalistic, consistent design system. **Visual/style only — no logic, navigation, or API changes.**

> New session? Read this file first before touching any screen, so nothing gets redone or skipped.

## Status legend
`Not started` → `In progress` → `Done`

## Core reusable components (Step 3)
| Component | Status | Notes |
|---|---|---|
| Button (primary/secondary/ghost/destructive) | Done | `components/ui/Button.tsx` — built, not yet wired into any screen |
| Input / TextField | Done | `components/ui/TextField.tsx` — built, not yet wired into any screen |
| Card | Done | `components/ui/Card.tsx` — built, not yet wired into any screen |
| Modal wrapper | Done | `components/ui/ModalSheet.tsx` (`sheet` + `center` variants) — built, not yet wired into the 5 existing modals |
| Header / AppBar (`ScreenHeader.tsx`) | Done | Redesigned onto tokens as part of the Tasks screen pass (per your approval to do it directly rather than fork it) — cascades visually to Team/TeamDetail/TeamMembers headers too, see note below |
| Badge / Chip | Done | `components/ui/Badge.tsx` — built, not yet wired into any screen |
| Avatar | Done | `components/ui/Avatar.tsx` — built, not yet wired into any screen |
| EmptyState | Done | `components/ui/EmptyState.tsx` — built, not yet wired into any screen |
| LoadingSpinner | Done | `components/ui/LoadingSpinner.tsx` — built, not yet wired into any screen. Skeleton loaders skipped per approval (spinner fits "minimalistic" fine; can revisit later) |

## Screens
| Screen | File | Status |
|---|---|---|
| Sign In / Sign Up | `screens/AuthScreen.tsx` | Done |
| Tasks (home) | `screens/TasksScreen.tsx` (+ `components/PageHeader.tsx`, `components/TaskList/*`) | Done |
| Team list | `screens/TeamScreen.tsx` | Done |
| Team detail (tasks) | `screens/TeamDetailScreen.tsx` | Done |
| Team members | `screens/TeamMembersScreen.tsx` | Done |
| Conversation list | `screens/ConversationListScreen.tsx` | Not started |
| Chat | `screens/ChatScreen.tsx` | Not started |
| New message | `screens/NewMessageScreen.tsx` | Not started |

## Modals
| Modal | File | Status |
|---|---|---|
| Add / Edit Task | `components/AddTaskModal/index.tsx` (+ `DateShortcuts`, `PrioritySelector`, `DateTimePickerField`, `ReminderToggle`) | Not started |
| Profile | `components/ProfileModal.tsx` | Not started |
| Add Team | `components/AddTeamModal.tsx` | Not started |
| Add Member | `components/AddMemberModal.tsx` | Not started |
| Member Info | `components/MemberInfoModal.tsx` | Not started |

## Housekeeping (found during exploration, not part of the redesign itself)
- `components/AppHeader.tsx` is dead code — not imported/rendered anywhere in the app. Flag for deletion whenever convenient; not touched as part of this redesign unless you say so.

## Design system
Status: **Approved and built** — `constants/theme.ts` (colors, spacing, radius, typography, shadow). Light mode only, no dark variants (per your call).
