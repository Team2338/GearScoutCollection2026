/**
 * Notification utilities for displaying user feedback
 */

export type NotificationType = 'error' | 'success';

/**
 * Display a notification to the user
 */
export function showNotification(
	message: string,
	type: NotificationType,
	duration = 3000
): void {
	const id = `${type}-notification`;
	const existing = document.getElementById(id);
	if (existing) {
		existing.remove();
	}

	const notificationDiv = document.createElement('div');
	notificationDiv.id = id;
	notificationDiv.className = id;
	notificationDiv.textContent = message;
	document.body.appendChild(notificationDiv);

	// Force reflow to ensure animation triggers
	void notificationDiv.offsetHeight;

	setTimeout(() => {
		notificationDiv.classList.add('fade-out');
		setTimeout(() => notificationDiv.remove(), 300);
	}, duration);
}

/**
 * Display an error notification
 */
export function showError(message: string, duration = 5000): void {
	showNotification(message, 'error', duration);
}

/**
 * Display a success notification
 */
export function showSuccess(message: string, duration = 3000): void {
	showNotification(message, 'success', duration);
}
