import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { FeedMedia } from '@/lib/api';
import { instant, quick } from '@/theme/motion';
import { colors, withAlpha } from '@/theme/tokens';

export function videoPlaybackUrl(media: FeedMedia): string | null {
  return media.hlsUrl ?? media.feedUrl ?? null;
}

/**
 * Muted loop by default. The parent owns play/pause (viewport) and mute (tap).
 * `pointerEvents` is none so the feed card's like / unmute gestures stay on top.
 */
export function PostVideo({
  source,
  playing,
  muted,
  contentFit = 'contain',
}: {
  source: string;
  playing: boolean;
  muted: boolean;
  /** Letterbox when the asset is shorter than the stage. */
  contentFit?: 'contain' | 'cover';
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = muted;
    instance.volume = 1;
    instance.showNowPlayingNotification = false;
    // `auto`: stay out of the way while muted; take the playback session
    // when unmuted so iOS plays through the silent switch.
    instance.audioMixingMode = 'auto';
    if (playing) {
      instance.play();
    }
  });

  useEffect(() => {
    // Live setters on the native player, not React state.
    // eslint-disable-next-line react-hooks/immutability -- expo-video
    player.muted = muted;
    player.audioMixingMode = 'auto';
  }, [muted, player]);

  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit={contentFit}
        nativeControls={false}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
        playsInline
        pointerEvents="none"
      />
    </View>
  );
}

const HOLD = { duration: 420 };

const FLASH = 56;

/**
 * Mute HUD in the middle of the host. `hostHeight` is required because
 * fill + `justifyContent: 'center'` collapses to the top of a full-bleed
 * card (right under the Dynamic Island).
 */
export function VideoMuteBadge({ muted, hostHeight }: { muted: boolean; hostHeight: number }) {
  const seen = useRef(muted);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (seen.current === muted) return;
    seen.current = muted;

    progress.set(0);
    progress.set(withSequence(withTiming(1, instant), withTiming(1, HOLD), withTiming(0, quick)));
  }, [muted, progress]);

  const flash = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      opacity: p,
      transform: [{ scale: 0.78 + p * 0.22 }],
    };
  });

  if (hostHeight <= 0) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      collapsable={false}
      style={[styles.flash, { top: Math.round(hostHeight / 2 - FLASH / 2) }]}
    >
      <Animated.View style={[styles.flashWell, flash]}>
        <Ionicons
          name={muted ? 'volume-mute' : 'volume-high'}
          size={28}
          color={colors.text.DEFAULT}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flash: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FLASH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  flashWell: {
    height: FLASH,
    width: FLASH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FLASH / 2,
    backgroundColor: withAlpha(colors.bg, 0.55),
  },
});
