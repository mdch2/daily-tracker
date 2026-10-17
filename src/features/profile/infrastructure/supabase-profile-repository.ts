import { z } from 'zod';
import type { BackendClient } from '@/infrastructure/supabase/client';
import type { ProfileRepository } from '../domain/profile-repository';

const profileRow = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  time_zone: z.string().nullable(),
});

export function createProfileRepository(
  client: BackendClient,
): ProfileRepository {
  return {
    async findByUserId(userId) {
      const { data, error } = await client
        .from('profiles')
        .select('id, display_name, time_zone')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw new Error('No se pudo consultar el perfil.');
      if (!data) return null;
      const row = profileRow.parse(data);
      return {
        id: row.id,
        displayName: row.display_name,
        timeZone: row.time_zone,
      };
    },
  };
}
