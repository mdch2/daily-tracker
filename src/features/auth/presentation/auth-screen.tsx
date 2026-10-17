import { z } from 'zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { RouteLink as Link } from '@/shared/ui/route-link';
import {
  Button,
  ErrorMessage,
  Input,
  Screen,
  Text,
} from '@/shared/ui/primitives';
import { validationMessage } from '@/shared/i18n/validation-message';
import { PreferencesControls } from '@/shared/preferences/preferences-controls';
import { useTheme } from '@/shared/theme/use-theme';
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
  type AuthFormValues,
} from '../application/auth-validation';
import { useAuth } from './auth-provider';

type Mode = 'sign-in' | 'sign-up' | 'reset-password' | 'update-password';
const titles = {
  'sign-in': 'auth.signIn',
  'sign-up': 'auth.signUp',
  'reset-password': 'auth.resetPassword',
  'update-password': 'auth.updatePassword',
} as const;

export function AuthScreen({ mode }: { mode: Mode }) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { actions, finishRecovery } = useAuth();
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<
    'auth.confirmEmail' | 'auth.resetSent' | null
  >(null);
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
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    setError(false);
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
    } catch {
      setError(true);
    }
  });
  return (
    <Screen>
      <Text
        accessibilityRole="header"
        style={{ fontSize: tokens.typography.title }}
      >
        {t(titles[mode])}
      </Text>
      <Text>{t('auth.provisional')}</Text>
      {mode !== 'update-password' && (
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('auth.email')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={validationMessage(errors.email?.message, t)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isSubmitting}
            />
          )}
        />
      )}
      {mode !== 'reset-password' && (
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label={t('auth.password')}
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
              editable={!isSubmitting}
            />
          )}
        />
      )}
      {error && <ErrorMessage message={t('errors.operation')} />}
      {notice && <Text accessibilityLiveRegion="polite">{t(notice)}</Text>}
      <Button
        title={t(titles[mode])}
        loading={isSubmitting}
        onPress={() => {
          void submit();
        }}
      />
      {mode === 'sign-in' ? (
        <>
          <Link href="/sign-up">{t('auth.signUp')}</Link>
          <Link href="/reset-password">{t('auth.recoverLink')}</Link>
        </>
      ) : null}
      {mode === 'sign-up' || mode === 'reset-password' ? (
        <Link href="/sign-in">{t('auth.backToSignIn')}</Link>
      ) : null}
      <PreferencesControls />
    </Screen>
  );
}
