// Bakes sound effects (jingles, melodies, train, footsteps) with ElevenLabs into
// public/audio/sfx/. Only effects whose prompt changed (or that are missing) are generated.
//   npm run sfx             generate
//   npm run sfx -- --dry    list what would be generated
//   npm run sfx -- step-3   regenerate just these names

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SFX, type Sfx } from '../src/audio/sfx';

const OUT = join(process.cwd(), 'public', 'audio', 'sfx');
const MANIFEST = join(OUT, 'manifest.json');
const args = process.argv.slice(2);
const dry = args.includes('--dry');
const only = args.filter((a) => !a.startsWith('--'));

try {
  process.loadEnvFile('.env.local');
} catch {
  /* fall back to the real environment */
}
const key = process.env.ELEVENLABS_API_KEY;

type Manifest = Record<string, { prompt: string; seconds: number; loop: boolean }>;
const manifest: Manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
const same = (s: Sfx) => {
  const m = manifest[s.name];
  return m && m.prompt === s.prompt && m.seconds === s.seconds && m.loop === !!s.loop && existsSync(join(OUT, `${s.name}.mp3`));
};

const todo = only.length ? SFX.filter((s) => only.includes(s.name)) : SFX.filter((s) => !same(s));
console.log(`${SFX.length} effects, ${todo.length} to generate, ${todo.reduce((n, s) => n + s.seconds, 0)} s of audio.`);
if (dry) {
  for (const s of todo) console.log(`${s.name} (${s.seconds}s)  ${s.prompt}`);
  process.exit(0);
}
if (!key) {
  console.error('Set ELEVENLABS_API_KEY in .env.local');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
let done = 0;
for (const s of todo) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: s.prompt, duration_seconds: s.seconds, prompt_influence: 0.6, ...(s.loop ? { loop: true } : {}) }),
  });
  if (!res.ok) {
    console.error(`Failed on ${s.name}: ${res.status} ${await res.text()}`);
    break;
  }
  writeFileSync(join(OUT, `${s.name}.mp3`), Buffer.from(await res.arrayBuffer()));
  manifest[s.name] = { prompt: s.prompt, seconds: s.seconds, loop: !!s.loop };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`${++done}/${todo.length}  ${s.name}`);
}
