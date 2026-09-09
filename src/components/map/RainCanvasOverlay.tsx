import React, { useEffect, useRef } from 'react';

interface RainCanvasOverlayProps {
  active: boolean;
}

interface Drop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
}

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export const RainCanvasOverlay: React.FC<RainCanvasOverlayProps> = ({ active }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    const DROP_COUNT = 280;
    const drops: Drop[] = [];
    const splashes: Splash[] = [];

    for (let i = 0; i < DROP_COUNT; i++) {
      drops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: 12 + Math.random() * 18,
        speed: 16 + Math.random() * 14,
        opacity: 0.15 + Math.random() * 0.35,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Monsoon atmosphere tint
      ctx.fillStyle = 'rgba(15, 23, 42, 0.12)';
      ctx.fillRect(0, 0, width, height);

      // Wind angle: slant of ~2.5 pixels per frame
      const windAngle = 2.5;

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = '#93c5fd';

      for (let i = 0; i < drops.length; i++) {
        const d = drops[i];

        ctx.strokeStyle = `rgba(186, 230, 253, ${d.opacity})`;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + windAngle, d.y + d.length);
        ctx.stroke();

        d.x += windAngle;
        d.y += d.speed;

        // Splash when hitting bottom area
        if (d.y > height - 60 && Math.random() < 0.08) {
          splashes.push({
            x: d.x,
            y: d.y,
            radius: 1,
            maxRadius: 4 + Math.random() * 6,
            opacity: 0.5,
          });
        }

        if (d.y > height || d.x > width) {
          d.y = -20;
          d.x = Math.random() * (width + 100) - 50;
        }
      }

      // Render splashes
      for (let s = splashes.length - 1; s >= 0; s--) {
        const sp = splashes[s];
        ctx.strokeStyle = `rgba(186, 230, 253, ${sp.opacity})`;
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, sp.radius * 1.5, sp.radius * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();

        sp.radius += 0.4;
        sp.opacity -= 0.04;

        if (sp.opacity <= 0) {
          splashes.splice(s, 1);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-20 w-full h-full"
      style={{ mixBlendMode: 'screen' }}
    />
  );
};
