# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

# Color Fool — Agent Guidelines & Architecture Manual

## 1. Project Overview & Tech Stack
* **Framework**: Expo SDK 57 (`~57.0.24`) with React Native 0.86.3 and React 19.2.3.
* **Language & Compiler**: TypeScript 6.0 (`strict: true`).
* **Package Manager & Test Runner**: [Bun](https://bun.sh/) (`bun test`, `bun install`).
* **Multiplayer Engine**: Supabase Realtime Channels (`@supabase/supabase-js` v2) over WebSocket.
* **Storage**: `@react-native-async-storage/async-storage` with an in-memory resilient fallback.

---

## 2. Core Architectural Principles & Invariants

### 1. Continuous 2-Decimal Precision System
* **Mathematical Invariant**: Perceptual distance $\Delta E$ and player scores must always be rounded to 2 decimal places:
  ```typescript
  const score = Math.round(clampedScore * 100) / 100;
  ```
* **Score Range**: Strictly bounded in $[0.00, 10.00]$ points per round.
* **UI Rendering**: Any score or $\Delta E$ presented to the user must use `.toFixed(2)` (e.g. `+{score.toFixed(2)} pts`, `+{player.lastRoundScore.toFixed(2)} pts`, `{totalScore.toFixed(2)}`).
* **Floating-Point Guard**: When accumulating scores across rounds or players, always sanitize with `Math.round((prev + points) * 100) / 100` to prevent JavaScript IEEE 754 drift.

### 2. Multiplayer State Machine & Race Guards
* **Game Phases**: Strictly follow the lifecycle:
  $$\text{lobby} \longrightarrow \text{preview} \longrightarrow \text{guessing} \longrightarrow \text{result} \longrightarrow \text{summary}$$
* **Ref Synchronization**: Always maintain `gameStateRef.current` alongside React state.
* **Re-entrant Resolution Guards**:
  * `resolveRound()` and `checkAllSubmitted()` must **only** execute when `gameStateRef.current === 'guessing'`.
  * `checkAllReady()` must **only** execute when `gameStateRef.current === 'result'`.
* **Rematch Reset Contract**:
  * When `startMatch()` is called or `ROUND_PREVIEW` with `round === 1` is received, `scoresRef`, `roundResults`, and `players` scores must be cleanly reset to 0.
* **Lobby Return**:
  * Pressing back or tapping return during summary/podium must call `returnToLobby()` (returning all players to the active room lobby) rather than leaving the room or navigating home.

### 3. Haptics & UI Thread Ergonomics
* **Bridge Saturation Guard**: Never call unthrottled haptic feedback in continuous gesture loops. All slider scrubbing must go through `triggerHaptic('light')` which enforces a minimum 45ms throttle interval in [`src/utils/haptics.ts`](file:///d:/Project/color-fool/src/utils/haptics.ts).
* **Keyboard Ergonomics**: Inputs in cards must support tap-outside dismissal via `TouchableWithoutFeedback onPress={Keyboard.dismiss}`.
* **Android Back Button**: Every top-level screen must register a `BackHandler` listener with confirmation alerts or clean navigation.

### 4. Modern Gradle & Native Build Rules
* **Groovy DSL Syntax**: In `android/build.gradle` and `android/app/build.gradle`, always use modern assignment syntax (`propName = value`) to ensure compatibility with Gradle 9+ and 10.
* **Windows Daemon Locking (`EBUSY`)**: If `npx expo prebuild` fails with `EBUSY` unlinking `.dex` files, stop running Gradle daemons with `Stop-Process -Name java -Force` in PowerShell.

---

## 3. Directory Map

| Path | Purpose |
| :--- | :--- |
| [`App.tsx`](file:///d:/Project/color-fool/App.tsx) | Root application router and persistent settings loader |
| [`src/components/`](file:///d:/Project/color-fool/src/components/) | Reusable UI widgets (`CountdownRing`, `Leaderboard`, `ResultSplit`, `SettingsModal`, `VerticalSlider`) |
| [`src/hooks/`](file:///d:/Project/color-fool/src/hooks/) | State logic (`useColorState` for HSL, `useMultiplayer` for Supabase networking) |
| [`src/screens/`](file:///d:/Project/color-fool/src/screens/) | Full-screen views (`HomeScreen`, `GameScreen`, `LobbyScreen`, `SummaryScreen`) |
| [`src/utils/`](file:///d:/Project/color-fool/src/utils/) | Utilities (`colorScorer` for CIELAB $\Delta E$, `haptics`, `storage`, `supabase`) |
| [`__tests__/`](file:///d:/Project/color-fool/__tests__/) | Jest unit test suite covering color science boundary cases |

---

## 4. Verification & Quality Checklist

Before submitting changes, agents must run and verify:
1. **TypeScript Typecheck**:
   ```bash
   bun x tsc --noEmit --noUnusedLocals --noUnusedParameters
   ```
   *Requirement*: 0 errors, 0 unused imports, 0 dead parameters.
2. **Automated Unit Tests**:
   ```bash
   bun test
   ```
   *Requirement*: All 16 unit tests passing.
3. **Expo Doctor Health Check**:
   ```bash
   bun x expo-doctor
   ```
   *Requirement*: 21/21 checks passing.
4. **Git Hygiene**:
   * Never commit `.env` or sensitive keystore files (protected by `.gitignore`).
   * Keep `package.json` lean—do not add third-party dependencies without explicit necessity.
