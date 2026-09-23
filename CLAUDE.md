# Claude Developer Guide — Color Fool

> **Important**: This project uses **Expo SDK 57**. Always refer to the versioned documentation at https://docs.expo.dev/versions/v57.0.0/ before writing code.

---

## 🛠️ Quick Reference Commands

```bash
# Development
bun run start               # Start Metro development server
bun run android             # Run on Android device / emulator
bun run ios                 # Run on iOS simulator
bun run web                 # Run web preview in browser

# Testing & Quality Assurance
bun test                    # Run automated unit test suite (Jest + jest-expo)
bun x tsc --noEmit          # Strict TypeScript compiler check
bun x expo-doctor           # Validate dependency integrity & Expo SDK 57 health

# Native Build
npx expo prebuild --platform android   # Regenerate native Android folder
```

---

## 📐 Key Architecture & Guidelines

### 1. Scoring & Precision Invariant
* **Continuous 2-Decimal Precision**: Scores ($0.00 - 10.00$) and CIELAB perceptual distance $\Delta E$ must always be rounded to 2 decimal places using `Math.round(val * 100) / 100`.
* **String Formatting**: All UI score badges, standings, HUD counters, and podium labels must format numbers with `.toFixed(2)`.
* **Score Accumulation**: Prevent IEEE 754 drift by wrapping additions with `Math.round((prev + points) * 100) / 100`.

### 2. Real-Time Multiplayer State Contract
* **State Machine**: `lobby` $\to$ `preview` $\to$ `guessing` $\to$ `result` $\to$ `summary`.
* **Ref Synchronization**: Always mirror `gameState` in `gameStateRef.current`.
* **Guards**:
  * Only call `resolveRound()` or `checkAllSubmitted()` when `gameStateRef.current === 'guessing'`.
  * Only call `checkAllReady()` when `gameStateRef.current === 'result'`.
* **Rematch Protocol**: When `round === 1` is detected on `ROUND_PREVIEW` or `startMatch()`, reset all player scores and clear `scoresRef`.
* **Lobby Return**: Pressing back on the summary podium calls `returnToLobby()` (broadcasts `RETURN_TO_LOBBY` and restores `gameState = 'lobby'`).

### 3. UI Thread & Native Safeguards
* **Throttled Haptics**: Continuous slider movement must only invoke `triggerHaptic('light')`, which enforces a 45ms minimum throttle interval in [`src/utils/haptics.ts`](file:///d:/Project/color-fool/src/utils/haptics.ts) to prevent Android vibration daemon saturation.
* **Android Back Button**: Top-level views register hardware back listeners with confirmation alerts or clean navigation.
* **Windows Gradle Daemon Locking**: If `expo prebuild` fails with `EBUSY`, stop Gradle background workers via `Stop-Process -Name java -Force` in PowerShell.

### 4. Code Hygiene
* Maintain zero unused imports, variables, and parameters (enforced by `tsc --noUnusedLocals --noUnusedParameters`).
* Do not install external dependencies unless explicitly requested—keep `package.json` lean.
