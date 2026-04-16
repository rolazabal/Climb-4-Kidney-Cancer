import { Platform } from 'react-native';

const tintColorLight = '#C76341';
const tintColorDark = '#E79A7A';

export const Colors = {
  light: {
    text: '#2F2F2F',
    background: '#ECEDEE',
    tint: tintColorLight,
    icon: '#6E6E6E',
    tabIconDefault: '#9A9A9A',
    tabIconSelected: tintColorLight,
    surface: '#FFFFFF',
    surfaceMuted: '#F1F2F4',
    surfaceWarm: '#EFE8E1',
    heading: '#2F2F2F',
    subtitle: '#666666',
    border: '#D6D6D6',
    inputBackground: '#FAFAFA',
    banner: '#4D4D4D',
    shadow: '#0E1A18',
    onPrimary: '#FFFFFF',
    error: '#B33A2B',
    disabled: '#D7A795',
  },
  dark: {
    text: '#F2F2F2',
    background: '#121212',
    tint: tintColorDark,
    icon: '#A8A8A8',
    tabIconDefault: '#888888',
    tabIconSelected: tintColorDark,
    surface: '#1F1F1F',
    surfaceMuted: '#2A2A2A',
    surfaceWarm: '#342D2A',
    heading: '#F2F2F2',
    subtitle: '#B8B8B8',
    border: '#3A3A3A',
    inputBackground: '#262626',
    banner: '#353535',
    shadow: '#000000',
    onPrimary: '#FFFFFF',
    error: '#E67F74',
    disabled: '#7A5C50',
  },
};
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export type ThemeName = keyof typeof Colors;
export type ThemeColorName = keyof (typeof Colors)['light'];
