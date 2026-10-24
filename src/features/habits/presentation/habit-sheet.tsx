import {
  useEffect,
  useRef,
  type ComponentRef,
  type PropsWithChildren,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { Text } from '@/shared/ui/primitives';
import { HabitIconButton } from './habit-list-card';

export function HabitSheet({
  title,
  locked,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  locked: boolean;
  onClose: () => void;
}>) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const headingRef = useRef<ComponentRef<typeof View>>(null);
  const close = () => {
    if (!locked) onClose();
  };
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);
  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={close}
      onShow={() => {
        if (Platform.OS === 'web') headingRef.current?.focus();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: colors.scrim,
          paddingTop: insets.top + tokens.spacing.md,
        }}
      >
        <View
          accessibilityViewIsModal
          onAccessibilityEscape={close}
          style={{
            maxHeight: '92%',
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            padding: tokens.spacing.lg,
            paddingBottom: Math.max(insets.bottom, tokens.spacing.lg),
            backgroundColor: colors.surface,
            borderTopLeftRadius: tokens.radius.card,
            borderTopRightRadius: tokens.radius.card,
            gap: tokens.spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              gap: tokens.spacing.sm,
              alignItems: 'center',
            }}
          >
            <View ref={headingRef} focusable style={{ flex: 1 }}>
              <Text
                accessibilityRole="header"
                weight="bold"
                style={{ fontSize: 20 }}
              >
                {title}
              </Text>
            </View>
            <HabitIconButton
              label={t('common.close')}
              icon="x"
              disabled={locked}
              onPress={close}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: tokens.spacing.md }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
