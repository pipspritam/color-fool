# Color Fool 🎨

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2057-000020.svg?logo=expo)](https://docs.expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.86.3-61DAFB.svg?logo=react)](https://reactnative.dev/)
[![React](https://img.shields.io/badge/React-19.2.3-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.4+-fbf0df.svg?logo=bun)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Color Fool** is a high-precision, real-time multiplayer and solo color perception game built with Expo and React Native. Test and sharpen your visual color memory against friends or solo by memorizing target swatches and reproducing them using interactive HSL (Hue, Saturation, Lightness) gesture sliders.

Scoring is powered by real color science: perceptual color differences are calculated using the standard **CIELAB $\Delta E$** Euclidean metric under the CIE D65 illuminant, mapped to a continuous **2-decimal point scoring system ($0.00$ to $10.00$ points)**.

---

## ✨ Features

* **🔬 Scientific Color Accuracy (CIELAB $\Delta E$)**:
  * Accurate mathematical transformation: $\text{sRGB} \to \text{Linear sRGB} \to \text{CIE } XYZ \to \text{CIELAB}$.
  * Computes Euclidean perceptual distance ($\Delta E = \sqrt{\Delta L^{*2} + \Delta a^{*2} + \Delta b^{*2}}$) to assess human visual difference.
* **🎯 Continuous 2-Decimal Scoring ($0.00 - 10.00$ pts)**:
  * Replaces coarse integer brackets with continuous piecewise color science curves.
  * Rewards microscopic differences (e.g. $\Delta E = 1.20 \to 9.76\text{ pts}$, $\Delta E = 5.00 \to 9.00\text{ pts}$).
* **⚡ Real-Time Multiplayer (Supabase Realtime)**:
  * 6-digit room codes for instant matchmaking.
  * Real-time presence detection and live streaming slider sync.
  * Instant round conclusion when all players lock in their guesses.
  * Live round standings, $\Delta E$ breakdowns, and final podium awards.
  * One-tap match rematching and seamless lobby return.
* **🕹️ Flexible Game Modes**:
  * **Presets**: Easy ($5.0\text{s}$ preview), Medium ($3.0\text{s}$ preview), Hard ($1.5\text{s}$ preview) with unlimited guess time in multiplayer.
  * **Custom Mode**: Configure custom preview duration ($0.5\text{s} - 99.0\text{s}$), guess time limits ($0.5\text{s} - 99.0\text{s}$ or unlimited), and round counts ($1 - 30$).
* **📳 Mobile Ergonomics & Haptics**:
  * Multi-tier tactile feedback (`light`, `medium`, `heavy`, `selection`, `success`) throttled to prevent native bridge saturation.
  * Native Android hardware back button lifecycle handling.
  * Left-handed and right-handed slider position customization.
  * Zero-data collection, 100% privacy-first design.

---

## 🏗️ Architecture & Tech Stack

```
color-fool/
├── App.tsx                     # Root application state & navigation router
├── app.json                    # Expo project configuration & plugins
├── assets/                     # App icons, splash screens, and store graphics
├── src/
│   ├── components/
│   │   ├── CountdownRing.tsx   # Smooth 50ms interval circular countdown timer
│   │   ├── Leaderboard.tsx     # Live dynamic in-game & results leaderboard
│   │   ├── ResultSplit.tsx     # Side-by-side color split & round scoring card
│   │   ├── SettingsModal.tsx   # Slider orientation and gameplay settings modal
│   │   └── VerticalSlider.tsx  # High-performance gesture-driven HSL sliders
│   ├── hooks/
│   │   ├── useColorState.ts    # HSL state management & random target generation
│   │   └── useMultiplayer.ts   # Supabase WebSocket networking & match authority
│   ├── screens/
│   │   ├── GameScreen.tsx      # Solo gameplay flow (preview -> guess -> result)
│   │   ├── HomeScreen.tsx      # Solo/Multiplayer mode selection & custom config
│   │   ├── LobbyScreen.tsx     # Room creation, player roster, & in-game multiplayer
│   │   └── SummaryScreen.tsx   # Match breakdown, performance rating, & share
│   └── utils/
│       ├── colorScorer.ts      # CIELAB conversion, Delta E, & scoring formulas
│       ├── haptics.ts          # Throttled cross-platform haptic feedback engine
│       ├── storage.ts          # Resilient AsyncStorage / memory fallback persistence
│       └── supabase.ts         # Supabase client initialization & status checks
└── __tests__/
    └── colorScorer.test.ts     # Automated unit test suite (Jest + jest-expo)
```

---

## 🚀 Getting Started

### Prerequisites

* [Bun](https://bun.sh/) (v1.2+ recommended) or [Node.js](https://nodejs.org/) (v20+)
* [Expo CLI](https://docs.expo.dev/get-started/installation/)
* (Optional for Android builds) Android Studio & JDK 20+

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
| `bun run test` | Run automated unit test suite with Jest |
| `bun x tsc --noEmit` | Run TypeScript compiler strict type-check |
| `bun x expo-doctor` | Validate dependency integrity and Expo SDK 57 health |
| `npx expo prebuild --platform android` | Regenerate native Android project files |

---

## 🧪 Testing

The test suite validates color conversions across mathematical boundary cases:
* **Pure Black ($L=0$) & Pure White ($L=100$)**: Verifies $\Delta E = 0$ irrespective of hue angles.
* **Achromatic Grayscale ($S=0$)**: Verifies neutral $R=G=B$ conversion across lightness levels.
* **Circular Hue Wraparound ($0^\circ \leftrightarrow 360^\circ$)**: Verifies identical RGB output and multi-turn modulo handling.
* **Continuous 2-Decimal Scoring**: Verifies piecewise thresholds from $\Delta E \le 0.0$ down to $50.0$.

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
   $$\begin{bmatrix} X \\ Y \\ Z \end{bmatrix} = \begin{bmatrix} 0.4124 & 0.3576 & 0.1804 \\ 0.2127 & 0.7152 & 0.0722 \\ 0.0193 & 0.1192 & 0.9503 \end{bmatrix} \begin{bmatrix} R_{\text{linear}} \\ G_{\text{linear}} \\ B_{\text{linear}} \end{bmatrix}$$

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

Color Fool does not collect, store, profile, or sell personal data. All solo gameplay occurs locally on the device. Multiplayer matches use transient, encrypted WebSockets via Supabase. See our complete [Privacy Policy](PRIVACY_POLICY.md).

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
