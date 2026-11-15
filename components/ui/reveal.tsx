"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

export function Reveal({
  children,
  className,
  delayMs = 0,
  blur = false,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  blur?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    if (!("IntersectionObserver" in window)) return;

    element.dataset.revealReady = "true";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          element.dataset.revealVisible = "true";
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal${blur ? " reveal--blur" : ""}${className ? ` ${className}` : ""}`}
      style={
        {
          "--reveal-delay": `${Math.max(0, Math.min(delayMs, 180))}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
