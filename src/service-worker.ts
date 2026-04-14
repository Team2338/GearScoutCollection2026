/// <reference lib="webworker" />

type PrecacheEntry = { url: string; revision: string | null };

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

import { logger } from './utils/logger';

const precacheManifest = self.__WB_MANIFEST;
const precacheUrls = [...precacheManifest.map(({ url }) => '/' + url), '/'];

const version: string = import.meta.env.VITE_APP_VERSION;
const cachePrefix = 'gs-quant';
const cacheName = `${cachePrefix}_${version}`;

const messageAllClients = (msg: string): void => {
	void self.clients.matchAll().then((clients) => clients.forEach((client) => client.postMessage(msg)));
};

self.addEventListener('install', (event: ExtendableEvent) => {
	logger.info(`Installing service worker ${version}...`);

	event.waitUntil(
		caches.open(cacheName)
			.then((cache: Cache) => cache.addAll(precacheUrls))
			.then(() => logger.info(`Finished installing v${version}`))
	);
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	logger.info(`Activating service worker v${version}...`);

	event.waitUntil(
		caches.keys()
			.then((keys: string[]) => {
				keys.forEach((key: string) => {
					if (key.startsWith(cachePrefix) && key !== cacheName) {
						caches.delete(key);
					}
				});
			})
			.then(() => logger.info(`Activated service worker ${version}`))
	);
});

self.addEventListener('fetch', (event: FetchEvent) => {
	const url: URL = new URL(event.request.url);

	if (precacheUrls.includes(url.pathname)) {
		event.respondWith(cacheFirstThenNetworkAndSave(event));
	}
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
	if (event.data === 'SKIP_WAITING') {
		self.skipWaiting()
			.then(() => {
				self.clients.claim()
					.then(() => messageAllClients('UPDATED'));
			});
	}
});

const cacheFirstThenNetworkAndSave = async (event: FetchEvent): Promise<Response> => {
	const request: Request = event.request.clone();
	const cache: Cache = await caches.open(cacheName);
	const cacheResponse: Response | undefined = await cache.match(event.request);

	if (cacheResponse) return cacheResponse;

	const networkResponse: Response = await fetch(request);
	cache.put(request, networkResponse.clone());
	return networkResponse;
};