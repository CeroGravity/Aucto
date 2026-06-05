"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Abstract, on-brand 3D hero (vanilla Three.js — one decorative scene, no React
// scene-graph, so the reconciler overhead of react-three-fiber isn't worth it;
// vanilla keeps the lazy chunk smaller and gives direct control of the cost
// caps). Layered angular "ridges" in the brand navy flow toward the viewer — the
// logo's mountain/momentum motif reading as forward power.
//
// SEAMLESS MOTION: each ridge advances continuously toward the camera; when it
// passes the camera it wraps to the far back of the field (z -= FIELD_DEPTH).
// That wrap happens DEEP IN THE FOG and is masked by a per-ridge opacity that
// fades to 0 both at the far spawn distance AND as the ridge nears the camera —
// so a recycling element is never visible at full opacity. There is no group-
// level modulo reset (the old visible seam); the field reads as one infinite,
// continuous flow with no perceptible loop period.
//
// Cost caps: pixel ratio clamped to ≤1.5; the loop pauses when the tab is hidden
// or the hero scrolls offscreen; reduced-motion renders a single static frame.
// The canvas is decorative (aria-hidden on its container) and never focusable.

const NAVY = 0x1b2a4d;
const NAVY_LIGHT = 0x3a4f7a;
const RIDGE_COUNT = 14;
const POINTS_PER_RIDGE = 64;
const RIDGE_SPACING = 2.6;
const FIELD_DEPTH = RIDGE_COUNT * RIDGE_SPACING; // total z-span the field wraps over
const SPEED = 1.4; // world units / second the field flows toward the camera
const NEAR_Z = 6; // ridges past this z have flowed by → wrap to the back
const FAR_Z = NEAR_Z - FIELD_DEPTH; // far spawn edge (deep in the fog)

// One jagged horizontal ridge line (a mountain silhouette) as a position buffer.
// Deterministic pseudo-random peaks so each ridge reads as distinct terrain.
function ridgeGeometry(seed: number, width: number, amplitude: number): THREE.BufferGeometry {
  const positions = new Float32Array(POINTS_PER_RIDGE * 3);
  let h = seed * 9301 + 49297;
  const rand = () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
  for (let i = 0; i < POINTS_PER_RIDGE; i++) {
    const t = i / (POINTS_PER_RIDGE - 1);
    // Two octaves of smooth wave + a little jagged detail → terrain silhouette.
    const wave =
      Math.sin(t * Math.PI * 2 + seed) * amplitude * 0.5 +
      Math.sin(t * Math.PI * 6 + seed * 1.7) * amplitude * 0.18;
    const detail = (rand() - 0.5) * amplitude * 0.5;
    positions[i * 3] = (t - 0.5) * width;
    positions[i * 3 + 1] = wave + detail;
    positions[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

// Opacity by distance: 0 at the far spawn edge and as the ridge passes the
// camera, peaking in the mid-field. This masks both the spawn and the wrap so a
// recycling ridge is never seen popping in or out.
function depthOpacity(z: number): number {
  // 0 at FAR_Z, 1 at the mid-field, easing back toward 0 as z → NEAR_Z.
  const t = (z - FAR_Z) / FIELD_DEPTH; // 0..1 across the field (far → near)
  const fadeIn = Math.min(1, t / 0.25); // ramp up over the far quarter
  const fadeOut = Math.min(1, (1 - t) / 0.3); // ramp down over the near third
  return Math.max(0, Math.min(fadeIn, fadeOut)) * 0.85;
}

type Ridge = { line: THREE.Line; mat: THREE.LineBasicMaterial; baseY: number; sway: number };

export default function Hero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    // No WebGL → bail; the static hero stands alone.
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    // Fog hides the far spawn edge so wraps are invisible.
    scene.fog = new THREE.Fog(NAVY, 7, FIELD_DEPTH * 0.9);
    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 100);
    camera.position.set(0, 0.7, NEAR_Z + 2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // transparent → the static navy shows through
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    const ridges: Ridge[] = [];
    for (let i = 0; i < RIDGE_COUNT; i++) {
      // Distribute evenly across the field depth at start.
      const z = FAR_Z + (i / RIDGE_COUNT) * FIELD_DEPTH;
      const amp = 1.0 + ((i * 37) % 10) * 0.06; // varied silhouettes
      const geo = ridgeGeometry(i + 1, 26, amp);
      const mat = new THREE.LineBasicMaterial({ color: new THREE.Color(NAVY), transparent: true });
      const line = new THREE.Line(geo, mat);
      line.position.set(0, 0, z);
      group.add(line);
      ridges.push({ line, mat, baseY: -1.6, sway: i * 0.7 });
    }
    scene.add(group);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const navyColor = new THREE.Color(NAVY);
    const navyLight = new THREE.Color(NAVY_LIGHT);

    // Advance the field by a real time delta so wrapping is continuous (no
    // dependence on an absolute-time modulo, which is what caused the old seam).
    let last = 0;
    const update = (now: number, animate: boolean) => {
      const dt = animate && last > 0 ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const tSec = now / 1000;

      for (const r of ridges) {
        if (animate) {
          r.line.position.z += SPEED * dt;
          if (r.line.position.z > NEAR_Z) r.line.position.z -= FIELD_DEPTH; // wrap in the fog
        }
        const z = r.line.position.z;
        // Depth 0 (far) → 1 (near): color lightens + a gentle vertical sway.
        const depth = (z - FAR_Z) / FIELD_DEPTH;
        r.line.position.y = r.baseY + Math.sin(tSec * 0.5 + r.sway) * 0.05;
        r.mat.opacity = depthOpacity(z);
        r.mat.color.copy(navyColor).lerp(navyLight, depth * 0.8);
      }

      // Slow lateral camera drift for parallax (also seamless — a pure sine).
      camera.position.x = Math.sin(tSec * 0.15) * 0.4;
      camera.lookAt(0, -0.5, -FIELD_DEPTH * 0.4);
      renderer.render(scene, camera);
    };

    let raf = 0;
    let running = false;
    const loop = (now: number) => {
      if (!running) return;
      update(now, true);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running || reduceMotion) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    // Pause when offscreen or the tab is hidden; resume when visible again.
    let onScreen = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry?.isIntersecting ?? true;
        if (onScreen && !document.hidden) play();
        else pause();
      },
      { threshold: 0 },
    );
    io.observe(mount);

    const onVisibility = () => {
      if (document.hidden) pause();
      else if (onScreen) play();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) {
      update(0, false); // single still frame — the depth-distributed field composes well
    } else {
      play();
    }

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      for (const r of ridges) {
        r.line.geometry.dispose();
        r.mat.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
