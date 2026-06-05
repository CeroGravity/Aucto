"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Lazy mount of the 3D scene. The Three.js code lives in a SEPARATE chunk
// (dynamic import, ssr:false) that is fetched only AFTER first paint and only on
// capable devices — so the home route's initial JS doesn't carry it and the
// static hero (the LCP) is never blocked.
const Hero3D = dynamic(() => import("./hero-3d"), { ssr: false });

// Gate: skip the 3D entirely under reduced-motion, on small screens, or on
// low-core / data-saver devices. Those get the static hero only.
function shouldEnhance(): boolean {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
  if (window.matchMedia("(max-width: 640px)").matches) return false;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === "number" && cores > 0 && cores < 4) return false;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (conn?.saveData) return false;
  return true;
}

export function Hero3DLazy() {
  const [enhance, setEnhance] = useState(false);

  useEffect(() => {
    // Defer the decision + mount until after the first paint (idle), so the 3D
    // never competes with the LCP.
    const schedule =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 200);
    const id = schedule(() => {
      if (shouldEnhance()) setEnhance(true);
    });
    return () => {
      if (typeof window.cancelIdleCallback === "function" && typeof id === "number") {
        window.cancelIdleCallback(id);
      } else if (typeof id === "number") {
        window.clearTimeout(id);
      }
    };
  }, []);

  // Decorative layer: aria-hidden, behind the static text, fades in when ready.
  // The reserved absolute box means mounting causes NO layout shift.
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 transition-opacity duration-700 ${
        enhance ? "opacity-100" : "opacity-0"
      }`}
    >
      {enhance ? <Hero3D /> : null}
    </div>
  );
}
