// Theme debugging utilities
export const resetTheme = () => {
  console.log('Resetting theme to light mode...')
  
  // Clear localStorage
  localStorage.removeItem('darkMode')
  
  // Force light mode
  document.documentElement.classList.remove('dark')
  document.body.classList.remove('dark')
  document.documentElement.style.colorScheme = 'light'
  
  console.log('Theme reset complete. Please refresh the page.')
}

export const debugTheme = () => {
  console.log('=== Theme Debug Info ===')
  console.log('localStorage darkMode:', localStorage.getItem('darkMode'))
  console.log('HTML has dark class:', document.documentElement.classList.contains('dark'))
  console.log('Body has dark class:', document.body.classList.contains('dark'))
  console.log('Color scheme:', document.documentElement.style.colorScheme)
  console.log('System prefers dark:', window.matchMedia('(prefers-color-scheme: dark)').matches)
}

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.resetTheme = resetTheme
  window.debugTheme = debugTheme
}