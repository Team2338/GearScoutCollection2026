/**
 * Form validation utilities
 */

/**
 * Display a validation error for a specific form field
 * @param fieldId - The ID of the form field
 * @param message - The error message to display
 */
export function showValidationError(
	fieldId: string,
	message: string
): void {
	const formField = document.getElementById(fieldId)?.closest('.form-field');
	if (!formField) {
		return;
	}

	// Remove any existing error
	formField.querySelector('.field-error')?.remove();

	// Create and append new error message
	const errorSpan = document.createElement('span');
	errorSpan.className = 'field-error';
	errorSpan.textContent = message;
	formField.appendChild(errorSpan);
	formField.classList.add('has-error');
}

/**
 * Clear validation error for a specific form field
 * @param fieldId - The ID of the form field
 */
export function clearValidationError(fieldId: string): void {
	const formField = document.getElementById(fieldId)?.closest('.form-field');
	if (!formField) {
		return;
	}

	formField.querySelector('.field-error')?.remove();
	formField.classList.remove('has-error');
}
