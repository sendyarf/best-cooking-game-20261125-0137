// Ember & Thyme — entrypoint: copies game/ and screenshots/ into the output
// directory and writes dossier.json with buildDossier from the kit's
// vendor/makefun-game.ts. Node 22, standard library only, no network, and
// fully deterministic: two runs write byte-identical output.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The repository root is the directory holding this file.
const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameSrc = join(repoRoot, 'game');
const shotsSrc = join(repoRoot, 'screenshots');
const gameDst = join(outDir, 'game');
const shotsDst = join(outDir, 'screenshots');

// Start from a clean slate so a stale file can never leak into a re-run.
mkdirSync(outDir, { recursive: true });
for (const target of [gameDst, shotsDst, join(outDir, 'dossier.json')]) {
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(gameSrc, gameDst, { recursive: true });
cpSync(shotsSrc, shotsDst, { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
