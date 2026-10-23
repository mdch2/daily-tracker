import { z } from 'zod';
import { useRef, useState, type ComponentRef } from 'react';
import { Keyboard, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { RouteLink as Link } from '@/shared/ui/route-link';
import { Button, ErrorMessage, Input, Text } from '@/shared/ui/primitives';
import { Icon } from '@/shared/ui/icon';
import { validationMessage } from '@/shared/i18n/validation-message';
import { useTheme } from '@/shared/theme/use-theme';
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
  type AuthFormValues,
} from '../application/auth-validation';
import { useAuth } from './auth-provider';
import { AuthFrame } from './auth-frame';
import { AuthError, type AuthErrorCode } from '../domain/auth-error';

const errorMessages = {
  network: 'errors.authNetwork',
  passwordPolicy: 'errors.passwordPolicy',
  rateLimit: 'errors.authRateLimit',
  operation: 'errors.operation',
} as const;

type Mode = 'sign-in' | 'sign-up' | 'reset-password' | 'update-password';
const content = {
  'sign-in': {
    action: 'auth.signIn',
    title: 'auth.welcomeTitle',
    description: 'auth.welcomeDescription',
    eyebrow: 'auth.welcomeEyebrow',
  },
  'sign-up': {
    action: 'auth.signUp',
    title: 'auth.createTitle',
    description: 'auth.createDescription',
    eyebrow: 'auth.createEyebrow',
  },
  'reset-password': {
    action: 'auth.resetPassword',
    title: 'auth.resetTitle',
    description: 'auth.resetDescription',
    eyebrow: 'auth.resetEyebrow',
  },
  'update-password': {
    action: 'auth.updatePassword',
    title: 'auth.updateTitle',
    description: 'auth.updateDescription',
    eyebrow: 'auth.resetEyebrow',
  },
} as const;

export function AuthScreen({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const { actions, finishRecovery } = useAuth();
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [notice, setNotice] = useState<
    'auth.confirmEmail' | 'auth.resetSent' | null
  >(null);
  const passwordRef = useRef<ComponentRef<typeof TextInput>>(null);
  const submittingRef = useRef(false);
  const schema =
    mode === 'sign-up'
      ? signUpSchema
      : mode === 'reset-password'
        ? emailSchema.extend({ password: z.string() })
        : mode === 'update-password'
          ? passwordSchema.extend({ email: z.string() })
          : signInSchema;
  const {
    control,
    handleSubmit,
    getValues,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const submit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      await handleSubmit(
        async (values) => {
          Keyboard.dismiss();
          setError(null);
          setNotice(null);
          try {
            if (mode === 'sign-in') await actions.signIn(values);
            if (mode === 'sign-up') {
              const result = await actions.signUp(values);
              if (result.confirmationRequired) setNotice('auth.confirmEmail');
            }
            if (mode === 'reset-password') {
              await actions.requestPasswordReset(values);
              setNotice('auth.resetSent');
            }
            if (mode === 'update-password') {
              await actions.updatePassword(values);
              finishRecovery();
            }
          } catch (failure) {
            setError(failure instanceof AuthError ? failure.code : 'operation');
          }
        },
        (invalid) => {
          setFocus(invalid.email ? 'email' : 'password');
        },
      )();
    } finally {
      submittingRef.current = false;
    }
  };
  const strings = content[mode];
  const isNewPassword = mode === 'sign-up' || mode === 'update-password';
  return (
    <AuthFrame
      title={t(notice ? 'auth.checkEmailTitle' : strings.title)}
      description={t(
        notice ? 'auth.checkEmailDescription' : strings.description,
      )}
      eyebrow={t(notice ? 'auth.checkEmailEyebrow' : strings.eyebrow)}
      {...(notice || mode === 'reset-password'
        ? { illustration: 'mail' as const }
        : mode === 'update-password'
          ? { illustration: 'lock' as const }
          : {})}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: tokens.radius.card,
          padding: 20,
          gap: tokens.spacing.md,
        }}
      >
        {notice ? (
          <>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: colors.successSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="check" size={24} color={colors.success} />
            </View>
            <Text accessibilityLiveRegion="polite">{t(notice)}</Text>
            <Text weight="semibold" style={{ color: colors.link }}>
              {getValues('email').trim()}
            </Text>
            <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 22 }}>
              {t('auth.emailDeliveryHint')}
            </Text>
            <Button
              variant="secondary"
              title={t('auth.useAnotherEmail')}
              icon="edit-2"
              onPress={() => {
                setNotice(null);
              }}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 20 }}>
              {mode !== 'update-password' && (
                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <Input
                      ref={ref}
                      label={t('auth.email')}
                      icon="mail"
                      placeholder={t('auth.emailPlaceholder')}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={validationMessage(errors.email?.message, t)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      textContentType="emailAddress"
                      importantForAutofill="yes"
                      maxLength={254}
                      returnKeyType={
                        mode === 'reset-password' ? 'send' : 'next'
                      }
                      submitBehavior={
                        mode === 'reset-password' ? 'blurAndSubmit' : 'submit'
                      }
                      onSubmitEditing={() => {
                        if (mode === 'reset-password') void submit();
                        else passwordRef.current?.focus();
                      }}
                      editable={!isSubmitting}
                    />
                  )}
                />
              )}
              {mode !== 'reset-password' && (
                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value, ref } }) => (
                    <Input
                      ref={(input) => {
                        ref(input);
                        passwordRef.current = input;
                      }}
                      label={t(
                        isNewPassword ? 'auth.newPassword' : 'auth.password',
                      )}
                      icon="lock"
                      placeholder={t('auth.passwordPlaceholder')}
                      hint={isNewPassword ? t('auth.passwordHint') : undefined}
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      error={validationMessage(errors.password?.message, t)}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete={
                        mode === 'sign-in' ? 'current-password' : 'new-password'
                      }
                      textContentType={
                        mode === 'sign-in' ? 'password' : 'newPassword'
                      }
                      importantForAutofill="yes"
                      maxLength={128}
                      returnKeyType="go"
                      onSubmitEditing={() => {
                        void submit();
                      }}
                      editable={!isSubmitting}
                    />
                  )}
                />
              )}
            </View>
            {mode === 'sign-in' && (
              <Link href="/reset-password" disabled={isSubmitting}>
                {t('auth.recoverLink')}
              </Link>
            )}
            {error && (
              <View
                style={{
                  borderRadius: 12,
                  backgroundColor: colors.errorSurface,
                  padding: tokens.spacing.md,
                  gap: tokens.spacing.sm,
                }}
              >
                <Icon name="alert-circle" color={colors.error} size={20} />
                <ErrorMessage message={t(errorMessages[error])} />
              </View>
            )}
            <Button
              title={t(strings.action)}
              loading={isSubmitting}
              icon="arrow-right"
              onPress={() => {
                void submit();
              }}
            />
            {isNewPassword && (
              <Text
                style={{
                  color: colors.muted,
                  textAlign: 'center',
                  fontSize: 14,
                  lineHeight: 22,
                }}
              >
                {t('auth.passwordPrivacy')}
              </Text>
            )}
          </>
        )}
      </View>
      <View
        style={{
          paddingTop: tokens.spacing.md,
          gap: tokens.spacing.sm,
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {mode === 'sign-in' ? (
          <>
            <Text style={{ color: colors.muted, fontSize: 14 }}>
              {t('auth.noAccount')}
            </Text>
            <Link href="/sign-up" disabled={isSubmitting} centered>
              {t('auth.signUp')}
            </Link>
          </>
        ) : mode === 'sign-up' || mode === 'reset-password' ? (
          <>
            {mode === 'sign-up' && !notice && (
              <Text style={{ color: colors.muted, fontSize: 14 }}>
                {t('auth.hasAccount')}
              </Text>
            )}
            <Link href="/sign-in" disabled={isSubmitting} centered>
              {t('auth.backToSignIn')}
            </Link>
          </>
        ) : null}
      </View>
    </AuthFrame>
  );
}
