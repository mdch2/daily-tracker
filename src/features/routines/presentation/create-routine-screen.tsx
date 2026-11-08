import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import { Screen, Text } from '@/shared/ui/primitives';
import { IconButton } from '@/shared/ui/icon-button';
import { useFormNavigation } from '@/shared/presentation/use-form-navigation';
import { RoutineForm } from './routine-form';

export function CreateRoutineScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const [dirty, setDirty] = useState(false);
  const { allowNavigation, requestLeave } = useFormNavigation(locked, dirty);
  return (
    <BusinessCalendarGate>
      {(context) => (
        <Screen
          header={
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <IconButton
                label={t('routines.back')}
                icon="arrow-left"
                disabled={locked}
                onPress={() =>
                  requestLeave(() => router.replace('/(tabs)/routines'))
                }
              />
              <Text
                weight="bold"
                accessibilityRole="header"
                style={{ fontSize: 22, flex: 1 }}
              >
                {t('routines.create')}
              </Text>
            </View>
          }
        >
          <RoutineForm
            context={context}
            onLock={setLocked}
            onDirtyChange={setDirty}
            onSaved={(id) => {
              setLocked(false);
              allowNavigation();
              router.replace({ pathname: '/routines/[id]', params: { id } });
            }}
          />
        </Screen>
      )}
    </BusinessCalendarGate>
  );
}
