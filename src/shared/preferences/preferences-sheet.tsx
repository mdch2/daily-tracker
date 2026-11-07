import { useEffect, useRef, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { Text } from '@/shared/ui/primitives';
import { Icon } from '@/shared/ui/icon';
import { PreferencesControls } from './preferences-controls';

export function PreferencesSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const closeRef = useRef<ComponentRef<typeof View>>(null);
  useEffect(() => {
    if (visible)
      AccessibilityInfo.announceForAccessibility(t('preferences.title'));
  }, [visible, t]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        if (Platform.OS === 'web') closeRef.current?.focus();
      }}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.scrim,
          justifyContent: 'flex-end',
          paddingTop: insets.top + tokens.spacing.lg,
        }}
      >
        <Pressable accessible={false} onPress={onClose} style={{ flex: 1 }} />
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={onClose}
          style={{
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            maxHeight: '90%',
            backgroundColor: colors.surface,
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            padding: tokens.spacing.lg,
            paddingBottom: Math.max(insets.bottom, tokens.spacing.lg),
            gap: tokens.spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.spacing.sm,
            }}
          >
            <Text style={{ color: colors.muted, flex: 1, fontSize: 14 }}>
              {t('preferences.subtitle')}
            </Text>
            <Pressable
              ref={closeRef}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
              style={({ pressed }) => ({
                minWidth: 48,
                minHeight: 48,
                borderRadius: tokens.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: pressed ? colors.selection : colors.elevated,
              })}
            >
              <Icon name="x" color={colors.text} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: tokens.spacing.sm }}
          >
            <PreferencesControls />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
