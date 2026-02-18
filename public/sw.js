self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then((windowClients) => {
            windowClients.forEach((windowClient) => {
                windowClient.navigate(windowClient.url);
            });
        })
    );
    return self.clients.claim();
});
