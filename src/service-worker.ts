/// <reference lib="webworker" />

type PrecacheEntry = { url: string; revision: string | null };

const sw = self as unknown as ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

const precacheManifest = sw.__WB_MANIFEST;
console.log('precache', precacheManifest);
const precacheUrls: string[] = precacheManifest
	.map((x: PrecacheEntry) => '/' + x.url)
	.concat('/');

const version: string = import.meta.env.VITE_APP_VERSION;
const cachePrefix = 'gs-quant';
const cacheName = `${cachePrefix}_${version}`;

/**
 * Send a message to all connected clients
 * @param msg - Message to send
 */
const messageAllClients = (msg: string): void => {
	sw.clients.matchAll()
		.then((clients: readonly Client[]) =>
			clients.forEach(client => client.postMessage(msg))
		)
		.catch((error: unknown) => {
			console.error('[SW] Error messaging clients:', error);
		});
};

sw.addEventListener('install', (event: ExtendableEvent) => {
	console.log(`[SW] Installing service worker v${version}...`);

	event.waitUntil(
		caches.open(cacheName)
			.then((cache: Cache) => cache.addAll(precacheUrls))
			.then(() => console.log(`[SW] Finished installing v${version}`))
			.catch((error: unknown) => console.error('[SW] Installation failed:', error))
	);
});

sw.addEventListener('activate', (event: ExtendableEvent) => {
	console.log(`[SW] Activating service worker v${version}...`);

	// Delete all old caches matching our prefix
	event.waitUntil(
		caches.keys()
			.then((keys: string[]) => {
				const deletionPromises = keys
					.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
					.map(key => {
						console.log(`[SW] Deleting old cache: ${key}`);
						return caches.delete(key);
					});
				return Promise.all(deletionPromises);
			})
			.then(() => console.log(`[SW] Activated service worker v${version}`))
			.catch((error: unknown) => console.error('[SW] Activation failed:', error))
	);
});

sw.addEventListener('fetch', (event: FetchEvent) => {
	const url: URL = new URL(event.request.url);

	if (precacheUrls.includes(url.pathname)) {
		event.respondWith(cacheFirstThenNetworkAndSave(event));
		return;
	}

	return;
});

sw.addEventListener('message', (event: ExtendableMessageEvent) => {
	console.log('[SW] Received message:', event.data);
	if (event.data === 'SKIP_WAITING') {
		console.log('[SW] Skipping waiting and claiming clients...');
		sw.skipWaiting()
			.then(() => {
				sw.clients.claim()
					.then(() => messageAllClients('UPDATED'))
					.catch((error: unknown) => console.error('[SW] Claim failed:', error));
			})
			.catch((error: unknown) => console.error('[SW] Skip waiting failed:', error));
	}
});

/**
 * Cache-first strategy with network fallback
 * @param event - Fetch event
 * @returns Response from cache or network
 */
const cacheFirstThenNetworkAndSave = async (event: FetchEvent): Promise<Response> => {
	try {
		const cache = await caches.open(cacheName);
		const cachedResponse = await cache.match(event.request);

		if (cachedResponse) {
			return cachedResponse;
		}

		const networkResponse = await fetch(event.request.clone());
		// Only cache successful responses
		if (networkResponse.ok) {
			await cache.put(event.request, networkResponse.clone());
		}
		return networkResponse;
	} catch (error) {
		console.error('[SW] Fetch failed:', error);
		throw error;
	}
};