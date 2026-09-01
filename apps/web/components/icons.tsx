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

export function SettingsIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 13a7.7 7.7 0 0 0 .1-2l2-1.2-2-3.4-2.3.5a8 8 0 0 0-1.7-1L15 3.5h-4l-.5 2.4a8 8 0 0 0-1.7 1L6.5 6.4l-2 3.4 2 1.2a7.7 7.7 0 0 0 0 2l-2 1.2 2 3.4 2.3-.5a8 8 0 0 0 1.7 1l.5 2.4h4l.5-2.4a8 8 0 0 0 1.7-1l2.3.5 2-3.4-2-1.2Z" />
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

/** Ionicons `chatbubble-outline` — comments on the feed card. */
export function CommentIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M19.5 15.4a7.6 7.6 0 1 0-3.1 3.2L19.8 20a.6.6 0 0 0 .75-.75l-1.05-3.85Z" />
    </svg>
  );
}

/** Ionicons `arrow-redo-outline` — share on the feed card. */
export function ShareIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M9.5 12.5 16 7.8" />
      <path d="M16 7.8c.4 3.2-1.1 6.3-4.2 8.2-1.3.8-2.8 1.2-4.3 1.2" />
      <path d="M16 7.8 12.4 4.5" />
    </svg>
  );
}

/** Ionicons `ellipsis-horizontal` — more menu on the feed card. */
export function MoreIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}

/** Filter funnel — the ledger's demo header, landing page only. */
export function FilterIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M4 5h16M7 12h10M10.5 19h3" />
    </svg>
  );
}

/** A dragging hand — the slider demo's gesture hint, landing page only. */
export function DragHandIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M9 11.5V6a1.5 1.5 0 0 1 3 0v4.5" />
      <path d="M12 10V5a1.5 1.5 0 0 1 3 0v5.5" />
      <path d="M15 10.5V8a1.5 1.5 0 0 1 3 0v6c0 3.5-2 6.5-6 6.5s-6.5-2-7.5-5L3.7 12a1.4 1.4 0 0 1 2-2l2.3 2" />
    </svg>
  );
}
