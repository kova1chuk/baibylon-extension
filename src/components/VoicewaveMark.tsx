import { VOICEWAVE_COLORS, VOICEWAVE_PATHS, voicewaveGeometry } from "../lib/voicewave";

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
    <svg aria-hidden="true" className={className} viewBox={voicewaveGeometry.viewBox.join(" ")}>
      {VOICEWAVE_PATHS.map(({ id, d, accent }) => (
        <path key={id} d={d} fill={scheme === "mono" || !accent ? colors.ink : colors.accent} />
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
