
interface IConfig {
	onUpdate?: (sw: ServiceWorker) => void;
	onSuccess?: (sw?: ServiceWorker) => void;
}

import { logger } from './utils/logger';

function isLocalHost(): boolean {
	return (
		window.location.hostname === 'localhost'
		|| window.location.hostname === '127.0.0.1' // IPv4
		|| window.location.hostname === '::1' // IPv6
	);
}

export const register = async (config: IConfig) => {
	window.addEventListener('load', async () => {
		if ('serviceWorker' in navigator) {
			if (isLocalHost() || import.meta.env.MODE !== 'production') {
				unregister();
				return;
			}

			try {
				const registration: ServiceWorkerRegistration = await navigator.serviceWorker
					.register('/service-worker.js', {
						type: 'module'
					});

				listenForUpdatedWorkerDownload(registration, config);
				listenForWorkerActivation(config);
				} catch (error) {
				logger.error('Service worker registration error', error);
			}
		}
	});
};

function listenForUpdatedWorkerDownload(registration: ServiceWorkerRegistration, config: IConfig): void {
	// Fired any time the ServiceWorkerRegistration.installing property acquires a new service worker
	registration.onupdatefound = () => {
		const installingWorker: ServiceWorker | null = registration.installing;
		if (!installingWorker) {
			return;
		}

		installingWorker.onstatechange = () => {
			if (installingWorker.state === 'installed') {
					if (registration.active) {
					// There is one SW active and the next one just finished installing
					logger.info('A new service worker is awaiting activation');
					config.onUpdate?.(installingWorker);
				} else {
					// Otherwise, this SW will activate immediately (first-time SW install)
					logger.info('Content is cached for offline use');
				}
			}
		};
	};
}

function listenForWorkerActivation(config: IConfig): void {
	navigator.serviceWorker.addEventListener('controllerchange', () => {
		config.onSuccess?.();
	});
}

export function unregister(): void {
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.ready
			.then((registration) => {
				registration.unregister();
			})
			.catch((error) => {
				logger.error(error.message);
			});
	}
}
