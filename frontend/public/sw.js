const CACHE_NAME = 'clinicrc-pwa-v4';

// Recursos vitais para o aplicativo carregar o shell visual (mesmo sem dados).
const URLS_TO_CACHE = [
  './',
  'index.html',
  'app.html',
  'upload.html',
  'css/styles-v4.css',
  'css/odontograma.css',
  'js/app.js',
  'js/api-client.js',
  'js/odontograma-anat.js',
  'favicon.ico',
  'icon-192.png',
  'icon-512.png',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.css',
  'https://cdn.jsdelivr.net/npm/easymde/dist/easymde.min.js'
];

// Instalação: o Service Worker faz o cache inicial do App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('SW: Cache aberto e populando App Shell');
      return cache.addAll(URLS_TO_CACHE);
    }).then(() => self.skipWaiting())
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
    }).then(() => self.clients.claim())
  );
});

// Interceptador de Requisições (Fetch)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Ignorar chamadas de API do backend (POST, GET, PUT, DELETE para rotas dinâmicas)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/') || event.request.method !== 'GET') {
    return; // Deixa ir direto para a rede sem cache
  }

  // 2. Estratégia Stale-While-Revalidate para recursos estáticos (CSS, JS, Imagens, Fontes, CDNs)
  // Serve do cache imediatamente e atualiza o cache em background se houver rede.
  const isStaticAsset = URLS_TO_CACHE.some(asset => event.request.url.includes(asset)) || 
                        url.pathname.endsWith('.css') || 
                        url.pathname.endsWith('.js') || 
                        url.pathname.endsWith('.png') || 
                        url.pathname.endsWith('.ico') ||
                        url.hostname.includes('googleapis') ||
                        url.hostname.includes('gstatic') ||
                        url.hostname.includes('jsdelivr');

  if (isStaticAsset) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Em caso de erro de rede (offline), simplesmente falha de forma silenciosa
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
  } else {
    // 3. Estratégia Network-First para as páginas principais HTML (ou rotas não estáticas)
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  }
});
