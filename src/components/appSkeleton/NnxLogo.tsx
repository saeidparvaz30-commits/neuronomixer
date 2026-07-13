"use client";

import { memo, useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * NnxLogo: "The Original" Astrolabe Mixer with the Living Sky animation.
 *
 * Geometry is the exact m6() mark emitted by the Simorgh logo dossier
 * (projects/NeuroNomixer/logo/gen_anim.py astro("nnx")), embedded verbatim so
 * the rendered instrument matches the reviewed artifact byte for byte. The
 * Living Sky timeline is gen_anim.py's a4(), scoped to this component's own SVG
 * so multiple instances (navbar + footer) never cross-animate. Motion runs only
 * under gsap.matchMedia("(prefers-reduced-motion: no-preference)"); with motion
 * off the still original renders and no tween is ever created.
 *
 * The component is wrapped in React.memo: it lives inside the navbar, whose
 * useSession() / scroll-visibility state re-renders it constantly. Without memo,
 * each parent re-render re-commits this SVG's dangerouslySetInnerHTML subtree,
 * replacing the inner nodes and orphaning the running gsap tweens onto detached
 * elements (the animation silently froze on the navbar instance). memo makes the
 * navbar instance as render-stable as the static footer instance, so the mark's
 * DOM nodes persist for the life of the animation.
 */

const MARK = `<g class="nnx-all"><circle class="nnx-ring" cx="60" cy="60" r="55.5" fill="none" stroke="#d4af37" stroke-width="1.9"/><g class="nnx-grp-ticks"><path class="nnx-tick" d="M60,9.5 L60,5.4" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M64.55,8 L64.76,5.61" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M69.06,8.59 L69.48,6.23" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M73.07,11.22 L74.13,7.26" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M77.85,10.95 L78.67,8.69" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M82.06,12.69 L83.07,10.52" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M85.25,16.27 L87.3,12.72" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M89.94,17.24 L91.32,15.27" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M93.55,20.01 L95.1,18.17" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M95.71,24.29 L98.61,21.39" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M99.99,26.45 L101.83,24.9" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M102.76,30.06 L104.73,28.68" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M103.73,34.75 L107.28,32.7" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M107.31,37.94 L109.48,36.93" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M109.05,42.15 L111.31,41.33" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M108.78,46.93 L112.74,45.87" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M111.41,50.94 L113.77,50.52" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M112,55.45 L114.39,55.24" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M110.5,60 L114.6,60" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M112,64.55 L114.39,64.76" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M111.41,69.06 L113.77,69.48" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M108.78,73.07 L112.74,74.13" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M109.05,77.85 L111.31,78.67" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M107.31,82.06 L109.48,83.07" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M103.73,85.25 L107.28,87.3" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M102.76,89.94 L104.73,91.32" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M99.99,93.55 L101.83,95.1" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M95.71,95.71 L98.61,98.61" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M93.55,99.99 L95.1,101.83" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M89.94,102.76 L91.32,104.73" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M85.25,103.73 L87.3,107.28" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M82.06,107.31 L83.07,109.48" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M77.85,109.05 L78.67,111.31" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M73.07,108.78 L74.13,112.74" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M69.06,111.41 L69.48,113.77" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M64.55,112 L64.76,114.39" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M60,110.5 L60,114.6" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M55.45,112 L55.24,114.39" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M50.94,111.41 L50.52,113.77" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M46.93,108.78 L45.87,112.74" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M42.15,109.05 L41.33,111.31" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M37.94,107.31 L36.93,109.48" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M34.75,103.73 L32.7,107.28" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M30.06,102.76 L28.68,104.73" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M26.45,99.99 L24.9,101.83" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M24.29,95.71 L21.39,98.61" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M20.01,93.55 L18.17,95.1" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M17.24,89.94 L15.27,91.32" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M16.27,85.25 L12.72,87.3" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M12.69,82.06 L10.52,83.07" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M10.95,77.85 L8.69,78.67" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M11.22,73.07 L7.26,74.13" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M8.59,69.06 L6.23,69.48" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M8,64.55 L5.61,64.76" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M9.5,60 L5.4,60" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M8,55.45 L5.61,55.24" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M8.59,50.94 L6.23,50.52" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M11.22,46.93 L7.26,45.87" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M10.95,42.15 L8.69,41.33" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M12.69,37.94 L10.52,36.93" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M16.27,34.75 L12.72,32.7" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M17.24,30.06 L15.27,28.68" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M20.01,26.45 L18.17,24.9" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M24.29,24.29 L21.39,21.39" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M26.45,20.01 L24.9,18.17" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M30.06,17.24 L28.68,15.27" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M34.75,16.27 L32.7,12.72" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M37.94,12.69 L36.93,10.52" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M42.15,10.95 L41.33,8.69" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M46.93,11.22 L45.87,7.26" stroke="#d4af37" stroke-width="1.0" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M50.94,8.59 L50.52,6.23" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/><path class="nnx-tick" d="M55.45,8 L55.24,5.61" stroke="#d4af37" stroke-width="0.8" stroke-linecap="round" opacity="0.75" fill="none"/></g><circle class="nnx-c49" cx="60" cy="60" r="49" fill="none" stroke="#d4af37" stroke-width="1.1" opacity="0.8"/><circle class="nnx-c44" cx="60" cy="60" r="44" fill="none" stroke="#d4af37" stroke-width="0.8" opacity="0.5"/><circle class="nnx-kursi" cx="60" cy="6" r="3" fill="none" stroke="#d4af37" stroke-width="1.6"/><path class="nnx-div" d="M60,16 A22,22 0 0 1 60,60 A22,22 0 0 0 60,104" fill="none" stroke="#d4af37" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.55"/><g class="nnx-grp-neuro"><path class="nnx-edge nnx-edge-0" d="M36,40 L46,46" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><path class="nnx-edge nnx-edge-1" d="M46,46 L52,56" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><path class="nnx-edge nnx-edge-2" d="M28,60 L52,56" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><path class="nnx-edge nnx-edge-3" d="M36,80 L48,68" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><path class="nnx-edge nnx-edge-4" d="M48,68 L52,56" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><path class="nnx-edge nnx-edge-5" d="M28,60 L46,46" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><path class="nnx-edge nnx-edge-6" d="M36,80 L52,56" stroke="#3bb4a4" stroke-width="1.1" stroke-linecap="round" opacity="0.8" fill="none"/><circle class="nnx-node nnx-node-0" cx="36" cy="40" r="2.3" fill="#3bb4a4"/><circle class="nnx-node nnx-node-1" cx="28" cy="60" r="2.3" fill="#3bb4a4"/><circle class="nnx-node nnx-node-2" cx="36" cy="80" r="2.3" fill="#3bb4a4"/><circle class="nnx-node nnx-node-3" cx="48" cy="68" r="2.3" fill="#3bb4a4"/><circle class="nnx-node nnx-node-4" cx="46" cy="46" r="2.3" fill="#3bb4a4"/><circle class="nnx-node nnx-node-5" cx="52" cy="56" r="3.4" fill="#d4af37"/></g><g class="nnx-grp-helix"><path class="nnx-sa" d="M76,28 C76.32,28.27 77.31,29.07 77.92,29.6 C78.52,30.13 79.13,30.67 79.64,31.2 C80.16,31.73 80.64,32.27 81.02,32.8 C81.39,33.33 81.7,33.87 81.9,34.4 C82.09,34.93 82.2,35.47 82.2,36 C82.2,36.53 82.09,37.07 81.9,37.6 C81.7,38.13 81.39,38.67 81.02,39.2 C80.64,39.73 80.16,40.27 79.64,40.8 C79.13,41.33 78.52,41.87 77.92,42.4 C77.31,42.93 76.64,43.47 76,44 C75.36,44.53 74.69,45.07 74.08,45.6 C73.48,46.13 72.87,46.67 72.36,47.2 C71.84,47.73 71.36,48.27 70.98,48.8 C70.61,49.33 70.3,49.87 70.1,50.4 C69.91,50.93 69.8,51.47 69.8,52 C69.8,52.53 69.91,53.07 70.1,53.6 C70.3,54.13 70.61,54.67 70.98,55.2 C71.36,55.73 71.84,56.27 72.36,56.8 C72.87,57.33 73.48,57.87 74.08,58.4 C74.69,58.93 75.36,59.47 76,60 C76.64,60.53 77.31,61.07 77.92,61.6 C78.52,62.13 79.13,62.67 79.64,63.2 C80.16,63.73 80.64,64.27 81.02,64.8 C81.39,65.33 81.7,65.87 81.9,66.4 C82.09,66.93 82.2,67.47 82.2,68 C82.2,68.53 82.09,69.07 81.9,69.6 C81.7,70.13 81.39,70.67 81.02,71.2 C80.64,71.73 80.16,72.27 79.64,72.8 C79.13,73.33 78.52,73.87 77.92,74.4 C77.31,74.93 76.64,75.47 76,76 C75.36,76.53 74.69,77.07 74.08,77.6 C73.48,78.13 72.87,78.67 72.36,79.2 C71.84,79.73 71.36,80.27 70.98,80.8 C70.61,81.33 70.3,81.87 70.1,82.4 C69.91,82.93 69.8,83.47 69.8,84 C69.8,84.53 69.91,85.07 70.1,85.6 C70.3,86.13 70.61,86.67 70.98,87.2 C71.36,87.73 71.84,88.27 72.36,88.8 C72.87,89.33 73.48,89.87 74.08,90.4 C74.69,90.93 75.68,91.73 76,92" fill="none" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path class="nnx-sb" d="M76,28 C75.68,28.27 74.69,29.07 74.08,29.6 C73.48,30.13 72.87,30.67 72.36,31.2 C71.84,31.73 71.36,32.27 70.98,32.8 C70.61,33.33 70.3,33.87 70.1,34.4 C69.91,34.93 69.8,35.47 69.8,36 C69.8,36.53 69.91,37.07 70.1,37.6 C70.3,38.13 70.61,38.67 70.98,39.2 C71.36,39.73 71.84,40.27 72.36,40.8 C72.87,41.33 73.48,41.87 74.08,42.4 C74.69,42.93 75.36,43.47 76,44 C76.64,44.53 77.31,45.07 77.92,45.6 C78.52,46.13 79.13,46.67 79.64,47.2 C80.16,47.73 80.64,48.27 81.02,48.8 C81.39,49.33 81.7,49.87 81.9,50.4 C82.09,50.93 82.2,51.47 82.2,52 C82.2,52.53 82.09,53.07 81.9,53.6 C81.7,54.13 81.39,54.67 81.02,55.2 C80.64,55.73 80.16,56.27 79.64,56.8 C79.13,57.33 78.52,57.87 77.92,58.4 C77.31,58.93 76.64,59.47 76,60 C75.36,60.53 74.69,61.07 74.08,61.6 C73.48,62.13 72.87,62.67 72.36,63.2 C71.84,63.73 71.36,64.27 70.98,64.8 C70.61,65.33 70.3,65.87 70.1,66.4 C69.91,66.93 69.8,67.47 69.8,68 C69.8,68.53 69.91,69.07 70.1,69.6 C70.3,70.13 70.61,70.67 70.98,71.2 C71.36,71.73 71.84,72.27 72.36,72.8 C72.87,73.33 73.48,73.87 74.08,74.4 C74.69,74.93 75.36,75.47 76,76 C76.64,76.53 77.31,77.07 77.92,77.6 C78.52,78.13 79.13,78.67 79.64,79.2 C80.16,79.73 80.64,80.27 81.02,80.8 C81.39,81.33 81.7,81.87 81.9,82.4 C82.09,82.93 82.2,83.47 82.2,84 C82.2,84.53 82.09,85.07 81.9,85.6 C81.7,86.13 81.39,86.67 81.02,87.2 C80.64,87.73 80.16,88.27 79.64,88.8 C79.13,89.33 78.52,89.87 77.92,90.4 C77.31,90.93 76.32,91.73 76,92" fill="none" stroke="#e9cf7a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path class="nnx-rung" d="M82.2,36 L69.8,36" stroke="#3bb4a4" stroke-width="1.3" stroke-linecap="round" opacity="0.95" fill="none"/><path class="nnx-rung" d="M69.8,52 L82.2,52" stroke="#3bb4a4" stroke-width="1.3" stroke-linecap="round" opacity="0.95" fill="none"/><path class="nnx-rung" d="M82.2,68 L69.8,68" stroke="#3bb4a4" stroke-width="1.3" stroke-linecap="round" opacity="0.95" fill="none"/><path class="nnx-rung" d="M69.8,84 L82.2,84" stroke="#3bb4a4" stroke-width="1.3" stroke-linecap="round" opacity="0.95" fill="none"/></g></g>`;

type NnxLogoProps = {
  /** Rendered width and height in px. */
  size?: number;
  /** Set false to force the still mark even when motion is allowed. */
  animate?: boolean;
};

function NnxLogo({ size = 40, animate = true }: NnxLogoProps) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!animate) return;
    const root = ref.current;
    if (!root) return;

    const one = (sel: string) => root.querySelector<SVGElement>(sel);
    const many = (sel: string) =>
      Array.from(root.querySelectorAll<SVGElement>(sel));

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Living Sky (gen_anim.py a4): ring tracks the sky, nodes twinkle,
      // rungs shimmer, kursi breathes, helix sways.
      gsap.to(one(".nnx-grp-ticks"), {
        rotation: 360,
        svgOrigin: "60 60",
        duration: 60,
        ease: "none",
        repeat: -1,
      });
      many(".nnx-node").forEach((el, i) => {
        gsap.to(el, {
          scale: 1.5,
          transformOrigin: "50% 50%",
          duration: 0.5 + (i % 3) * 0.3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: i * 0.55,
          repeatDelay: 1.1,
        });
      });
      gsap.fromTo(
        many(".nnx-rung"),
        { autoAlpha: 0.35 },
        {
          autoAlpha: 1,
          duration: 0.9,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.45,
        }
      );
      gsap.to(one(".nnx-kursi"), {
        autoAlpha: 0.45,
        duration: 2.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(one(".nnx-grp-helix"), {
        rotation: 2.4,
        svgOrigin: "76 60",
        duration: 3.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    return () => {
      mm.revert();
    };
  }, [animate]);

  return (
    <svg
      ref={ref}
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role="img"
      aria-label="NeuroNomixer"
      style={{ display: "block", flex: "0 0 auto" }}
      dangerouslySetInnerHTML={{ __html: MARK }}
    />
  );
}

export default memo(NnxLogo);
