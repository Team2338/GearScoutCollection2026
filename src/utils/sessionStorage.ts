/**
 * Session storage utilities for temporary data persistence
 */

/**
 * Save a value to sessionStorage
 * @param key - The storage key
 * @param value - The value to store (string or object)
 */
export function saveToSessionStorage(
	key: string,
	value: string | object
): void {
	try {
		const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
		sessionStorage.setItem(key, stringValue);
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Session Storage] Error saving:', error.message);
		}
	}
}

/**
 * Get a string value from sessionStorage
 * @param key - The storage key
 * @param defaultValue - The default value if key not found
 * @returns The stored value or default value
 */
export function getFromSessionStorage(
	key: string,
	defaultValue = ''
): string {
	try {
		return sessionStorage.getItem(key) ?? defaultValue;
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Session Storage] Error reading:', error.message);
		}
		return defaultValue;
	}
}

/**
 * Get a parsed JSON value from sessionStorage
 * @param key - The storage key
 * @param defaultValue - The default value if key not found
 * @returns The parsed value or default value
 */
export function getJsonFromSessionStorage<T>(
	key: string,
	defaultValue: T | null = null
): T | null {
	try {
		const item = sessionStorage.getItem(key);
		if (!item) {
			return defaultValue;
		}
		return JSON.parse(item) as T;
	} catch (error) {
			if (error instanceof Error) {
				console.warn('[Session Storage] Error parsing JSON:', error.message);
			}
			return defaultValue;
	}
}

/**
 * Remove a value from sessionStorage
 * @param key - The storage key to remove
 */
export function removeFromSessionStorage(key: string): void {
	try {
		sessionStorage.removeItem(key);
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Session Storage] Error removing:', error.message);
		}
	}
}

/**
 * Clear all sessionStorage data
 */
export function clearSessionStorage(): void {
	try {
		sessionStorage.clear();
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Session Storage] Error clearing:', error.message);
		}
	}
}
