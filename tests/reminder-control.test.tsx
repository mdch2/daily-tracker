import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createReminderService } from '@/features/reminders/application/reminder-service';
import { ReminderContext } from '@/features/reminders/presentation/reminder-context';
import { ReminderControl } from '@/features/reminders/presentation/reminder-control';
import { render } from './helpers/render-localized';

jest.mock('@/features/auth/presentation/auth-provider', () => ({
  useAuth: () => ({ state: { session: { userId: 'alice' } } }),
}));
const target = {
  kind: 'habit' as const,
  targetId: '11111111-1111-4111-8111-111111111111',
};
async function setup(
  language: 'en' | 'es',
  theme: 'light' | 'dark' | 'system',
) {
  let raw: string | null = null;
  const permission = jest.fn(async () => true);
  const service = createReminderService(
    {
      read: async () => raw,
      write: async (value) => {
        raw = value;
      },
    },
    { requestPermission: permission, replace: async () => undefined },
  );
  await service.activate('alice');
  const view = await render(
    <ReminderContext.Provider value={service}>
      <ReminderControl target={target} />
    </ReminderContext.Provider>,
    { language, theme },
  );
  return { service, permission, ...view };
}
it.each([
  ['es', 'light'],
  ['es', 'dark'],
  ['es', 'system'],
  ['en', 'light'],
  ['en', 'dark'],
  ['en', 'system'],
] as const)(
  'edits and disables a reminder with translated accessible controls in %s/%s',
  async (language, theme) => {
    const { service, permission } = await setup(language, theme);
    expect(permission).not.toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole('button', {
        name: language === 'es' ? 'Configurar recordatorio' : 'Set up reminder',
      }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: language === 'es' ? 'Hora' : 'Time' }),
    );
    const chosen = new Date();
    chosen.setHours(19, 0, 0, 0);
    await fireEvent(
      screen.getByTestId('time-picker'),
      'valueChange',
      {},
      chosen,
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: language === 'es' ? 'Confirmar selección' : 'Confirm selection',
      }),
    );
    await fireEvent.press(
      screen.getByRole('checkbox', {
        name: language === 'es' ? 'Lunes' : 'Monday',
      }),
    );
    await fireEvent.press(
      screen.getByRole('button', {
        name: language === 'es' ? 'Guardar y activar' : 'Save and enable',
      }),
    );
    await waitFor(() => expect(service.getSnapshot().entries).toHaveLength(1));
    expect(service.getSnapshot().entries[0]).toMatchObject({
      hour: 19,
      weekdays: [2, 3, 4, 5, 6, 7],
    });
    await fireEvent.press(
      screen.getByRole('button', {
        name:
          language === 'es' ? 'Desactivar recordatorio' : 'Turn off reminder',
      }),
    );
    await waitFor(() => expect(service.getSnapshot().entries).toHaveLength(0));
  },
);
it('keeps the draft and shows a translated error when permission is denied', async () => {
  const { permission } = await setup('es', 'dark');
  permission.mockResolvedValue(false);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Configurar recordatorio' }),
  );
  await fireEvent.press(screen.getByRole('button', { name: 'Hora' }));
  const chosen = new Date();
  chosen.setHours(22, 0, 0, 0);
  await fireEvent(screen.getByTestId('time-picker'), 'valueChange', {}, chosen);
  await fireEvent.press(
    screen.getByRole('button', { name: 'Confirmar selección' }),
  );
  await fireEvent.press(
    screen.getByRole('button', { name: 'Guardar y activar' }),
  );
  expect(
    await screen.findByText(/Las notificaciones están desactivadas/),
  ).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Hora' })).toHaveProp(
    'accessibilityValue',
    { text: '22:00' },
  );
  expect(
    screen.getByRole('button', { name: 'Abrir ajustes del teléfono' }),
  ).toBeOnTheScreen();
});
