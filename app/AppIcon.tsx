type IconName =
  | "arrow-right"
  | "bag"
  | "bell"
  | "calendar"
  | "chef-hat"
  | "clock"
  | "close"
  | "heart"
  | "home"
  | "list"
  | "plus"
  | "search"
  | "settings"
  | "sparkles"
  | "star"
  | "trash"
  | "user";

type AppIconProps = {
  name: IconName;
  className?: string;
  filled?: boolean;
  /** Stroke width in user units (default 1.8). Use ~2.2+ for small UI targets. */
  strokeWidth?: number;
};

const paths: Record<IconName, string> = {
  "arrow-right":
    "M5 12h14m-5-5 5 5-5 5",
  bag: "M6 8h12l1 11H5L6 8Zm3 0V6a3 3 0 1 1 6 0v2",
  bell: "M15 17h5l-1.4-1.4a2 2 0 0 1-.6-1.4V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9",
  calendar:
    "M7 3v3m10-3v3M5 8h14M5 6.5A1.5 1.5 0 0 1 6.5 5h11A1.5 1.5 0 0 1 19 6.5v11A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5v-11Z",
  "chef-hat":
    "M7 18h10m-9 0v-4h8v4m2-9a3 3 0 0 0-5-2.2A4 4 0 0 0 6 9a3 3 0 0 0 1.5 5.6h9A3.5 3.5 0 0 0 18 9Z",
  clock:
    "M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  close:
    "m7 7 10 10M17 7 7 17",
  heart:
    "m12 20-.7-.6C6 14.8 3 12 3 8.6 3 6 5 4 7.6 4c1.5 0 3 .7 4 1.9A5.2 5.2 0 0 1 15.6 4C18.2 4 20 6 20 8.6c0 3.4-3 6.2-8.3 10.8L12 20Z",
  home:
    "m4 10 8-6 8 6m-2 0v9H6v-9",
  list:
    "M8 7h11M8 12h11M8 17h11M4 7h.01M4 12h.01M4 17h.01",
  plus:
    "M12 5v14M5 12h14",
  search:
    "m21 21-4.35-4.35M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z",
  settings:
    "M12 8.8A3.2 3.2 0 1 1 8.8 12 3.2 3.2 0 0 1 12 8.8Zm0-5.8 1.1 2.4a7.8 7.8 0 0 1 1.8.7L17.5 5l1.8 1.8-1.1 2.6c.3.6.5 1.2.7 1.8L21 12l-2.4 1.1a7.8 7.8 0 0 1-.7 1.8l1.1 2.6-1.8 1.8-2.6-1.1c-.6.3-1.2.5-1.8.7L12 21l-1.1-2.4a7.8 7.8 0 0 1-1.8-.7L6.5 19l-1.8-1.8 1.1-2.6a7.8 7.8 0 0 1-.7-1.8L3 12l2.4-1.1c.1-.6.4-1.2.7-1.8L5 6.5 6.8 4.7l2.6 1.1c.6-.3 1.2-.5 1.8-.7L12 3Z",
  sparkles:
    "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Zm6.5 11 1 2.5L22 17.5l-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5ZM5.5 13l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2Z",
  star:
    "m12 3.7 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.8l5.8-.8L12 3.7Z",
  /** Standard bin + lid (Lucide-style); reads clearer at small sizes than a thin bucket. */
  trash:
    "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
  user:
    "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 1 1 14 0",
};

export function AppIcon({
  name,
  className,
  filled = false,
  strokeWidth: strokeWidthProp = 1.8,
}: AppIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidthProp}
    >
      <path d={paths[name]} />
    </svg>
  );
}
