/* Service worker do Afinador Oficial da INCOGNITUNA
   • Página (HTML): rede primeiro → atualizações chegam logo; sem rede usa a cópia guardada.
   • Restantes ficheiros: cópia guardada primeiro, atualizada em segundo plano.
   • A instalação ignora a cache HTTP do browser (cache: 'reload'), para nunca guardar
     uma versão antiga por engano. */
const CACHE = 'incognituna-afinador-v7';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(SHELL.map(async (u) => {
      const res = await fetch(new Request(u, { cache: 'reload' }));
      if (res.ok) await c.put(u, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;   // nunca guarda nada de fora

  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await fetch(req, { cache: 'no-cache' });
        if (res.ok && res.type === 'basic') c.put('index.html', res.clone());
        return res;
      } catch (_) {
        return (await c.match('index.html')) || (await c.match('./')) || Response.error();
      }
    })());
    return;
  }

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(req);
    const network = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') c.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
