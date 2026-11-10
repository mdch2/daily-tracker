# Daily Tracker

Mobile MVP foundation for iOS and Android. The name is provisional; no final commercial brand identity has been established.

This release includes navigation, authentication, profiles, habit recording, [routines](docs/architecture/routines.md) and [personal goals](docs/architecture/goals-v1.md). Habits support binary/quantity recording, three frequencies, explicit account calendar and seven-day corrections. Routine steps combine their own records and linked habits, with today's-only routine recording and preserved history. Names can be edited immediately; habit frequency/goals and routine structure take effect next account week. Full calendar/statistics, journaling, pauses and streaks remain deferred. See [habit contracts](docs/architecture/habits.md).

The functional definitions of routines and personal goals are approved in [ADR-008](docs/architecture/adr/008-routines-personal-goals.md). Routines follow [ADR-009](docs/architecture/adr/009-routines-v1.md). Personal goals track quantities or equally weighted milestones, with manual or habit-linked progress chosen per goal, according to [ADR-010](docs/architecture/adr/010-personal-goals-v1.md). Each goal can include an optional personal reward, editable while unarchived and highlighted when achieved.

The five-tab navigation includes Today, Habits, Routines, Goals and More. Goals support seven-day manual quantity corrections, lifetime manual milestone corrections while unarchived, history, editing and archive. Descriptions and rewards each allow up to 400 Unicode characters. The [goal service contract](docs/architecture/goals-service-contract.md) documents reads, writes and recovery. Backend changes live in their own repository. The [usability audit](docs/design/usability-audit.md) and [ADR-013](docs/architecture/adr/013-form-controls-and-goal-rewards.md) describe native date/time controls, searchable selections and reward compatibility. Original visual exports remain unchanged.

Rebuild the development client after installing the native picker dependency. Android must compile the patched `@expo/ui` sources to respect the app's selected language in calendar/clock dialogs; Expo Go cannot incorporate this native patch. Deploy the compatible backend before distributing a client that uses goal RPC v2. This task only migrates the local database.

## Requirements

Local reminders for habits and routines are available from their detail screens using Expo Notifications. Each device can store up to eight optional schedules with a time and selected weekdays. Reminders follow the phone's local time; open the app after changing time zones. They continue after completing an activity and are removed on sign-out. Widgets and push notifications remain deferred. See [ADR-012](docs/architecture/adr/012-local-reminders-v1.md) for persistence, recovery and native validation limits.

Home also shows up to three goals in progress or overdue, prioritizing overdue goals, with confirmed cumulative progress and links to details or the full goals list. This progress does not change with the day selected for habits and routines.

- **Minimum Android version:** **Android 11 (API 30)**. The native configuration uses `minSdkVersion: 30`, `compileSdkVersion: 37`, and `targetSdkVersion: 36` through `expo-build-properties`. See [Android compatibility](docs/architecture/android-compatibility.md).
- Node.js 22.14.0 (`.nvmrc`) and pnpm 10.28.2 (`packageManager`).
- Expo Go compatible with SDK 58 to run the foundation; a development build is required to validate email callbacks using the `dailytracker` URL scheme.
- Access to a Supabase backend service; server tooling belongs to the independent backend repository.
- The iOS simulator requires macOS and Xcode. On Windows, you can generate the bundle and use a physical iOS device.

## Getting Started

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm start
```

Without valid environment variables, the application displays "Configuration pending". No credentials are fabricated, and no mock backend is queried.

Complete `.env` with your Supabase project's URL and **publishable key** (`sb_publishable_`). Never use `service_role` or `sb_secret_` keys. Restart Expo after changing environment variables.

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

These variables are public and bundled into the application. Row Level Security (RLS) and PostgreSQL privileges control data access.

The legacy `anon` JWT key format is not enabled in this foundation. Use the new publishable key instead.

```powershell
pnpm android
pnpm ios
```

Authentication currently provides a provisional technical flow: registration, email confirmation, sign-in, local sign-out, and account recovery.

The MVP requires an account to access personal tracking features and does not include guest mode. See [ADR-005](docs/architecture/adr/005-mvp-account-required.md). The final onboarding design remains pending.

## Web y Vercel

`pnpm web` inicia web; `pnpm build:web` exporta la SPA a `dist`; `pnpm serve:web` permite revisar esa compilación. `vercel.json` configura instalación reproducible, compilación y rutas profundas. Véase [ADR-014](docs/architecture/adr/014-web-storage-and-hosting.md).

En Vercel importa `mdch2/daily-tracker`, selecciona el directorio raíz y configura `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los valores del proyecto Supabase de nube antes de compilar. No subir `.env` ni claves secretas. `.env.local` tiene prioridad sobre `.env` localmente; no se copia automáticamente a Vercel. Cada cambio de variables necesita una nueva compilación/despliegue.

En Supabase Auth / URL Configuration autoriza el callback exacto `https://<dominio-vercel>/callback` y su variante `?mode=recovery`, además de los callbacks nativos ya existentes. Para desarrollo añade `http://localhost:8081/callback` y la variante de recuperación. Usa dominios de preview específicos si también se prueban correos allí; evita una autorización global de vercel.app. Este cambio remoto no lo realiza la compilación del cliente.

Web conserva idioma/tema en localStorage y sesión en sessionStorage. Para confirmar correo o recuperar contraseña, abre el enlace en la misma pestaña que inició la solicitud (copia el enlace del correo). Cerrar la pestaña termina la persistencia local; el backend determina la validez del token. Los recordatorios locales siguen disponibles en Android/iOS.

Publicar en Vercel aloja el cliente web y usa Supabase remoto; no traslada ni reinicia su base de datos. Valida acceso con tu cuenta, recarga/cierre de sesión y correo antes de distribuir la URL.

## Backend

The independent [mdch2/daily-tracker-supabase](https://github.com/mdch2/daily-tracker-supabase) repository exclusively owns PostgreSQL, migrations, RLS, SQL, triggers, seeds, Edge Functions, tests and Supabase infrastructure. Read its instructions before changing backend contracts. This mobile repository only consumes the services.

Generate types **in the backend repository** with its pnpm db:types command. Then, in this mobile checkout:

```powershell
pnpm db:types
# Or supply the generated artifact explicitly:
pnpm db:types C:\path\to\daily-tracker-supabase\types\database.types.ts
```

The mobile command only imports the generated artifact; it does not run Supabase CLI or manage PostgreSQL. It preserves the previous file if the artifact is unavailable.
The current artifact is generated from the local backend PostgreSQL schema and imported without manual edits. Earlier manual-snapshot limitations remain documented as historical evidence.

For the Android emulator, use http://10.0.2.2:15421 for a local service. For iOS simulator, use http://127.0.0.1:15421. Physical devices require accessible HTTPS.
Android's `127.0.0.1` points to the emulator itself. If you keep that URL, run `adb reverse tcp:15421 tcp:15421` after connecting the device; Metro's port forwarding only covers its own port. Restart Expo and reload the app after changing `.env`.
After editing the backend Auth configuration, run `pnpm db:restart` in the backend checkout to apply it while preserving local data. Its `pnpm db:test:auth` verifies registration, confirmation email and S256 PKCE against the local services with disposable synthetic data. A database reset is unnecessary for Auth configuration changes.
Backend Email, SMTP and redirect configuration belongs to the backend repository. The client uses dailytracker://callback and dailytracker://callback?mode=recovery; PKCE links must open on the device that initiated the request, using a development build.
See [repository boundaries](docs/architecture/repository-boundaries.md) and [client integration](docs/architecture/supabase.md).

## Mandatory languages and themes

Spanish (es) and English (en), with English fallback, device detection, manual/system selection and persistent preferences are mandatory.
Light, Dark and System modes share semantic tokens and persist independently of login.
Temporary controls are available before sign-in, in the dashboard and without backend credentials. They do not define a final settings design.

All visible and accessible text belongs in the centralized translation catalogs. All component colors must use equivalent semantic tokens.
See [localization and themes](docs/architecture/localization-and-themes.md) and [ADR-004](docs/architecture/adr/004-permanent-foundations.md).

## Quality Assurance

```powershell
pnpm check
pnpm format
pnpm test:watch
pnpm exec expo install --check --pnpm
pnpm exec expo export --platform android --platform ios --output-dir dist
pnpm audit
```

`check` runs repository boundary checks, linting with zero warnings, formatting checks, TypeScript validation, and Jest tests. SQL tests run exclusively in the backend repository.

The compatibility check excludes Jest 30 and its type definitions from Expo's conservative recommendation (Jest 29). However, `jest-expo` 58 declares support for both versions, and its watch plugin requires Jest 30. See ADR-001.

JavaScript bundles are not substitutes for native builds or testing on physical devices.

Validation results and known blockers for this release are documented in [validation.md](docs/architecture/validation.md).

## Project Structure

```text
src/
  app/                 # Expo Router routes: auth, callback, recovery, protected home
  bootstrap/           # Client, repository, and provider composition
  features/
    auth/              # Domain, application, infrastructure, presentation
    profile/           # Contract, adapter, and context consumed by dashboard
    habits/            # Habit rules, recording actions, Supabase adapter and screens
    routines/          # Own/linked steps, dated definitions, recording, history and archive
    dashboard/         # Stitch home, account week and confirmed daily habit overview
  infrastructure/
    supabase/          # Client, SecureStore, and database types
  shared/
    config/            # Public configuration validation
    theme/             # Semantic tokens and Light/Dark/System resolution
    i18n/              # Typed es/en catalogs and localized formatters
    preferences/       # Persistent device language/theme preferences
    ui/                # Minimal shared UI components
scripts/               # Backend type artifact import and boundary checks
tests/                 # Validation, actions, forms, and encrypted session tests
docs/architecture/     # Architecture, ADRs, data, security, and validation
.agents/skills/        # Specialized Codex workflows
```

Module directories and architectural layers are not created without an actual implementation. Future modules will follow these boundaries as they are introduced.

## Documentation and Development Instructions

- [Architecture and Data Flow](docs/architecture/README.md).
- [Current and Preliminary Data Model](docs/architecture/data-model.md).
- [Supabase and Security](docs/architecture/supabase.md).
- [Testing](docs/architecture/testing.md).
- [Pending Decisions](docs/decisiones-pendientes.md).
- [ADR-001: Technology Stack and Structure](docs/architecture/adr/001-mobile-foundation.md).
- [ADR-002: Sessions and Authorization](docs/architecture/adr/002-auth-security.md).
- [ADR-003: Persistence and Future Offline Support](docs/architecture/adr/003-persistence.md).
- [AGENTS.md](AGENTS.md) and [Codex Skills Evaluation](docs/architecture/codex-skills.md).
