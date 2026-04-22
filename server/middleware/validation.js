// Input validation middleware

import { APIError } from './errorHandler.js';

/**
 * Validate required fields in request body
 * @param {Array<string>} fields - Required field names
 * @returns {Function} Middleware function
 */
export function validateRequired(fields) {
  return (req, res, next) => {
    const missing = [];
    
    for (const field of fields) {
      if (!req.body[field]) {
        missing.push(field);
      }
    }
    
    if (missing.length > 0) {
      throw new APIError(`Missing required fields: ${missing.join(', ')}`, 400);
    }
    
    next();
  };
}

/**
 * Validate email format
 */
export function validateEmail(req, res, next) {
  const { email } = req.body;
  
  if (!email) {
    return next();
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    throw new APIError('Invalid email format', 400);
  }
  
  next();
}

/**
 * Validate role
 */
export function validateRole(req, res, next) {
  const { role } = req.body;
  
  if (!role) {
    return next();
  }
  
  const validRoles = ['tourist', 'authority', 'admin'];
  
  if (!validRoles.includes(role)) {
    throw new APIError(`Invalid role. Must be one of: ${validRoles.join(', ')}`, 400);
  }
  
  next();
}

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Normalize state/city names for consistent comparison
 * @param {string} value - State or city name
 * @returns {string} Normalized value
 */
export function normalizeLocation(value) {
  if (!value || value === 'all') return value;
  return String(value).trim().toLowerCase();
}
