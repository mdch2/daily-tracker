import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { usePreventRemove } from 'expo-router';
import { useTranslation } from 'react-i18next';

export function useDiscardConfirmation(locked: boolean, dirty: boolean) {
  const { t } = useTranslation();
  return (action: () => void) => {
    if (locked) return;
    if (!dirty) {
      action();
      return;
    }
    if (Platform.OS === 'web') {
      if (
        globalThis.confirm(
          `${t('fields.discardTitle')}\n${t('fields.discardMessage')}`,
        )
      )
        action();
    } else {
      Alert.alert(t('fields.discardTitle'), t('fields.discardMessage'), [
        { text: t('fields.keepEditing'), style: 'cancel' },
        { text: t('fields.discard'), style: 'destructive', onPress: action },
      ]);
    }
  };
}

export function useFormNavigation(locked: boolean, dirty: boolean) {
  const [permission, setPermission] = useState({ dirty, discarded: false });
  if (permission.dirty !== dirty) setPermission({ dirty, discarded: false });
  const discarded = permission.dirty === dirty && permission.discarded;
  const confirmDiscard = useDiscardConfirmation(locked, dirty && !discarded);
  const allowNavigation = usePreventRemove(
    locked || (dirty && !discarded),
    ({ repeat }) => {
      requestLeave(repeat);
    },
  );
  function allow() {
    setPermission({ dirty, discarded: true });
    allowNavigation();
  }
  function requestLeave(action: () => void) {
    if (locked) return;
    if (!dirty || discarded) {
      action();
      return;
    }
    confirmDiscard(() => {
      allow();
      action();
    });
  }
  return { allowNavigation: allow, requestLeave };
}
