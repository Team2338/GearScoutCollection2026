/**
 * Local storage utilities for form data persistence
 */

import { FORM_DATA_KEYS } from '@/constants';

/**
 * Save a value to localStorage
 * @param key - The storage key
 * @param value - The value to store
 * @throws Error if quota is exceeded
 */
export function saveToLocalStorage(
	key: string,
	value: string | number
): void {
	try {
		localStorage.setItem(key, String(value));
	} catch (error) {
		if (error instanceof DOMException && error.name === 'QuotaExceededError') {
			console.error('[Local Storage] Quota exceeded');
			throw new Error('Storage full. Please submit pending matches.');
		} else if (error instanceof Error) {
			console.warn('[Local Storage] Error saving:', error.message);
		}
	}
}

/**
 * Get a value from localStorage
 * @param key - The storage key
 * @param defaultValue - The default value if key not found
 * @returns The stored value or default value
 */
export function getFromLocalStorage(
	key: string,
	defaultValue: string | number = ''
): string {
	try {
		return localStorage.getItem(key) ?? String(defaultValue);
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Local Storage] Error reading:', error.message);
		}
		return String(defaultValue);
	}
}

/**
 * Clear all form data from localStorage
 */
export function clearFormDataFromLocalStorage(): void {
	try {
		FORM_DATA_KEYS.forEach(key => localStorage.removeItem(key));
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Local Storage] Error clearing:', error.message);
		}
	}
}
