const React = require('react');
const { Text } = require('react-native');

function Ionicons(props) {
  return React.createElement(Text, props, props.name ?? 'icon');
}

module.exports = {
  __esModule: true,
  default: Ionicons,
};
