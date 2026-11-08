import { PreferencesScreen } from '@/shared/preferences/preferences-screen';
import { SignOutButton } from '@/features/auth/presentation/sign-out-button';
import { ReminderStatus } from '@/features/reminders/presentation/reminder-control';

export default function MoreScreen() {
  return (
    <PreferencesScreen>
      <ReminderStatus />
      <SignOutButton />
    </PreferencesScreen>
  );
}
