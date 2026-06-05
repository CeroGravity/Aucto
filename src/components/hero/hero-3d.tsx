"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Striking, on-brand 3D hero (vanilla Three.js — one decorative scene, no React
// scene-graph). Concept: flowing ENERGY STREAMS — curved light ribbons that
// sweep forward and arc over a dimensional mountain PEAK, reading as kinetic
// momentum ("Move with Power"). Navy base with a restrained steel-cyan accent
// glowing on each stream's leading edge (on-brand, no orange).
//
// THEME-AWARE: stream/peak/accent/fog colors are read from CSS custom props
// (--hero-base/-mid/-accent/-fog), which differ per theme (dark = lighter lines
// so they read on the navy bg). A MutationObserver on <html class> re-reads them
// when the user toggles the theme.
//
// SEAMLESS: each stream advances on its own continuous z; when it passes the
// camera it wraps to the far back (z -= FIELD_DEPTH) DEEP IN THE FOG, where its
// opacity is already ~0 — so the recycle is never visible. No group-level reset.
//
// Cost caps: pixel ratio clamped ≤1.5; loop pauses when the tab is hidden or the
// hero is offscreen; reduced-motion renders one still frame. The canvas is
// decorative (aria-hidden container) and never focusable.

const STREAM_COUNT = 26;
const POINTS_PER_STREAM = 80;
const FIELD_DEPTH = 42;
const NEAR_Z = 7;
const FAR_Z = NEAR_Z - FIELD_DEPTH;
const SPEED = 2.0; // world units / second toward the camera

type ThemeColors = { base: THREE.Color; mid: THREE.Color; accent: THREE.Color; fog: THREE.Color };

function readThemeColors(el: HTMLElement): ThemeColors {
  const s = getComputedStyle(el);
  const pick = (name: string, fallback: string) =>
    new THREE.Color((s.getPropertyValue(name).trim() || fallback) as string);
  return {
    base: pick("--hero-base", "#1b2a4d"),
    mid: pick("--hero-mid", "#3a4f7a"),
    accent: pick("--hero-accent", "#2dd4bf"),
    fog: pick("--hero-fog", "#eef1f6"),
  };
}

// One streamline: a smooth flowing curve (sweeping up-and-over a peak) sampled
// into a position buffer + a per-vertex color buffer. The color runs base→accent
// toward the leading (front) end so the stream reads as moving energy.
function streamGeometry(seed: number, colors: ThemeColors): THREE.BufferGeometry {
  const positions = new Float32Array(POINTS_PER_STREAM * 3);
  const colorAttr = new Float32Array(POINTS_PER_STREAM * 3);
  let h = seed * 9301 + 49297;
  const rand = () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
  const xOffset = (rand() - 0.5) * 16;
  const phase = rand() * Math.PI * 2;
  const arc = 1.4 + rand() * 1.6; // peak height this stream arcs to
  const lateral = 0.8 + rand() * 1.4; // how much it weaves sideways

  for (let i = 0; i < POINTS_PER_STREAM; i++) {
    const t = i / (POINTS_PER_STREAM - 1); // 0 (tail/back) → 1 (head/front)
    const x = xOffset + Math.sin(t * Math.PI * 1.5 + phase) * lateral;
    // A peak-shaped arc: rises toward the middle, settles — a mountain sweep.
    const y = -2.0 + Math.sin(t * Math.PI) * arc + Math.sin(t * Math.PI * 3 + phase) * 0.18;
    const z = (t - 0.5) * 5; // local length along flow
    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    // Color: base → mid → accent toward the head (t→1) so the leading edge glows.
    const c = colors.base.clone().lerp(colors.mid, Math.min(1, t * 1.4));
    if (t > 0.7) c.lerp(colors.accent, (t - 0.7) / 0.3);
    colorAttr[i * 3] = c.r;
    colorAttr[i * 3 + 1] = c.g;
    colorAttr[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));
  return geo;
}

// Opacity by depth: 0 at the far spawn edge and as a stream passes the camera,
// peaking mid-field — masks both spawn and the wrap.
function depthOpacity(z: number): number {
  const t = (z - FAR_Z) / FIELD_DEPTH; // 0 (far) → 1 (near)
  const fadeIn = Math.min(1, t / 0.25);
  const fadeOut = Math.min(1, (1 - t) / 0.28);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

type Stream = { line: THREE.Line; mat: THREE.LineBasicMaterial; seed: number; sway: number };

export default function Hero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (mount === null) return;
    const probe = document.createElement("canvas");
    if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;

    const root = document.documentElement;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let colors = readThemeColors(root);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(colors.fog, 8, FIELD_DEPTH * 0.85);
    const camera = new THREE.PerspectiveCamera(54, 1, 0.1, 100);
    camera.position.set(0, 0.8, NEAR_Z + 2);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // transparent → static hero shows through
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    const streams: Stream[] = [];
    for (let i = 0; i < STREAM_COUNT; i++) {
      const seed = i + 1;
      const geo = streamGeometry(seed, colors);
      const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true });
      const line = new THREE.Line(geo, mat);
      line.position.z = FAR_Z + (i / STREAM_COUNT) * FIELD_DEPTH;
      group.add(line);
      streams.push({ line, mat, seed, sway: i * 0.6 });
    }
    scene.add(group);

    // Rebuild stream colors + fog when the theme changes.
    const applyColors = () => {
      colors = readThemeColors(root);
      if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(colors.fog);
      for (const s of streams) {
        const next = streamGeometry(s.seed, colors);
        s.line.geometry.dispose();
        s.line.geometry = next;
      }
    };
    const themeObserver = new MutationObserver(() => applyColors());
    themeObserver.observe(root, { attributes: true, attributeFilter: ["class"] });

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

    let last = 0;
    const update = (now: number, animate: boolean) => {
      const dt = animate && last > 0 ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      const tSec = now / 1000;
      for (const s of streams) {
        if (animate) {
          s.line.position.z += SPEED * dt;
          if (s.line.position.z > NEAR_Z) s.line.position.z -= FIELD_DEPTH; // wrap in fog
        }
        const z = s.line.position.z;
        s.line.position.y = Math.sin(tSec * 0.6 + s.sway) * 0.12; // gentle flow sway
        s.line.rotation.z = Math.sin(tSec * 0.3 + s.sway) * 0.04;
        s.mat.opacity = depthOpacity(z);
      }
      camera.position.x = Math.sin(tSec * 0.18) * 0.5;
      camera.lookAt(0, -0.3, -FIELD_DEPTH * 0.4);
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
      update(0, false); // single still frame; the depth-distributed field composes well
    } else {
      play();
    }

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
      io.disconnect();
      ro.disconnect();
      for (const s of streams) {
        s.line.geometry.dispose();
        s.mat.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
