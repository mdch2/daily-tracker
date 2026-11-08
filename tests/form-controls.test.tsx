import { useState } from 'react';
import { Alert, Platform } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { DateField, TimeField } from '@/shared/ui/date-time-field';
import { SelectionField } from '@/shared/ui/selection-field';
import { TimeZoneField } from '@/shared/ui/time-zone-field';
import {
  calendarFields,
  calendarValue,
  clampCalendarValue,
} from '@/shared/ui/calendar-value';
import { Sheet } from '@/shared/ui/sheet';
import { Input } from '@/shared/ui/primitives';
import { render } from './helpers/render-localized';

function DateExample({ optional = false }: { optional?: boolean }) {
  const [value, setValue] = useState<string | null>('2026-11-07');
  return (
    <DateField
      label="Date"
      value={value}
      onChange={setValue}
      optional={optional}
      min="2026-11-01"
      max="2026-11-30"
    />
  );
}

describe('semantic form controls', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each(['utc', 'local'] as const)(
    'round-trips calendar fields through %s transport',
    (transport) => {
      for (const date of [
        '2024-02-29',
        '2026-01-01',
        '2026-03-08',
        '2026-11-01',
        '2026-12-31',
      ]) {
        expect(calendarFields(calendarValue(date, transport), transport)).toBe(
          date,
        );
      }
      expect(clampCalendarValue('2026-10-31', '2026-11-01', '2026-11-30')).toBe(
        '2026-11-01',
      );
      expect(clampCalendarValue('2026-12-01', '2026-11-01', '2026-11-30')).toBe(
        '2026-11-30',
      );
    },
  );
  it.each(['ios', 'android'] as const)(
    'selects bounded calendar dates on %s',
    async (platform) => {
      jest.replaceProperty(Platform, 'OS', platform);
      await render(<DateExample />, { language: 'en', theme: 'dark' });
      await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
      const picker = screen.getByTestId('date-picker');
      const transport = platform === 'android' ? 'local' : 'utc';
      expect(calendarFields(picker.props.minimumDate, transport)).toBe(
        '2026-11-01',
      );
      expect(calendarFields(picker.props.maximumDate, transport)).toBe(
        '2026-11-30',
      );
      expect(picker).toHaveProp('themeVariant', 'dark');
      await fireEvent(
        picker,
        'valueChange',
        {},
        calendarValue('2026-11-12', transport),
      );
      if (platform === 'ios')
        await fireEvent.press(
          screen.getByRole('button', { name: 'Confirm selection' }),
        );
      expect(screen.getByRole('button', { name: 'Date' })).toHaveProp(
        'accessibilityValue',
        { text: 'Nov 12, 2026' },
      );
    },
  );
  it('cancels a date draft and explicitly clears an optional deadline', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    await render(<DateExample optional />, { language: 'en', theme: 'light' });
    await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
    await fireEvent(
      screen.getByTestId('date-picker'),
      'valueChange',
      {},
      calendarValue('2026-11-15'),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Date' })).toHaveProp(
      'accessibilityValue',
      { text: 'Nov 7, 2026' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'No deadline' }));
    expect(screen.getByRole('button', { name: 'Date' })).toHaveProp(
      'accessibilityValue',
      { text: 'No date selected' },
    );
  });
  it('keeps an expired date visible instead of silently replacing it', async () => {
    const changed = jest.fn();
    await render(
      <DateField
        label="Date"
        value="2026-10-31"
        min="2026-11-01"
        onChange={changed}
      />,
      { language: 'en', theme: 'light' },
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This date is no longer available. Choose a date within the allowed range.',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
    expect(changed).not.toHaveBeenCalled();
  });
  it('confirms clock fields without converting them to the account zone', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const changed = jest.fn();
    await render(
      <TimeField label="Time" hour={8} minute={0} onChange={changed} />,
      { language: 'en', theme: 'dark' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Time' }));
    const chosen = new Date();
    chosen.setHours(23, 45, 0, 0);
    await fireEvent(
      screen.getByTestId('time-picker'),
      'valueChange',
      {},
      chosen,
    );
    expect(changed).not.toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Confirm selection' }),
    );
    expect(changed).toHaveBeenCalledWith(23, 45);
  });
  it('closes a picker on a changed business window without moving the draft date', async () => {
    const changed = jest.fn();
    const view = await render(
      <DateField
        label="Date"
        value="2026-11-07"
        min="2026-11-07"
        onChange={changed}
      />,
      { language: 'en', theme: 'light' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Date' }));
    expect(screen.getByTestId('date-picker')).toBeOnTheScreen();
    await view.rerender(
      <DateField
        label="Date"
        value="2026-11-07"
        min="2026-11-08"
        onChange={changed}
      />,
    );
    expect(screen.queryByTestId('date-picker')).not.toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    expect(changed).not.toHaveBeenCalled();
  });
  it('searches options across accents, retains selection and reports no matches', async () => {
    const changed = jest.fn();
    await render(
      <SelectionField
        label="Habit"
        value="one"
        onChange={changed}
        options={[
          { value: 'one', label: 'Meditación' },
          { value: 'two', label: 'Reading' },
        ]}
        searchable
      />,
      { language: 'en', theme: 'dark' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Habit' }));
    await fireEvent.changeText(
      screen.getByLabelText('Search Habit'),
      'meditacion',
    );
    expect(screen.getByRole('radio', { name: 'Meditación' })).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ checked: true }),
    );
    await fireEvent.changeText(
      screen.getByLabelText('Search Habit'),
      'unavailable',
    );
    expect(screen.getByText('No matching options.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(changed).not.toHaveBeenCalled();
  });
  it('suggests the phone zone without selecting it and searches the full catalog', async () => {
    const changed = jest.fn();
    await render(
      <TimeZoneField value="" onChange={changed} disabled={false} />,
      { language: 'en', theme: 'light' },
    );
    expect(changed).not.toHaveBeenCalled();
    await fireEvent.press(
      screen.getByRole('button', { name: 'Account time zone' }),
    );
    expect(screen.getByText(/Suggested from your phone/)).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText('Search Account time zone'),
      'Tokyo',
    );
    await fireEvent.press(screen.getByRole('radio', { name: 'Asia/Tokyo' }));
    expect(changed).toHaveBeenCalledWith('Asia/Tokyo');
  });
  it('keeps the form mounted when a dirty sheet close is cancelled', async () => {
    const closed = jest.fn();
    const alert = jest
      .spyOn(Alert, 'alert')
      .mockImplementation(() => undefined);
    await render(
      <Sheet title="Draft" locked={false} dirty onClose={closed}>
        <Input label="Name" value="Preserved draft" />
      </Sheet>,
      { language: 'en', theme: 'dark' },
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(closed).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Preserved draft')).toBeOnTheScreen();
    const buttons = alert.mock.calls[0]?.[2];
    expect(buttons?.[0]?.text).toBe('Keep editing');
    await act(async () => buttons?.[1]?.onPress?.());
    expect(closed).toHaveBeenCalledTimes(1);
  });
});
