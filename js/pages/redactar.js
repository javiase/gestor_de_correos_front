import { initSidebar } from "../components/sidebar.js";
import { sendEmail } from "../utils/api.js";

document.addEventListener("DOMContentLoaded", () => {
  initSidebar("#sidebarContainer");

  const form = document.getElementById("composeForm");
  const editor = document.getElementById("messageInput");
  const toolbarBtns = document.querySelectorAll(".toolbar [data-cmd]");

  // Add a notification area for non-blocking messages
  let notification = document.getElementById("notification");
  if (!notification) {
    notification = document.createElement("div");
    notification.id = "notification";
    notification.style.position = "fixed";
    notification.style.bottom = "20px";
    notification.style.right = "20px";
    notification.style.background = "#333";
    notification.style.color = "#fff";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "5px";
    notification.style.display = "none";
    notification.style.zIndex = "1000";
    document.body.appendChild(notification);
  }

  function showNotification(message, duration = 2000) {
    notification.textContent = message;
    notification.style.display = "block";
    setTimeout(() => {
      notification.style.display = "none";
    }, duration);
  }

  toolbarBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const cmd = btn.dataset.cmd;
      if (cmd === "fontSize") {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          if (!range.collapsed) {
            const span = document.createElement("span");
            span.style.fontSize = btn.value + "px";
            range.surroundContents(span);
          }
        }
      } else if (cmd === "bold") {
        document.execCommand && document.execCommand("bold", false, null); // fallback for bold
      } else if (cmd === "italic") {
        document.execCommand && document.execCommand("italic", false, null); // fallback for italic
      } else {
        // For other commands, implement as needed or use a library
        showNotification(`El comando "${cmd}" no está soportado en este editor.`);
      }
      editor.focus();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const to = document.getElementById("toInput").value.trim();
    const subject = document.getElementById("subjectInput").value.trim();
    const message = editor.innerHTML.trim();
    if (!to || !message) {
      return alert("Rellena todos los campos.");
    }
    try {
      await sendEmail({
        emailId: Date.now(),
        recipient: to,
        subject,
        message,
      });
      alert("Correo enviado con éxito ✅");
      form.reset();
      editor.innerHTML = "";
    } catch (err) {
      console.error(err);
      alert("Error al enviar el correo ❌");
    }
  });
});
