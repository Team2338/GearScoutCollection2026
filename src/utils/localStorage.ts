/**
 * Local storage utilities for form data persistence
 */

const FORM_DATA_KEYS = [
	'matchNumber',
	'scoutedTeamNumber',
	'allianceColor',
	'leaveValue',
	'leftCounter',
	'rightCounter',
	'leftBumpCounter',
	'rightBumpCounter',
	'accuracyValue',
	'estimateSizeAuto',
	'leaveValueTeleop',
	'accuracyValueTeleop',
	'cycles',
	'estimateSize'
] as const;

/**
 * Save a value to localStorage
 */
export function saveToLocalStorage(
	key: string,
	value: string | number
): void {
	try {
		localStorage.setItem(key, String(value));
	} catch (error) {
		if (error instanceof Error) {
			console.warn('[Local Storage] Error saving:', error.message);
		}
	}
}

/**
 * Get a value from localStorage
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
