import { VOICEWAVE_BARS, VOICEWAVE_COLORS } from "../lib/voicewave";

type VoicewaveMarkProps = {
  className?: string;
  scheme?: "light" | "dark" | "mono";
};

type VoicewaveWordmarkProps = {
  scheme?: "light" | "dark";
};

export function VoicewaveMark({ className, scheme = "light" }: VoicewaveMarkProps) {
  const colors = VOICEWAVE_COLORS[scheme === "dark" ? "dark" : "light"];

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 28.2 24">
      {VOICEWAVE_BARS.map(({ x, y, height, accent, opacity }) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width="3"
          height={height}
          rx="1.5"
          opacity={opacity}
          fill={scheme === "mono" || !accent ? colors.ink : colors.accent}
        />
      ))}
    </svg>
  );
}

export function VoicewaveWordmark({ scheme = "light" }: VoicewaveWordmarkProps) {
  const colors = VOICEWAVE_COLORS[scheme];

  return (
    <h1
      className="text-base font-semibold tracking-[-0.045em]"
      style={{ color: colors.ink, fontFamily: "IBM Plex Sans, sans-serif" }}
    >
      Voc<span style={{ color: colors.accent }}>ai</span>ro
    </h1>
  );
}
