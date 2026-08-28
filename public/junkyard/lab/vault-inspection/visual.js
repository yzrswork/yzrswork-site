(() => {
  'use strict';

  const startButton = document.getElementById('startButton');
  const deferredImages = [
    './assets/vault-mid.webp',
    './assets/vault-deep.webp',
    './assets/vault-traversal.webp',
  ];

  let warmed = false;

  function warmVaultImages() {
    if (warmed) return;
    warmed = true;

    deferredImages.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
    });
  }

  startButton?.addEventListener('click', warmVaultImages, { once: true });
})();
