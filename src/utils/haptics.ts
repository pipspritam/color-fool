import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export const triggerHaptic = (
  style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection' = 'light'
) => {
  if (Platform.OS === 'web') return;

  const noop = () => {};
  try {
    if (style === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(noop);
    } else if (style === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(noop);
    } else if (style === 'heavy') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(noop);
    } else if (style === 'success') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(noop);
    } else if (style === 'warning') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(noop);
    } else if (style === 'selection') {
      Haptics.selectionAsync().catch(noop);
    }
  } catch {
    // Fail silently in simulator or unsupported devices
  }
};
