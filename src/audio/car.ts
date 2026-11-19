// In-car announcements, Tokyo/Osaka Metro style, for the train the player is riding: the
// next stop just after departure, "arriving soon" with transfers and door side before the
// stop, "doors closing" at the end of the dwell, and now and then a manners notice on a
// longer run. Everything is read from the train's timetabled phase.

import { clock } from '../sim';
import { where } from '../player/player';
import { announce, CAR, hushCar } from './engine';
import { CAR_DOORS_CLOSING, CAR_NOTICES, carAnnouncement, doorSideOf } from './phrases';

/** Door timing from the sim: doors start closing 3 s before the dwell ends. */
const DOOR_CLOSE_BEFORE = 3;
/** "Next stop" this long after pulling out, if the run is long enough to fit both. */
const NEXT_AFTER = 4, NEXT_MIN_RUN = 50;
/** "Arriving soon" this long before the stop. */
const SOON_BEFORE = 24;
const NOTICE_MIN_RUN = 90;

let train: string | null = null, phase = -1;
let fired = { next: false, soon: false, notice: false, closing: false };
let noticeIdx = Math.floor(Math.random() * CAR_NOTICES.length), runs = 0;

const paths = (cs: { key: string }[]) => cs.map((c) => `voice/${c.key}`);

export function tickCarAudio() {
  const t = where.train;
  if (!t || clock.scale !== 1) {
    if (train) hushCar();
    train = null;
    return;
  }
  const s = t.state, p = s.phase;
  const firstSight = train !== t.id;
  if (firstSight || phase !== s.phaseIndex) {
    train = t.id;
    phase = s.phaseIndex;
    fired = { next: false, soon: false, notice: false, closing: false };
    if (p.kind === 'run') runs++;
    if (firstSight && p.kind === 'run') fired.next = s.tau - p.t0 > NEXT_AFTER + 6; // boarded mid-run: skip the late "next"
  }
  const line = t.sim.geom.def;

  if (p.kind === 'run') {
    if (!p.inService || p.toStop < 0) return;
    const len = p.t1 - p.t0, el = s.tau - p.t0, left = p.t1 - s.tau;
    if (!fired.next && el >= NEXT_AFTER && len >= NEXT_MIN_RUN && left > SOON_BEFORE + 8) {
      fired.next = true;
      announce(CAR, 'next', paths(carAnnouncement('next', line, p.dir, p.toStop, doorSideOf(line, p.dir))));
    }
    if (!fired.soon && left <= SOON_BEFORE && el >= 3) {
      fired.soon = true;
      announce(CAR, 'soon', paths(carAnnouncement('soon', line, p.dir, p.toStop, doorSideOf(line, p.dir))));
    }
    if (!fired.notice && runs % 2 === 0 && len >= NOTICE_MIN_RUN && el >= len * 0.45 && left > SOON_BEFORE + 12) {
      fired.notice = true;
      noticeIdx = (noticeIdx + 1) % CAR_NOTICES.length;
      announce(CAR, 'notice', paths(CAR_NOTICES[noticeIdx]));
    }
  } else if (p.doors && p.stop >= 0 && p.role !== 'arrival') {
    if (!fired.closing && s.tau >= p.t1 - DOOR_CLOSE_BEFORE - 2.5) {
      fired.closing = true;
      if (s.tau < p.t1 - DOOR_CLOSE_BEFORE) announce(CAR, 'closing', paths(CAR_DOORS_CLOSING), { priority: true });
    }
  }
}
