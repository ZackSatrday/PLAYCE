"use client";

import { useEffect, useRef } from "react";

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    const setSize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    setSize();
    window.addEventListener("resize", setSize);

    const isMobile = window.innerWidth < 768;
    const dotCount = isMobile ? 10 : 30;
    const speedMultiplier = isMobile ? 0.5 : 1;

    let dots = Array.from({ length: dotCount }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2 + 1,
      speed: (Math.random() * 0.5 + 0.2) * speedMultiplier,
    }));

    const handleResize = () => {
      setSize();
      const newIsMobile = window.innerWidth < 768;
      const newDotCount = newIsMobile ? 10 : 30;
      const newSpeedMultiplier = newIsMobile ? 0.5 : 1;
      
      // Update dots array if count changed
      if (dots.length !== newDotCount) {
        dots = Array.from({ length: newDotCount }).map(() => ({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 2 + 1,
          speed: (Math.random() * 0.5 + 0.2) * newSpeedMultiplier,
        }));
      }
    };
    
    window.addEventListener("resize", handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "color-mix(in srgb, var(--accent) 8%, transparent)";

      dots.forEach((dot) => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
        ctx.fill();

        dot.y -= dot.speed;
        if (dot.y + dot.radius < 0) {
          dot.y = height + dot.radius;
          dot.x = Math.random() * width;
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", setSize);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 z-[-1] pointer-events-none"
      />
      <div
        className="absolute top-0 left-0 w-full h-[600px] z-[-1] pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 39px, rgba(255, 255, 255, 0.04) 39px, rgba(255, 255, 255, 0.04) 40px)",
          maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
        }}
      />
    </>
  );
}
