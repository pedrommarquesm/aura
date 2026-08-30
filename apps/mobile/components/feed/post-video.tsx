import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { FeedMedia } from '@/lib/api';
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
}: {
  source: string;
  playing: boolean;
  muted: boolean;
}) {
  const player = useVideoPlayer(source, (instance) => {
    instance.loop = true;
    instance.muted = muted;
    instance.volume = 1;
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
    player.volume = 1;
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
        contentFit="cover"
        nativeControls={false}
        allowsPictureInPicture={false}
        allowsVideoFrameAnalysis={false}
        playsInline
        pointerEvents="none"
      />
    </View>
  );
}

export function VideoMuteBadge({ muted, label }: { muted: boolean; label: string }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no"
      className="absolute bottom-3 left-3 flex-row items-center gap-1 rounded-full px-2 py-1"
      style={{ backgroundColor: withAlpha(colors.bg, 0.7) }}
    >
      <Ionicons
        name={muted ? 'volume-mute' : 'volume-high'}
        size={12}
        color={colors.text.DEFAULT}
      />
      <Text variant="caption">{label}</Text>
    </View>
  );
}
