// Shared theme class tokens for procurement and other departments
// Keep Tailwind classes explicit so JIT/purge picks them up
export function themeFor(isDarkMode) {
  return {
    // Generic
    card: isDarkMode ? 'bg-slate-800 border-slate-700 rounded-xl p-4' : 'bg-slate-50 border-slate-200 rounded-xl p-4',
    cardPadded: isDarkMode ? 'bg-slate-800 border-slate-700 rounded-xl p-6' : 'bg-white border-slate-200 rounded-xl p-6',

    // Text tokens
    header: isDarkMode ? 'text-slate-100' : 'text-gray-900',
    subHeader: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    title: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    label: isDarkMode ? 'text-slate-300' : 'text-slate-800',
    muted: isDarkMode ? 'text-slate-400' : 'text-slate-700',
    smallMuted: isDarkMode ? 'text-slate-400' : 'text-slate-700',

    // Accent color tokens (use value-700 / 400 for dark variants)
    accent: {
      blue: isDarkMode ? 'text-blue-400' : 'text-blue-700',
      green: isDarkMode ? 'text-green-400' : 'text-green-700',
      amber: isDarkMode ? 'text-amber-400' : 'text-amber-700',
      orange: isDarkMode ? 'text-orange-400' : 'text-orange-700',
      purple: isDarkMode ? 'text-purple-400' : 'text-purple-700',
      red: isDarkMode ? 'text-red-400' : 'text-red-700'
    },

    // Small helpers
    iconMuted: isDarkMode ? 'text-slate-300' : 'text-slate-700',
    statNumber: isDarkMode ? 'text-white' : 'text-slate-900',
    chipMutedBg: isDarkMode ? 'dark:bg-slate-700/40' : 'bg-slate-100'
  }
}
