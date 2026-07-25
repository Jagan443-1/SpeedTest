import { useRef, useEffect } from "react";

interface BackgroundProps {
  speed: number;
  isActive: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

const PARTICLE_COUNT = 120;
const CONNECTION_DISTANCE = 150;
const BASE_SPEED = 0.3;
const MAX_BOOST = 6;

function getAccentColor(): string {
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue("--accent").trim() || "#00d4ff";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export default function Background({ speed, isActive }: BackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const speedRef = useRef(0);
  const activeRef = useRef(false);

  speedRef.current = speed;
  activeRef.current = isActive;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      initParticles();
    };

    function initParticles() {
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(w, h)
      );
    }

    function createParticle(w: number, h: number): Particle {
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * BASE_SPEED * 2,
        vy: (Math.random() - 0.5) * BASE_SPEED * 2,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
      };
    }

    initParticles();
    window.addEventListener("resize", onResize);

    function animate() {
      ctx.clearRect(0, 0, w, h);

      const accent = hexToRgb(getAccentColor());
      const speedVal = speedRef.current;
      const active = activeRef.current;

      let boost = 0;
      if (active && speedVal > 0) {
        const mbps = speedVal >= 1024 ? speedVal / 1024 : speedVal;
        boost = Math.min(mbps / 500, 1) * MAX_BOOST;
      }

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (active && boost > 0) {
          p.vx += boost * 0.01;
        } else {
          if (p.vx > BASE_SPEED) p.vx *= 0.98;
          if (p.vy > BASE_SPEED) p.vy *= 0.98;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) p.x = w + 10;
        else if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        else if (p.y > h + 10) p.y = -10;

        const maxV = BASE_SPEED + boost;
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > maxV * 1.5) {
          p.vx *= 0.95;
          p.vy *= 0.95;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${p.opacity})`;
        ctx.fill();
      }

      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECTION_DISTANCE) {
            const alpha = (1 - dist / CONNECTION_DISTANCE) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(${accent.r}, ${accent.g}, ${accent.b}, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="background-canvas" />;
}
