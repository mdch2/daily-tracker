import type { BackendClient } from '@/infrastructure/supabase/client';
import type { AuthRepository } from '../domain/auth-repository';

export function createAuthRepository(client: BackendClient): AuthRepository {
  const redirectUrl = 'dailytracker://callback';
  return {
    async getSession() {
      const { data, error } = await client.auth.getSession();
      if (error)
        throw new Error('No se pudo recuperar la sesión. Vuelve a intentarlo.');
      return data.session ? { userId: data.session.user.id } : null;
    },
    subscribe(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        listener({
          session: session ? { userId: session.user.id } : null,
          recovery: event === 'PASSWORD_RECOVERY',
        });
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(credentials) {
      const { error } = await client.auth.signInWithPassword(credentials);
      if (error)
        throw new Error(
          'No se pudo iniciar sesión. Revisa tus datos y la conexión.',
        );
    },
    async signUp(credentials) {
      const { data, error } = await client.auth.signUp({
        ...credentials,
        options: { emailRedirectTo: redirectUrl },
      });
      if (error)
        throw new Error(
          'No se pudo crear la cuenta. Revisa tus datos e inténtalo de nuevo.',
        );
      return { confirmationRequired: data.session === null };
    },
    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error)
        throw new Error('No se pudo cerrar la sesión. Vuelve a intentarlo.');
    },
    async requestPasswordReset(email) {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: `${redirectUrl}?mode=recovery`,
      });
      if (error)
        throw new Error(
          'No se pudo solicitar el enlace. Revisa la conexión e inténtalo de nuevo.',
        );
    },
    async completeRedirect(code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error)
        throw new Error(
          'El enlace no es válido o caducó. Solicita uno nuevo desde este dispositivo.',
        );
    },
    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password });
      if (error)
        throw new Error(
          'No se pudo cambiar la contraseña. Vuelve a intentarlo.',
        );
    },
  };
}
