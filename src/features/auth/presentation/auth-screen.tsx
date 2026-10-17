import { z } from 'zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { RouteLink as Link } from '@/shared/ui/route-link';
import {
  Button,
  ErrorMessage,
  Input,
  Screen,
  Text,
} from '@/shared/ui/primitives';
import {
  emailSchema,
  passwordSchema,
  signInSchema,
  signUpSchema,
  type AuthFormValues,
} from '../application/auth-validation';
import { useAuth } from './auth-provider';

type Mode = 'sign-in' | 'sign-up' | 'reset-password' | 'update-password';
const titles: Record<Mode, string> = {
  'sign-in': 'Iniciar sesión',
  'sign-up': 'Crear cuenta',
  'reset-password': 'Solicitar recuperación',
  'update-password': 'Guardar contraseña',
};

export function AuthScreen({ mode }: { mode: Mode }) {
  const { actions, finishRecovery } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
    // Inactive fields remain strings; each action validates only its own inputs.
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });
  const submit = handleSubmit(async (values) => {
    setError(null);
    setNotice(null);
    try {
      if (mode === 'sign-in') await actions.signIn(values);
      if (mode === 'sign-up') {
        const result = await actions.signUp(values);
        if (result.confirmationRequired)
          setNotice(
            'Revisa tu correo para confirmar la cuenta en este dispositivo.',
          );
      }
      if (mode === 'reset-password') {
        await actions.requestPasswordReset(values);
        setNotice(
          'Si existe una cuenta para ese correo, recibirás un enlace. Ábrelo en este dispositivo.',
        );
      }
      if (mode === 'update-password') {
        await actions.updatePassword(values);
        finishRecovery();
      }
    } catch {
      setError(
        'No se pudo completar la operación. Revisa tus datos y la conexión e inténtalo de nuevo.',
      );
    }
  });
  return (
    <Screen>
      <Text accessibilityRole="header" style={{ fontSize: 26 }}>
        {titles[mode]}
      </Text>
      <Text>
        Acceso técnico provisional. El recorrido final se definirá con los
        diseños del producto.
      </Text>
      {mode !== 'update-password' && (
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Correo electrónico"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
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
              label="Contraseña"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
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
      {error && <ErrorMessage message={error} />}
      {notice && <Text accessibilityLiveRegion="polite">{notice}</Text>}
      <Button
        title={titles[mode]}
        loading={isSubmitting}
        onPress={() => {
          void submit();
        }}
      />
      {mode === 'sign-in' ? (
        <>
          <Link href="/sign-up">Crear cuenta</Link>
          <Link href="/reset-password">Recuperar contraseña</Link>
        </>
      ) : null}
      {mode === 'sign-up' || mode === 'reset-password' ? (
        <Link href="/sign-in">Volver al inicio de sesión</Link>
      ) : null}
    </Screen>
  );
}
