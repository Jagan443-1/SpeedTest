import { useState, useCallback } from "react";
import SpeedTest from "./components/SpeedTest";
import ThemeToggle from "./components/ThemeToggle";
import Background from "./components/Background";
import "./App.css";

function App() {
  const [speed, setSpeed] = useState(0);
  const [isActive, setIsActive] = useState(false);

  const handleSpeedChange = useCallback((s: number) => setSpeed(s), []);
  const handleActiveChange = useCallback((a: boolean) => setIsActive(a), []);

  return (
    <div className="app">
      <Background speed={speed} isActive={isActive} />
      <header className="app-header">
        <div className="logo">
          <span className="logo-text">SPEED</span>
          <span className="logo-dot">.</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="app-main">
        <SpeedTest
          onSpeedChange={handleSpeedChange}
          onActiveChange={handleActiveChange}
        />
      </main>
    </div>
  );
}

export default App;
