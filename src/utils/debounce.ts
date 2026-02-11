/**
 * Debounce utility function
 */

type Timer = ReturnType<typeof setTimeout>;

/**
 * Creates a debounced version of a function that delays execution
 * until after wait milliseconds have elapsed since the last call
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: never[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: Timer | null = null;

	return (...args: Parameters<T>): void => {
		if (timeout !== null) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => {
			func(...args);
		}, wait);
	};
}
