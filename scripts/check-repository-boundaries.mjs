import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const skipped = new Set([
  '.git',
  'node_modules',
  '.expo',
  'dist',
  'coverage',
  'android',
  'ios',
  '.cache',
  '.tmp',
]);
const backendDirectories = new Set([
  'supabase',
  '.supabase',
  'migrations',
  'seeds',
  'snippets',
  'edge-functions',
]);
const violations = [];
function inspect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (skipped.has(entry.name) || entry.isSymbolicLink()) continue;
    const path = join(directory, entry.name);
    const name = relative(root, path).replaceAll('\\', '/');
    if (entry.isDirectory()) {
      // src/infrastructure/supabase contains client adapters, never backend infrastructure.
      if (
        backendDirectories.has(entry.name) &&
        name !== 'src/infrastructure/supabase'
      )
        violations.push(name);
      else inspect(path);
    } else if (entry.name.endsWith('.sql')) violations.push(name);
  }
}
inspect(root);
if (violations.length) {
  process.stderr.write(
    'Backend artifacts belong in mdch2/daily-tracker-supabase:\n' +
      violations.join('\n') +
      '\n',
  );
  process.exitCode = 1;
} else process.stdout.write('Repository boundaries verified.\n');
