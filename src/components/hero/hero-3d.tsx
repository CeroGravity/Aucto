"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

// Abstract, on-brand 3D hero (vanilla Three.js — one decorative scene, no React
// scene-graph, so the reconciler overhead of react-three-fiber isn't worth it;
// vanilla keeps the lazy chunk smaller and gives direct control of the cost
// caps). Layered angular "ridges" in the brand navy drift toward the viewer —
// the logo's mountain/momentum motif reading as forward power.
//
// Cost caps: pixel ratio clamped to ≤1.5; the loop pauses when the tab is hidden
// or the hero scrolls offscreen; reduced-motion renders a single static frame.
// The canvas is decorative (aria-hidden on its container) and never focusable.

const NAVY = 0x1b2a4d;
const NAVY_LIGHT = 0x3a4f7a;
const RIDGE_COUNT = 7;
const POINTS_PER_RIDGE = 48;
const RIDGE_SPACING = 2.2;

// One jagged horizontal ridge line (a mountain silhouette) as a position buffer.
// Deterministic pseudo-random peaks so it reads as terrain and is stable.
function ridgeGeometry(seed: number, width: number, amplitude: number): THREE.BufferGeometry {
  const positions = new Float32Array(POINTS_PER_RIDGE * 3);
  let h = seed * 9301 + 49297;
  const rand = () => {
    h = (h * 9301 + 49297) % 233280;
    return h / 233280;
  };
  for (let i = 0; i < POINTS_PER_RIDGE; i++) {
    const t = i / (POINTS_PER_RIDGE - 1);
    const base = Math.sin(t * Math.PI * 2 + seed) * amplitude * 0.5;
    const detail = (rand() - 0.5) * amplitude;
    positions[i * 3] = (t - 0.5) * width;
    positions[i * 3 + 1] = base + detail;
    positions[i * 3 + 2] = 0;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geo;
}

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
    scene.fog = new THREE.Fog(NAVY, 6, 18);
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0.6, 9);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0); // transparent → the static navy shows through
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    const ridges: THREE.Line[] = [];
    for (let i = 0; i < RIDGE_COUNT; i++) {
      const depth = i / (RIDGE_COUNT - 1);
      const geo = ridgeGeometry(i + 1, 22, 1.1 + depth * 0.8);
      const color = new THREE.Color(NAVY).lerp(new THREE.Color(NAVY_LIGHT), depth);
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25 + depth * 0.45,
      });
      const line = new THREE.Line(geo, mat);
      line.position.y = -1.5 - depth * 0.4;
      line.position.z = -i * RIDGE_SPACING;
      group.add(line);
      ridges.push(line);
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

    const renderFrame = (now: number) => {
      const t = now * 0.0001;
      group.position.z = (t * 6) % RIDGE_SPACING; // seamless loop with the spacing
      for (let i = 0; i < ridges.length; i++) {
        const r = ridges[i];
        if (r) r.position.y = -1.5 - (i / (RIDGE_COUNT - 1)) * 0.4 + Math.sin(t * 6 + i) * 0.06;
      }
      camera.position.x = Math.sin(t * 2) * 0.25;
      camera.lookAt(0, -0.4, -4);
      renderer.render(scene, camera);
    };

    let raf = 0;
    let running = false;
    const loop = (now: number) => {
      if (!running) return;
      renderFrame(now);
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
      renderFrame(0); // single static frame, no animation
    } else {
      play();
    }

    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      ro.disconnect();
      for (const r of ridges) {
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 h-full w-full" />;
}
