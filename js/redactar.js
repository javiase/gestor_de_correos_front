// redactar.js
document.addEventListener("DOMContentLoaded", () => {
  loadSidebar();

  const form = document.getElementById("composeForm");
  const editor = document.getElementById("messageInput");
  const toolbarButtons = document.querySelectorAll(".toolbar [data-cmd]");

  // Toolbar: execCommand para dar formato
  toolbarButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const cmd = btn.getAttribute("data-cmd");
      if (cmd === "fontSize") {
        // Para <select>, tomamos el valor seleccionado
        const size = btn.value;
        document.execCommand(cmd, false, size);
      } else {
        document.execCommand(cmd, false, null);
      }
      editor.focus();
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const to = document.getElementById("toInput").value.trim();
    const subject = document.getElementById("subjectInput").value.trim();
    const messageHtml = editor.innerHTML.trim();

    if (!to || !messageHtml) {
      alert("Rellena todos los campos.");
      return;
    }

    try {
      const emailId = Date.now();
      const response = await fetchWithAuth(
        "https://sincere-musical-squid.ngrok-free.app/api/emails/send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emailId,
            recipient: to,
            subject,
            message: messageHtml
          })
        }
      );

      if (!response.ok) throw new Error("Error al enviar el correo");
      alert("Correo enviado con éxito ✅");
      form.reset();
      editor.innerHTML = "";
    } catch (err) {
      console.error(err);
      alert("Ha ocurrido un error al enviar el correo ❌");
    }
  });
});
