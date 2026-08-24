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
      {VOICEWAVE_BARS.map((height, index) => (
        <rect
          key={height}
          x={index * 4.2}
          y="0"
          width="3"
          height={height}
          rx="1.5"
          fill={scheme === "mono" || index !== 3 ? colors.ink : colors.accent}
        />
      ))}
    </svg>
  );
}

export function VoicewaveWordmark({ scheme = "light" }: VoicewaveWordmarkProps) {
  const colors = VOICEWAVE_COLORS[scheme];

  return (
    <h1
      className="text-sm font-semibold tracking-[-0.045em]"
      style={{ color: colors.ink, fontFamily: "IBM Plex Sans, sans-serif" }}
    >
      Voc<span style={{ color: colors.accent }}>ai</span>ro
    </h1>
  );
}
