/**
 * Script común a todas las páginas.
 * Botones "copiar": <button data-copy="texto" data-done="Copiado">…</button>
 */
(function () {
  'use strict';

  document.querySelectorAll('[data-copy]').forEach((button) => {
    const original = button.textContent;
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent = button.dataset.done || original;
        setTimeout(() => { button.textContent = original; }, 2000);
      } catch (error) {
        console.warn('No se pudo copiar:', error.message);
      }
    });
  });
})();
