let active: HTMLVideoElement | null = null;

/** One video plays at a time — same rule as the mobile feed. */
export function becomeActiveVideo(el: HTMLVideoElement) {
  if (active && active !== el) {
    active.pause();
  }
  active = el;
}

export function releaseActiveVideo(el: HTMLVideoElement) {
  if (active === el) active = null;
}
