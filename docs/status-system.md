# Status System

The application uses a two-dimensional status system that separates **user intent** from **computed state**.

## Monitor Status (User Intent)

Stored on shows, seasons, and episodes. Represents what the user wants to track.

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `WANTED` | User wants this content | Blue (default) |
| `UNWANTED` | User doesn't want this content | Gray (outline) |
| `PARTIAL` | Mixed children (display only, not stored) | Gray (secondary) |

**Cascade Updates**: When changing a show or season to `UNWANTED`, a dialog asks whether to apply to all children.

## Quality Status (Computed State)

Computed from children, never stored directly. Represents the current state of the content.

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `OK` | All files verified good | Green (default) |
| `UNVERIFIED` | Files exist but not verified | Yellow (warning) |
| `BROKEN` | At least one file has issues | Red (destructive) |
| `MISSING` | Wanted but no files exist | Gray (secondary) |

**Computation Logic** (worst status wins):
- Episode: Computed from its files
- Season: Worst quality among its episodes
- Show: Worst quality among its seasons

## File Quality

Stored on individual files. Can be auto-computed from playback tests.

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `UNVERIFIED` | Not yet tested | Yellow (warning) |
| `VERIFIED` | All required platform tests pass | Green (success) |
| `OK` | Reserved for future quality property checks | Green (success) |
| `BROKEN` | At least one required platform test fails | Red (destructive) |

**Auto-computation**: When playback tests are recorded, file quality is automatically updated based on required platforms.

## Playback Status

| Status | Description | Badge Color |
|--------|-------------|-------------|
| `PASS` | Plays without issues | Green (success) |
| `PARTIAL` | Plays with conditions (e.g., needs transcoding) | Yellow (warning) |
| `FAIL` | Does not play | Red (destructive) |

## File Actions

| Action | Description |
|--------|-------------|
| `NOTHING` | No action needed |
| `REDOWNLOAD` | Should be re-downloaded |
| `CONVERT` | Needs format conversion |
| `ORGANIZE` | Needs file organization |
| `REPAIR` | Needs repair |

## UI Components

All status badges are clickable and open dropdowns to change values:

- **BadgeSelector**: Unified component for status selection with dropdown menus
  - Supports optimistic updates for immediate visual feedback
  - Optional cascade confirmation dialog for hierarchical entities (shows -> seasons -> episodes)
  - Works with any status type (monitor status, quality status, file actions, etc.)
  - Located at `src/components/badge-selector.tsx`
