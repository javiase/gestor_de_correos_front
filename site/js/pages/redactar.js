// js/pages/redactar.js
import { initSidebar } from '/js/components/sidebar.js';
import { fetchWithAuth } from '/js/utils/api.js';
import { enforceFlowGate } from '/js/utils/flow-gate.js';
import { notify } from '/js/utils/notify.js';

enforceFlowGate();

document.addEventListener('DOMContentLoaded', () => {
  initSidebar('#sidebarContainer');

  const form       = document.getElementById('composeForm');
  const editor     = document.getElementById('messageInput');
  const toolbarBtns= document.querySelectorAll('.toolbar [data-cmd]');

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
      return notify.error('El destinatario es obligatorio');
    }
    if (!message) {
      return notify.error('El cuerpo del mensaje no puede estar vacío');
    }

    try {
      const fd = new FormData();
      fd.set('recipient', to);
      fd.set('subject', subject);
      fd.set('message', message); // HTML permitido
      // si añades adjuntos: for (const f of fileInput.files) fd.append('files', f)
      const res = await fetchWithAuth('/emails/send', {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('422 Validation error:', data);
        return notify.error('Error al enviar el correo ❌');
      }
      notify.success('Correo enviado con éxito ✅');
      form.reset();
      editor.innerHTML = '';
    } catch (err) {
      console.error('Error inesperado en envío:', err);
      notify.error('Error al enviar el correo ❌');
    }
  });
});
