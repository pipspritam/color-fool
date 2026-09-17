import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Difficulty } from '../hooks/useColorState';
import { triggerHaptic } from '../utils/haptics';

interface HomeScreenProps {
  onStartSolo: (difficulty: Difficulty) => void;
  onStartMultiplayer: () => void;
  sliderPosition: 'left' | 'right';
  onUpdateSliderPosition: (pos: 'left' | 'right') => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onStartSolo,
  onStartMultiplayer,
  sliderPosition,
  onUpdateSliderPosition,
}) => {
  const insets = useSafeAreaInsets();
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 24) + 8,
          paddingBottom: Math.max(insets.bottom, 20) + 8,
        },
      ]}
    >
      {/* Settings Gear Button */}
      <TouchableOpacity
        style={[
          styles.settingsBtn,
          {
            top: Math.max(insets.top, 24) + 8,
          },
        ]}
        onPress={() => {
          triggerHaptic('light');
          setShowSettings(true);
        }}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Text style={styles.settingsIcon}>⚙</Text>
      </TouchableOpacity>
      <View style={styles.content}>
        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
          </View>
          <Text style={styles.title}>color-fool</Text>
          <Text style={styles.tagline}>Memorize. Reconstruct. Match.</Text>
        </View>

        {/* Difficulty Presets */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>SELECT DIFFICULTY</Text>
          <View style={styles.diffRow}>
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
              const isSelected = difficulty === level;
              return (
                <TouchableOpacity
                  key={level}
                  style={[styles.diffBtn, isSelected && styles.diffBtnActive]}
                  onPress={() => setDifficulty(level)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.diffText, isSelected && styles.diffTextActive]}>
                    {level.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.descBox}>
            {difficulty === 'easy' && (
              <>
                <Text style={styles.descTitle}>5.0s Preview • Vivid Palette</Text>
                <Text style={styles.descSub}>High saturation colors (40% - 90%)</Text>
              </>
            )}
            {difficulty === 'medium' && (
              <>
                <Text style={styles.descTitle}>3.0s Preview • Standard Spectrum</Text>
                <Text style={styles.descSub}>Balanced shades (15% - 95%)</Text>
              </>
            )}
            {difficulty === 'hard' && (
              <>
                <Text style={styles.descTitle}>1.5s Preview • Expert Palette</Text>
                <Text style={styles.descSub}>Muted, pastels, and dark earth tones (5% - 100%)</Text>
              </>
            )}
          </View>
        </View>

        {/* Math & Rule info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>HOW IT WORKS</Text>
          <Text style={styles.infoText}>
            1. Memorize the preview color before the timer expires.{'\n'}
            2. Use the 3 vertical sliders (Hue, Saturation, Lightness) to match it.{'\n'}
            3. Score 0 to 10 points per round calculated via perceptual ΔE distance.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => onStartSolo(difficulty)}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>SOLO MATCH (5 ROUNDS)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={onStartMultiplayer}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryBtnText}>MULTIPLAYER ROOM (UP TO 10)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowSettings(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>SETTINGS</Text>
            <Text style={styles.modalSubtitle}>COLOR BARS POSITION (H S L)</Text>

            <View style={styles.optionsList}>
              {/* Option 1: Left */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  sliderPosition === 'left' && styles.optionCardActive,
                ]}
                onPress={() => {
                  triggerHaptic('selection');
                  onUpdateSliderPosition('left');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      sliderPosition === 'left' && styles.radioCircleActive,
                    ]}
                  >
                    {sliderPosition === 'left' && <View style={styles.radioInner} />}
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.optionLabel,
                        sliderPosition === 'left' && styles.optionLabelActive,
                      ]}
                    >
                      Left (H S L)
                    </Text>
                    <Text style={styles.optionSub}>
                      Slider bars docked on the left rail
                    </Text>
                  </View>
                </View>
                {sliderPosition === 'left' && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </TouchableOpacity>

              {/* Option 2: Right */}
              <TouchableOpacity
                style={[
                  styles.optionCard,
                  sliderPosition === 'right' && styles.optionCardActive,
                ]}
                onPress={() => {
                  triggerHaptic('selection');
                  onUpdateSliderPosition('right');
                }}
                activeOpacity={0.8}
              >
                <View style={styles.optionLeft}>
                  <View
                    style={[
                      styles.radioCircle,
                      sliderPosition === 'right' && styles.radioCircleActive,
                    ]}
                  >
                    {sliderPosition === 'right' && <View style={styles.radioInner} />}
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.optionLabel,
                        sliderPosition === 'right' && styles.optionLabelActive,
                      ]}
                    >
                      Right (H S L)
                    </Text>
                    <Text style={styles.optionSub}>
                      Slider bars docked on the right rail
                    </Text>
                  </View>
                </View>
                {sliderPosition === 'right' && (
                  <Text style={styles.checkIcon}>✓</Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => {
                triggerHaptic('light');
                setShowSettings(false);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDoneText}>DONE</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  settingsBtn: {
    position: 'absolute',
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  settingsIcon: {
    fontSize: 20,
    color: '#94A3B8',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  tagline: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#131D31',
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  diffBtnActive: {
    backgroundColor: '#38BDF8',
    borderColor: '#38BDF8',
  },
  diffText: {
    color: '#94A3B8',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  diffTextActive: {
    color: '#090D16',
    fontWeight: '900',
  },
  descBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  descTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  descSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoTitle: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  infoText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  actions: {
    gap: 12,
    marginBottom: 10,
  },
  primaryBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#090D16',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  secondaryBtn: {
    backgroundColor: '#131D31',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#131D31',
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCardActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#38BDF8',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#38BDF8',
  },
  optionLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  optionLabelActive: {
    color: '#38BDF8',
  },
  optionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  checkIcon: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
  },
  modalDoneBtn: {
    backgroundColor: '#38BDF8',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalDoneText: {
    color: '#090D16',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
});
