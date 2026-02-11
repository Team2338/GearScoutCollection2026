/**
 * Input sanitization utilities
 */

/**
 * Sanitize user input by trimming whitespace and removing potentially harmful characters
 * @param input - The raw input string
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeInput(input: string): string {
	return input
		.trim()
		.replace(/[<>]/g, '') // Remove potential XSS characters
		.replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
}

/**
 * Sanitize numeric input to ensure it's a valid number
 * @param input - The raw input string
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumericInput(
	input: string,
	min?: number,
	max?: number
): number | null {
	const cleaned = input.trim();
	const num = parseInt(cleaned, 10);
	
	if (isNaN(num)) {
		return null;
	}
	
	if (min !== undefined && num < min) {
		return null;
	}
	
	if (max !== undefined && num > max) {
		return null;
	}
	
	return num;
}

/**
 * Sanitize event code to ensure it follows expected format
 * @param input - The raw event code
 * @returns Sanitized event code (lowercase alphanumeric)
 */
export function sanitizeEventCode(input: string): string {
	return input
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, ''); // Only allow alphanumeric
}
