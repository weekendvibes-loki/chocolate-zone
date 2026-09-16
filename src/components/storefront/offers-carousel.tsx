"use client";

import Image from "next/image";
import type { Offer } from "@/types/domain";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const AUTOPLAY_MS = 4500;
const SWIPE_THRESHOLD = 40;
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const media = window.matchMedia(REDUCED_MOTION_QUERY);
  media.addEventListener("change", callback);

  return () => media.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionServerSnapshot() {
  return false;
}

/**
 * Reads the reduced-motion preference through an external-store subscription.
 * All callbacks are module-stable and the server snapshot is `false`, matching
 * the pre-hydration default without setting state inside an effect.
 */
function useReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

/**
 * Image-only carousel that fills the hero's right-hand image area. Only offers
 * that actually carry an image are usable as slides; when none do, the hero's
 * original no-image fallback is shown instead. Every control overlays the
 * image, so the carousel never adds height to the hero.
 */
export function OffersCarousel({ offers }: { offers: Offer[] }) {
  const slides = offers.filter(
    (offer): offer is Offer & { image_url: string } => Boolean(offer.image_url),
  );
  const count = slides.length;

  const [active, setActive] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(false);
  const [autoplayKey, setAutoplayKey] = useState(0);
  const reduceMotion = useReducedMotion();
  const regionRef = useRef<HTMLDivElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (index: number) => {
      if (count === 0) return;

      setActive(((index % count) + count) % count);
      setAutoplayKey((key) => key + 1);
    },
    [count],
  );

  // Autoplay runs only when the user is playing and no transient signal
  // (hover, focus, or a hidden tab) is asking us to hold. Keeping these as
  // independent signals means a manual pause is never clobbered by, say, the
  // tab becoming visible again while the pointer is still hovering.
  const autoplayActive =
    isPlaying &&
    !hovered &&
    !focused &&
    !documentHidden &&
    !reduceMotion &&
    count > 1;

  useEffect(() => {
    if (!autoplayActive) return;

    const intervalId = setInterval(
      () => setActive((current) => (current + 1) % count),
      AUTOPLAY_MS,
    );

    return () => clearInterval(intervalId);
  }, [autoplayActive, count, autoplayKey]);

  useEffect(() => {
    const handleVisibilityChange = () => setDocumentHidden(document.hidden);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(active - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        go(active + 1);
      }
    };

    region.addEventListener("keydown", handleKeyDown);

    return () => region.removeEventListener("keydown", handleKeyDown);
  }, [go, active]);

  // No usable offer image → preserve the hero's original no-image fallback.
  if (count === 0) {
    return (
      <div className="grid aspect-[4/5] w-full place-items-center rounded-3xl border border-dashed border-zinc-300 bg-white p-8 text-center">
        <div>
          <span className="grid size-14 place-items-center rounded-full bg-amber-50">
            <svg
              className="size-7 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 3v18M3 12h18" strokeLinecap="round" />
              <path d="m5 5 14 14M19 5 5 19" strokeLinecap="round" />
            </svg>
          </span>
          <p className="mt-4 text-sm text-zinc-500">
            Featured offers will appear here soon.
          </p>
        </div>
      </div>
    );
  }

  const showControls = count > 1;

  const pauseHandlers = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };

  return (
    <div
      ref={regionRef}
      className="relative aspect-[4/5] w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-zinc-900/10 transition-shadow hover:shadow-2xl lg:aspect-[5/6]"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        touchStart.current = null;
        if (!start) return;

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;

        // Only treat clearly horizontal drags as swipes so vertical
        // scrolling is never hijacked.
        if (
          Math.abs(deltaX) < SWIPE_THRESHOLD ||
          Math.abs(deltaX) <= Math.abs(deltaY)
        )
          return;

        if (deltaX < 0) go(active + 1);
        else go(active - 1);
      }}
      {...pauseHandlers}
    >
      {slides.map((offer, index) => (
        <div
          key={offer.id}
          role="group"
          aria-roledescription="slide"
          aria-label={`Offer ${index + 1} of ${count}`}
          aria-hidden={index !== active}
          inert={index !== active}
          className="absolute inset-0 transition-transform duration-[var(--dur-slow)] ease-out-soft"
          style={{
            transform: `translateX(${(index - active) * 100}%)`,
            transitionDuration: reduceMotion ? "0ms" : undefined,
          }}
        >
          <Image
            src={offer.image_url}
            alt={offer.title}
            fill
            loading={index === 0 ? "eager" : undefined}
            sizes="(max-width: 640px) 80vw, (max-width: 1024px) 50vw, 45vw"
            className="object-cover"
          />
        </div>
      ))}

      {showControls && (
        <>
          <OverlayButton
            label={isPlaying ? "Pause offer rotation" : "Play offer rotation"}
            onClick={() => setIsPlaying((playing) => !playing)}
            className="left-2 top-2"
          >
            {isPlaying ? (
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <rect x="6.5" y="5" width="3.5" height="14" rx="1" />
                <rect x="14" y="5" width="3.5" height="14" rx="1" />
              </svg>
            ) : (
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5.5v13a1 1 0 0 0 1.53.85l10-6.5a1 1 0 0 0 0-1.7l-10-6.5A1 1 0 0 0 8 5.5Z" />
              </svg>
            )}
          </OverlayButton>

          <OverlayButton
            label="Previous offer"
            onClick={() => go(active - 1)}
            className="left-2 top-1/2 -translate-y-1/2"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="m15 5-7 7 7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </OverlayButton>

          <OverlayButton
            label="Next offer"
            onClick={() => go(active + 1)}
            className="right-2 top-1/2 -translate-y-1/2"
          >
            <svg
              className="size-4 rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path
                d="m15 5-7 7 7 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </OverlayButton>

          <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center">
            <div className="flex items-center gap-1.5 rounded-full bg-cocoa-950/40 px-2 py-1">
              {slides.map((offer, index) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => go(index)}
                  aria-label={`Go to offer ${index + 1}`}
                  aria-current={index === active}
                  className="grid size-11 -my-3 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400"
                >
                  <span
                    className={`rounded-full transition-all duration-[var(--dur-base)] ease-out-soft ${
                      index === active
                        ? "h-1.5 w-4 bg-ivory"
                        : "size-1.5 bg-ivory/60"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OverlayButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`absolute z-10 grid size-11 place-items-center rounded-full bg-cocoa-950/50 text-ivory transition-colors duration-[var(--dur-base)] ease-out-soft hover:bg-cocoa-950/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold-400 motion-reduce:transition-none ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
