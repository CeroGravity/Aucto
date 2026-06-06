"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Striking, on-brand 3D hero (vanilla Three.js — one decorative scene). Concept:
// the AUCTO MARK as a mountain. Layered peak RANGES — each a filled silhouette
// whose profile echoes the logo's sharp, asymmetric peak (a dominant spike
// left-of-centre with a steep face + jagged foothills) — recede into fog and
// drift forward, with the ridgeline lit by the steel-cyan accent. The ranges
// also rise slightly (ascent / elevation = "Aucto, to increase" + "Move with
// Power"). Dimensional and premium, tied to the brand mark — not a generic hill.
//
// THEME-AWARE: peak/accent/fog colors come from the --hero-* CSS tokens (dark =
// lighter so the peaks read on the navy bg); a MutationObserver on <html class>
// rebuilds them on theme toggle.
//
// SEAMLESS: each range advances on its own continuous z; when it passes the
// camera it wraps to the far back (z -= FIELD_DEPTH) DEEP IN THE FOG where its
// opacity is ~0 — the recycle is never visible. No group-level reset.
//
// Cost caps: pixel ratio clamped ≤1.5; loop pauses when the tab is hidden or the
// hero is offscreen; reduced-motion renders one still frame. The canvas is
// decorative (aria-hidden container) and never focusable.

const RANGE_COUNT = 9;
const PROFILE_POINTS = 120;
const RANGE_WIDTH = 34;
const FIELD_DEPTH = 40;
const NEAR_Z = 8;
const FAR_Z = NEAR_Z - FIELD_DEPTH;
const SPEED = 1.3; // world units / second toward the camera
const BASE_Y = -7; // silhouette floor (filled down to here)

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

// The AUCTO peak profile: height (0..1) across the silhouette (x in -0.5..0.5).
// Echoes the mark — a dominant sharp spike left-of-centre with a steep right
// face, a secondary peak, and jagged foothills. `seed` varies foothill detail
// per range so the layers differ without losing the signature shape.
function auctoPeak(t: number, seed: number): number {
  const x = t - 0.5;
  // Main spike just left of centre (sharp, asymmetric — quick rise, steep fall).
  const main = Math.exp(-((x + 0.08) ** 2) / 0.012) * 1.0;
  // Secondary shoulder peak to the right.
  const shoulder = Math.exp(-((x - 0.22) ** 2) / 0.02) * 0.55;
  // A smaller left foothill.
  const foothill = Math.exp(-((x + 0.34) ** 2) / 0.03) * 0.35;
  // Jagged high-frequency detail (terrain), varied by seed, fading at the edges.
  const edge = 1 - Math.min(1, (Math.abs(x) - 0.3) / 0.2);
  const jag =
    (Math.sin(t * 47 + seed * 2.3) * 0.5 + Math.sin(t * 23 + seed) * 0.5) *
    0.05 *
    Math.max(0, edge);
  return Math.max(0, main + shoulder + foothill + jag);
}

// A filled mountain-range silhouette (triangle strip from the ridgeline down to
// BASE_Y) with per-vertex color: base at the floor → mid up the face → accent on
// the ridge. `peakHeight` scales the whole range; nearer ranges are taller.
function rangeGeometry(
  seed: number,
  peakHeight: number,
  colors: ThemeColors,
): THREE.BufferGeometry {
  const positions = new Float32Array(PROFILE_POINTS * 2 * 3);
  const colorAttr = new Float32Array(PROFILE_POINTS * 2 * 3);
  for (let i = 0; i < PROFILE_POINTS; i++) {
    const t = i / (PROFILE_POINTS - 1);
    const x = (t - 0.5) * RANGE_WIDTH;
    const ridgeY = BASE_Y + auctoPeak(t, seed) * peakHeight;

    // top vertex (ridge) + bottom vertex (floor)
    positions[i * 6] = x;
    positions[i * 6 + 1] = ridgeY;
    positions[i * 6 + 2] = 0;
    positions[i * 6 + 3] = x;
    positions[i * 6 + 4] = BASE_Y;
    positions[i * 6 + 5] = 0;

    // ridge color = mid→accent near the top; floor = base.
    const ridge = colors.mid.clone().lerp(colors.accent, 0.55);
    colorAttr[i * 6] = ridge.r;
    colorAttr[i * 6 + 1] = ridge.g;
    colorAttr[i * 6 + 2] = ridge.b;
    colorAttr[i * 6 + 3] = colors.base.r;
    colorAttr[i * 6 + 4] = colors.base.g;
    colorAttr[i * 6 + 5] = colors.base.b;
  }
  const indices: number[] = [];
  for (let i = 0; i < PROFILE_POINTS - 1; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    indices.push(a, b, c, c, b, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));
  geo.setIndex(indices);
  return geo;
}

// Opacity by depth: 0 at the far spawn edge and as a range passes the camera,
// peaking mid-field — masks both spawn and the wrap.
function depthOpacity(z: number): number {
  const t = (z - FAR_Z) / FIELD_DEPTH;
  const fadeIn = Math.min(1, t / 0.22);
  const fadeOut = Math.min(1, (1 - t) / 0.18);
  return Math.max(0, Math.min(fadeIn, fadeOut));
}

type Range = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; seed: number };

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
    scene.fog = new THREE.Fog(colors.fog, 9, FIELD_DEPTH * 0.95);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.4, NEAR_Z + 3);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // transparent → static hero shows through
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    // peakHeight by depth: nearer ranges are taller (parallax + sense of scale).
    const peakFor = (z: number) => 4.5 + ((z - FAR_Z) / FIELD_DEPTH) * 6;

    const group = new THREE.Group();
    const ranges: Range[] = [];
    for (let i = 0; i < RANGE_COUNT; i++) {
      const seed = i + 1;
      const z = FAR_Z + (i / RANGE_COUNT) * FIELD_DEPTH;
      const geo = rangeGeometry(seed, peakFor(z), colors);
      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.z = z;
      group.add(mesh);
      ranges.push({ mesh, mat, seed });
    }
    scene.add(group);

    const rebuild = () => {
      for (const r of ranges) {
        const next = rangeGeometry(r.seed, peakFor(r.mesh.position.z), colors);
        r.mesh.geometry.dispose();
        r.mesh.geometry = next;
      }
    };

    const applyColors = () => {
      colors = readThemeColors(root);
      if (scene.fog instanceof THREE.Fog) scene.fog.color.copy(colors.fog);
      rebuild();
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
      for (const r of ranges) {
        if (animate) {
          r.mesh.position.z += SPEED * dt;
          if (r.mesh.position.z > NEAR_Z) {
            r.mesh.position.z -= FIELD_DEPTH; // wrap in the fog
            // Re-scale the peak for its new (far) depth so the layering holds.
            const next = rangeGeometry(r.seed, peakFor(r.mesh.position.z), colors);
            r.mesh.geometry.dispose();
            r.mesh.geometry = next;
          }
        }
        const z = r.mesh.position.z;
        // Subtle elevating drift (ascent) — a slow vertical rise + breathe.
        r.mesh.position.y = Math.sin(tSec * 0.3 + r.seed) * 0.18;
        r.mat.opacity = depthOpacity(z);
      }
      // Gentle lateral camera drift for parallax (seamless — a pure sine).
      camera.position.x = Math.sin(tSec * 0.12) * 0.6;
      camera.lookAt(0, -0.6, -FIELD_DEPTH * 0.4);
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
      update(0, false); // single still frame — the layered ranges compose well
    } else {
      play();
    }

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      themeObserver.disconnect();
      io.disconnect();
      ro.disconnect();
      for (const r of ranges) {
        r.mesh.geometry.dispose();
        r.mat.dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
