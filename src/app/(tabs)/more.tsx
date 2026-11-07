import { PreferencesScreen } from '@/shared/preferences/preferences-screen';
import { SignOutButton } from '@/features/auth/presentation/sign-out-button';

export default function MoreScreen() {
  return (
    <PreferencesScreen>
      <SignOutButton />
    </PreferencesScreen>
  );
}
