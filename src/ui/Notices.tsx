// Notices on the in-game screen: the station name card on arriving, what the trains at this
// platform are doing, and what the player is standing at (an exit, a lift).
// All of it is read from the timetable and the built station; nothing is on a timer of its own
// except how long the arrival card stays up.

import { useEffect, useRef, useState } from 'react';
import { lineById, linesAt, stationById, terminusOf } from '../data/network';
import type { Dir, LineDef } from '../data/types';
import { player, where } from '../player/player';
import { clock, lineSim } from '../sim';
import { nextArrivals, nextDepartures } from '../sim/timetable';
import { stationExits, type StationExit } from '../stations/exits';
import { toLocal } from '../world/collision';
import type { V3 } from '../world/builder';
import { guideStep, platformOf } from './Guide';
import { Two } from './Hud';
import { LineBullet, NumberBadge } from './MetroMap';

/** Seconds before a train stops that it is announced, and before it leaves that the doors are called. */
const APPROACH_S = 25, DOORS_S = 9;
/** Real seconds the arrival card stays up. */
const CARD_MS = 5500;

interface Note { key: string; tone: 'info' | 'go' | 'warn'; tag: [string, string]; ja: string; en: string; line?: LineDef }

const exitCache = new Map<string, StationExit[]>();
const exitsOf = (id: string) => exitCache.get(id) ?? (exitCache.set(id, stationExits(id)), exitCache.get(id)!);
const l: V3 = [0, 0, 0];

function notes(): Note[] {
  const out: Note[] = [];
  const st = where.station, zone = where.zone, train = where.train, now = clock.time;
  const step = guideStep();
  if (step?.kind === 'ride' && step.stops === 1) {
    const s = stationById(step.alight);
    out.push({ key: 'alight', tone: 'go', tag: ['案内', 'Guide'], ja: step.here ? `${s.nameJa} です。お降りください` : `つぎの ${s.nameJa} でお降りください`, en: step.here ? `This is ${s.nameRomaji}. Get off here` : `Get off at the next stop, ${s.nameRomaji}` });
  }
  if (step?.kind === 'board' && !train && zone?.kind === 'platform' && zone.line) {
    const plat = platformOf(step.leg), left = step.leg.dep - now;
    if (zone.line !== step.leg.line.id) {
      out.push({ key: 'wrong', tone: 'warn', tag: ['案内', 'Guide'], line: step.leg.line, ja: `のりばが違います。${step.leg.line.nameJa} ${plat}番線へ`, en: `Wrong platform. Go to ${step.leg.line.nameEn} platform ${plat}` });
    } else if (left <= 60) {
      out.push({ key: 'mine', tone: 'go', tag: ['案内', 'Guide'], line: step.leg.line, ja: `${plat}番線の電車にご乗車ください。まもなく発車します`, en: `Board the train at platform ${plat}. It leaves in under a minute` });
    }
  }
  if (train) {
    const p = train.state.phase, line = train.sim.geom.def;
    if (p.kind === 'dwell' && p.role === 'arrival') {
      out.push({ key: 'end', tone: 'warn', tag: ['終点', 'Last stop'], line, ja: 'この電車は回送になります。お降りください', en: 'This train goes out of service. Please get off' });
    } else if (p.kind === 'dwell' && p.doors && p.t1 - train.state.tau <= DOORS_S) {
      out.push({ key: 'doors', tone: 'warn', tag: ['ドア', 'Doors'], line, ja: 'ドアが閉まります', en: 'Doors closing' });
    }
    return out;
  }
  if (!st) return out;
  if (zone?.kind === 'platform' && zone.line) {
    const line = lineById(zone.line), stop = line.stops.indexOf(st.def.id);
    const { tt } = lineSim(line.id);
    for (const dir of stop < 0 ? [] : (['down', 'up'] as Dir[])) {
      const d = nextDepartures(tt, stop, dir, now, 1)[0];
      const plat = st.def.platforms[line.id][dir === 'down' ? 0 : 1], dest = terminusOf(line, dir);
      if (d && now < d.arr && d.arr - now <= APPROACH_S) {
        out.push({ key: `in${dir}`, tone: 'go', tag: [`${plat}番線`, `Platform ${plat}`], line, ja: `まもなく ${dest.nameJa} ゆきがまいります`, en: `Train for ${dest.nameRomaji} approaching` });
      } else if (d && now >= d.arr && d.dep - now <= DOORS_S) {
        out.push({ key: `out${dir}`, tone: 'warn', tag: [`${plat}番線`, `Platform ${plat}`], line, ja: `${dest.nameJa} ゆき ドアが閉まります`, en: `For ${dest.nameRomaji}: doors closing` });
      }
      const a = nextArrivals(tt, stop, dir, now, 1)[0];
      if (a && a.arr - now <= APPROACH_S && now <= a.dep) {
        out.push({ key: `end${dir}`, tone: 'warn', tag: ['当駅止まり', 'Terminates here'], line, ja: 'この電車にはご乗車になれません', en: 'This train is not in service. Do not board' });
      }
    }
  }
  // What the player is standing at.
  toLocal(st.frame, player.body.pos, l);
  const lift = st.build.lifts.find((f) => l[0] > f.min[0] && l[0] < f.max[0] && l[2] > f.min[1] && l[2] < f.max[1] && l[1] > f.levels[0] - 0.5 && l[1] < f.levels[f.levels.length - 1] + 0.5);
  if (lift) out.push({ key: 'lift', tone: 'info', tag: ['エレベーター', 'Lift'], ja: '乗ると自動で動きます', en: 'It moves by itself once you are in' });
  if (zone?.kind === 'street' || zone?.kind === 'passage') {
    const e = exitsOf(st.def.id).find((x) => l[0] > x.rect[0] - 1 && l[0] < x.rect[2] + 1 && l[2] > x.rect[1] - 1 && l[2] < x.rect[3] + 1);
    if (e) {
      const near = e.near.slice(0, 2);
      out.push({
        key: 'exit', tone: 'info', tag: e.num ? [`出口 ${e.num}`, `Exit ${e.num}`] : ['出入口', 'Entrance'],
        ja: near.map((n) => n.ja).join('・') || st.def.nameJa + '駅', en: near.map((n) => n.en).join(' · ') || `${st.def.nameRomaji} Station`,
      });
    }
  }
  return out;
}

/** The station the card should announce right now: the one walked into, or the one the train has stopped at. */
function arrivedAt(): { id: string; riding: LineDef | null } | null {
  const train = where.train;
  if (train) {
    const p = train.state.phase, line = train.sim.geom.def;
    return p.kind === 'dwell' && p.stop >= 0 ? { id: line.stops[p.stop], riding: line } : null;
  }
  return where.station ? { id: where.station.def.id, riding: null } : null;
}

function ArrivalCard({ show }: { show: boolean }) {
  const last = useRef<string | null>(null);
  const [card, setCard] = useState<{ id: string; riding: LineDef | null; until: number } | null>(null);
  const at = arrivedAt();
  useEffect(() => {
    if (at && at.id !== last.current) {
      last.current = at.id;
      setCard({ ...at, until: performance.now() + CARD_MS });
    }
  });
  if (!show || !card || performance.now() > card.until) return null;
  const s = stationById(card.id);
  const lines = linesAt(s.id), change = lines.filter((x) => x !== card.riding);
  return (
    <div className="hud-arrive" key={card.id}>
      <div className="hud-arrive-main">
        {lines.map((x) => <NumberBadge key={x.id} code={s.numbers[x.id]} color={x.color} size={50} />)}
        <div>
          <small>{s.nameKana}</small>
          <Two ja={s.nameJa} en={s.nameRomaji} />
        </div>
      </div>
      <div className="hud-arrive-lines">
        <i>{card.riding ? 'のりかえ Change here for' : 'のりば Lines'}</i>
        {change.length ? change.map((x) => <span key={x.id}><LineBullet line={x} size={20} /> <Two ja={x.nameJa} en={x.nameEn} /></span>) : <span>—</span>}
      </div>
    </div>
  );
}

/** `show` is false while a screen covers the view; the card still keeps track of where the player has been. */
export function Notices({ show }: { show: boolean }) {
  return (
    <>
      <ArrivalCard show={show} />
      <div className="hud-notes">
        {show && notes().map((n) => (
          <div key={n.key} className={`hud-note ${n.tone}`}>
            <span className="tag"><Two ja={n.tag[0]} en={n.tag[1]} /></span>
            {n.line && <LineBullet line={n.line} size={22} />}
            <div><Two ja={n.ja} en={n.en} /></div>
          </div>
        ))}
      </div>
    </>
  );
}
