// js/pages/redactar.js
import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';

document.addEventListener('DOMContentLoaded', () => {
  initSidebar('#sidebarContainer');

  const form       = document.getElementById('composeForm');
  const editor     = document.getElementById('messageInput');
  const toolbarBtns= document.querySelectorAll('.toolbar [data-cmd]');
  const notification = initNotification();

  // Función para aplicar formato al texto seleccionado
  function applyFormat(cmd, value) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    let wrapper;
    switch (cmd) {
      case 'bold':
        wrapper = document.createElement('strong');
        break;
      case 'italic':
        wrapper = document.createElement('em');
        break;
      case 'underline':
        wrapper = document.createElement('span');
        wrapper.style.textDecoration = 'underline';
        break;
      case 'fontSize':
        wrapper = document.createElement('span');
        wrapper.style.fontSize = value + 'px';
        break;
      default:
        return;
    }
    // Extrae el contenido seleccionado y lo envuelve
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
  }

  // Inicializa la zona de notificaciones non-blocking
  function initNotification() {
    let n = document.getElementById('notification');
    if (!n) {
      n = document.createElement('div');
      n.id = 'notification';
      Object.assign(n.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#333',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        display: 'none',
        zIndex: '1000'
      });
      document.body.appendChild(n);
    }
    return n;
  }
  function showNotification(msg, duration = 2000) {
    notification.textContent = msg;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', duration);
  }

  // Botones de la toolbar
  toolbarBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd   = btn.dataset.cmd;
      const value = btn.value;
      applyFormat(cmd, value);
      editor.focus();
    });
  });

  // Envío del formulario
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const to      = document.getElementById('toInput').value.trim();
    const subject = document.getElementById('subjectInput').value.trim();
    const message = DOMPurify.sanitize(editor.innerHTML.trim());

    // Validación
    if (!to) {
      return showNotification('El destinatario es obligatorio');
    }
    if (!message) {
      return showNotification('El cuerpo del mensaje no puede estar vacío');
    }

    try {
      const res = await fetchWithAuth('/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: to, subject, message })
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('422 Validation error:', data);
        return showNotification(
          data.detail || data.message || 'Error al enviar el correo ❌'
        );
      }
      showNotification('Correo enviado con éxito ✅');
      form.reset();
      editor.innerHTML = '';
    } catch (err) {
      console.error('Error inesperado en envío:', err);
      showNotification('Error al enviar el correo ❌');
    }
  });
});
