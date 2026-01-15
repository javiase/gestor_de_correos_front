#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para traducir completamente info.html con data-i18n
"""

import re

def translate_info_html():
    filepath = r"site\secciones\info.html"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # SECCIÓN DEVOLUCIONES - Campos ya traducidos antes que se perdieron con git checkout
    
    # Días para devolver
    content = content.replace(
        '<label>🗓️ Los clientes disponen de</label>',
        '<label data-i18n="info.returnsDays">🗓️ Los clientes disponen de</label>'
    )
    content = content.replace(
        '<label> días </label>',
        '<label data-i18n="info.days"> días </label>'
    )
    content = content.replace(
        'data-value="naturales">naturales</button>',
        'data-value="naturales" data-i18n="info.naturalDays">naturales</button>'
    )
    content = content.replace(
        'data-value="laborales">laborales</button>',
        'data-value="laborales" data-i18n="info.businessDays">laborales</button>'
    )
    content = content.replace(
        '<label> para devolver un producto</label>',
        '<label data-i18n="info.toReturnProduct"> para devolver un producto</label>'
    )
    
    # Estado del artículo
    content = content.replace(
        '<label>📦 Estado en el que debe estar el artículo para ser aceptado como devolución</label>',
        '<label data-i18n="info.productState">📦 Estado en el que debe estar el artículo para ser aceptado como devolución</label>'
    )
    content = content.replace(
        'data-value="Sin usar">Sin usar</button>',
        'data-value="Sin usar" data-i18n="info.unused">Sin usar</button>'
    )
    content = content.replace(
        'data-value="Con etiqueta">Con etiqueta</button>',
        'data-value="Con etiqueta" data-i18n="info.withTag">Con etiqueta</button>'
    )
    content = content.replace(
        'data-value="Embalaje original">Embalaje original</button>',
        'data-value="Embalaje original" data-i18n="info.originalPackaging">Embalaje original</button>'
    )
    content = content.replace(
        'data-value="Precintado">Precintado</button>',
        'data-value="Precintado" data-i18n="info.sealed">Precintado</button>'
    )
    
    # Coste de devolución
    content = content.replace(
        '<label>💸 Coste de devolución</label>',
        '<label data-i18n="info.returnCost">💸 Coste de devolución</label>'
    )
    content = content.replace(
        'data-value="cliente">A cargo del cliente</button>',
        'data-value="cliente" data-i18n="info.customerPays">A cargo del cliente</button>'
    )
    content = content.replace(
        'data-value="tienda">Gratis (lo asume la tienda)</button>',
        'data-value="tienda" data-i18n="info.storePays">Gratis (lo asume la tienda)</button>'
    )
    
    # SECCIÓN DEVOLUCIONES - Campos restantes
    
    # Método de reembolso
    content = content.replace(
        '<label>↩️ Método de reembolso</label>',
        '<label data-i18n="info.refundMethod">↩️ Método de reembolso</label>'
    )
    # Añadir (N/A) después del label de método de reembolso
    content = re.sub(
        r'(<label data-i18n="info\.refundMethod">.*?</label>\s*<button[^>]*data-na-toggle[^>]*>)\(N/A\)',
        r'\1<span data-i18n="info.notApplicable">(N/A)</span>',
        content
    )
    content = content.replace(
        'data-value="Mismo medio de pago">Mismo medio de pago</button>',
        'data-value="Mismo medio de pago" data-i18n="info.samePaymentMethod">Mismo medio de pago</button>'
    )
    content = content.replace(
        'data-value="Vale de tienda">Vale de tienda</button>',
        'data-value="Vale de tienda" data-i18n="info.storeCredit">Vale de tienda</button>'
    )
    content = content.replace(
        'data-value="Cambio por otro producto">Cambio por otro producto</button>',
        'data-value="Cambio por otro producto" data-i18n="info.exchangeProduct">Cambio por otro producto</button>'
    )
    # Otro + (método reembolso)
    content = re.sub(
        r'(<button[^>]*chip-other[^>]*data-other[^>]*>)Otro \+',
        r'\1<span data-i18n="info.other">Otro +</span>',
        content,
        count=1  # Solo primera ocurrencia en método reembolso
    )
    # Especifica otro (método reembolso) 
    content = re.sub(
        r'(<input class="chip-other-input"[^>]*>)',
        r'<input class="chip-other-input" type="text" data-i18n-placeholder="info.specifyOther" placeholder="Especifica \'Otro\'…" />',
        content,
        count=1  # Primera ocurrencia
    )
    
    # Plazo de reembolso
    content = content.replace(
        '<label>⏱️ Plazo de reembolso</label>',
        '<label data-i18n="info.refundTimeframe">⏱️ Plazo de reembolso</label>'
    )
    content = content.replace(
        '            Reembolsamos el dinero aproximadamente en',
        '            <span data-i18n="info.refundTimeText">Reembolsamos el dinero aproximadamente en</span>'
    )
    content = content.replace(
        'name="reembolso_dias" placeholder="7"> días.',
        'name="reembolso_dias" placeholder="7"> <span data-i18n="info.days">días</span>.'
    )
    
    # Cancelación de pedido
    content = content.replace(
        '<label>🛑 Cuando se puede cancelar un pedido</label>',
        '<label data-i18n="info.orderCancellation">🛑 Cuando se puede cancelar un pedido</label>'
    )
    content = content.replace(
        'data-value="Si no ha salido del almacén">Si no ha salido del almacén</button>',
        'data-value="Si no ha salido del almacén" data-i18n="info.notLeftWarehouse">Si no ha salido del almacén</button>'
    )
    content = content.replace(
        'data-value="Dentro de X horas">Dentro de las primeras 24 horas</button>',
        'data-value="Dentro de X horas" data-i18n="info.withinHours">Dentro de las primeras 24 horas</button>'
    )
    
    # Link a política de devoluciones
    content = content.replace(
        '<label>🔗 Enlace a la política de devoluciones</label>',
        '<label data-i18n="info.returnsPolicyLink">🔗 Enlace a la política de devoluciones</label>'
    )
    content = content.replace(
        'name="url_devoluciones" placeholder="https://tutienda.com/devoluciones (opcional)">',
        'name="url_devoluciones" data-i18n-placeholder="info.returnsPolicyLinkPlaceholder" placeholder="https://tutienda.com/devoluciones (opcional)">'
    )
    
    # Campos marcados como no aplican (devoluciones)
    content = content.replace(
        '<h4>Campos marcados como "No aplican"</h4>',
        '<h4 data-i18n="info.fieldsMarkedNA">Campos marcados como "No aplican"</h4>',
        1  # Solo la primera ocurrencia
    )
    
    # Tu política completa de devoluciones
    content = content.replace(
        '<h3 class="user-policy-title">📄 Tu política completa de devoluciones</h3>',
        '<h3 class="user-policy-title" data-i18n="info.yourCompleteReturnsPolicy">📄 Tu política completa de devoluciones</h3>'
    )
    content = content.replace(
        '<p class="policy-note">Pega aquí <strong>únicamente el texto de tu política</strong>. No añadas instrucciones de comportamiento para el bot, serán ignoradas.</p>',
        '<p class="policy-note" data-i18n="info.policyNote">Pega aquí <strong>únicamente el texto de tu política</strong>. No añadas instrucciones de comportamiento para el bot, serán ignoradas.</p>',
        1  # Primera ocurrencia (devoluciones)
    )
    content = content.replace(
        'placeholder="Pega aquí tu política completa de devoluciones…"',
        'data-i18n-placeholder="info.pasteReturnsPolicyPlaceholder" placeholder="Pega aquí tu política completa de devoluciones…"'
    )
    
    # Botón guardar (devoluciones)
    content = content.replace(
        '<button type="submit" class="send-button pf-submit">Guardar</button>',
        '<button type="submit" class="send-button pf-submit" data-i18n="info.save">Guardar</button>',
        1  # Primera ocurrencia
    )
    
    # Loading spinner (devoluciones)
    content = content.replace(
        '                      <p>Estamos</p>',
        '                      <p data-i18n="info.weAre">Estamos</p>',
        1  # Primera ocurrencia
    )
    content = content.replace(
        '                        <span class="word">guardando tu información...</span>',
        '                        <span class="word" data-i18n="info.savingYourInfo">guardando tu información...</span>',
        1  # Primera ocurrencia
    )
    content = content.replace(
        '                        <span class="word">validando campos...</span>',
        '                        <span class="word" data-i18n="info.validatingFields">validando campos...</span>',
        1  # Primera ocurrencia
    )
    content = content.replace(
        '                        <span class="word">actualizando la base de datos...</span>',
        '                        <span class="word" data-i18n="info.updatingDatabase">actualizando la base de datos...</span>',
        1  # Primera ocurrencia
    )
    content = content.replace(
        '                        <span class="word">preparando confirmación...</span>',
        '                        <span class="word" data-i18n="info.preparingConfirmation">preparando confirmación...</span>',
        1  # Primera ocurrencia
    )
    
    # SECCIÓN ENVÍOS
    
    # SECCIÓN ENVÍOS
    
    content = content.replace(
        '              <h2>Política de Envíos</h2>',
        '              <h2 data-i18n="info.shippingPolicy">Política de Envíos</h2>'
    )
    
    # Anuncio de envíos (también debe tener las mismas claves de importante, formDescription, pastePolicyInstructions)
    # Pero como ya se tradujeron arriba en devoluciones, aquí necesito buscar la segunda ocurrencia
    lines = content.split('\n')
    important_count = 0
    for i, line in enumerate(lines):
        if '<strong>ℹ️ Importante:</strong>' in line and 'data-i18n' not in line:
            important_count += 1
            if important_count == 2:  # Segunda ocurrencia (envíos)
                lines[i] = line.replace(
                    '<strong>ℹ️ Importante:</strong>',
                    '<strong data-i18n="info.important">ℹ️ Importante:</strong>'
                )
    content = '\n'.join(lines)
    
    # Agregar data-i18n a las frases del anuncio de envíos
    # Buscar la segunda ocurrencia de cada texto
    content = re.sub(
        r'(este formulario recoge la <em>información mínima</em> para que el bot funcione bien\.)',
        r'<span data-i18n="info.formDescription">\1</span>',
        content,
        count=2  # Devoluciones y Envíos
    )
    content = re.sub(
        r'(Debes pegar tu política completa al final del formulario, para que el bot pueda usarla\.)',
        r'<span data-i18n="info.pastePolicyInstructions">\1</span>',
        content,
        count=2  # Devoluciones y Envíos
    )
    
    # Tarifas
    content = content.replace(
        '<label>💶 Tarifas</label>',
        '<label data-i18n="info.rates">💶 Tarifas</label>'
    )
    content = content.replace(
        '                          <span>Zona</span><span>Precio</span><span>Tiempo</span><span>Notas</span><span></span>',
        '                          <span data-i18n="info.zone">Zona</span><span data-i18n="info.price">Precio</span><span data-i18n="info.time">Tiempo</span><span data-i18n="info.notes">Notas</span><span></span>'
    )
    content = content.replace(
        'data-add-row>+ Añadir fila</button>',
        'data-add-row data-i18n="info.addRow">+ Añadir fila</button>'
    )
    
    # Zonas de envío
    content = content.replace(
        '<label>🗺️ Zonas de envío</label>',
        '<label data-i18n="info.shippingZones">🗺️ Zonas de envío</label>'
    )
    content = content.replace(
        'data-value="Nacional (España)">Nacional (España)</button>',
        'data-value="Nacional (España)" data-i18n="info.national">Nacional (España)</button>'
    )
    content = content.replace(
        'data-value="UE">UE</button>',
        'data-value="UE" data-i18n="info.eu">UE</button>'
    )
    content = content.replace(
        'data-value="Internacional">Internacional</button>',
        'data-value="Internacional" data-i18n="info.international">Internacional</button>'
    )
    content = content.replace(
        'País/es concretos +</button>',
        'data-i18n="info.specificCountries">País/es concretos +</button>'
    )
    content = content.replace(
        'placeholder="Especifica país/es…"',
        'data-i18n-placeholder="info.specifyCountries" placeholder="Especifica país/es…"'
    )
    
    # Tiempo estimado global
    content = content.replace(
        '<label>⏱️ Tiempo estimado global</label>',
        '<label data-i18n="info.globalEstimatedTime">⏱️ Tiempo estimado global</label>'
    )
    
    # Identificadores de pedido
    content = content.replace(
        '<label>📬 Identificadores de pedido</label>',
        '<label data-i18n="info.orderIds">📬 Identificadores de pedido</label>'
    )
    content = content.replace(
        '                        ¿Se proporciona número de seguimiento?',
        '                        <span data-i18n="info.trackingProvided">¿Se proporciona número de seguimiento?</span>'
    )
    content = content.replace(
        'data-value="sí">Sí</button>',
        'data-value="sí" data-i18n="info.yes">Sí</button>'
    )
    content = content.replace(
        'data-value="no">No</button>',
        'data-value="no" data-i18n="info.no">No</button>'
    )
    content = content.replace(
        '<label>🕒 ¿Cuándo se envía el seguimiento?</label>',
        '<label data-i18n="info.whenTrackingSent">🕒 ¿Cuándo se envía el seguimiento?</label>'
    )
    content = content.replace(
        'name="tracking_cuando" placeholder="Ej. al despachar el pedido / 24h después">',
        'name="tracking_cuando" data-i18n-placeholder="info.whenTrackingSentPlaceholder" placeholder="Ej. al despachar el pedido / 24h después">'
    )
    
    # Seguimiento del envío
    content = content.replace(
        '<label>🔎 Seguimiento del envío</label>',
        '<label data-i18n="info.shipmentTracking">🔎 Seguimiento del envío</label>'
    )
    content = content.replace(
        'data-value="Email con enlace">Email con enlace</button>',
        'data-value="Email con enlace" data-i18n="info.emailWithLink">Email con enlace</button>'
    )
    content = content.replace(
        'data-value="Cuenta de cliente">En nuestra página web</button>',
        'data-value="Cuenta de cliente" data-i18n="info.onWebsite">En nuestra página web</button>'
    )
    content = content.replace(
        'data-value="Enlace del transportista">Enlace del transportista</button>',
        'data-value="Enlace del transportista" data-i18n="info.carrierLink">Enlace del transportista</button>'
    )
    content = content.replace(
        'name="tracking_url" placeholder="URL de seguimiento (opcional)">',
        'name="tracking_url" data-i18n-placeholder="info.trackingUrlPlaceholder" placeholder="URL de seguimiento (opcional)">'
    )
    
    # Link a política de envíos
    content = content.replace(
        '<label>🔗 Link a política de envíos</label>',
        '<label data-i18n="info.shippingPolicyLink">🔗 Link a política de envíos</label>'
    )
    content = content.replace(
        'name="url_envios" placeholder="https://tutienda.com/envios (opcional)">',
        'name="url_envios" data-i18n-placeholder="info.shippingPolicyLinkPlaceholder" placeholder="https://tutienda.com/envios (opcional)">'
    )
    
    # Política completa de envíos
    content = content.replace(
        '<h3 class="user-policy-title">📄 Tu política completa de envíos</h3>',
        '<h3 class="user-policy-title" data-i18n="info.yourCompleteShippingPolicy">📄 Tu política completa de envíos</h3>'
    )
    content = content.replace(
        'placeholder="Pega aquí tu política completa de envíos…"',
        'data-i18n-placeholder="info.pasteShippingPolicyPlaceholder" placeholder="Pega aquí tu política completa de envíos…"'
    )
    
    # SECCIÓN INFO GENERAL
    
    content = content.replace(
        '              <h2>Información general de la tienda</h2>',
        '              <h2 data-i18n="info.generalInfo">Información general de la tienda</h2>'
    )
    content = content.replace(
        '<p class="policy-tip">🧾 Métodos de pago, ubicación, garantías…</p>',
        '<p class="policy-tip" data-i18n="info.generalInfoTip">🧾 Métodos de pago, ubicación, garantías…</p>'
    )
    
    # Métodos de pago
    content = content.replace(
        '<label>💳 Métodos de pago aceptados</label>',
        '<label data-i18n="info.paymentMethods">💳 Métodos de pago aceptados</label>'
    )
    content = content.replace(
        'data-value="Visa">Visa</button>',
        'data-value="Visa" data-i18n="info.visa">Visa</button>'
    )
    content = content.replace(
        'data-value="Mastercard">Mastercard</button>',
        'data-value="Mastercard" data-i18n="info.mastercard">Mastercard</button>'
    )
    content = content.replace(
        'data-value="PayPal">PayPal</button>',
        'data-value="PayPal" data-i18n="info.paypal">PayPal</button>'
    )
    content = content.replace(
        'data-value="Bizum">Bizum</button>',
        'data-value="Bizum" data-i18n="info.bizum">Bizum</button>'
    )
    content = content.replace(
        'data-value="Transferencia">Transferencia</button>',
        'data-value="Transferencia" data-i18n="info.bankTransfer">Transferencia</button>'
    )
    content = content.replace(
        'data-value="Contra reembolso">Contra reembolso</button>',
        'data-value="Contra reembolso" data-i18n="info.cashOnDelivery">Contra reembolso</button>'
    )
    content = content.replace(
        'data-value="Apple Pay">Apple Pay</button>',
        'data-value="Apple Pay" data-i18n="info.applePay">Apple Pay</button>'
    )
    content = content.replace(
        'data-value="Google Pay">Google Pay</button>',
        'data-value="Google Pay" data-i18n="info.googlePay">Google Pay</button>'
    )
    
    # Ubicación
    content = content.replace(
        '<label>📍 Ubicación</label>',
        '<label data-i18n="info.location">📍 Ubicación</label>'
    )
    content = content.replace(
        'data-value="Online">Online</button>',
        'data-value="Online" data-i18n="info.online">Online</button>'
    )
    content = content.replace(
        'data-value="Física">Física</button>',
        'data-value="Física" data-i18n="info.physical">Física</button>'
    )
    content = content.replace(
        'name="direccion_tienda" placeholder="Dirección de la tienda">',
        'name="direccion_tienda" data-i18n-placeholder="info.storeAddress" placeholder="Dirección de la tienda">'
    )
    
    # Cambio de dirección
    content = content.replace(
        '<label>🚚 Cambio de dirección tras pedido</label>',
        '<label data-i18n="info.addressChange">🚚 Cambio de dirección tras pedido</label>'
    )
    content = content.replace(
        '¿Bajo qué condiciones el cliente puede cambiar la dirección de envío?¿Y qué plazo tiene para ello?',
        '<span data-i18n="info.addressChangeConditions">¿Bajo qué condiciones el cliente puede cambiar la dirección de envío?¿Y qué plazo tiene para ello?</span>'
    )
    content = content.replace(
        'name="cambio_direccion_condiciones" rows="3" placeholder="Condiciones / plazo"></textarea>',
        'name="cambio_direccion_condiciones" rows="3" data-i18n-placeholder="info.addressChangePlaceholder" placeholder="Condiciones / plazo"></textarea>'
    )
    
    # Tabla de tallas
    content = content.replace(
        '<label>📏 Tabla de tallas</label>',
        '<label data-i18n="info.sizeChart">📏 Tabla de tallas</label>'
    )
    content = content.replace(
        'name="tabla_tallas_url" placeholder="Dónde se encuentra?">',
        'name="tabla_tallas_url" data-i18n-placeholder="info.sizeChartLocation" placeholder="Dónde se encuentra?">'
    )
    
    # Garantía
    content = content.replace(
        '<label>🛡️ Garantía</label>',
        '<label data-i18n="info.warranty">🛡️ Garantía</label>'
    )
    content = content.replace(
        'data-value="Sin garantía">Sin garantía</button>',
        'data-value="Sin garantía" data-i18n="info.noWarranty">Sin garantía</button>'
    )
    content = content.replace(
        'data-value="Días">Días</button>',
        'data-value="Días" data-i18n="info.warrantyDays">Días</button>'
    )
    content = content.replace(
        'data-value="Meses">Meses</button>',
        'data-value="Meses" data-i18n="info.warrantyMonths">Meses</button>'
    )
    content = content.replace(
        'data-value="Años">Años</button>',
        'data-value="Años" data-i18n="info.warrantyYears">Años</button>'
    )
    content = content.replace(
        '                          Duración:',
        '                          <span data-i18n="info.duration">Duración:</span>'
    )
    
    # SECCIÓN FAQ
    
    content = content.replace(
        '              <h2>Preguntas Frecuentes</h2>',
        '              <h2 data-i18n="info.faq">Preguntas Frecuentes</h2>'
    )
    content = content.replace(
        '                  ❓ Aquí configuras tus Preguntas Frecuentes. Escribe la <strong>pregunta de forma literal</strong> y una <strong>respuesta exacta</strong> tal y como quieres que la vea el cliente.',
        '                  <span data-i18n="info.faqTip">❓ Aquí configuras tus Preguntas Frecuentes. Escribe la <strong>pregunta de forma literal</strong> y una <strong>respuesta exacta</strong> tal y como quieres que la vea el cliente.</span>'
    )
    content = content.replace(
        '<h4 style="font-weight:600; color:#9CA3AF; margin-bottom:1.5vh;">No aplican</h4>',
        '<h4 style="font-weight:600; color:#9CA3AF; margin-bottom:1.5vh;" data-i18n="info.notApply">No aplican</h4>'
    )
    content = content.replace(
        'id="faqAdd">+ Añadir pregunta</button>',
        'id="faqAdd" data-i18n="info.addQuestion">+ Añadir pregunta</button>'
    )
    
    # SIDEBAR
    
    content = content.replace(
        '<button class="info-tab" aria-expanded="false" aria-label="Mostrar panel">',
        '<button class="info-tab" aria-expanded="false" data-i18n-aria-label="info.showPanel" aria-label="Mostrar panel">'
    )
    content = content.replace(
        '          <h3>Propuestas de información a añadir</h3>',
        '          <h3 data-i18n="info.sidebarTitle">Propuestas de información a añadir</h3>'
    )
    
    # TRADUCCIONES GLOBALES - Todos los botones (N/A) faltantes
    content = re.sub(
        r'(<button[^>]*class="na-faq-btn"[^>]*data-na-toggle[^>]*>)\(N/A\)</button>',
        r'\1<span data-i18n="info.notApplicable">(N/A)</span></button>',
        content
    )
    
    # Todos los "Otro +" faltantes
    content = re.sub(
        r'(<button[^>]*chip-other[^>]*data-other[^>]*)>Otro \+</button>',
        r'\1 data-i18n="info.other">Otro +</button>',
        content
    )
    
    # Todos los inputs "Especifica 'Otro'…" faltantes (simple replace, no regex)
    # Con comillas escapadas \'
    content = content.replace(
        '<input class="chip-other-input" type="text" placeholder="Especifica \'Otro\'…" />',
        '<input class="chip-other-input" type="text" data-i18n-placeholder="info.specifyOther" placeholder="Especifica \'Otro\'…" />'
    )
    # Con comillas normales '
    content = content.replace(
        '<input class="chip-other-input" type="text" placeholder="Especifica \'Otro\'…" />',
        '<input class="chip-other-input" type="text" data-i18n-placeholder="info.specifyOther" placeholder="Especifica \'Otro\'…" />'
    )
    content = content.replace(
        '<input class="chip-other-input" type="text" placeholder="Especifica \'Otro\'…">',
        '<input class="chip-other-input" type="text" data-i18n-placeholder="info.specifyOther" placeholder="Especifica \'Otro\'…">'
    )
    # Versión con comillas curvas
    content = content.replace(
        'placeholder="Especifica \'Otro\'…"',
        'data-i18n-placeholder="info.specifyOther" placeholder="Especifica \'Otro\'…"'
    )
    
    # Todos los "Guardar" buttons y loading spinners en TODAS las secciones
    content = re.sub(
        r'<button type="submit" class="send-button pf-submit">Guardar</button>',
        r'<button type="submit" class="send-button pf-submit" data-i18n="info.save">Guardar</button>',
        content
    )
    content = re.sub(
        r'<button class="send-button" id="faqSend">Guardar</button>',
        r'<button class="send-button" id="faqSend" data-i18n="info.save">Guardar</button>',
        content
    )
    
    # Todos los loading spinners
    content = re.sub(
        r'<p>Estamos</p>',
        r'<p data-i18n="info.weAre">Estamos</p>',
        content
    )
    content = re.sub(
        r'<span class="word">guardando tu información\.\.\.</span>',
        r'<span class="word" data-i18n="info.savingYourInfo">guardando tu información...</span>',
        content
    )
    content = re.sub(
        r'<span class="word">validando campos\.\.\.</span>',
        r'<span class="word" data-i18n="info.validatingFields">validando campos...</span>',
        content
    )
    content = re.sub(
        r'<span class="word">actualizando la base de datos\.\.\.</span>',
        r'<span class="word" data-i18n="info.updatingDatabase">actualizando la base de datos...</span>',
        content
    )
    content = re.sub(
        r'<span class="word">preparando confirmación\.\.\.</span>',
        r'<span class="word" data-i18n="info.preparingConfirmation">preparando confirmación...</span>',
        content
    )
    
    # Campos marcados como "No aplican" en TODAS las secciones
    content = re.sub(
        r'<h4>Campos marcados como "No aplican"</h4>',
        r'<h4 data-i18n="info.fieldsMarkedNA">Campos marcados como "No aplican"</h4>',
        content
    )
    
    # Todas las policy notes
    content = re.sub(
        r'<p class="policy-note">Pega aquí <strong>únicamente el texto de tu política</strong>\. No añadas instrucciones de comportamiento para el bot, serán ignoradas\.</p>',
        r'<p class="policy-note" data-i18n="info.policyNote">Pega aquí <strong>únicamente el texto de tu política</strong>. No añadas instrucciones de comportamiento para el bot, serán ignoradas.</p>',
        content
    )
    
    # Guardar el archivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Traducción completa de {filepath} realizada con éxito!")
    print("✅ Todos los textos ahora tienen data-i18n para traducción automática")

if __name__ == '__main__':
    translate_info_html()
