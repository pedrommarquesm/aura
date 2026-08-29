import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function HeartIcon({
  filled = true,
  ...props
}: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
        <path d="M12 20.727 3.6 12.6a5.4 5.4 0 0 1 7.638-7.63L12 5.73l.762-.76a5.4 5.4 0 0 1 7.638 7.63Z" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 20.727 3.6 12.6a5.4 5.4 0 0 1 7.638-7.63L12 5.73l.762-.76a5.4 5.4 0 0 1 7.638 7.63Z" />
    </svg>
  );
}

export function PlayIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.29-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
