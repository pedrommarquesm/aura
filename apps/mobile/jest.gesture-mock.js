const React = require('react');
const { View } = require('react-native');

function tap() {
  const gesture = {
    numberOfTaps: () => gesture,
    maxDuration: () => gesture,
    maxDelay: () => gesture,
    onEnd: () => gesture,
  };
  return gesture;
}

function pinch() {
  const gesture = {
    onUpdate: () => gesture,
    onEnd: () => gesture,
  };
  return gesture;
}

function pan() {
  const gesture = {
    minDistance: () => gesture,
    maxPointers: () => gesture,
    enabled: () => gesture,
    onStart: () => gesture,
    onUpdate: () => gesture,
    onEnd: () => gesture,
  };
  return gesture;
}

function GestureHandlerRootView({ children }) {
  return React.createElement(View, null, children);
}

function GestureDetector({ children }) {
  return children ?? null;
}

module.exports = {
  GestureHandlerRootView,
  GestureDetector,
  Gesture: {
    Tap: tap,
    Pinch: pinch,
    Pan: pan,
    Exclusive: (...gestures) => gestures[0],
    Simultaneous: (...gestures) => gestures[0],
  },
  State: {},
  Directions: {},
};
