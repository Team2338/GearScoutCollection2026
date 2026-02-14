import { memo, useCallback } from 'react';
import './UpdateBanner.scss';

interface IProps {
	hasUpdate: boolean;
	serviceWorker: ServiceWorker | null;
}

/**
 * Update Banner component
 * Displays when a new service worker version is available
 * Memoized to prevent unnecessary re-renders
 */
const UpdateBanner = memo(({ hasUpdate, serviceWorker }: IProps) => {
	// Memoize the click handler to prevent recreation on each render
	const handleUpdate = useCallback(() => {
		if (serviceWorker) {
			serviceWorker.postMessage('SKIP_WAITING');
		}
	}, [serviceWorker]);

	if (!hasUpdate || !serviceWorker) {
		return null;
	}

	return (
		<div className="update-available-banner">
			<span>An update is available!</span>
			<button
				className="update-button"
				onClick={handleUpdate}
				type="button"
				aria-label="Install app update"
			>
				Update
			</button>
		</div>
	);
});

UpdateBanner.displayName = 'UpdateBanner';

export default UpdateBanner;
