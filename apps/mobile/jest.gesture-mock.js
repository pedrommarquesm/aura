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
    Exclusive: (...gestures) => gestures[0],
  },
  State: {},
  Directions: {},
};
