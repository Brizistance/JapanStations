// Bakes platform announcements with ElevenLabs into public/audio/voice/. Offline only:
// the API key stays in .env.local and never reaches the game bundle.
//   npm run voice            generate missing clips
//   npm run voice -- --dry   list what would be generated, no API calls

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { allClips, type Clip } from '../src/audio/phrases';

const OUT = join(process.cwd(), 'public', 'audio', 'voice');
const MANIFEST = join(OUT, 'manifest.json');
const MODEL = 'eleven_multilingual_v2';
const dry = process.argv.includes('--dry');

try {
  process.loadEnvFile('.env.local');
} catch {
  /* fall back to the real environment */
}
const key = process.env.ELEVENLABS_API_KEY;
const voices = { F: process.env.ELEVENLABS_VOICE_F, M: process.env.ELEVENLABS_VOICE_M, C: process.env.ELEVENLABS_VOICE_CAR };

type Manifest = Record<string, { voice: string; text: string }>;
const manifest: Manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

const clips = allClips();
// Drop clips the wording no longer uses.
const keep = new Set(clips.map((c) => c.key));
let pruned = 0;
for (const k of Object.keys(manifest)) {
  if (keep.has(k)) continue;
  if (!dry) rmSync(join(OUT, `${k}.mp3`), { force: true });
  delete manifest[k];
  pruned++;
}
if (pruned && !dry) writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
if (pruned) console.log(`${pruned} unused clips ${dry ? 'would be' : ''} removed.`);
const todo = clips.filter((c) => !manifest[c.key] || !existsSync(join(OUT, `${c.key}.mp3`)));
const chars = todo.reduce((n, c) => n + c.text.length, 0);
console.log(`${clips.length} clips, ${todo.length} to generate, ${chars} characters.`);

if (dry) {
  for (const c of todo) console.log(`${c.key}  ${c.text}`);
  process.exit(0);
}
if (!key || !voices.F || !voices.M || !voices.C) {
  console.error('Set ELEVENLABS_API_KEY, ELEVENLABS_VOICE_F, ELEVENLABS_VOICE_M and ELEVENLABS_VOICE_CAR in .env.local');
  process.exit(1);
}

async function tts(c: Clip): Promise<Buffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voices[c.voice]}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': key!, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: c.text,
      model_id: MODEL,
      // Steady, announcer-like delivery.
      voice_settings: { stability: 0.75, similarity_boost: 0.8, style: 0, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

mkdirSync(OUT, { recursive: true });
let done = 0;
for (const c of todo) {
  try {
    writeFileSync(join(OUT, `${c.key}.mp3`), await tts(c));
  } catch (e) {
    console.error(`Failed on ${c.key} "${c.text}": ${(e as Error).message}`);
    break;
  }
  manifest[c.key] = { voice: c.voice, text: c.text };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
  console.log(`${++done}/${todo.length}  ${c.text}`);
}
