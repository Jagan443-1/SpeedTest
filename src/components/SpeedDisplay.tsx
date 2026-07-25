import type { TestPhase } from "../utils/speedTest";

interface SpeedDisplayProps {
  value: number;
  isActive: boolean;
  phase: TestPhase;
}

const MBPS_MAX = 500;
const GBPS_MAX = 1;
const KBPS_MAX = 500;
const BARS = 30;

const KBPS_SCALE = ["0", "100", "200", "300", "400", "500+"];
const MBPS_SCALE = ["0", "100", "200", "300", "400", "500+"];
const GBPS_SCALE = ["0", "0.2", "0.4", "0.6", "0.8", "1+"];

export default function SpeedDisplay({
  value,
  isActive,
  phase,
}: SpeedDisplayProps) {
  let speed: number;
  let maxSpeed: number;
  let unit: string;
  let scale: string[];

  if (value >= 1024) {
    speed = value / 1024;
    maxSpeed = GBPS_MAX;
    unit = "Gbps";
    scale = GBPS_SCALE;
  } else if (value >= 1) {
    speed = value;
    maxSpeed = MBPS_MAX;
    unit = "Mbps";
    scale = MBPS_SCALE;
  } else {
    speed = value * 1024;
    maxSpeed = KBPS_MAX;
    unit = "Kbps";
    scale = KBPS_SCALE;
  }

  const capped = Math.min(speed, maxSpeed);
  const displayValue =
    speed >= maxSpeed
      ? scale[5]
      : speed < 10
        ? speed.toFixed(1)
        : speed < 100
          ? speed.toFixed(1)
          : Math.round(speed).toString();

  const fillRatio = Math.min(capped / maxSpeed, 1);
  const activeBars = Math.round(fillRatio * BARS);

  return (
    <div className={`speed-display ${isActive ? "active" : ""}`}>
      <div className="dig-frame">
        {/* Top status row */}
        <div className="dig-header">
          <span className="dig-dot" />
          <span className="dig-label">SPEED</span>
          <span className="dig-label right">{unit}</span>
        </div>

        {/* Main digital readout */}
        <div className="dig-display">
          <span className="dig-num">{displayValue}</span>
        </div>

        {/* Segmented bar */}
        <div className="dig-bar-row">
          <div className="dig-bar">
            {Array.from({ length: BARS }, (_, i) => {
              const ratio = i / (BARS - 1);
              const on = i < activeBars;
              let color = "var(--accent)";
              if (ratio > 0.7) color = "var(--accent-red)";
              else if (ratio > 0.45) color = "var(--accent-yellow)";
              return (
                <div
                  key={i}
                  className={`dig-seg ${on ? "on" : ""}`}
                  style={
                    on
                      ? { backgroundColor: color, boxShadow: `0 0 6px ${color}50, inset 0 0 2px ${color}30` }
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>

        {/* Scale row */}
        <div className="dig-scale">
          {scale.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
