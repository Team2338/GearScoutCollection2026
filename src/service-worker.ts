/// <reference lib="webworker" />

type PrecacheEntry = { url: string; revision: string | null };

declare let self: ServiceWorkerGlobalScope & { __WB_MANIFEST: PrecacheEntry[] };

const precacheManifest = self.__WB_MANIFEST;
console.log('precache', precacheManifest);
const precacheUrls: string[] = precacheManifest
	.map((x: PrecacheEntry) => '/' + x.url)
	.concat('/');

const version: string = import.meta.env.VITE_APP_VERSION;
const cachePrefix = 'gs-quant';
const cacheName = `${cachePrefix}_${version}`;

const messageAllClients = (msg: string): void => {
	self.clients.matchAll()
		.then((clients: readonly Client[]) =>
			clients.forEach(client => client.postMessage(msg))
		);
};

self.addEventListener('install', (event: ExtendableEvent) => {
	console.log(`Installing service worker ${version}...`);

	// TODO: Put the necessary PWA files in persistent storage
	event.waitUntil(
		caches.open(cacheName)
			.then((cache: Cache) => cache.addAll(precacheUrls))
			.then(() => console.log(`Finished installing v${version}`))
	);
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	console.log(`Activating service worker v${version}...`);

	// Delete all old caches matching our prefix
	event.waitUntil(
		caches.keys()
			.then((keys: string[]) => {
				keys.forEach((key: string) => {
					if (key.startsWith(cachePrefix) && key !== cacheName) {
						console.log(`Deleting cache ${key}`);
						caches.delete(key);
					}
				});
			})
			.then(() => console.log(`Activated service worker ${version}`))
	);
});

self.addEventListener('fetch', (event: FetchEvent) => {
	const url: URL = new URL(event.request.url);

	if (precacheUrls.includes(url.pathname)) {
		event.respondWith(cacheFirstThenNetworkAndSave(event));
		return;
	}

	return;
});

self.addEventListener('message', (event: ExtendableMessageEvent) => {
	console.log('Received message:', event);
	if (event.data === 'SKIP_WAITING') {
		console.log('Received update signal!');
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