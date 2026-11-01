self.addEventListener('install', (e) => {
  e.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // A presença deste evento é suficiente para o navegador reconhecer o PWA.
  // Deixamos vazio para que o navegador baixe os arquivos normalmente 
  // e não quebre o site (evita a "tela branca").
});
