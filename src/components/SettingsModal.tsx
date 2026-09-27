import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { triggerHaptic } from '../utils/haptics';
import { theme } from '../theme';

export interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  sliderPosition: 'left' | 'right';
  onUpdateSliderPosition?: (pos: 'left' | 'right') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onClose,
  sliderPosition,
  onUpdateSliderPosition,
}) => {
  const handleSelect = (pos: 'left' | 'right') => {
    triggerHaptic('selection');
    onUpdateSliderPosition?.(pos);
  };

  const handleClose = () => {
    triggerHaptic('light');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={handleClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeaderRow}>
            <View>
              <Text style={styles.modalTitle}>SETTINGS</Text>
              <Text style={styles.modalSubtitle}>COLOR BARS POSITION (H S L)</Text>
            </View>
            <TouchableOpacity
              style={styles.closeIconBtn}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIconText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {/* Option 1: Left */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                sliderPosition === 'left' && styles.optionCardActive,
              ]}
              onPress={() => handleSelect('left')}
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
            </TouchableOpacity>

            {/* Option 2: Right */}
            <TouchableOpacity
              style={[
                styles.optionCard,
                sliderPosition === 'right' && styles.optionCardActive,
              ]}
              onPress={() => handleSelect('right')}
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
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.modalDoneBtn}
            onPress={handleClose}
            activeOpacity={0.85}
          >
            <Text style={styles.modalDoneText}>DONE</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalCard: {
    backgroundColor: theme.colors.cardSurface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
  },
  modalSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  closeIconBtn: {
    padding: 4,
  },
  closeIconText: {
    color: theme.colors.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  optionsList: {
    gap: 12,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: theme.colors.surface2,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.surfaceBorder,
  },
  optionCardActive: {
    backgroundColor: theme.colors.surface2,
    borderColor: theme.colors.primaryAccent,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: theme.colors.primaryAccent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primaryAccent,
  },
  optionLabel: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  optionLabelActive: {
    color: theme.colors.textPrimary,
    fontWeight: '800',
  },
  optionSub: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  modalDoneBtn: {
    backgroundColor: theme.colors.primaryAccent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    color: theme.colors.accentText,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1.5,
  },
});
