"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

export function TiltCard({
  children,
  className = "",
  maxTilt = 6,
}: {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !ref.current) return;
    if (
      !window.matchMedia(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      ).matches
    )
      return;
    const bounds = ref.current.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    const tiltLimit = Math.max(0, Math.min(maxTilt, 8));
    ref.current.style.setProperty("--tilt-x", `${-y * tiltLimit}deg`);
    ref.current.style.setProperty("--tilt-y", `${x * tiltLimit}deg`);
    ref.current.style.setProperty("--glare-x", `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty("--glare-y", `${(y + 0.5) * 100}%`);
  }

  function reset() {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`.trim()}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
    >
      {children}
    </div>
  );
}
