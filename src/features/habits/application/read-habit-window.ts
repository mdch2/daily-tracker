import { OperationError } from '@/shared/domain/operation-error';
import type { HabitRepository } from '../domain/habit-repository';
import { addBusinessDays } from '../domain/habit-rules';

// Overview maps (16 weeks), or one habit's calendar year including edge weeks,
// read in batches below both the adapter's 31-day limit
// and the service's 1,000-row response cap (30 habits × 28 days).
export async function readHabitWindow(
  repository: HabitRepository,
  habitIds: string[],
  from: string,
  to: string,
) {
  const count = (Date.parse(to) - Date.parse(from)) / 86400000 + 1;
  const limit = habitIds.length === 1 ? 378 : 112;
  if (!Number.isInteger(count) || count < 1 || count > limit)
    throw new OperationError('invalidInput');
  if (!habitIds.length) return [];
  const requests = [];
  for (let start = from; start <= to; start = addBusinessDays(start, 28)) {
    const end = [to, addBusinessDays(start, 27)].sort()[0]!;
    requests.push(repository.readDays(habitIds, start, end));
  }
  // Do not render failed batches as empty dates or false missed days.
  return (await Promise.all(requests)).flat();
}
