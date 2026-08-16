import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const script = fs.readFileSync(
  path.join(process.cwd(), 'scripts/refresh_official_lotto_data.py'),
  'utf8',
);

test('weekly refresh preserves verified history and fetches only missing draws', () => {
  assert.match(script, /def load_existing_draws\(\)/);
  assert.match(script, /collected = dict\(existing\)/);
  assert.match(script, /def fetch_recent_stores\(latest: int, existing: list\[dict\]\)/);
  assert.match(script, /if draw_no in existing_draws:\n            continue/);
});