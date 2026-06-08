"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Simple, on-brand 3D hero (vanilla Three.js — one decorative scene). The
// original navy RIDGE field, adapted: layered terrain ridge-lines stacked in
// depth that flow LEFT → RIGHT across the FULL viewport, the logo's momentum
// motif as a calm horizontal drift. Basic on purpose — just lines + fog.
//
// FULL-BLEED: the ridges span well past the screen edges and the camera frames
// the whole field, so the field fills the viewport edge-to-edge with no floor
// line. NO darkening scrim — the heading/CTA sit on top and read by natural
// theme contrast (ridges kept subtle/low-density).
//
// SEAMLESS: the terrain wave scrolls continuously in x (a periodic function, so
// it never resets), and each ridge's per-vertex opacity fades to 0 at both the
// left and right edges — so the flow reads infinite with no edge pop.
//
// THEME-AWARE: ridge/fog colors come from the --hero-* CSS tokens (dark =
// lighter so the ridges read on the navy bg); a MutationObserver on <html class>
// rebuilds them on theme toggle.
//
// Cost caps: pixel ratio ≤1.5; the loop pauses when the tab is hidden or the
// hero is offscreen; reduced-motion renders one still frame. The canvas is
// decorative (aria-hidden container) and never focusable.

const RIDGE_COUNT = 9;
const POINTS_PER_RIDGE = 96;
const FIELD_WIDTH = 40; // x-span (wider than view → edges off-screen)
const FLOW = 1.6; // wave scroll speed (left → right), world units / s

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

// A terrain ridge line as a position buffer + per-vertex color. `phase` scrolls
// the wave (so the same buffer re-sampled each frame reads as flowing terrain);
// the vertex alpha is folded into color brightness via a separate alpha array.
// Returns the geometry; colors run base → mid with the accent on the crests.
function ridgeGeometry(depth: number, colors: ThemeColors): THREE.BufferGeometry {
  const positions = new Float32Array(POINTS_PER_RIDGE * 3);
  const colorAttr = new Float32Array(POINTS_PER_RIDGE * 3);
  // Lines use the BASE token (dark navy in light theme → strong contrast on the
  // light field; light steel in dark theme → reads on the navy bg), with a touch
  // of accent on the front lines for life. mid/back lines stay atmospheric.
  const line = colors.base.clone().lerp(colors.accent, (1 - depth) * 0.35);
  for (let i = 0; i < POINTS_PER_RIDGE; i++) {
    const t = i / (POINTS_PER_RIDGE - 1);
    positions[i * 3] = (t - 0.5) * FIELD_WIDTH;
    positions[i * 3 + 1] = 0; // y set per-frame (the scrolling wave)
    positions[i * 3 + 2] = 0;
    colorAttr[i * 3] = line.r;
    colorAttr[i * 3 + 1] = line.g;
    colorAttr[i * 3 + 2] = line.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));
  return geo;
}

type Ridge = {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  seed: number;
  depth: number;
  amp: number;
};

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
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // transparent → static hero bg shows through
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    const ridges: Ridge[] = [];
    for (let i = 0; i < RIDGE_COUNT; i++) {
      const depth = i / (RIDGE_COUNT - 1); // 0 (front) → 1 (back)
      const geo = ridgeGeometry(depth, colors);
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.55 + (1 - depth) * 0.45, // front lines crisp, back atmospheric
      });
      const line = new THREE.Line(geo, mat);
      // Stack into depth (parallax). The band spans the lower half and rises into
      // the centre so the ridges are clearly visible across the field; the text
      // sits over the calmer crest area and reads by natural contrast.
      line.position.set(0, -2.6 + depth * 1.8, -i * 1.4);
      group.add(line);
      ridges.push({ line, mat, seed: i + 1, depth, amp: 1.8 + depth * 1.3 });
    }
    scene.add(group);

    const applyColors = () => {
      colors = readThemeColors(root);
      for (const r of ridges) {
        const next = ridgeGeometry(r.depth, colors);
        r.line.geometry.dispose();
        r.line.geometry = next;
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

    // Per-frame: scroll the terrain wave in x (left → right) and edge-fade each
    // vertex's height so the field flows seamlessly off both edges.
    const updateWave = (tSec: number) => {
      for (const r of ridges) {
        const pos = r.line.geometry.getAttribute("position") as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        for (let i = 0; i < POINTS_PER_RIDGE; i++) {
          const t = i / (POINTS_PER_RIDGE - 1);
          const x = (t - 0.5) * FIELD_WIDTH;
          // Scroll the wave phase by +x over time → flows left → right.
          const phase = x * 0.32 - tSec * FLOW + r.seed;
          const wave =
            Math.sin(phase) * r.amp * 0.5 +
            Math.sin(phase * 2.7 + r.seed) * r.amp * 0.18 +
            Math.sin(phase * 5.3) * r.amp * 0.08;
          // Fade height toward the screen edges so there's no hard end.
          const edge = Math.sin(t * Math.PI); // 0 at edges, 1 mid
          arr[i * 3 + 1] = wave * edge;
        }
        pos.needsUpdate = true;
      }
    };

    let raf = 0;
    let running = false;
    const renderFrame = (tSec: number) => {
      updateWave(tSec);
      renderer.render(scene, camera);
    };
    const loop = (now: number) => {
      if (!running) return;
      renderFrame(now / 1000);
      raf = requestAnimationFrame(loop);
    };
    const play = () => {
      if (running || reduceMotion) return;
      running = true;
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
      renderFrame(0); // single still frame — a calm terrain composition
    } else {
      play();
    }

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
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
