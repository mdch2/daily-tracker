import { spawnSync } from 'node:child_process';
import { writeFileSync, renameSync, rmSync } from 'node:fs';

const target = new URL(
  '../src/infrastructure/supabase/database.types.ts',
  import.meta.url,
);
const temporary = new URL(
  '../src/infrastructure/supabase/database.types.ts.tmp',
  import.meta.url,
);
const result = spawnSync(
  'supabase',
  ['gen', 'types', 'typescript', '--local', '--schema', 'public'],
  { encoding: 'utf8', shell: false },
);
if (
  result.error ||
  result.status !== 0 ||
  !result.stdout.includes('export type Database')
) {
  process.stderr.write(
    'No se generaron tipos. Inicia Supabase local y aplica las migraciones. El archivo anterior se conserva.\n',
  );
  process.exit(1);
}
try {
  writeFileSync(temporary, result.stdout);
  renameSync(temporary, target);
} finally {
  rmSync(temporary, { force: true });
}
