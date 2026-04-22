// API Helper Utilities for consistent error handling
import { authFetch } from '../services/auth-api.js';

/**
 * Make an API request with JWT auth + error handling
 */
export async function apiRequest(url, options = {}) {
  try {
    const response = await authFetch(url, options);

    if (!response.ok) {
      let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * GET request helper
 * @param {string} url - API endpoint URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiGet(url, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'GET'
  });
}

/**
 * POST request helper
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiPost(url, data, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data)
  });
}

/**
 * PUT request helper
 * @param {string} url - API endpoint URL
 * @param {Object} data - Request body data
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiPut(url, data, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

/**
 * DELETE request helper
 * @param {string} url - API endpoint URL
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} Response data
 */
export async function apiDelete(url, options = {}) {
  return apiRequest(url, {
    ...options,
    method: 'DELETE'
  });
}

/**
 * Show user-friendly error notification
 * @param {Error} error - Error object
 * @param {string} defaultMessage - Default message if error message is not user-friendly
 */
export function handleAPIError(error, defaultMessage = 'An error occurred') {
  console.error('[API Error Handler]', error);
  
  let userMessage = defaultMessage;
  
  if (error.message) {
    // Use error message if it's user-friendly
    if (!error.message.includes('fetch') && 
        !error.message.includes('JSON') && 
        !error.message.includes('undefined')) {
      userMessage = error.message;
    }
  }
  
  // Show notification (assumes showNotification function exists)
  if (typeof window.showNotification === 'function') {
    window.showNotification(userMessage, 'error');
  } else {
    // Fallback to alert
    alert(userMessage);
  }
  
  return userMessage;
}

/**
 * Debounce function to limit API call frequency
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Retry API request with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>} Result of the function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`[API] Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
