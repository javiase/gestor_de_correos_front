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
    backdrop-filter: blur(4px);
  }
  .notify-modal {
    background: #2a2a2a; color: #fff; padding: 1.5rem;
    border-radius: .75rem; max-width: 92vw; width: 28rem;
    text-align: center;
    box-shadow: 0 1rem 3rem rgba(0,0,0,.6);
  }
  .notify-modal-title {
    font-size: 1.5rem; font-weight: 600; margin-bottom: .75rem;
  }
  .notify-modal-message {
    font-size: .95rem; line-height: 1.5; margin-bottom: 1.25rem;
    color: #d1d5db;
  }
  .notify-actions { display:flex; justify-content:center; gap: .625rem; margin-top: .875rem; }
  .notify-btn { 
    padding: .625rem 1.25rem; border-radius: .5rem; border: 0; 
    cursor: pointer; font-size: .875rem; font-weight: 500;
    transition: all .2s ease;
  }
  .notify-btn.primary { background:#e879f9; color:#000; }
  .notify-btn.primary:hover { background:#d946ef; transform: translateY(-1px); }
  .notify-btn.secondary { background:#3a3a3a; color:#fff; }
  .notify-btn.secondary:hover { background:#4a4a4a; }
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

/**
 * Modal informativo con botones personalizados
 * @param {Object} options - Configuración del modal
 * @param {string} options.title - Título del modal
 * @param {string} options.message - Mensaje (puede contener HTML)
 * @param {Array} options.buttons - Array de botones [{text, style, value}]
 * @returns {Promise} - Resuelve con el valor del botón clickeado
 */
async function modal({ title = '', message = '', buttons = [] } = {}) {
  ensureStyles();
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'notify-modal-overlay';
    const box = document.createElement('div');
    box.className = 'notify-modal';
    
    let html = '';
    if (title) html += `<div class="notify-modal-title">${title}</div>`;
    if (message) html += `<div class="notify-modal-message">${message}</div>`;
    
    if (buttons.length > 0) {
      html += '<div class="notify-actions">';
      buttons.forEach((btn, idx) => {
        const style = btn.style || 'secondary';
        const text = btn.text || 'OK';
        html += `<button class="notify-btn ${style}" data-idx="${idx}">${text}</button>`;
      });
      html += '</div>';
    }
    
    box.innerHTML = html;
    ov.appendChild(box);
    document.body.appendChild(ov);

    const cleanup = (value) => { ov.remove(); resolve(value); };
    
    // Click en botones
    box.querySelectorAll('.notify-btn').forEach((btn, idx) => {
      btn.onclick = () => cleanup(buttons[idx]?.value ?? idx);
    });
    
    // Click fuera cierra sin valor
    ov.addEventListener('click', (e) => { if (e.target === ov) cleanup(null); });
    
    // ESC cierra sin valor
    const onEsc = (ev) => {
      if (ev.key === 'Escape') {
        document.removeEventListener('keydown', onEsc);
        cleanup(null);
      }
    };
    document.addEventListener('keydown', onEsc);
  });
}

export const notify = {
  show,
  info: (t, o) => show(t, 'info', o),
  success: (t, o) => show(t, 'success', o),
  warning: (t, o) => show(t, 'warning', o),
  error: (t, o) => show(t, 'error', o),
  confirm,
  modal,
};
