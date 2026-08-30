type Listener = () => void;

const listeners = new Set<Listener>();

/** Home registers the FlashList scroll; the tab bar fires this on press. */
export function subscribeFeedTabPress(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitFeedTabPress() {
  for (const listener of listeners) listener();
}
