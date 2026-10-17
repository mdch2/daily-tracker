# Daily Tracker

Mobile MVP foundation for iOS and Android. The name is provisional; no final commercial brand identity has been established.

This release establishes navigation, authentication, and the technical profile foundation. It does not implement habits, routines, goals, calendar, statistics, or journaling.

## Requirements

- **Minimum Android version:** **Android 11 (API 30)**. The native configuration uses `minSdkVersion: 30`, `compileSdkVersion: 37`, and `targetSdkVersion: 36` through `expo-build-properties`. See [Android compatibility](docs/architecture/android-compatibility.md).
- Node.js 22.14.0 (`.nvmrc`) and pnpm 10.28.2 (`packageManager`).
- Expo Go compatible with SDK 58 to run the foundation; a development build is required to validate email callbacks using the `dailytracker` URL scheme.
- Supabase CLI 2.75.0 or a compatible version, and Docker Desktop with a Linux container engine for the local backend.
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

The final anonymous access policy remains undecided.

## Backend

```powershell
pnpm db:start
pnpm db:reset
pnpm db:test
pnpm db:types
```

`db:reset` deletes data from the project's **local** instance. Use it only with disposable data.

`db:types` generates types from PostgreSQL and preserves the previous file if generation fails. The initial snapshot is marked as manually generated if Docker prevents automatic generation.

The only applied table is `profiles`. The other five entities have a documented preliminary design, without premature migrations.

For the Android emulator, the local URL is [http://10.0.2.2:54321](http://10.0.2.2:54321). For the iOS simulator, use [http://127.0.0.1:54321](http://127.0.0.1:54321). A physical device must use an accessible HTTPS endpoint; remote HTTP access has not been enabled.

Obtain the publishable key from the local backend without copying privileged keys into the client application.

For a hosted project, configure the Email provider, email confirmation, a minimum password length of 12 characters, and the allowed redirect URLs `dailytracker://callback` and `dailytracker://callback?mode=recovery`.

No remote project has been created or linked, and no SQL has been applied remotely.

Before using a hosted project, review and apply the version-controlled migration through your deployment process. See [Supabase](docs/architecture/supabase.md).

PKCE links must open on the device that initiated the request. They require a development build with the registered URL scheme, not Expo Go alone.

Production SMTP configuration, application package identifiers, app store accounts, and EAS setup are deferred to a future release.

## Quality Assurance

```powershell
pnpm check
pnpm format
pnpm test:watch
pnpm exec expo install --check --pnpm
pnpm exec expo export --platform android --platform ios --output-dir dist
pnpm audit
```

`check` runs linting with zero warnings, formatting checks, TypeScript validation, and Jest tests. SQL tests run separately through `db:test`.

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
    dashboard/         # Initial technical screen
  infrastructure/
    supabase/          # Client, SecureStore, and database types
  shared/
    config/            # Public configuration validation
    theme/             # Provisional tokens, themes, and Zustand preferences
    ui/                # Minimal shared UI components
supabase/
  migrations/          # Version-controlled SQL: profile, trigger, permissions, RLS
  tests/database/      # Authorization integration tests using pgTAP
  config.toml
  seed.sql             # Empty for privacy; transactional fixtures in tests
scripts/               # Atomic type generation
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
