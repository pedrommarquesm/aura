const { View } = require('react-native');

function shared(init) {
  let current = init;
  return {
    get value() {
      return current;
    },
    set value(next) {
      current = next;
    },
    get() {
      return current;
    },
    set(next) {
      current = typeof next === 'function' ? next(current) : next;
    },
  };
}

const Animated = {
  View,
  createAnimatedComponent: (Component) => Component,
  call: () => undefined,
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...Animated,
  useSharedValue: shared,
  useAnimatedStyle: (fn) => {
    try {
      return fn();
    } catch {
      return {};
    }
  },
  useAnimatedReaction: () => undefined,
  useAnimatedRef: () => ({ current: null }),
  useEvent: () => undefined,
  useHandler: () => ({}),
  useWorkletCallback: (fn) => fn,
  withTiming: (value) => value,
  withSpring: (value) => value,
  withRepeat: (value) => value,
  withSequence: (...values) => values[values.length - 1],
  withDelay: (_ms, value) => value,
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (value) => value,
  interpolateColor: () => 'transparent',
  cancelAnimation: () => undefined,
  Easing: {
    linear: (v) => v,
    quad: (v) => v,
    cubic: (v) => v,
    bezier: () => (v) => v,
    out: (fn) => fn,
    in: (fn) => fn,
    inOut: (fn) => fn,
  },
};
