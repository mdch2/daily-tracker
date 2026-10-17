import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text as NativeText,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { PropsWithChildren } from 'react';
import { useTheme } from '@/shared/theme/use-theme';
import { useTranslation } from 'react-i18next';

export function Text({ style, ...props }: TextProps) {
  const { colors, tokens } = useTheme();
  return (
    <NativeText
      {...props}
      style={[{ color: colors.text, fontSize: tokens.typography.body }, style]}
    />
  );
}

export function Screen({ children }: PropsWithChildren) {
  const { colors, tokens } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            padding: tokens.spacing.lg,
            gap: tokens.spacing.md,
            width: '100%',
            maxWidth: 600,
            alignSelf: 'center',
          }}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  selected,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
}) {
  const { colors, tokens } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
        ...(selected === undefined ? {} : { selected }),
      }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: tokens.minimumTouchTarget,
        borderRadius: tokens.radius.control,
        padding: tokens.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected === false ? colors.surface : colors.action,
        borderColor: colors.border,
        borderWidth: 1,
        opacity: disabled ? 0.6 : pressed ? 0.85 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator
          color={colors.onAction}
          accessibilityLabel={t('common.processing')}
        />
      ) : (
        <Text
          style={{ color: selected === false ? colors.text : colors.onAction }}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | undefined }) {
  const { colors, tokens, mode } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Text>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        keyboardAppearance={mode}
        selectionColor={colors.selection}
        cursorColor={colors.text}
        placeholderTextColor={colors.muted}
        style={{
          color: colors.text,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: error ? colors.error : colors.border,
          borderRadius: tokens.radius.control,
          padding: tokens.spacing.md,
          minHeight: tokens.minimumTouchTarget,
          fontSize: tokens.typography.body,
        }}
      />
      {error ? <ErrorMessage message={error} /> : null}
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.error }}
    >
      {message}
    </Text>
  );
}

export function LoadingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen>
      <ActivityIndicator
        color={colors.action}
        accessibilityLabel={t('common.loadingSession')}
      />
      <Text>{t('common.loading')}</Text>
    </Screen>
  );
}
