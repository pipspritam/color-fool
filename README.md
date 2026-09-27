# Color Fool 🎨

[![Version](https://img.shields.io/badge/version-1.1%20(code%209)-38BDF8.svg)](app.json)
[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB.svg?logo=react)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.4+-fbf0df.svg?logo=bun)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Color Fool** is a high-precision, real-time multiplayer and solo color perception game built with Expo SDK 57 and React Native 0.86.3. Test and sharpen your visual color memory against friends or solo by memorizing target swatches and reproducing them using interactive HSL (Hue, Saturation, Lightness) gesture sliders.

Scoring is powered by real color science: perceptual color differences are calculated using the standard **CIELAB $\Delta E$** Euclidean metric under the CIE D65 illuminant, mapped to a continuous **2-decimal point scoring system ($0.00$ to $10.00$ points)** with deterministic multi-tier tie-breaking.

---

## ✨ Features

* **🔬 Scientific Color Accuracy (CIELAB $\Delta E$)**:
  * Accurate mathematical transformation: $\text{sRGB} \to \text{Linear sRGB} \to \text{CIE } XYZ \to \text{CIELAB}$.
  * Computes Euclidean perceptual distance ($\Delta E = \sqrt{\Delta L^{*2} + \Delta a^{*2} + \Delta b^{*2}}$) under the CIE D65 standard observer.
* **🎯 Continuous 2-Decimal Scoring ($0.00 - 10.00$ pts)**:
  * Continuous piecewise curves reward minute perceptual nuances (e.g. $\Delta E = 1.20 \to 9.76\text{ pts}$, $\Delta E = 5.00 \to 9.00\text{ pts}$).
  * Cumulative score sanitization prevents JavaScript IEEE 754 floating-point drift.
* **🏆 Deterministic Multi-Tier Tie-Breaking**:
  * **Primary**: Highest total score.
  * **Secondary**: Lowest cumulative perceptual distance ($\Delta E$).
  * **Tertiary**: Alphabetical display name.
* **⚡ Real-Time Multiplayer (Supabase Realtime)**:
  * 6-digit room codes for instant matchmaking (no account required).
  * Real-time presence detection and 100ms debounced live slider synchronization.
  * Fast-track round resolution when all players lock in their guesses.
  * Host/Guest duplicate name detection and enforcement.
  * Live round standings, $\Delta E$ breakdowns, and final podium awards.
  * One-tap match rematching and seamless lobby return.
* **🕹️ Flexible Game Modes & Palette Spectra**:
  * **Presets**: Easy ($5.0\text{s}$ preview), Medium ($3.0\text{s}$ preview), Hard ($1.5\text{s}$ preview).
  * **Custom Mode**: Configure preview duration ($0.5\text{s} - 99.0\text{s}$), guess time limits ($0.5\text{s} - 99.0\text{s}$ or unlimited), and round counts ($1 - 30$).
  * **Color Palette Selector**: Choose between **All Mix** (cycles palettes dynamically across rounds), **Vivid** (high saturation & clear tones), **Balanced** (standard spectrum), or **Expert** (muted, pastels & deep earth tones).
  * **In-Game Concealment**: Palette indicators remain hidden during active preview and guessing phases to preserve the target mystery.
* **🎨 Nordic Obsidian & Arctic Cyan Design System**:
  * Minimalist, distraction-free aesthetic (`#0B1017` obsidian background, `#131B27` card surface, `#38BDF8` arctic cyan accent).
  * Strict design invariants: zero drop shadows, zero emojis, zero checkmarks, zero harsh neon gradients.
* **📳 Mobile Ergonomics & Haptics**:
  * Multi-tier tactile feedback (`light`, `medium`, `heavy`, `selection`, `success`) throttled at $45\text{ms}$ to protect native vibration bridges.
  * Full Android hardware back button lifecycle handling with confirmation dialogs.
  * Left-handed and right-handed slider position customization.
  * 100% privacy-first design with zero telemetry.

---

## 🏗️ Architecture & Directory Map

```
color-fool/
├── App.tsx                     # Root state router & persistent settings loader
├── app.json                    # Expo SDK 57 project configuration & plugins
├── assets/                     # App icons, splash screens, and adaptive drawables
├── src/
│   ├── theme.ts                # Single source of truth for design tokens & colors
│   ├── components/
│   │   ├── CountdownRing.tsx   # Wall-clock accurate 50ms interval countdown timer
│   │   ├── Leaderboard.tsx     # Dynamic in-game & results leaderboard with tie-breaking
│   │   ├── ResultSplit.tsx     # Side-by-side color comparison & round scoring card
│   │   ├── SettingsModal.tsx   # Slider orientation and gameplay settings modal
│   │   └── VerticalSlider.tsx  # High-performance gesture-driven HSL sliders
│   ├── hooks/
│   │   ├── useColorState.ts    # HSL state management & random target generation
│   │   └── useMultiplayer.ts   # Supabase WebSocket networking & match authority
│   ├── screens/
│   │   ├── GameScreen.tsx      # Solo gameplay flow (preview -> guess -> result)
│   │   ├── HomeScreen.tsx      # Mode selection, custom settings, & palette dropdown
│   │   ├── LobbyScreen.tsx     # Room creation, player roster, & in-game multiplayer
│   │   └── SummaryScreen.tsx   # Match breakdown, performance rating, & score sharing
│   └── utils/
│       ├── colorScorer.ts      # CIELAB conversion, Delta E, & scoring formulas
│       ├── haptics.ts          # Throttled cross-platform haptic feedback engine
│       ├── playerSort.ts       # Deterministic multi-tier ranking comparator
│       ├── storage.ts          # Resilient AsyncStorage / in-memory fallback persistence
│       └── supabase.ts         # Supabase client initialization & channel management
└── __tests__/
    └── colorScorer.test.ts     # Automated unit test suite (23 passing tests)
```

---

## 🚀 Getting Started

### Prerequisites

* [Bun](https://bun.sh/) (v1.2+ recommended) or [Node.js](https://nodejs.org/) (v20+)
* [Expo CLI](https://docs.expo.dev/get-started/installation/)
* (Optional for Android builds) Android Studio & JDK 17+

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pipspritam/color-fool.git
   cd color-fool
   ```

2. **Install dependencies:**
   ```bash
   bun install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file and provide your Supabase project credentials:
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```
   *(Note: Solo offline play functions fully even without Supabase credentials).*

---

## 💻 Development Commands

| Command | Description |
| :--- | :--- |
| `bun run start` | Launch the Expo Metro development server |
| `bun run android` | Run on connected Android device / emulator |
| `bun run ios` | Run on iOS simulator (macOS required) |
| `bun run web` | Run web preview in browser |
| `bun run test` | Run automated unit test suite with Bun |
| `bun x tsc --noEmit` | Run TypeScript compiler strict type-check (`strict: true`) |
| `bun x expo-doctor` | Validate dependency integrity and Expo SDK 57 health |
| `npx expo prebuild --platform android` | Regenerate native Android project files |

---

## 🧪 Testing

The automated test suite in `__tests__/colorScorer.test.ts` validates mathematical color boundaries and game mechanics across **23 unit tests**:
* **Pure Black ($L=0$) & Pure White ($L=100$)**: Verifies $\Delta E = 0$ irrespective of hue angles.
* **Achromatic Grayscale ($S=0$)**: Verifies neutral $R=G=B$ conversion across lightness levels.
* **Circular Hue Wraparound ($0^\circ \leftrightarrow 360^\circ$)**: Verifies identical RGB output and multi-turn modulo handling.
* **Continuous 2-Decimal Scoring**: Verifies piecewise thresholds from $\Delta E \le 0.00$ down to $50.00$.
* **Palette Resolution**: Verifies fixed and cyclic custom palette sequences and boundaries.
* **Deterministic Tie-Breaking**: Validates primary (score), secondary ($\Delta E$), and tertiary (alphabetical) ranking tiers.

To execute the test suite:
```bash
bun test
```

---

## 📐 Color Science: How Scoring Works

1. **sRGB Linearization (Gamma Expansion)**:
   $$v = \frac{C_{\text{srgb}}}{255}$$
   $$V = \begin{cases} \frac{v}{12.92} & v \le 0.04045 \\ \left(\frac{v + 0.055}{1.055}\right)^{2.4} & v > 0.04045 \end{cases}$$

2. **Linear RGB to CIE XYZ (D65 Standard Observer)**:
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124564 & 0.3575761 & 0.1804375 \\ 0.2126729 & 0.7151522 & 0.0721750 \\ 0.0193339 & 0.1191920 & 0.9503041 \end{bmatrix} \begin{bmatrix} R_{\text{linear}} \\ G_{\text{linear}} \\ B_{\text{linear}} \end{bmatrix}$$

3. **CIE XYZ to CIELAB ($L^*, a^*, b^*$)**:
   Using reference white $X_n = 0.95047, Y_n = 1.00000, Z_n = 1.08883$:
   $$L^* = 116 f(Y/Y_n) - 16, \quad a^* = 500 [f(X/X_n) - f(Y/Y_n)], \quad b^* = 200 [f(Y/Y_n) - f(Z/Z_n)]$$

4. **Euclidean $\Delta E$ Distance**:
   $$\Delta E = \sqrt{(\Delta L^*)^2 + (\Delta a^*)^2 + (\Delta b^*)^2}$$

5. **Continuous Score Interpolation**:
   * $\Delta E \le 0.00 \implies 10.00\text{ pts}$
   * $\Delta E \in (0.00, 10.00] \implies 10.00 - 0.20 \times \Delta E$
   * $\Delta E \in (10.00, 18.00] \implies 8.00 - \frac{\Delta E - 10.00}{8.00} \times 2.00$
   * $\Delta E \in (18.00, 28.00] \implies 6.00 - \frac{\Delta E - 18.00}{10.00} \times 2.00$
   * $\Delta E \in (28.00, 40.00] \implies 4.00 - \frac{\Delta E - 28.00}{12.00} \times 2.00$
   * $\Delta E \in (40.00, 50.00] \implies 2.00 - \frac{\Delta E - 40.00}{10.00} \times 2.00$
   * $\Delta E > 50.00 \implies 0.00\text{ pts}$

---

## 🔒 Privacy

Color Fool does not collect, store, profile, or sell personal data. All solo gameplay occurs locally on the device. Multiplayer matches use transient, encrypted WebSockets via Supabase Realtime Channels. See our complete [Privacy Policy](PRIVACY_POLICY.md).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
