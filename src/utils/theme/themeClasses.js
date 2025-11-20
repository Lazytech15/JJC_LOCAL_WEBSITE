// Updated theme helper with more comprehensive tokens
export function themeFor(isDarkMode) {
  return {
    // Backgrounds
    pageBg: isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40',
    cardBg: isDarkMode ? 'bg-slate-800' : 'bg-white',
    cardBorder: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    headerBg: isDarkMode ? 'bg-slate-800' : 'bg-white',
    
    // Alternating row backgrounds
    rowEven: isDarkMode ? 'bg-slate-800' : 'bg-white',
    rowOdd: isDarkMode ? 'bg-slate-700/60' : 'bg-slate-50',
    rowHover: isDarkMode ? 'hover:bg-slate-600/60' : 'hover:bg-blue-50/70',
    
    // Table header
    tableHeaderBg: isDarkMode ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900' : 'bg-gradient-to-r from-slate-100 via-blue-50 to-indigo-50',
    
    // Dividers
    divider: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    
    // Input backgrounds
    inputBg: isDarkMode ? 'bg-slate-900/50' : 'bg-white',
    inputBorder: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    
    // Modal backgrounds
    modalBg: isDarkMode ? 'bg-slate-900' : 'bg-white',
    modalBorder: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    
    // Section backgrounds (for detail cards, etc)
    sectionBg: isDarkMode ? 'bg-slate-800' : 'bg-white',
    sectionBgAlt: isDarkMode ? 'bg-slate-900/50' : 'bg-slate-50',
    sectionBorder: isDarkMode ? 'border-slate-700' : 'border-slate-200',
    
    // Text tokens
    header: isDarkMode ? 'text-slate-100' : 'text-gray-900',
    subHeader: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    title: isDarkMode ? 'text-slate-100' : 'text-slate-900',
    label: isDarkMode ? 'text-slate-300' : 'text-slate-700',
    muted: isDarkMode ? 'text-slate-400' : 'text-slate-600',
    smallMuted: isDarkMode ? 'text-slate-400' : 'text-slate-500',

    // Accent color tokens
    accent: {
      blue: isDarkMode ? 'text-blue-400' : 'text-blue-600',
      green: isDarkMode ? 'text-green-400' : 'text-green-600',
      amber: isDarkMode ? 'text-amber-400' : 'text-amber-600',
      orange: isDarkMode ? 'text-orange-400' : 'text-orange-600',
      purple: isDarkMode ? 'text-purple-400' : 'text-purple-600',
      red: isDarkMode ? 'text-red-400' : 'text-red-600'
    },

    // Small helpers
    iconMuted: isDarkMode ? 'text-slate-300' : 'text-slate-600',
    statNumber: isDarkMode ? 'text-white' : 'text-slate-900',
    chipMutedBg: isDarkMode ? 'bg-slate-700/40' : 'bg-slate-100'
  }
}
