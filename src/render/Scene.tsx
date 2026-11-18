import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { EYE, input, player, teleport, tickPlayer, nearestStation } from '../player/player';
import { clock } from '../sim';
import { stationWorld } from '../stations';
import { updateTrains } from '../trains/system';
import { dom, useUI, capturePointer } from '../ui/store';
import { toWorld } from '../world/collision';
import { WorldView } from './world-view';

const SKY = new THREE.Color('#bcd6ea'), DARK = new THREE.Color('#0c0d10');
const tmp: [number, number, number] = [0, 0, 0];

function World() {
  const { camera, scene } = useThree();
  const view = useMemo(() => new WorldView(), []);
  useEffect(() => {
    scene.fog = new THREE.Fog(SKY.clone(), 300, 1700);
    scene.background = SKY.clone();
    camera.rotation.order = 'YXZ';
    return () => view.dispose();
  }, [scene, camera, view]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    clock.advance(dt);
    updateTrains(clock.time);

    if (useUI.getState().mode === 'play') {
      tickPlayer(dt);
      const p = player.body.pos;
      camera.position.set(p[0], player.eyeY + EYE, p[2]);
      camera.rotation.set(player.pitch, player.yaw, 0);
    } else {
      // Menu backdrop: a slow pan on the elevated platform at Hibarino.
      const w = stationWorld('hibarino');
      const t = state.clock.elapsedTime;
      toWorld(w.frame, [-34, 9.5, 6.2], tmp);
      camera.position.set(tmp[0], tmp[1], tmp[2]);
      camera.rotation.set(-0.06, w.frame.yaw - Math.PI / 2 + 0.22 + Math.sin(t * 0.08) * 0.12, 0);
    }

    view.update(dt, camera.position);

    // Underground the far distance fades to black; above ground to sky.
    const fog = scene.fog as THREE.Fog;
    const under = camera.position.y < -1.2;
    const k = Math.min(1, dt * 3);
    fog.color.lerp(under ? DARK : SKY, k);
    (scene.background as THREE.Color).copy(fog.color);
    fog.near += ((under ? 70 : 300) - fog.near) * k;
    fog.far += ((under ? 520 : 1700) - fog.far) * k;
  });

  return <primitive object={view.root} />;
}

const KEYS: Record<string, keyof typeof input> = {
  KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnL', ArrowRight: 'turnR',
  KeyQ: 'turnL', KeyE: 'turnR', PageUp: 'lookU', PageDown: 'lookD',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump',
};

function Controls() {
  const { gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    dom.canvas = el;
    let dragging = false;
    const playing = () => {
      const s = useUI.getState();
      return s.mode === 'play' && !s.mapOpen;
    };
    const key = (down: boolean) => (e: KeyboardEvent) => {
      const ui = useUI.getState();
      if (ui.mode !== 'play') return;
      if (down && !e.repeat) {
        if (e.code === 'KeyM') return ui.setMap(!ui.mapOpen);
        if (e.code === 'Escape' && ui.mapOpen) return ui.setMap(false);
        if (ui.mapOpen) return;
        if (e.code === 'KeyF') return ui.toggleFast();
        if (e.code === 'KeyR') return teleport(nearestStation(player.body.pos[0], player.body.pos[2]).world.def.id);
      }
      const k = KEYS[e.code];
      if (!k || ui.mapOpen) return;
      input[k] = down;
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Page')) e.preventDefault();
    };
    const kd = key(true), ku = key(false);
    const look = (e: MouseEvent) => {
      if (!playing()) return;
      if (document.pointerLockElement !== el && !dragging) return;
      player.yaw -= e.movementX * 0.0022;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * 0.0022));
    };
    const down = () => {
      if (!playing()) return;
      dragging = true;
      if (document.pointerLockElement !== el) capturePointer();
    };
    const up = () => (dragging = false);
    const lock = () => useUI.getState().setLocked(document.pointerLockElement === el);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('mousemove', look);
    el.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.addEventListener('pointerlockchange', lock);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('mousemove', look);
      el.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('pointerlockchange', lock);
    };
  }, [gl]);
  return null;
}

export function Scene() {
  return (
    <Canvas flat dpr={[1, 1.5]} camera={{ fov: 72, near: 0.08, far: 3200 }} gl={{ antialias: true }}>
      <ambientLight intensity={1.05} color="#ffffff" />
      <hemisphereLight args={["#eaf2ff", "#7d786c", 0.75]} />
      <directionalLight position={[300, 500, 180]} intensity={1.15} color="#fff4e0" />
      <World />
      <Controls />
    </Canvas>
  );
}
