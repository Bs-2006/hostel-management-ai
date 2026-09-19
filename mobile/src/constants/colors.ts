export const lightColors = {
  // Core palette
  bg: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceDark: '#1A1A1A',
  primary: '#2563EB',
  accent: '#9EE86F',
  text: '#111111',
  textLight: '#FFFFFF',
  muted: '#888888',
  border: '#E8E8E0',
  navBg: '#FFFFFF',
  navText: '#111111',
  navActive: '#E8E8E0',
  navInactive: '#8E8E93',
  heroCardBg: '#FFFFFF',
  heroCardText: '#111111',
  danger: '#EF4444',

  // Semantic status colors (strong, readable on light or dark surfaces)
  pending: '#854D0E',
  approved: '#166534',
  rejected: '#991B1B',
  inProgress: '#1D4ED8',
  present: '#166534',
  absent: '#991B1B',
  success: '#166534',

  // Soft pill backgrounds
  pillGreen: '#DCFCE7',
  pillRed: '#FEE2E2',
  pillAmber: '#FEF9C3',
  pillBlue: '#DBEAFE',
};

export const darkColors = {
  // Core palette
  bg: '#121212',
  surface: '#1E1E1E',
  surfaceDark: '#2A2A2A',
  primary: '#3B82F6',
  accent: '#9EE86F',
  text: '#F1F1EF',
  textLight: '#FFFFFF',
  muted: '#9E9E96',
  border: '#2C2C2C',
  navBg: '#2A2A2A',
  navText: '#FFFFFF',
  navActive: '#3D3D3D',
  navInactive: '#9C9C96',
  heroCardBg: '#2A2A2A',
  heroCardText: '#FFFFFF',
  danger: '#EF4444',

  // Semantic status colors (brighter for contrast on dark surfaces)
  pending: '#FBBF24',
  approved: '#4ADE80',
  rejected: '#F87171',
  inProgress: '#60A5FA',
  present: '#4ADE80',
  absent: '#F87171',
  success: '#4ADE80',

  // Soft pill backgrounds (dark-tinted)
  pillGreen: '#16261B',
  pillRed: '#2B1616',
  pillAmber: '#2A210F',
  pillBlue: '#17263A',
};

export type ThemeColors = typeof lightColors;