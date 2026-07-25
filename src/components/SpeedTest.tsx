import { useState, useCallback, useEffect, useRef } from "react";
import SpeedDisplay from "./SpeedDisplay";
import {
  runSpeedTest,
  type TestPhase,
} from "../utils/speedTest";

export default function SpeedTest() {
  const [phase, setPhase] = useState<TestPhase>("idle");
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const abortRef = useRef(false);

  const handleProgress = useCallback(
    (_phase: TestPhase, speed: number, _progress: number) => {
      if (abortRef.current) return;
      setPhase(_phase);
      if (speed > 0) {
        setCurrentSpeed(speed);
      }
    },
    []
  );

  const startTest = async () => {
    if (isRunning) {
      abortRef.current = true;
      setIsRunning(false);
      setPhase("idle");
      setCurrentSpeed(0);
      return;
    }

    abortRef.current = false;
    setIsRunning(true);
    setCurrentSpeed(0);

    try {
      await runSpeedTest(handleProgress);
      if (!abortRef.current) {
        setPhase("done");
      }
    } catch {
      setPhase("idle");
    } finally {
      setIsRunning(false);
    }
  };

  // Auto-start on mount
  const hasStarted = useRef(false);
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      startTest();
    }
  }, []);

  return (
    <div className="speed-test">
      <SpeedDisplay
        value={currentSpeed}
        isActive={isRunning}
        phase={phase}
      />

      <button
        className={`restart-btn ${isRunning ? "running" : ""}`}
        onClick={startTest}
      >
        {isRunning ? (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop
          </>
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {phase === "done" ? "Test again" : "Start test"}
          </>
        )}
      </button>
    </div>
  );
}
