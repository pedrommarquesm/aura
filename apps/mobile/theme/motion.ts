import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

import { motion } from './tokens';

/** `instant` / `quick` — ease-out timings for state changes the user just caused. */
export const instant: WithTimingConfig = {
  duration: motion.instant.duration,
  easing: Easing.out(Easing.quad),
};

export const quick: WithTimingConfig = {
  duration: motion.quick.duration,
  easing: Easing.out(Easing.quad),
};

/** `smooth` — the default spring for anything that moves on screen. */
export const smooth: WithSpringConfig = {
  damping: motion.smooth.damping,
  stiffness: motion.smooth.stiffness,
};

/** `celebrate` — noticeably bouncier. Reserved for earned moments. */
export const celebrate: WithSpringConfig = {
  damping: motion.celebrate.damping,
  stiffness: motion.celebrate.stiffness,
};

/** The `celebrate` duration as a timing curve, for one-shot travel like a rising label. */
export const celebrateTiming: WithTimingConfig = {
  duration: motion.celebrate.duration,
  easing: Easing.out(Easing.cubic),
};

/** Overlay heart on the photo. */
export const burstTiming: WithTimingConfig = {
  duration: motion.burst.duration,
  easing: Easing.out(Easing.cubic),
};

/** `+Aura` float. Longer than the heart so the label is still readable at the top. */
export const riseTiming: WithTimingConfig = {
  duration: motion.rise.duration,
  easing: Easing.out(Easing.cubic),
};
