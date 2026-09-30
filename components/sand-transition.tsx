"use client";

import { useEffect, useRef, useState, useId } from "react";
import { AnimatePresence, usePresence } from "motion/react";

interface SandTransitionImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function SandTransitionImage({ src, alt, className = "" }: SandTransitionImageProps) {
  const [isPresent, safeToRemove] = usePresence();
  const [displayedSrc, setDisplayedSrc] = useState(src);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const reactId = useId();
  const filterId = useRef(`sand-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    if (isPresent) {
      setDisplayedSrc(src);
    }
  }, [src, isPresent]);

  useEffect(() => {
    if (!isPresent) {
      // Exit animation
      setIsTransitioning(true);
      const startTime = performance.now();
      const duration = 900;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Cubic ease-in for exit
        const eased = Math.pow(progress, 3);
        progressRef.current = eased;

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
          safeToRemove?.();
        }
      };

      rafRef.current = requestAnimationFrame(animate);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } else if (isTransitioning) {
      // Enter animation
      const startTime = performance.now();
      const duration = 900;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Quartic ease-out for enter
        const eased = 1 - Math.pow(1 - progress, 4);
        progressRef.current = eased;

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate);
        } else {
          setIsTransitioning(false);
        }
      };

      rafRef.current = requestAnimationFrame(animate);

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }
  }, [isPresent, isTransitioning, safeToRemove]);

  const progress = progressRef.current;
  const isEntering = isPresent && isTransitioning;
  const isExiting = !isPresent && isTransitioning;

  // Calculate filter values based on progress and direction
  const displacementScale = isEntering ? 150 * (1 - progress) : 150 * progress;
  const offsetY = isEntering ? -80 * (1 - progress) : 120 * progress;
  const offsetX = isEntering ? -30 * (1 - progress) : 30 * progress;
  const blur = isEntering ? 6 * (1 - progress) : 6 * progress;
  const opacity = isEntering ? Math.min(progress * 1.5, 1) : 1 - progress * 1.2;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          <filter id={filterId.current}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.8"
              numOctaves="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale={displacementScale}
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feOffset dx={offsetX} dy={offsetY} result="offset" />
            <feGaussianBlur in="offset" stdDeviation={blur} result="blurred" />
            <feColorMatrix
              in="blurred"
              type="matrix"
              values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${opacity} 0`}
            />
          </filter>
        </defs>
      </svg>
      <AnimatePresence mode="wait">
        <img
          key={displayedSrc}
          src={displayedSrc}
          alt={alt}
          className="w-full h-full object-cover"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          style={{
            filter: isTransitioning ? `url(#${filterId.current})` : undefined,
          }}
        />
      </AnimatePresence>
    </div>
  );
}
