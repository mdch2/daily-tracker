import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/shared/theme/use-theme';
import { Icon, type IconName } from './icon';
import { ErrorMessage, Input, Text } from './primitives';

export type SelectionOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function SelectionTrigger({
  label,
  value,
  hint,
  error,
  disabled = false,
  expanded,
  icon = 'chevron-down',
  onPress,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  error?: string | undefined;
  disabled?: boolean;
  expanded: boolean;
  icon?: IconName;
  onPress: () => void;
}) {
  const { colors, tokens } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <Text weight="semibold" style={{ fontSize: 14 }}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value }}
        accessibilityHint={error ?? hint}
        accessibilityState={{ disabled, expanded }}
        disabled={disabled}
        onPress={onPress}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => ({
          minHeight: 54,
          padding: tokens.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          borderWidth: 1.5,
          borderRadius: tokens.radius.control,
          borderColor: error
            ? colors.error
            : focused
              ? colors.link
              : colors.fieldBorder,
          backgroundColor: pressed ? colors.elevated : colors.field,
          opacity: disabled ? 0.55 : 1,
        })}
      >
        <Text style={{ flex: 1 }}>{value}</Text>
        <Icon name={icon} color={colors.muted} size={20} />
      </Pressable>
      {error ? (
        <ErrorMessage message={error} />
      ) : hint ? (
        <Text style={{ color: colors.muted, fontSize: 14 }}>{hint}</Text>
      ) : null}
    </View>
  );
}

// Expand inside the current form: this also works inside an existing native Modal.
export function SelectionField({
  label,
  value,
  options,
  onChange,
  hint,
  error,
  disabled = false,
  searchable = false,
  placeholder,
  initiallyExpanded = false,
}: {
  label: string;
  value: string | null;
  options: readonly SelectionOption[];
  onChange: (value: string) => void;
  hint?: string | undefined;
  error?: string | undefined;
  disabled?: boolean;
  searchable?: boolean;
  placeholder?: string;
  initiallyExpanded?: boolean;
}) {
  const { t } = useTranslation();
  const { colors, tokens } = useTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [search, setSearch] = useState('');
  const trigger = useRef<ComponentRef<typeof View>>(null);
  const selected = options.find((option) => option.value === value);
  const normalize = (text: string) =>
    text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  const query = normalize(search.trim());
  const matches = options.filter((option) =>
    normalize(
      `${option.label} ${option.value} ${option.description ?? ''}`,
    ).includes(query),
  );
  function close() {
    setExpanded(false);
    setSearch('');
    trigger.current?.focus();
  }
  return (
    <View style={{ gap: tokens.spacing.sm }}>
      <View ref={trigger} focusable>
        <SelectionTrigger
          label={label}
          value={selected?.label ?? value ?? placeholder ?? t('fields.select')}
          hint={hint}
          error={error}
          disabled={disabled}
          expanded={expanded && !disabled}
          onPress={() => (expanded ? close() : setExpanded(true))}
        />
      </View>
      {expanded && !disabled && (
        <View
          style={{
            gap: tokens.spacing.sm,
            padding: tokens.spacing.sm,
            borderRadius: tokens.radius.control,
            backgroundColor: colors.elevated,
          }}
        >
          {searchable && (
            <Input
              label={t('fields.search', { field: label })}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
              autoCapitalize="none"
              icon="search"
            />
          )}
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 280 }}
          >
            <View accessibilityRole="radiogroup" accessibilityLabel={label}>
              {matches.map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityLabel={option.label}
                  accessibilityHint={option.description}
                  accessibilityState={{
                    checked: value === option.value,
                    disabled: !!option.disabled,
                  }}
                  disabled={option.disabled}
                  onPress={() => {
                    onChange(option.value);
                    close();
                  }}
                  style={({ pressed }) => ({
                    minHeight: tokens.minimumTouchTarget,
                    padding: tokens.spacing.sm,
                    borderRadius: tokens.radius.control,
                    backgroundColor:
                      value === option.value
                        ? colors.accentSoft
                        : pressed
                          ? colors.surface
                          : colors.elevated,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: tokens.spacing.sm,
                    opacity: option.disabled ? 0.55 : 1,
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <Text weight={value === option.value ? 'bold' : 'regular'}>
                      {option.label}
                    </Text>
                    {option.description && (
                      <Text style={{ color: colors.muted, fontSize: 13 }}>
                        {option.description}
                      </Text>
                    )}
                  </View>
                  {value === option.value && (
                    <Icon name="check" color={colors.link} />
                  )}
                </Pressable>
              ))}
            </View>
            {!matches.length && (
              <Text accessibilityLiveRegion="polite">
                {t('fields.noResults')}
              </Text>
            )}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('fields.cancel')}
            onPress={close}
            style={{
              minHeight: tokens.minimumTouchTarget,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.link }}>{t('fields.cancel')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
