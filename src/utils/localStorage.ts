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
export function saveToLocalStorage(key: string, value: string | number): void {
	try {
		localStorage.setItem(key, String(value));
	} catch (error) {
		console.error('Error saving to localStorage:', error);
	}
}

/**
 * Get a value from localStorage
 */
export function getFromLocalStorage(key: string, defaultValue: string | number = ''): string {
	try {
		return localStorage.getItem(key) ?? String(defaultValue);
	} catch (error) {
		console.error('Error reading from localStorage:', error);
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
		console.error('Error clearing localStorage:', error);
	}
}
