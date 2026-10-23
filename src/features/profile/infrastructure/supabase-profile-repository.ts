import { z } from 'zod';
import type { BackendClient } from '@/infrastructure/supabase/client';
import type { ProfileRepository } from '../domain/profile-repository';
import { mapOperationError } from '@/infrastructure/supabase/map-operation-error';
import { OperationError } from '@/shared/domain/operation-error';

const businessContextRow = z.object({
  server_time: z.iso.datetime({ offset: true }),
  business_date: z.iso.date().nullable(),
  time_zone: z.string().nullable(),
  week_start_day: z.union([z.literal(1), z.literal(7)]).nullable(),
  week_start_date: z.iso.date().nullable(),
  next_day_at: z.iso.datetime({ offset: true }).nullable(),
});

const profileRow = z.object({
  id: z.uuid(),
  display_name: z.string().nullable(),
  time_zone: z.string().nullable(),
});

export function createProfileRepository(
  client: BackendClient,
): ProfileRepository {
  return {
    async getBusinessContext() {
      const { data, error } = await client.rpc('get_habit_context');
      if (error) throw mapOperationError(error);
      const result = z.array(businessContextRow).length(1).safeParse(data);
      const row = result.success ? result.data[0] : undefined;
      if (!row) throw new OperationError('service');
      if (row.week_start_day === null)
        return { configured: false, serverTime: row.server_time };
      if (
        !row.business_date ||
        !row.time_zone ||
        !row.week_start_date ||
        !row.next_day_at
      )
        throw new OperationError('service');
      return {
        configured: true,
        serverTime: row.server_time,
        today: row.business_date,
        timeZone: row.time_zone,
        weekStartDay: row.week_start_day,
        weekStartDate: row.week_start_date,
        nextDayAt: row.next_day_at,
      };
    },
    async initializeHabitCalendar(input) {
      const { error } = await client.rpc('initialize_habit_calendar', {
        p_time_zone: input.timeZone,
        p_week_start_day: input.weekStartDay,
      });
      if (error) throw mapOperationError(error);
    },
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
