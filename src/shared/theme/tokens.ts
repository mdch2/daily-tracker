// Neutral, provisional tokens until the Stitch references define the visual system.
export const tokens = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
  radius: { control: 8, card: 12 },
  typography: { body: 16, title: 26, caption: 14 },
  minimumTouchTarget: 48,
  elevation: { flat: 0, raised: 2 },
};

export const palettes = {
  light: {
    background: '#ffffff',
    surface: '#f4f4f5',
    text: '#18181b',
    muted: '#52525b',
    border: '#71717a',
    selection: '#d4d4d8',
    action: '#27272a',
    onAction: '#ffffff',
    error: '#b91c1c',
  },
  dark: {
    background: '#18181b',
    surface: '#27272a',
    text: '#fafafa',
    muted: '#d4d4d8',
    border: '#a1a1aa',
    selection: '#52525b',
    action: '#e4e4e7',
    onAction: '#18181b',
    error: '#fca5a5',
  },
};
