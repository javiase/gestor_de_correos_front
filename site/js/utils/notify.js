// /js/utils/notify.js
// UI consistente con el perfil: mensajes apilados + confirm modal.
// Exports: notify.show/info/success/warning/error/confirm

function ensureStyles() {
  if (document.getElementById('notify-styles')) return;
  const css = `
  #messageContainer {
    position: fixed;                 /* SIEMPRE fixed para que acompañe el scroll */
    top: 80px;                       /* Debajo del header */
    right: 16px;                     /* Margen derecho */
    display: flex;
    flex-direction: column;
    gap: .625rem;
    z-index: 10000;
    max-width: min(27.5rem, 90vw);
    pointer-events: none;
  }
  .message {
    display: flex; align-items: center; gap: .625rem;
    padding: .75rem .875rem; border-radius: .625rem;
    box-shadow: 0 .375rem 1.125rem rgba(0,0,0,.25);
    color: #fff; font-size: .875rem; line-height: 1.3;
    backdrop-filter: blur(2px);
    pointer-events: auto;
    animation: slideInRight .3s ease-out;
  }
  @keyframes slideInRight {
    from { transform: translateX(25rem); opacity: 0; }
    to   { transform: translateX(0);      opacity: 1; }
  }
  .message.success { background: #10b981; }
  .message.error   { background: #ef4444; }
  .message.warning { background: #f59e0b; }
  .message.info    { background: #3b82f6; }
  .message .message-close {
    margin-left: auto; background: transparent; border: 0;
    color: inherit; font-size: 1.25rem; cursor: pointer; opacity: .9;
  }

  .notify-modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    display: flex; justify-content: center; align-items: center;
    z-index: 10001;
  }
  .notify-modal {
    background: #2a2a2a; color: #fff; padding: 1.125rem;
    border-radius: .625rem; max-width: 92vw; width: 22.5rem;
    text-align: center;
  }
  .notify-actions { display:flex; justify-content:center; gap: .625rem; margin-top: .875rem; }
  .notify-btn { padding: .5rem .75rem; border-radius: .5rem; border: 0; cursor: pointer; }
  .notify-btn.ok { background:#ef4444; color:#fff; }
  .notify-btn.cancel { background:#444; color:#fff; }
  `;
  const style = Object.assign(document.createElement('style'), { id: 'notify-styles' });
  style.textContent = css;
  document.head.appendChild(style);
}
function ensureContainer() {
  // Con position:fixed, siempre va directo al body para evitar problemas con sticky
  let el = document.getElementById('messageContainer');
  
  if (el) {
    // Si ya existe pero está dentro del main, muévelo al body
    if (el.parentElement !== document.body) {
      el.remove();
      document.body.appendChild(el);
    }
    return el;
  }

  // No existe: créalo directamente en el body
  el = document.createElement('div');
  el.id = 'messageContainer';
  document.body.appendChild(el);
  return el;
}

function show(text, type = 'info', { duration = 5000 } = {}) {
  ensureStyles();
  const container = ensureContainer();

  const msg = document.createElement('div');
  msg.className = `message ${type}`;
  msg.innerHTML = `
    <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
    <span>${text}</span>
    <button class="message-close" aria-label="Cerrar">&times;</button>
  `;
  container.appendChild(msg);

  const close = () => { if (msg && msg.parentNode) msg.remove(); };
  msg.querySelector('.message-close').addEventListener('click', close);
  if (duration > 0) setTimeout(close, duration);
}

async function confirm(text = '¿Estás seguro?', { okText = 'Sí', cancelText = 'No' } = {}) {
  ensureStyles();
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'notify-modal-overlay';
    const box = document.createElement('div');
    box.className = 'notify-modal';
    box.innerHTML = `
      <p style="margin-bottom:8px">${text}</p>
      <div class="notify-actions">
        <button class="notify-btn ok">${okText}</button>
        <button class="notify-btn cancel">${cancelText}</button>
      </div>
    `;
    ov.appendChild(box);
    document.body.appendChild(ov);

    const cleanup = (val) => { ov.remove(); resolve(val); };
    box.querySelector('.ok').onclick = () => cleanup(true);
    box.querySelector('.cancel').onclick = () => cleanup(false);
    ov.addEventListener('click', (e) => { if (e.target === ov) cleanup(false); });
    document.addEventListener('keydown', function onEsc(ev){
      if (ev.key === 'Escape') { document.removeEventListener('keydown', onEsc); cleanup(false); }
    });
  });
}

export const notify = {
  show,
  info: (t, o) => show(t, 'info', o),
  success: (t, o) => show(t, 'success', o),
  warning: (t, o) => show(t, 'warning', o),
  error: (t, o) => show(t, 'error', o),
  confirm,
};
