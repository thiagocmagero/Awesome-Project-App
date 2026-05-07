import { useEffect } from 'react';

const PARTICLES_CONFIG = {
  particles: {
    number: { value: 80, density: { enable: true, value_area: 800 } },
    color: { value: '#d1d9e0' },
    shape: {
      type: 'circle',
      stroke: { width: 0, color: '#d1d9e0' },
      polygon: { nb_sides: 5 },
    },
    opacity: {
      value: 0.1,
      random: false,
      anim: { enable: false, speed: 1, opacity_min: 0.1, sync: false },
    },
    size: {
      value: 2,
      random: true,
      anim: { enable: false, speed: 40, size_min: 0.1, sync: false },
    },
    line_linked: { enable: true, distance: 150, color: '#d1d9e0', opacity: 0.4, width: 1 },
    move: {
      enable: true,
      speed: 2,
      direction: 'none',
      random: false,
      straight: false,
      out_mode: 'out',
      bounce: false,
      attract: { enable: false, rotateX: 600, rotateY: 1200 },
    },
  },
  interactivity: {
    detect_on: 'canvas',
    events: {
      onhover: { enable: true, mode: 'grab' },
      onclick: { enable: true, mode: 'push' },
      resize: true,
    },
    modes: {
      grab: { distance: 150, line_linked: { opacity: 1 } },
      bubble: { distance: 400, size: 40, duration: 2, opacity: 8, speed: 3 },
      repulse: { distance: 200, duration: 0.4 },
      push: { particles_nb: 4 },
      remove: { particles_nb: 2 },
    },
  },
  retina_detect: true,
};

export function useParticles(containerId: string, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const loadScript = (src: string): Promise<void> =>
      new Promise((resolve) => {
        if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
        const s = document.createElement('script');
        s.src = src;
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });

    loadScript('/assets/libs/particles.js/particles.js').then(() => {
      if (typeof (window as unknown as Record<string, unknown>).particlesJS !== 'undefined') {
        (window as unknown as Record<string, (id: string, cfg: unknown) => void>).particlesJS(containerId, PARTICLES_CONFIG);
      }
    });

    return () => {
      document.querySelector(`#${containerId} canvas`)?.remove();
    };
  }, [containerId, enabled]);
}
