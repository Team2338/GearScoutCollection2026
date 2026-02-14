/**
 * Notification utilities for displaying user feedback
 */

import { TIMING } from '@/constants';

export type NotificationType = 'error' | 'success';

/**
 * Display a notification to the user
 * @param message - The message to display
 * @param type - The notification type (error or success)
 * @param duration - How long to show the notification in milliseconds
 */
export function showNotification(
	message: string,
	type: NotificationType,
	duration: number = TIMING.NOTIFICATION_DURATION_DEFAULT
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
		setTimeout(() => notificationDiv.remove(), TIMING.NOTIFICATION_FADE_OUT);
	}, duration);
}

/**
 * Display an error notification
 * @param message - The error message to display
 * @param duration - How long to show the notification in milliseconds
 */
export function showError(message: string, duration = TIMING.NOTIFICATION_DURATION_ERROR): void {
	showNotification(message, 'error', duration);
}

/**
 * Display a success notification
 * @param message - The success message to display
 * @param duration - How long to show the notification in milliseconds
 */
export function showSuccess(message: string, duration = TIMING.NOTIFICATION_DURATION_DEFAULT): void {
	showNotification(message, 'success', duration);
}
