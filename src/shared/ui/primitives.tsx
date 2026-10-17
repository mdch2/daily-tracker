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
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors, tokens } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: tokens.minimumTouchTarget,
        borderRadius: tokens.radius.control,
        padding: tokens.spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.action,
        opacity: disabled || pressed ? 0.6 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator
          color={colors.onAction}
          accessibilityLabel="Procesando"
        />
      ) : (
        <Text style={{ color: colors.onAction }}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string | undefined }) {
  const { colors, tokens } = useTheme();
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Text>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
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
  return (
    <Screen>
      <ActivityIndicator accessibilityLabel="Cargando sesión" />
      <Text>Cargando…</Text>
    </Screen>
  );
}
