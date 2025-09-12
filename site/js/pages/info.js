//js/pages/info.js
import { fetchWithAuth } from '/js/utils/api.js';
import { initSidebar } from '/js/components/sidebar.js';
import { LIMITS } from '/js/config.js?v=1';

  /****************************************
   * 4) Expansión / Contracción de tarjetas
  ****************************************/
  const cardsGrid   = document.getElementById('cardsGrid');
  const allCards    = document.querySelectorAll('.card');
  const mainHeading = document.getElementById('mainHeading');

  allCards.forEach((card) => {
    const arrowCollapse = card.querySelector('.arrow-collapse');
    const cardTitle = card.querySelector("h2");
    const policyTitle = cardTitle.textContent.trim();
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.arrow-collapse')) {
        return;
      }
      if (!card.classList.contains('expanded')) {
        try{
          const response = await fetchWithAuth(`/policies/get?policy_name=${policyTitle}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              }
            })
            .then(response => response.json())
            .then(data => {
              if (data.found) {
                console.log(data);
                const preservedArrow = arrowCollapse ? arrowCollapse.cloneNode(true) : null;
                const preservedTitle = cardTitle ? cardTitle.cloneNode(true) : null;
                card.innerHTML = "";
                if (preservedArrow) card.appendChild(preservedArrow);
                if (preservedTitle) card.appendChild(preservedTitle);

                if(policyTitle=="Preguntas Frecuentes"){
                  // Crear el contenedor expand-content
                  const expandContent = document.createElement("div");
                  expandContent.classList.add("expand-content");

                  // Crear el párrafo informativo
                  const infoP = document.createElement("p");
                  infoP.style.marginBottom = "4vh";
                  infoP.style.marginTop = "4vh";
                  infoP.style.textAlign = "center";
                  infoP.textContent = "En esta sección se encuentran preguntas frecuentes las cuales puedes responder para agilizar las respuestas del bot. También puedes añadir las tuyas propias.";
                  expandContent.appendChild(infoP);

                  // Crear el contenedor de FAQs
                  const faqContainer = document.createElement("div");
                  faqContainer.id = "faqContainer";

                  // Contenedor que agrupa todos los bloques FAQ
                  const faqBlocks = document.createElement("div");
                  faqBlocks.id = "faqBlocks";

                  // Iterar sobre cada elemento del content (lista de diccionarios)
                  data.content.forEach(faq => {
                    // Cada faq es un objeto con una única clave (la pregunta) y su valor (la respuesta)
                    for (let question in faq) {
                      const answer = faq[question];

                      // Crear el contenedor del bloque FAQ
                      const faqBlock = document.createElement("div");
                      faqBlock.classList.add("faq-block");
                      faqBlock.style.position = "relative";
                      faqBlock.style.marginBottom = "3vh";
                      faqBlock.style.paddingLeft = "1vh";

                      // Contenedor interno para la pregunta y botones
                      const innerDiv = document.createElement("div");

                      // Crear el párrafo con el texto de la pregunta
                      const pQuestion = document.createElement("p");
                      pQuestion.classList.add("faq-question-text");
                      pQuestion.style.width = "fit-content";
                      pQuestion.textContent = question;
                      enforceContentEditableMax(pQuestion, LIMITS.faq_q);

                      // Crear el botón "Editar"
                      const editBtn = document.createElement("button");
                      editBtn.classList.add("edit-faq-btn", "edit-title-btn");
                      editBtn.style.position = "absolute";
                      editBtn.style.top = "0";
                      editBtn.style.right = "10vh";
                      editBtn.textContent = "Editar";

                      // Crear el botón "Eliminar"
                      const deleteBtn = document.createElement("button");
                      deleteBtn.classList.add("delete-faq-btn", "edit-title-btn");
                      deleteBtn.style.position = "absolute";
                      deleteBtn.style.top = "0";
                      deleteBtn.style.right = "0";
                      deleteBtn.style.backgroundColor = "#b93030";
                      deleteBtn.textContent = "Eliminar";

                      // Agregar la pregunta y los botones al contenedor interno
                      innerDiv.appendChild(pQuestion);
                      innerDiv.appendChild(editBtn);
                      innerDiv.appendChild(deleteBtn);

                      // Crear el textarea para la respuesta
                      const textarea = document.createElement("textarea");
                      textarea.classList.add("faq-answer");
                      textarea.placeholder = "Escribe tu respuesta aquí...";
                      textarea.maxLength = LIMITS.faq_a;
                      textarea.style.marginTop = "2vh";
                      textarea.style.minHeight = "1vh";
                      textarea.style.resize = "none";
                      textarea.style.overflowY = "hidden";
                      textarea.style.lineHeight = "1";
                      textarea.style.fontSize = "1.5vh";
                      textarea.value = answer;

                      // Agregar el contenedor interno y el textarea al bloque FAQ
                      faqBlock.appendChild(innerDiv);
                      faqBlock.appendChild(textarea);

                      // Agregar el bloque FAQ al contenedor de bloques
                      faqBlocks.appendChild(faqBlock);
                    }
                  });

                  // Agregar el contenedor de bloques al contenedor principal de FAQs
                  faqContainer.appendChild(faqBlocks);

                  // Crear el contenedor para el botón de añadir FAQ
                  const addFaqBtnContainer = document.createElement("div");
                  addFaqBtnContainer.id = "addFaqBtnContainer";

                  const addFaqBtn = document.createElement("button");
                  addFaqBtn.classList.add("añadir-faq-btn");
                  addFaqBtn.id = "addFaqBtn";
                  addFaqBtn.style.marginTop = "2vh";
                  addFaqBtn.textContent = "Añadir nueva pregunta-respuesta";

                  addFaqBtnContainer.appendChild(addFaqBtn);
                  faqContainer.appendChild(addFaqBtnContainer);

                  // Agregar el contenedor de FAQs al contenedor expand-content
                  expandContent.appendChild(faqContainer);

                  // Crear el botón de enviar final
                  const finalSendBtn = document.createElement("button");
                  finalSendBtn.classList.add("send-button");
                  finalSendBtn.style.marginTop = "2vh";
                  finalSendBtn.textContent = "Enviar";

                  expandContent.appendChild(finalSendBtn);

                  // Agregar expand-content al card (después de la flecha y el título)
                  card.appendChild(expandContent);
                  if (preservedArrow) {
                    console.log("preservedArrow");
                    preservedArrow.addEventListener('click', (e) => {
                      console.log("resultContainer");
                      let resultContainer = card.querySelector(".result-container");
                      if (resultContainer) {
                        resultContainer.style.display = "none";
                      }
                      expandContent.style.display = "none";
                      e.stopPropagation();
                      collapseCard(card);
                    });
                  }
                  addFaqBtn.addEventListener('click', () => {
                    const newBlock = document.createElement('div');
                    newBlock.classList.add('faq-block');
                    newBlock.style.position = 'relative';
                    newBlock.style.marginBottom = '3vh';
                    newBlock.style.paddingLeft = '1vh';

                    newBlock.innerHTML = `
                      <div>
                        <p class="faq-question-text" contenteditable="true" style="width: fit-content;">Nueva pregunta</p>
                        <button class="edit-faq-btn edit-title-btn" style="position:absolute; top:0; right:10vh;">Editar</button>
                        <button class="delete-faq-btn edit-title-btn" style="position:absolute; top:0; right:0; background-color:#b93030;">Eliminar</button>
                      </div>
                      <textarea class="faq-answer" placeholder="Escribe tu respuesta aquí..." style="margin-top: 2vh; min-height: 1vh; resize: none; overflow-y: hidden; line-height: 1; font-size: 1.5vh;"></textarea>
                    `;
                    const qEl = newBlock.querySelector('.faq-question-text');
                    enforceContentEditableMax(qEl, LIMITS.faq_q);
                    faqBlocks.append(newBlock);
                    addFaqBtn.scrollIntoView(false);
                  });
                  procesar_faq(card);
                }else{
                
                  const buttoneditarinfo = document.createElement("button");
                  buttoneditarinfo.classList.add("edit-title-btn");
                  buttoneditarinfo.textContent = "Editar información";
                  buttoneditarinfo.style.position = "relative";
                  buttoneditarinfo.style.fontSize = "2vh";
                  const buttonañadirinfo = document.createElement("button");
                  buttonañadirinfo.classList.add("edit-title-btn");
                  buttonañadirinfo.style.position = "relative";
                  buttonañadirinfo.style.fontSize = "2vh";
                  buttonañadirinfo.textContent = "Añadir informacion nueva";

                  const expandcontentconpolitica = document.createElement("div");
                  expandcontentconpolitica.classList.add("expand-content");
                  expandcontentconpolitica.appendChild(buttoneditarinfo);
                  expandcontentconpolitica.appendChild(buttonañadirinfo);


                  // Style to fill the container
                  expandcontentconpolitica.style.width = "100%";
                  expandcontentconpolitica.style.height = "100%";
                  expandcontentconpolitica.style.display = "flex";
                  expandcontentconpolitica.style.flex = "1";
                  expandcontentconpolitica.style.justifyContent = "center";
                  expandcontentconpolitica.style.alignItems = "center";
                  expandcontentconpolitica.style.gap = "4vh";

                  card.appendChild(expandcontentconpolitica);
                  
                  if (buttoneditarinfo) {
                    buttoneditarinfo.addEventListener('click', async (e) => {
                      e.stopPropagation();
                      
                      try {
                        // Clear the card content but preserve arrow and title
                        card.innerHTML = "";
                        if (preservedArrow) card.appendChild(preservedArrow);
                        if (preservedTitle) card.appendChild(preservedTitle);
                        
                        // Create expand-content div with textarea and send button
                        const expandContent = document.createElement("div");
                        expandContent.classList.add("expand-content");
                        
                        const textarea = document.createElement("textarea");
                        textarea.placeholder = "Escribe tu texto aqui...";
                        textarea.maxLength = LIMITS.policies;
                        if (data.found && data.content) {
                          textarea.value = data.content;
                        }
                        
                        const sendButton = document.createElement("button");
                        sendButton.classList.add("send-button");
                        sendButton.textContent = "Enviar";
                        
                        // Create loading spinner (hidden initially)
                        const loadingSpinner = document.createElement("div");
                        loadingSpinner.classList.add("loading-spinner", "hidden");
                        loadingSpinner.innerHTML = `
                          <div class="loader">
                            <p>Estamos</p>
                            <div class="words">
                              <span class="word">comprobando que tus datos estén completos...</span>
                              <span class="word">revisando que no falte nada...</span>
                              <span class="word">comparando con nuestra base de datos...</span>
                              <span class="word">preparando el feedback...</span>
                              <span class="word">comprobando que tus datos estén completos...</span>
                            </div>
                          </div>
                        `;
                        
                        // Add all elements to expandContent
                        expandContent.appendChild(textarea);
                        expandContent.appendChild(sendButton);
                        expandContent.appendChild(loadingSpinner);
                        
                        // Add expandContent to card
                        card.appendChild(expandContent);
                        
                        procesar_politica(card);

                        // Restore arrow collapse functionality
                        if (preservedArrow) {
                          preservedArrow.addEventListener('click', (e) => {
                            let resultContainer = card.querySelector(".result-container");
                            if (resultContainer) {
                              resultContainer.style.display = "none";
                            }
                            e.stopPropagation();
                            collapseCard(card);
                          });
                        }
                      } catch (error) {
                        console.error("Error al obtener la política para editar:", error);
                      }
                    });
                  }
                  if(buttonañadirinfo){
                    buttonañadirinfo.addEventListener('click', async (e) => {
                      // Clear the card content but preserve arrow and title
                      card.innerHTML = "";
                      if (preservedArrow) card.appendChild(preservedArrow);
                      if (preservedTitle) card.appendChild(preservedTitle);

                      // Create expand-content div with textarea and send button
                      const expandContent = document.createElement("div");
                      expandContent.classList.add("expand-content");

                      // Asignamos el contenido completo en innerHTML
                      expandContent.innerHTML = `
                        <p style="margin-bottom: 4vh; margin-top: 4vh; text-align: center;">
                          En esta sección se encuentran preguntas frecuentes las cuales puedes responder
                          para agilizar las respuestas del bot. También puedes añadir las tuyas propias.
                        </p>
                        <div id="faqContainer" >
                          <div id="faqBlocks">
                            <!-- Pregunta/Respuesta 1 -->
                            <div class="faq-block" style="position: relative; margin-bottom: 3vh; padding-left: 1vh;">
                              <div>
                                <p class="faq-question-text" style="width: fit-content;" contentEditable="true">Escribe aqui el texto</p>
                                <button class="edit-faq-btn edit-title-btn" style="position: absolute; top: 0; right: 10vh;">Editar</button>
                                <button class="delete-faq-btn edit-title-btn" style="position: absolute; top: 0; right: 0; background-color: #b93030;">Eliminar</button>
                              </div>
                              <textarea class="faq-answer"
                                placeholder="Escribe tu respuesta aquí..."
                                style="margin-top: 2vh; min-height: 1vh; resize: none; overflow-y: hidden; line-height: 1; font-size: 1.5vh;"></textarea>
                            </div>
                          </div>
                          <div id="addFaqBtnContainer">
                            <!-- Botón para añadir un nuevo bloque pregunta-respuesta -->
                            <button class="añadir-faq-btn" id="addFaqBtn" style="margin-top: 2vh;">
                              Añadir nueva pregunta-respuesta
                            </button>
                          </div>
                        </div>
                        <!-- Botón de enviar al final -->
                        <button class="send-button" style="margin-top: 2vh;">Enviar</button>
                      `;
                      card.appendChild(expandContent);
                      const addFaqBtn = expandContent.querySelector("#addFaqBtn")
                      const faqBlocks= expandContent.querySelector("#faqBlocks")

                      addFaqBtn.addEventListener('click', () => {
                        console.log("Añadir nueva pregunta");
                        const newBlock = document.createElement('div');
                        newBlock.classList.add('faq-block');
                        newBlock.style.position = 'relative';
                        newBlock.style.marginBottom = '3vh';
                        newBlock.style.paddingLeft = '1vh';

                        newBlock.innerHTML = `
                          <div>
                            <p class="faq-question-text" contenteditable="true" style="width: fit-content;">Nueva pregunta</p>
                            <button class="edit-faq-btn edit-title-btn" style="position:absolute; top:0; right:10vh;">Editar</button>
                            <button class="delete-faq-btn edit-title-btn" style="position:absolute; top:0; right:0; background-color:#b93030;">Eliminar</button>
                          </div>
                          <textarea class="faq-answer" placeholder="Escribe tu respuesta aquí..." style="margin-top: 2vh; min-height: 1vh; resize: none; overflow-y: hidden; line-height: 1; font-size: 1.5vh;"></textarea>
                        `;
                        faqBlocks.append(newBlock);
                        addFaqBtn.scrollIntoView(false);
                      });
                      card.attributes["faq"] = "faq";
                      procesar_faq(card);
                    });
                  }
                  if (preservedArrow) {
                    console.log("preservedArrow");
                    preservedArrow.addEventListener('click', (e) => {
                      let resultContainer = card.querySelector(".result-container");
                      if (resultContainer) {
                        resultContainer.style.display = "none";
                      }
                      expandcontentconpolitica.style.display = "none";
                      e.stopPropagation();
                      collapseCard(card);
                    });
                  }
                }
              }
            })
            .catch(error => console.error("Error al obtener la política:", error));
          expandCard(card);
        } catch (error) {
          console.error("Error al procesar la política:", error);
        }
      }else{
        expandCard(card);
      }
    });
    if (arrowCollapse) {
      arrowCollapse.addEventListener('click', (e) => {
        e.stopPropagation();
        collapseCard(card);
      });
    }
  });

  function expandCard(card) {
    document.querySelectorAll('.card.expanded').forEach((c) => {
      c.classList.remove('expanded');
    });
    card.classList.add('expanded');
    cardsGrid.classList.add('expanded');
    mainHeading.classList.add('hidden-heading');
  }

  function collapseCard(card) {
    card.classList.remove('expanded');
    if (!document.querySelector('.card.expanded')) {
      cardsGrid.classList.remove('expanded');
      mainHeading.classList.remove('hidden-heading');
    }
  }
  /****************************************
   * 6) FAQS (preguntas frecuentes)
  ****************************************/
  // 1) EDITAR y ELIMINAR (delegación de eventos)
  document.addEventListener('click', (e) => {
    const btn = e.target;

    // EDITAR FAQ
    if (btn.matches('.edit-faq-btn')) {
      const faqBlock = btn.closest('.faq-block');
      const questionP = faqBlock.querySelector('.faq-question-text');
      const editing = questionP.isContentEditable;
      questionP.contentEditable = editing ? "false" : "true";
      faqBlock.classList.toggle('editing', !editing);
    }

    // ELIMINAR FAQ
    if (btn.classList.contains('delete-faq-btn')) {
      const faqBlock = btn.closest('.faq-block');
      if (confirm('¿Seguro que deseas eliminar esta pregunta?')) {
        faqBlock.remove();
      }
    }
  });

  // Auto resize textarea
  function autoResizeTextarea(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  document.addEventListener('input', (e) => {
    if (e.target.classList.contains('faq-answer')) {
      autoResizeTextarea(e.target);
    }
  });

  // Añadir nueva pregunta
  const faqBlocks = document.getElementById('faqBlocks');
  const addFaqBtn = document.getElementById('addFaqBtn');

  addFaqBtn.addEventListener('click', () => {
    console.log("Añadir nueva pregunta");
    const newBlock = document.createElement('div');
    newBlock.classList.add('faq-block');
    newBlock.style.position = 'relative';
    newBlock.style.marginBottom = '3vh';
    newBlock.style.paddingLeft = '1vh';

    newBlock.innerHTML = `
      <div>
        <p class="faq-question-text" contenteditable="true" style="width: fit-content;">Nueva pregunta</p>
        <button class="edit-faq-btn edit-title-btn" style="position:absolute; top:0; right:10vh;">Editar</button>
        <button class="delete-faq-btn edit-title-btn" style="position:absolute; top:0; right:0; background-color:#b93030;">Eliminar</button>
      </div>
      <textarea class="faq-answer" placeholder="Escribe tu respuesta aquí..." style="margin-top: 2vh; min-height: 1vh; resize: none; overflow-y: hidden; line-height: 1; font-size: 1.5vh;"></textarea>
    `;
    faqBlocks.append(newBlock);
    addFaqBtn.scrollIntoView(false);
  });

  // Auto resize FAQ answers on input
  faqBlocks.addEventListener('input', (e) => {
    if (e.target.classList.contains('faq-answer')) {
      autoResizeTextarea(e.target);
    }
  });


  /****************************************
   * 7) ENVIAR POLÍTICAS (devoluciones, envíos, info)
  ****************************************/

  document.addEventListener('DOMContentLoaded', () => {
      initSidebar('#sidebarContainer');

    // Seleccionamos TODAS las tarjetas que tengan data-policy-type
    const policyCards = document.querySelectorAll('.card[data-policy-type]');
    const faqCards = document.querySelectorAll('.card[faq]');


    policyCards.forEach(card => {
      procesar_politica(card);
    });

    faqCards.forEach(card => {
      procesar_faq(card);
    });
  });

  function procesar_politica(card) {
    const policyTitle = card.querySelector('h2').textContent.trim(); // Obtener el título de la card expandida
    const textarea   = card.querySelector('textarea');
    const sendBtn    = card.querySelector('.send-button');
    const arrow      = card.querySelector('.arrow-collapse');
    const spinner    = card.querySelector('.loading-spinner');
    
    // Aquí creamos un contenedor donde mostraremos la lista de "faltantes" o mensajes
    // (puedes darle la clase o estilos que quieras)
    const resultContainer = document.createElement('div');
    resultContainer.classList.add('result-container');
    resultContainer.style.display = 'flex';
    resultContainer.style.flexDirection = 'column';
    resultContainer.style.alignItems = 'center';
    resultContainer.style.flexWrap = 'wrap';
    resultContainer.style.paddingTop = '2vh';
    // Lo insertamos antes del textarea, por ejemplo:
    textarea.parentNode.insertBefore(resultContainer, textarea);

    // Cuando pulsamos "Enviar"
    sendBtn.addEventListener('click', async () => {
      const content = textarea.value.trim();
      if (!content) {
        alert("No has escrito nada");
        return;
      }
      if (content.length > LIMITS.policies) {
        alert(`Has superado el máximo de ${LIMITS.policies} caracteres para esta política.`);
        return;
      }

      try {
        // 1) Ocultar lo que el usuario no debe tocar (textarea, botón, flecha)
        textarea.classList.add('hidden');
        sendBtn.classList.add('hidden');
        if (arrow) arrow.classList.add('hidden'); 
        // 2) Mostrar spinner
        spinner.classList.remove('hidden');

        // Limpiamos el contenedor de resultados
        resultContainer.innerHTML = "";

        const response = await fetchWithAuth("/policies/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            policy_type: policyTitle,
            content: content
          })
        });

        if (!response.ok) {
          throw new Error("Error HTTP: " + response.status);
        }
        
        const data = await response.json();
        // 2) Dependiendo del estado:
        if (data.status === "complete") {
          const successMsg = document.createElement('p');
          successMsg.textContent = "¡Felicidades, Ya tienes tu información actualizada! 🎉";
          successMsg.style.textAlign = 'center';
          successMsg.style.fontWeight = 'bold';
          successMsg.style.fontSize = '2em';
          resultContainer.appendChild(successMsg);
          if (arrow) arrow.classList.remove('hidden');
          
        } else if (data.status === "incomplete") {
          const infoMsg = document.createElement('p');
          infoMsg.textContent = "Faltan los siguientes elementos por añadir:";
          // Creamos el contenedor principal del checklist
          const checklistContainer = document.createElement('div');
          checklistContainer.id = "checklist"; // <-- para que aplique el CSS anterior

          // Iteramos cada 'item' faltante
          data.missing_info.forEach((item, index) => {
            // Creamos un id único para el <input> y su <label>
            const checkboxId = `missingItem_${index}`;

            // 1) input[type="checkbox"]
            const inputEl = document.createElement('input');
            inputEl.type = 'checkbox';
            inputEl.value = item;        // Podrías usar item como valor
            inputEl.name = "missing_r";  // el name que gustes
            inputEl.id = checkboxId;

            // 2) label for="checkboxId"
            const labelEl = document.createElement('label');
            labelEl.setAttribute('for', checkboxId);
            // Aquí lo normal es que el texto sea el "item" que falte
            // o que pongas "Falta: item"
            labelEl.textContent = item;

            // Añadir todo dentro del checklistContainer
            checklistContainer.appendChild(inputEl);
            checklistContainer.appendChild(labelEl);
          });

          // Insertamos el checklistContainer en el "resultContainer"
          resultContainer.appendChild(infoMsg);
          resultContainer.appendChild(checklistContainer);

          // Después volvemos a poner el textarea y botón para que el usuario
          // rellene lo que falta, etc.
          textarea.classList.remove('hidden');
          sendBtn.classList.remove('hidden');
          if (arrow) arrow.classList.remove('hidden');
        }else {
          // Respuesta inesperada
          alert("Respuesta inesperada del servidor: " + JSON.stringify(data));
          textarea.classList.remove('hidden');
          sendBtn.classList.remove('hidden');
          if (arrow) arrow.classList.remove('hidden');
        }
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al enviar la política: " + error.message);
        textarea.classList.remove('hidden');
        sendBtn.classList.remove('hidden');
        if (arrow) arrow.classList.remove('hidden');
      } finally {
        // 4) Ocultar el spinner pase lo que pase
        spinner.classList.add('hidden');
      }
    });
  }

  function procesar_faq(card) {
    const policyTitle = card.querySelector('h2').textContent.trim();
    const sendBtn     = card.querySelector('.send-button');
    const arrow       = card.querySelector('.arrow-collapse');
    const spinner     = card.querySelector('.loading-spinner');
    // Si tienes un contenedor de resultados ya definido en el card, lo usas; sino, lo creas.
    const resultContainer = document.createElement('div');
    resultContainer.classList.add('result-container');
    // Insertar el resultContainer debajo del título
    const cardTitle = card.querySelector('h2');
    (card.querySelector('.expand-content') || card).appendChild(resultContainer);

    sendBtn.addEventListener('click', async () => {
      console.log("Procesando FAQ");
      // Recopilamos todos los bloques de pregunta-respuesta dentro de la sección FAQ
      const faqBlocks = card.querySelectorAll('.faq-block');
      let faqList = [];

      for (const [idx, block] of Array.from(faqBlocks).entries()) {
        const questionEl = block.querySelector('.faq-question-text');
        const answerEl   = block.querySelector('.faq-answer');
        if (!questionEl || !answerEl) continue;

        const question = (questionEl.textContent || '').trim();
        const answer   = (answerEl.value || '').trim();

        if (question.length > LIMITS.faq_q) {
          alert(`La pregunta #${idx+1} supera ${LIMITS.faq_q} caracteres.`);
          return;
        }
        if (answer.length > LIMITS.faq_a) {
          alert(`La respuesta #${idx+1} supera ${LIMITS.faq_a} caracteres.`);
          return;
        }
        faqList.push({ [question]: answer });
      }

      // Validación: asegurarse de que se haya ingresado al menos un par pregunta-respuesta
      if (faqList.length === 0) {
        alert("No has ingresado ninguna pregunta-respuesta.");
        return;
      }
      const expandContent = card.querySelector('.expand-content');
      try {
        // Ocultar los elementos que el usuario no debe modificar durante el envío
        const expandContent = card.querySelector('.expand-content');
        if (arrow) arrow.classList.add('hidden');
        sendBtn.classList.add('hidden');

        // Mostrar spinner
        if (spinner) spinner.classList.remove('hidden');

        // Limpiar el contenedor de resultados
        resultContainer.innerHTML = "";

        // Enviar los datos al backend, enviando policyTitle y la lista de FAQ
        const response = await fetchWithAuth("/policies/process", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            policy_type: policyTitle,
            content: faqList
          })
        });

        if (!response.ok) {
          throw new Error("Error HTTP: " + response.status);
        }

        const data = await response.json();

        if (data.status === "complete") {
          const exp = card.querySelector('.expand-content');
          if (exp) {
            [...exp.children].forEach(ch => {
              if (!ch.classList.contains('result-container')) ch.style.display = 'none';
            });
          }

          // Pinta el mensaje de éxito
          resultContainer.innerHTML = "";
          const successMsg = document.createElement('p');
          successMsg.textContent = "¡Felicidades, ya se ha guardado tu informacion! 🎉";
          successMsg.style.textAlign = 'center';
          successMsg.style.fontWeight = 'bold';
          successMsg.style.fontSize = '2em';
          resultContainer.appendChild(successMsg);

          // Muestra la flecha para poder cerrar
          if (arrow) arrow.classList.remove('hidden');
        } else {
          alert("Error al guardar: " + (data.error || "Respuesta inesperada"));
        }
      } catch (error) {
        console.error(error);
        alert("Ocurrió un error al enviar la política: " + error.message);
        
        sendBtn.classList.remove('hidden');
        if (arrow) arrow.classList.remove('hidden');
      }
    });
  }
  function enforceContentEditableMax(el, max) {
    el.addEventListener('input', () => {
      const txt = el.textContent || '';
      if (txt.length > max) {
        el.textContent = txt.slice(0, max);
        // Colocar el cursor al final
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    });
  }