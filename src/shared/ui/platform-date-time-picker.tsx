import SystemDateTimePicker, {
  type DateTimePickerProps,
} from '@expo/ui/community/datetime-picker';

export default function PlatformDateTimePicker(
  props: DateTimePickerProps & { label: string },
) {
  return <SystemDateTimePicker {...props} />;
}
