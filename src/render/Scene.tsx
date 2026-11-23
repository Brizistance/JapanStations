import { perfStats } from './perf';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EYE, gale, input, player, tickPlayer, nearestStation, where } from '../player/player';
import { clock } from '../sim';
import { stationWorld } from '../stations';
import { updateTrains } from '../trains/system';
import { updateTraffic } from '../traffic/street';
import { tickTrafficAudio } from '../audio/traffic';
import { TrafficView } from './traffic-view';
import { tickStationAudio } from '../audio/platform';
import { dom, useUI, capturePointer } from '../ui/store';
import { moveWheel, WHEEL, wheelIndex, wheelMove } from '../ui/Wheel';
import { toWorld } from '../world/collision';
import { tickStormAudio } from '../audio/storm';
import { WIND_DIR, atmosphereAt, easeAtmosphere, lightning, newAtmosphere } from './atmosphere';
import { declOf } from '../sim/climate';
import { LampDots, updateLamps } from './lamps';
import { Lighting } from './lighting';
import { lineGrade, outdoorGrade, UNDERGROUND, WARM_HUB, type Grade } from './grade';
import { needsPost } from './graphics';
import { treeGust, treeWind } from './building-models';
import { Post } from './post';
import { ssrWet } from './ssr';
import { Rain } from './weather';
import { WorldView } from './world-view';

const DARK = new THREE.Color('#050506');
const SKY = new THREE.Color(), SUN = new THREE.Vector3();
const atm = newAtmosphere(), atmTarget = newAtmosphere();
/** Time constant of the sky easing: about 95% of the way after 1.5 s. */
const ATM_EASE_TAU = 0.5;
const tmp: [number, number, number] = [0, 0, 0];

function World() {
  const { camera, scene, gl, size } = useThree();
  const fx = useUI((s) => s.graphics.fx);
  const wantPost = needsPost(fx);
  const view = useMemo(() => new WorldView(), []);
  const seasonNow = useUI((s) => s.season);
  useEffect(() => view.reseason(), [view, seasonNow]);
  const lighting = useRef<Lighting | null>(null);
  const post = useRef<Post | null>(null);
  const rain = useRef<Rain | null>(null);
  const dots = useRef<LampDots | null>(null);
  const traffic = useRef<TrafficView | null>(null);
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFShadowMap;
    // Counted over the whole frame (every pass), for the perf readout.
    gl.info.autoReset = false;
    perfStats.scene = scene;
    lighting.current = new Lighting(gl, scene);
    rain.current = new Rain(scene);
    dots.current = new LampDots();
    scene.add(dots.current.points);
    traffic.current = new TrafficView();
    scene.add(traffic.current.root);
    atmosphereAt(clock.time, useUI.getState().weatherNow, atm, declOf(useUI.getState().doy));
    SKY.fromArray(atm.fogColor);
    scene.fog = new THREE.Fog(SKY.clone(), 300, 1700);
    scene.background = SKY.clone();
    camera.rotation.order = 'YXZ';
    return () => {
      view.dispose();
      lighting.current?.dispose();
      lighting.current = null;
      rain.current?.dispose();
      rain.current = null;
      if (dots.current) scene.remove(dots.current.points);
      dots.current?.dispose();
      dots.current = null;
      if (traffic.current) scene.remove(traffic.current.root);
      traffic.current?.dispose();
      traffic.current = null;
    };
  }, [scene, camera, gl, view]);
  // The post-processing chain only exists while some effect needs it (not on Low).
  useEffect(() => {
    if (!wantPost) return;
    const p = new Post(gl, scene, camera as THREE.PerspectiveCamera, size.width, size.height, useUI.getState().graphics.fx);
    post.current = p;
    return () => {
      p.dispose();
      post.current = null;
    };
    // Size and effect changes are handled below without rebuilding the chain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantPost, gl, scene, camera]);
  useEffect(() => {
    post.current?.apply(fx);
    lighting.current?.setDetail(fx.hq);
    lighting.current?.setClouds(fx.clouds);
  }, [fx, wantPost]);
  useEffect(() => {
    post.current?.setSize(size.width, size.height);
  }, [size]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const t0 = performance.now();
    // Field of view is a setting; it applies live, on the menu backdrop too.
    const cam = camera as THREE.PerspectiveCamera, fov = useUI.getState().fov;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    gl.info.reset();
    clock.advance(dt);
    updateTrains(clock.time);
    // Road traffic moves before the player does, so the vehicles are solid where they now are.
    const walking = useUI.getState().mode === 'play';
    updateTraffic(clock.time, walking ? { x: player.body.pos[0], z: player.body.pos[2] } : camera.position, walking && !where.train ? player.body.pos : null, fx.traffic, fx.density * (atm.storm > 0.6 ? 0.3 : atm.storm > 0.3 ? 0.6 : 1));

    if (useUI.getState().mode === 'play') {
      // Frozen while the teleport cover is up: the move happens under it.
      if (!useUI.getState().travel) tickPlayer(dt);
      const p = player.body.pos;
      camera.position.set(p[0], player.eyeY + EYE, p[2]);
      camera.rotation.set(player.pitch, player.yaw, 0);
      tickStationAudio(dt, true, camera.position, player.yaw);
    } else {
      // Menu backdrop: a slow pan on the elevated platform at Hibarino.
      const w = stationWorld('hibarino');
      const t = state.clock.elapsedTime;
      toWorld(w.frame, [-34, 9.5, 6.2], tmp);
      camera.position.set(tmp[0], tmp[1], tmp[2]);
      camera.rotation.set(-0.06, w.frame.yaw - Math.PI / 2 + 0.22 + Math.sin(t * 0.08) * 0.12, 0);
      tickStationAudio(dt, false, camera.position, camera.rotation.y);
    }

    // What cannot be seen from here is not drawn (WorldView.update): indoors underground the street, on the street the halls below.
    const zone = useUI.getState().mode === 'play' ? where.zone : null;
    const vis = !zone ? 'any' : zone.kind === 'street' ? 'street' : !zone.sky && camera.position.y < -2.5 ? 'under' : 'any';
    view.update(dt, camera.position, vis, (scene.fog as THREE.Fog).far);

    // The hour and the weather decide the light, the sky and the fog above ground.
    useUI.getState().syncDate();
    // The scene draws an eased copy: a new time, weather or date plays out over ~1.5 s.
    atmosphereAt(clock.time, useUI.getState().weatherNow, atmTarget, declOf(useUI.getState().doy));
    easeAtmosphere(atm, atmTarget, 1 - Math.exp(-dt / ATM_EASE_TAU));
    const bolt = lightning(state.clock.elapsedTime, atm.storm);
    atm.flash = vis === 'under' ? 0 : bolt;
    SKY.fromArray(atm.fogColor).addScalar(atm.flash * 0.3);
    SUN.fromArray(atm.sun);

    // Underground the far distance fades to black; above ground to sky.
    const fog = scene.fog as THREE.Fog;
    const under = camera.position.y < -1.2 && !(useUI.getState().mode === 'play' && where.zone?.sky);
    const k = Math.min(1, dt * 3);
    fog.color.lerp(under ? DARK : SKY, k);
    (scene.background as THREE.Color).copy(fog.color);
    fog.near += ((under ? 70 : atm.fogNear) - fog.near) * k;
    fog.far += ((under ? 520 : atm.fogFar) - fog.far) * k;

    const near = nearestStation(camera.position.x, camera.position.z).world.frame;
    const light = lighting.current;
    light?.update(camera.position, near.yaw, fx.shadows, atm, dt);
    const riding = useUI.getState().mode === 'play' && where.train != null;
    rain.current?.update(gl, camera.position, atm, dt, vis !== 'under' && camera.position.y > -12, riding, light && dots.current ? [light.dome, dots.current.points] : []);
    traffic.current?.update(vis !== 'under', under ? 0 : atm.night, dt, state.clock.elapsedTime);
    tickTrafficAudio(camera.position, under || useUI.getState().mode !== 'play', atm.wet > 0.5, clock.time);
    tickStormAudio(camera.position, useUI.getState().mode === 'play' && !useUI.getState().paused, under, riding, atm, bolt, state.clock.elapsedTime);
    // A gale is felt on foot in the open: under the sky, off the train.
    gale.power = !under && !riding && useUI.getState().mode === 'play' ? Math.min(1, Math.max(0, (atm.wind - 0.4) / 0.6)) : 0;
    updateLamps(camera.position, under ? 0 : atm.night, fx.hq ? 64 : 24, dt);
    dots.current?.update(under ? 0 : atm.night);
    ssrWet.on = atm.wet > 0.5;
    // Trees: the sway runs faster and the crowns lean as the wind rises, in gusts.
    treeWind.value += dt * (1 + 2.5 * atm.wind);
    treeGust.value.set(WIND_DIR[0], WIND_DIR[1], atm.wind * (0.75 + 0.25 * Math.sin(state.clock.elapsedTime * 0.8)));
    // Priority 1 takes over rendering from R3F.
    const shafts = under || !atm.sunLit ? 0 : Math.min(1, atm.lightPower / 1.2) * (0.35 + 0.65 * atm.dusk);
    // Out in the city beyond the nearest station's plot (continued streets, boulevards) AO costs far more than it shows.
    const nw = nearestStation(camera.position.x, camera.position.z).world;
    const ndx = camera.position.x - nw.frame.x, ndz = camera.position.z - nw.frame.z, nc = Math.cos(nw.frame.yaw), ns = Math.sin(nw.frame.yaw);
    const inPlot = Math.abs(ndx * nc - ndz * ns) < nw.build.plot.x + 10 && Math.abs(ndx * ns + ndz * nc) < nw.build.plot.z + 10;
    if (post.current) post.current.render(under ? gradeFor() : outdoorGrade(atm.day, atm.dusk, atm.direct), dt, state.clock.elapsedTime, SUN, shafts, inPlot || camera.position.y < -1);
    else gl.render(scene, camera);
    perfStats.calls = gl.info.render.calls;
    perfStats.tris = gl.info.render.triangles;
    perfStats.ms += (performance.now() - t0 - perfStats.ms) * 0.1;
  }, 1);

  return <primitive object={view.root} />;
}

/** Underground colour grade to ease towards: generic, or the line you're on. */
function gradeFor(): Grade {
  if (useUI.getState().mode !== 'play') return UNDERGROUND;
  const line = where.train?.sim.geom.def.id ?? where.zone?.line;
  if (line) return lineGrade(line);
  return where.station?.def.id === 'kita-odori' ? WARM_HUB : UNDERGROUND;
}

const KEYS: Record<string, keyof typeof input> = {
  KeyW: 'fwd', ArrowUp: 'fwd', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', KeyD: 'right', ArrowLeft: 'turnL', ArrowRight: 'turnR',
  KeyQ: 'turnL', KeyE: 'turnR', PageUp: 'lookU', PageDown: 'lookD',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'jump',
};

function Controls() {
  const { gl, camera } = useThree();
  dom.camera = camera;
  useEffect(() => {
    const el = gl.domElement;
    dom.canvas = el;
    let dragging = false;
    const playing = () => {
      const s = useUI.getState();
      return s.mode === 'play' && !s.mapOpen && !s.settingsOpen && !s.paused && !s.pickerOpen;
    };
    // When the pause screen last came up by itself (the mouse was released), so the same Esc press does not close it again.
    let pausedAt = 0;
    // Esc closed the pause screen: the mouse is captured again once the key is let go (a held Esc would release it straight away).
    let recapture = false, resumedAt = 0;
    // The quick menu ring (Z held): letting go runs what the mouse points at.
    const closeWheel = (run: boolean) => {
      const ui = useUI.getState();
      if (!ui.wheelOpen) return;
      const i = wheelIndex();
      ui.setWheel(false);
      if (run && i >= 0) WHEEL[i].run(useUI.getState());
    };
    const key = (down: boolean) => (e: KeyboardEvent) => {
      const ui = useUI.getState();
      if (ui.mode !== 'play') return;
      if (!down && e.code === 'Escape' && recapture) {
        recapture = false;
        if (playing() && !ui.freeMouse) capturePointer();
        return;
      }
      // The destination picker takes the keyboard; Esc closes it.
      if (ui.pickerOpen) {
        if (down && e.code === 'Escape') ui.setPicker(false);
        return;
      }
      // Typing in a text box (the map's station search) is not a game key, except Esc; a slider is not a text box.
      if (e.target instanceof HTMLInputElement && e.target.type !== 'range' && e.code !== 'Escape') return;
      if (e.code === 'KeyZ' && !down) return closeWheel(true);
      if (down && e.code === 'F3') e.preventDefault();
      if (down && e.code === 'Tab') e.preventDefault();
      if (down && !e.repeat) {
        if (e.code === 'KeyM') return ui.setMap(!ui.mapOpen);
        if (e.code === 'KeyG') return ui.setSettings(!ui.settingsOpen);
        if (e.code === 'Escape' && ui.mapOpen) return ui.setMap(false);
        if (e.code === 'Escape' && ui.settingsOpen) return ui.setSettings(false);
        if (e.code === 'Escape') {
          if (performance.now() - pausedAt < 300) return;
          if (ui.paused) {
            ui.setPaused(false, false);
            recapture = true;
            resumedAt = performance.now();
          } else ui.setPaused(true);
          return;
        }
        if (ui.mapOpen || ui.settingsOpen || ui.paused) return;
        if (e.code === 'F3') return ui.setFps(!ui.fpsOn);
        if (e.code === 'KeyN') return ui.setMap(true, true);
        if (e.code === 'KeyV') return ui.setGuideView(ui.guideView === 'map' ? 'list' : 'map');
        if (e.code === 'KeyZ') {
          wheelMove.x = wheelMove.y = 0;
          return ui.setWheel(true);
        }
        if (e.code === 'KeyF') return ui.toggleFast();
        if (e.code === 'KeyT') return ui.toggleFreeze();
        if (e.code === 'KeyH') return ui.toggleHud();
        if (e.code === 'Tab') return ui.setFreeMouse(document.pointerLockElement === el);
        if (e.code === 'KeyX') return (ui.setGuide(null), ui.setMark(null));
        if (e.code === 'KeyP') return ui.setPlan(!ui.planOn);
        if (e.code === 'KeyR') return ui.travelTo(nearestStation(player.body.pos[0], player.body.pos[2]).world.def.id);
      }
      const k = KEYS[e.code];
      if (!k || ui.mapOpen || ui.settingsOpen || ui.paused) return;
      input[k] = down;
      if (e.code === 'Space' || e.code.startsWith('Arrow') || e.code.startsWith('Page')) e.preventDefault();
    };
    const kd = key(true), ku = key(false);
    const look = (e: MouseEvent) => {
      if (!playing()) return;
      if (useUI.getState().wheelOpen) return moveWheel(e.movementX, e.movementY);
      if (document.pointerLockElement !== el && !dragging) return;
      const { sensitivity, invertY } = useUI.getState();
      const k = 0.0022 * sensitivity;
      player.yaw -= e.movementX * k;
      player.pitch = Math.max(-1.45, Math.min(1.45, player.pitch - e.movementY * k * (invertY ? -1 : 1)));
    };
    const down = () => {
      if (!playing()) return;
      dragging = true;
      if (useUI.getState().freeMouse) useUI.setState({ freeMouse: false });
      if (document.pointerLockElement !== el) capturePointer();
    };
    const up = () => (dragging = false);
    const lock = () => {
      const locked = document.pointerLockElement === el;
      useUI.getState().setLocked(locked);
      // Releasing the mouse (Esc, or leaving the window) pauses, unless a screen that needs the mouse has opened.
      if (locked) useUI.setState({ freeMouse: false });
      if (!locked && playing() && !useUI.getState().freeMouse && performance.now() - resumedAt > 600) {
        pausedAt = performance.now();
        useUI.getState().setPaused(true);
      }
    };
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
  const scale = useUI((s) => s.graphics.fx.scale);
  return (
    <Canvas dpr={[1, scale]} camera={{ fov: 72, near: 0.08, far: 3200 }} gl={{ antialias: true }}>
      <World />
      <Controls />
    </Canvas>
  );
}
