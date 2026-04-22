// Time utility for consistent IST (Asia/Kolkata) formatting

/**
 * Format a date/timestamp to IST timezone
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @param {Object} options - Formatting options
 * @returns {string} Formatted date string in IST
 */
export function formatToIST(date, options = {}) {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  const defaultOptions = {
    timeZone: 'Asia/Kolkata',
    ...options
  };
  
  return dateObj.toLocaleString('en-IN', defaultOptions);
}

/**
 * Format date and time separately in IST
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {Object} Object with date and time strings
 */
export function formatDateTimeIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  
  return {
    date: dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }),
    time: dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
    full: dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  };
}

/**
 * Format time only in IST
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {string} Formatted time string in IST
 */
export function formatTimeIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Format date only in IST
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {string} Formatted date string in IST
 */
export function formatDateIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' });
}

/**
 * Get current IST timestamp
 * @returns {string} Current date/time in IST
 */
export function getCurrentIST() {
  return formatToIST(new Date());
}

/**
 * Format relative time (e.g., "2 hours ago") in IST context
 * @param {Date|string|number} date - Date object, ISO string, or timestamp
 * @returns {string} Relative time string
 */
export function formatRelativeTimeIST(date) {
  const dateObj = date instanceof Date ? date : new Date(date);
  const now = new Date();
  const diffMs = now - dateObj;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return formatDateIST(dateObj);
}
