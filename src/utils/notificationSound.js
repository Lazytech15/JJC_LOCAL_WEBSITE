// ============================================================================
// notificationSound.js
// Utility for playing notification sounds with caching and rate limiting
// ============================================================================

// Audio cache for preloaded sounds
const audioCache = new Map()

// Rate limiting: prevent sound spam
let lastPlayTime = 0
const MIN_INTERVAL_MS = 2000 // Minimum 2 seconds between sounds

// Storage key for user preference
const SOUND_ENABLED_KEY = 'notification_sound_enabled'

/**
 * Check if notification sounds are enabled
 * @returns {boolean}
 */
export function isSoundEnabled() {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY)
  // Default to enabled if not set
  return stored === null ? true : stored === 'true'
}

/**
 * Enable or disable notification sounds
 * @param {boolean} enabled
 */
export function setSoundEnabled(enabled) {
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled))
}

/**
 * Preload an audio file for faster playback
 * @param {string} soundPath - Path to the sound file
 * @returns {Promise<HTMLAudioElement>}
 */
export async function preloadSound(soundPath) {
  if (audioCache.has(soundPath)) {
    return audioCache.get(soundPath)
  }

  return new Promise((resolve, reject) => {
    const audio = new Audio(soundPath)
    audio.preload = 'auto'
    
    audio.addEventListener('canplaythrough', () => {
      audioCache.set(soundPath, audio)
      resolve(audio)
    }, { once: true })
    
    audio.addEventListener('error', (e) => {
      console.warn(`Failed to preload sound: ${soundPath}`, e)
      reject(e)
    }, { once: true })
    
    // Trigger load
    audio.load()
  })
}

/**
 * Play a notification sound
 * @param {Object} options - Playback options
 * @param {string} options.soundPath - Path to sound file (defaults to notification.mp3)
 * @param {number} options.volume - Volume level 0-1 (defaults to 0.5)
 * @param {boolean} options.force - Bypass rate limiting
 * @returns {Promise<boolean>} - True if sound was played
 */
export async function playNotificationSound({
  soundPath = '/sounds/notification.mp3',
  volume = 0.5,
  force = false
} = {}) {
  console.log('[NotificationSound] Attempting to play sound:', { soundPath, volume, force })
  
  // Check if sounds are enabled
  if (!isSoundEnabled()) {
    console.log('[NotificationSound] Sounds are disabled by user preference')
    return false
  }

  // Rate limiting check
  const now = Date.now()
  if (!force && now - lastPlayTime < MIN_INTERVAL_MS) {
    console.log('[NotificationSound] Rate limited, skipping')
    return false
  }

  try {
    let audio = audioCache.get(soundPath)
    
    if (!audio) {
      // Create new audio instance
      console.log('[NotificationSound] Creating new Audio instance')
      audio = new Audio(soundPath)
    } else {
      // Reset cached audio to beginning
      audio.currentTime = 0
    }
    
    audio.volume = Math.max(0, Math.min(1, volume))
    
    // Try to play
    const playPromise = audio.play()
    
    if (playPromise !== undefined) {
      await playPromise
      console.log('[NotificationSound] Sound played successfully!')
      lastPlayTime = now
      
      // Cache the audio for future use
      if (!audioCache.has(soundPath)) {
        audioCache.set(soundPath, audio)
      }
      
      return true
    }
    
    return false
  } catch (error) {
    // Browser might block autoplay - this is common
    console.warn('[NotificationSound] Failed to play sound:', error.message)
    console.warn('[NotificationSound] This may be due to browser autoplay policy. User must interact with page first.')
    return false
  }
}

/**
 * Play sound for stock alerts (urgent notifications)
 * Uses higher volume and bypasses rate limiting for high priority
 * @param {string} priority - 'high', 'urgent', 'medium', 'important', 'low', 'normal'
 */
export async function playStockAlertSound(priority = 'medium') {
  // Map backend priority values to sound config
  const config = {
    urgent: { volume: 0.8, force: true },
    high: { volume: 0.8, force: true },
    important: { volume: 0.6, force: true },
    medium: { volume: 0.5, force: false },
    normal: { volume: 0.4, force: false },
    low: { volume: 0.3, force: false }
  }
  
  const { volume, force } = config[priority] || config.medium
  
  console.log(`[NotificationSound] Playing sound for priority: ${priority}, volume: ${volume}`)
  
  return playNotificationSound({
    soundPath: '/sounds/notification.mp3',
    volume,
    force
  })
}

/**
 * Preload default notification sounds
 * Call this on app initialization for faster first playback
 */
export async function preloadDefaultSounds() {
  try {
    await preloadSound('/sounds/notification.mp3')
    console.log('Notification sounds preloaded')
  } catch (error) {
    console.warn('Failed to preload notification sounds:', error)
  }
}

/**
 * Test notification sound (for settings panel)
 */
export async function testNotificationSound() {
  const wasEnabled = isSoundEnabled()
  
  // Temporarily enable for test
  setSoundEnabled(true)
  
  const played = await playNotificationSound({
    volume: 0.5,
    force: true
  })
  
  // Restore previous setting
  setSoundEnabled(wasEnabled)
  
  return played
}

export default {
  playNotificationSound,
  playStockAlertSound,
  preloadSound,
  preloadDefaultSounds,
  testNotificationSound,
  isSoundEnabled,
  setSoundEnabled
}
