import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import {
  clampScale,
  clampTranslation,
  coverScale,
  cropRectFromTransform,
} from '@/lib/media/avatar-crop';
import { colors } from '@/theme/tokens';

const AnimatedImage = Animated.createAnimatedComponent(Image);

export type AvatarCropHandle = {
  crop(): { originX: number; originY: number; width: number; height: number };
};

export function AvatarCropEditor({
  uri,
  imageWidth,
  imageHeight,
  cropRef,
}: {
  uri: string;
  imageWidth: number;
  imageHeight: number;
  cropRef: { current: AvatarCropHandle | null };
}) {
  const { width: viewportW, height: viewportH } = useWindowDimensions();
  const circleSize = Math.min(viewportW, viewportH) * 0.72;
  const base = coverScale(imageWidth, imageHeight, circleSize);
  const displayW = imageWidth * base;
  const displayH = imageHeight * base;

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  cropRef.current = {
    crop: () =>
      cropRectFromTransform({
        imageWidth,
        imageHeight,
        circleSize,
        scale: scale.value,
        translateX: translateX.value,
        translateY: translateY.value,
      }),
  };

  const pinch = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          const next = clampScale(savedScale.value * event.scale);
          scale.value = next;
          const clamped = clampTranslation(
            translateX.value,
            translateY.value,
            imageWidth,
            imageHeight,
            circleSize,
            next,
          );
          translateX.value = clamped.x;
          translateY.value = clamped.y;
        })
        .onEnd(() => {
          savedScale.value = scale.value;
          savedX.value = translateX.value;
          savedY.value = translateY.value;
        }),
    [circleSize, imageHeight, imageWidth, savedScale, savedX, savedY, scale, translateX, translateY],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(1)
        .onUpdate((event) => {
          const clamped = clampTranslation(
            savedX.value + event.translationX,
            savedY.value + event.translationY,
            imageWidth,
            imageHeight,
            circleSize,
            scale.value,
          );
          translateX.value = clamped.x;
          translateY.value = clamped.y;
        })
        .onEnd(() => {
          savedX.value = translateX.value;
          savedY.value = translateY.value;
        }),
    [circleSize, imageHeight, imageWidth, savedX, savedY, scale, translateX, translateY],
  );

  const composed = useMemo(() => Gesture.Simultaneous(pinch, pan), [pan, pinch]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const overlayPad = Math.max(viewportW, viewportH);

  return (
    <View style={styles.stage} testID="avatar-crop">
      <GestureDetector gesture={composed}>
        <Animated.View
          style={[
            styles.imageWrap,
            {
              left: (viewportW - displayW) / 2,
              top: (viewportH - displayH) / 2,
              width: displayW,
              height: displayH,
            },
            imageStyle,
          ]}
        >
          <AnimatedImage
            source={{ uri }}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
        </Animated.View>
      </GestureDetector>

      <View pointerEvents="none" style={styles.overlay}>
        <View
          style={{
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            borderWidth: overlayPad,
            borderColor: 'rgba(0,0,0,0.62)',
            backgroundColor: 'transparent',
          }}
        />
        <View
          style={[
            styles.ring,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  imageWrap: {
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.text.DEFAULT,
  },
});
