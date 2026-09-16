import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { triggerHaptic } from '../utils/haptics';

interface VerticalSliderProps {
  value: number; // 0 to max
  min: number;
  max: number;
  colors: string[];
  onChange: (val: number) => void;
  width?: number;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({
  value,
  min,
  max,
  colors,
  onChange,
  width = 34,
}) => {
  const [trackHeight, setTrackHeight] = useState<number>(300);
  const trackHeightRef = useRef<number>(300);
  const trackPageYRef = useRef<number>(0);
  const containerRef = useRef<View>(null);
  const lastStepRef = useRef<number>(value);

  const normalize = (val: number) => {
    return Math.max(0, Math.min(1, (val - min) / (max - min)));
  };

  const updateFromPageY = (pageY: number) => {
    const relativeY = pageY - trackPageYRef.current;
    const clampedY = Math.max(0, Math.min(trackHeightRef.current, relativeY));
    const ratio = clampedY / (trackHeightRef.current || 1);
    const computedVal = min + ratio * (max - min);
    const rounded = Math.round(computedVal);

    if (Math.abs(rounded - lastStepRef.current) >= 3) {
      triggerHaptic('light');
      lastStepRef.current = rounded;
    }

    onChange(rounded);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        containerRef.current?.measure((x, y, w, h, pageX, pageY) => {
          trackPageYRef.current = pageY;
          updateFromPageY(evt.nativeEvent.pageY);
        });
      },
      onPanResponderMove: (evt) => {
        updateFromPageY(evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {
        triggerHaptic('medium');
      },
    })
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    if (height > 0) {
      setTrackHeight(height);
      trackHeightRef.current = height;
    }
  };

  const knobPosition = normalize(value) * trackHeight;
  const knobSize = 26;

  return (
    <View
      ref={containerRef}
      style={[styles.container, { width }]}
      onLayout={onLayout}
      {...panResponder.panHandlers}
    >
      <LinearGradient
        colors={colors as [string, string, ...string[]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradientTrack}
      />
      <View
        style={[
          styles.knob,
          {
            width: knobSize,
            height: knobSize,
            borderRadius: knobSize / 2,
            top: Math.max(0, Math.min(trackHeight - knobSize, knobPosition - knobSize / 2)),
            left: (width - knobSize) / 2,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientTrack: {
    width: 20,
    height: '100%',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  knob: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: 'rgba(0, 0, 0, 0.25)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 5,
    elevation: 6,
  },
});
