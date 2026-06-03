const CACHE_NAME = 'clinicrc-pwa-v1';

// Recursos vitais para o aplicativo carregar o shell visual (mesmo sem dados).
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/css/odontograma.css',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalação: o Service Worker faz o cache inicial do App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Cache aberto');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Ativação: limpa caches antigos se a versão mudar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deletando cache antigo', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch: Rede primeiro (Network-first), cai pro Cache se falhar.
// Sendo um CRM com banco de dados, precisamos sempre da versão mais atual.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Se a rede falhar (offline), tenta buscar do cache visual
      return caches.match(event.request);
    })
  );
});
