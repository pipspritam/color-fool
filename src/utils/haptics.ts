import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const triggerHaptic = (
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light'
) => {
  if (Platform.OS === 'web') return;

  try {
    if (style === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (style === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else if (style === 'heavy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } else if (style === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (style === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  } catch {
    // Fail silently in simulator or unsupported devices
  }
};
