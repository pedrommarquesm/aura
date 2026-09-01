import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { colors } from '@/theme/tokens';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Certified / Cooked (`RDX-53`/`RDX-54`) are blocked on a remote-config
 * inject threshold (Q13) that does not exist yet — the header swipe
 * (`RDX-51`) is real, the destination isn't. A placeholder keeps the
 * gesture honest instead of hiding these pages entirely.
 */
export function FeedPlaceholderPage({
  icon,
  title,
  body,
  width,
  height,
}: {
  icon: IoniconName;
  title: string;
  body: string;
  width: number;
  height: number;
}) {
  return (
    <View
      className="items-center justify-center bg-bg px-8"
      style={{ width, height }}
    >
      <Ionicons name={icon} size={40} color={colors.text.muted} />
      <Text variant="title" className="pt-4 text-center">
        {title}
      </Text>
      <Text variant="body" tone="secondary" className="pt-2 text-center">
        {body}
      </Text>
    </View>
  );
}
