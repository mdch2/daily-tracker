import { useState } from 'react';
import { View } from 'react-native';
import { useRouter, usePreventRemove } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BusinessCalendarGate } from '@/features/profile/presentation/business-calendar-gate';
import { Screen, Text } from '@/shared/ui/primitives';
import { IconButton } from '@/shared/ui/icon-button';
import { GoalForm } from './goal-form';

export function CreateGoalScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [locked, setLocked] = useState(false);
  const allowNavigation = usePreventRemove(locked);
  return (
    <BusinessCalendarGate>
      {(context) => (
        <Screen
          header={
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
            >
              <IconButton
                label={t('goals.back')}
                icon="arrow-left"
                disabled={locked}
                onPress={() => router.replace('/(tabs)/goals')}
              />
              <Text
                weight="bold"
                accessibilityRole="header"
                style={{ fontSize: 22, flex: 1 }}
              >
                {t('goals.create')}
              </Text>
            </View>
          }
        >
          <GoalForm
            context={context}
            onLock={setLocked}
            onSaved={(id) => {
              setLocked(false);
              allowNavigation();
              router.replace({ pathname: '/goals/[id]', params: { id } });
            }}
          />
        </Screen>
      )}
    </BusinessCalendarGate>
  );
}
