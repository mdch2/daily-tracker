import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useState,
  type ComponentRef,
  type PropsWithChildren,
  type Ref,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { Icon, type IconName } from './icon';

export function Text({
  style,
  weight = 'regular',
  ...props
}: TextProps & {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const { colors, tokens } = useTheme();
  const fontSize =
    StyleSheet.flatten(style)?.fontSize ?? tokens.typography.body;
  return (
    <NativeText
      {...props}
      style={[
        {
          color: colors.text,
          fontSize,
          lineHeight: Math.round(fontSize * 1.5),
          fontFamily: tokens.fontFamily[weight],
        },
        style,
      ]}
    />
  );
}

export function Screen({
  children,
  contentStyle,
}: PropsWithChildren<{ contentStyle?: StyleProp<ViewStyle> }>) {
  const { colors, tokens } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            {
              flexGrow: 1,
              padding: tokens.spacing.lg,
              gap: tokens.spacing.md,
              width: '100%',
              maxWidth: 520,
              alignSelf: 'center',
            },
            contentStyle,
          ]}
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
  variant = 'primary',
  icon,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  selected?: boolean;
  variant?: 'primary' | 'secondary';
  icon?: IconName;
}) {
  const { colors, tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  const primary = selected !== false && variant === 'primary';
  const foreground = primary ? colors.onAction : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
        ...(selected === undefined ? {} : { selected }),
      }}
      disabled={disabled || loading}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        minHeight: 56,
        borderRadius: tokens.radius.control,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: 14,
        flexDirection: 'row',
        gap: tokens.spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary
          ? pressed
            ? colors.actionPressed
            : colors.action
          : colors.elevated,
        borderColor: focused
          ? colors.link
          : primary
            ? colors.action
            : colors.border,
        borderWidth: 2,
        opacity: disabled ? 0.55 : pressed && !primary ? 0.75 : 1,
      })}
    >
      {loading && <ActivityIndicator color={foreground} accessible={false} />}
      <Text
        weight="bold"
        style={{ color: foreground, textAlign: 'center', flexShrink: 1 }}
      >
        {title}
      </Text>
      {icon && !loading && <Icon name={icon} size={20} color={foreground} />}
    </Pressable>
  );
}

export function Input({
  label,
  error,
  hint,
  icon,
  secureTextEntry,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & {
  ref?: Ref<ComponentRef<typeof TextInput>>;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  icon?: IconName;
}) {
  const { colors, tokens, mode } = useTheme();
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Text weight="semibold" style={{ fontSize: 14, lineHeight: 20 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          paddingLeft: tokens.spacing.md,
          paddingRight: secureTextEntry ? tokens.spacing.xs : tokens.spacing.md,
          borderWidth: 1.5,
          borderColor: error
            ? colors.error
            : focused
              ? colors.link
              : colors.fieldBorder,
          borderRadius: tokens.radius.control,
          backgroundColor: colors.field,
        }}
      >
        {icon && (
          <Icon
            name={icon}
            size={19}
            color={focused ? colors.link : colors.muted}
          />
        )}
        <TextInput
          {...props}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint ?? props.accessibilityHint}
          keyboardAppearance={mode}
          secureTextEntry={!!secureTextEntry && !visible}
          selectionColor={colors.selection}
          cursorColor={colors.link}
          underlineColorAndroid={colors.field}
          placeholderTextColor={colors.muted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          style={[
            {
              flex: 1,
              minWidth: 0,
              minHeight: 54,
              paddingVertical: 14,
              color: colors.text,
              fontFamily: tokens.fontFamily.regular,
              fontSize: tokens.typography.body,
            },
            style,
          ]}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(
              visible ? 'auth.hidePassword' : 'auth.showPassword',
            )}
            accessibilityState={{ disabled: props.editable === false }}
            disabled={props.editable === false}
            onPress={() => setVisible((value) => !value)}
            style={({ pressed }) => ({
              minWidth: tokens.minimumTouchTarget,
              minHeight: tokens.minimumTouchTarget,
              borderRadius: tokens.radius.control,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: pressed ? colors.elevated : colors.field,
            })}
          >
            <Icon name={visible ? 'eye-off' : 'eye'} />
          </Pressable>
        )}
      </View>
      {error ? (
        <ErrorMessage message={error} />
      ) : hint ? (
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.muted }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.error, fontSize: 14, lineHeight: 22 }}
    >
      {message}
    </Text>
  );
}

export function LoadingScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Screen contentStyle={{ justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator
        color={colors.link}
        accessibilityLabel={t('common.loadingSession')}
      />
      <Text>{t('common.loading')}</Text>
    </Screen>
  );
}
