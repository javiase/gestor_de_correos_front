#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para agregar atributos data-i18n al archivo info.html
"""

# Mapeo de traducciones
TRANSLATIONS = {
    # Returns Policy
    '>📦 Estado en el que debe estar el artículo para ser aceptado como devolución<': ' data-i18n="info.productState">📦 Estado en el que debe estar el artículo para ser aceptado como devolución<',
    '>(N/A)<': ' data-i18n="info.notApplicable">(N/A)<',
    '>Sin usar<': ' data-i18n="info.unused">Sin usar<',
    '>Con etiqueta<': ' data-i18n="info.withTag">Con etiqueta<',
    '>Embalaje original<': ' data-i18n="info.originalPackaging">Embalaje original<',
    '>Precintado<': ' data-i18n="info.sealed">Precintado<',
    '>Otro +<': ' data-i18n="info.other">Otro +<',
    'placeholder="Especifica \'Otro\'…"': 'data-i18n-placeholder="info.specifyOther" placeholder="Especifica \'Otro\'…"',
    '>💸 Coste de devolución<': ' data-i18n="info.returnCost">💸 Coste de devolución<',
    '>A cargo del cliente<': ' data-i18n="info.customerPays">A cargo del cliente<',
    '>Gratis (lo asume la tienda)<': ' data-i18n="info.storePays">Gratis (lo asume la tienda)<',
    '>↩️ Método de reembolso<': ' data-i18n="info.refundMethod">↩️ Método de reembolso<',
    '>Mismo medio de pago<': ' data-i18n="info.samePaymentMethod">Mismo medio de pago<',
    '>Vale de tienda<': ' data-i18n="info.storeCredit">Vale de tienda<',
    '>Cambio por otro producto<': ' data-i18n="info.exchangeProduct">Cambio por otro producto<',
    '>⏱️ Plazo de reembolso<': ' data-i18n="info.refundTimeframe">⏱️ Plazo de reembolso<',
    '>Reembolsamos el dinero aproximadamente en': ' data-i18n="info.refundTimeText">Reembolsamos el dinero aproximadamente en',
    '> días.': ' data-i18n="info.days"> días.',
    '>🛑 Cuando se puede cancelar un pedido<': ' data-i18n="info.orderCancellation">🛑 Cuando se puede cancelar un pedido<',
    '>Si no ha salido del almacén<': ' data-i18n="info.notLeftWarehouse">Si no ha salido del almacén<',
    '>Dentro de las primeras 24 horas<': ' data-i18n="info.withinHours">Dentro de las primeras 24 horas<',
    '>🔗 Enlace a la política de devoluciones<': ' data-i18n="info.returnsPolicyLink">🔗 Enlace a la política de devoluciones<',
    'placeholder="https://tutienda.com/devoluciones (opcional)"': 'data-i18n-placeholder="info.returnsPolicyLinkPlaceholder" placeholder="https://tutienda.com/devoluciones (opcional)"',
    '>Campos marcados como "No aplican"<': ' data-i18n="info.fieldsMarkedNA">Campos marcados como "No aplican"<',
    '>📄 Tu política completa de devoluciones<': ' data-i18n="info.yourCompleteReturnsPolicy">📄 Tu política completa de devoluciones<',
    'placeholder="Pega aquí tu política completa de devoluciones…"': 'data-i18n-placeholder="info.pasteReturnsPolicyPlaceholder" placeholder="Pega aquí tu política completa de devoluciones…"',
    '>Guardar<': ' data-i18n="info.save">Guardar<',
    '>Estamos<': ' data-i18n="info.weAre">Estamos<',
    '>guardando tu información...</span>': ' data-i18n="info.savingYourInfo">guardando tu información...</span>',
    '>validando campos...</span>': ' data-i18n="info.validatingFields">validando campos...</span>',
    '>actualizando la base de datos...</span>': ' data-i18n="info.updatingDatabase">actualizando la base de datos...</span>',
    '>preparando confirmación...</span>': ' data-i18n="info.preparingConfirmation">preparando confirmación...</span>',
    
    # Shipping Policy
    '>Política de Envíos<': ' data-i18n="info.shippingPolicy">Política de Envíos<',
    '>💶 Tarifas<': ' data-i18n="info.rates">💶 Tarifas<',
    '>Zona<': ' data-i18n="info.zone">Zona<',
    '>Precio<': ' data-i18n="info.price">Precio<',
    '>Tiempo<': ' data-i18n="info.time">Tiempo<',
    '>Notas<': ' data-i18n="info.notes">Notas<',
    '>+ Añadir fila<': ' data-i18n="info.addRow">+ Añadir fila<',
    '>🗺️ Zonas de envío<': ' data-i18n="info.shippingZones">🗺️ Zonas de envío<',
    '>Nacional (España)<': ' data-i18n="info.national">Nacional (España)<',
    '>UE<': ' data-i18n="info.eu">UE<',
    '>Internacional<': ' data-i18n="info.international">Internacional<',
    '>País/es concretos +<': ' data-i18n="info.specificCountries">País/es concretos +<',
    'placeholder="Especifica país/es…"': 'data-i18n-placeholder="info.specifyCountries" placeholder="Especifica país/es…"',
    '>⏱️ Tiempo estimado global<': ' data-i18n="info.globalEstimatedTime">⏱️ Tiempo estimado global<',
    '>📬 Identificadores de pedido<': ' data-i18n="info.orderIds">📬 Identificadores de pedido<',
    '>¿Se proporciona número de seguimiento?': ' data-i18n="info.trackingProvided">¿Se proporciona número de seguimiento?',
    '>Sí<': ' data-i18n="info.yes">Sí<',
    '>No<': ' data-i18n="info.no">No<',
    '>¿Cuándo se envía el seguimiento?<': ' data-i18n="info.whenTrackingSent">¿Cuándo se envía el seguimiento?<',
    'placeholder="Ej. al despachar el pedido / 24h después"': 'data-i18n-placeholder="info.whenTrackingSentPlaceholder" placeholder="Ej. al despachar el pedido / 24h después"',
    '>🔎 Seguimiento del envío<': ' data-i18n="info.shipmentTracking">🔎 Seguimiento del envío<',
    '>Email con enlace<': ' data-i18n="info.emailWithLink">Email con enlace<',
    '>En nuestra página web<': ' data-i18n="info.onWebsite">En nuestra página web<',
    '>Enlace del transportista<': ' data-i18n="info.carrierLink">Enlace del transportista<',
    'placeholder="URL de seguimiento (opcional)"': 'data-i18n-placeholder="info.trackingUrlPlaceholder" placeholder="URL de seguimiento (opcional)"',
    '>🔗 Link a política de envíos<': ' data-i18n="info.shippingPolicyLink">🔗 Link a política de envíos<',
    'placeholder="https://tutienda.com/envios (opcional)"': 'data-i18n-placeholder="info.shippingPolicyLinkPlaceholder" placeholder="https://tutienda.com/envios (opcional)"',
    '>📄 Tu política completa de envíos<': ' data-i18n="info.yourCompleteShippingPolicy">📄 Tu política completa de envíos<',
    'placeholder="Pega aquí tu política completa de envíos…"': 'data-i18n-placeholder="info.pasteShippingPolicyPlaceholder" placeholder="Pega aquí tu política completa de envíos…"',
    
    # General Info
    '>Información general de la tienda<': ' data-i18n="info.generalInfo">Información general de la tienda<',
    '>🧾 Métodos de pago, ubicación, garantías…<': ' data-i18n="info.generalInfoTip">🧾 Métodos de pago, ubicación, garantías…<',
    '>💳 Métodos de pago aceptados<': ' data-i18n="info.paymentMethods">💳 Métodos de pago aceptados<',
    '>Visa<': ' data-i18n="info.visa">Visa<',
    '>Mastercard<': ' data-i18n="info.mastercard">Mastercard<',
    '>PayPal<': ' data-i18n="info.paypal">PayPal<',
    '>Bizum<': ' data-i18n="info.bizum">Bizum<',
    '>Transferencia<': ' data-i18n="info.bankTransfer">Transferencia<',
    '>Contra reembolso<': ' data-i18n="info.cashOnDelivery">Contra reembolso<',
    '>Apple Pay<': ' data-i18n="info.applePay">Apple Pay<',
    '>Google Pay<': ' data-i18n="info.googlePay">Google Pay<',
    '>📍 Ubicación<': ' data-i18n="info.location">📍 Ubicación<',
    '>Online<': ' data-i18n="info.online">Online<',
    '>Física<': ' data-i18n="info.physical">Física<',
    'placeholder="Dirección de la tienda"': 'data-i18n-placeholder="info.storeAddress" placeholder="Dirección de la tienda"',
    '>🚚 Cambio de dirección tras pedido<': ' data-i18n="info.addressChange">🚚 Cambio de dirección tras pedido<',
    '>¿Bajo qué condiciones el cliente puede cambiar la dirección de envío?¿Y qué plazo tiene para ello?': ' data-i18n="info.addressChangeConditions">¿Bajo qué condiciones el cliente puede cambiar la dirección de envío?¿Y qué plazo tiene para ello?',
    'placeholder="Condiciones / plazo"': 'data-i18n-placeholder="info.addressChangePlaceholder" placeholder="Condiciones / plazo"',
    '>📏 Tabla de tallas<': ' data-i18n="info.sizeChart">📏 Tabla de tallas<',
    'placeholder="Dónde se encuentra?"': 'data-i18n-placeholder="info.sizeChartLocation" placeholder="Dónde se encuentra?"',
    '>🛡️ Garantía<': ' data-i18n="info.warranty">🛡️ Garantía<',
    '>Sin garantía<': ' data-i18n="info.noWarranty">Sin garantía<',
    '>Días<': ' data-i18n="info.warrantyDays">Días<',
    '>Meses<': ' data-i18n="info.warrantyMonths">Meses<',
    '>Años<': ' data-i18n="info.warrantyYears">Años<',
    '>Duración:': ' data-i18n="info.duration">Duración:',
    
    # FAQ
    '>Preguntas Frecuentes<': ' data-i18n="info.faq">Preguntas Frecuentes<',
    '>+ Añadir pregunta<': ' data-i18n="info.addQuestion">+ Añadir pregunta<',
    '>No aplican<': ' data-i18n="info.notApply">No aplican<',
    
    # Sidebar
    '>Propuestas de información a añadir<': ' data-i18n="info.sidebarTitle">Propuestas de información a añadir<',
    'aria-label="Mostrar panel"': 'data-i18n-aria-label="info.showPanel" aria-label="Mostrar panel"',
}

def translate_file(filepath):
    """Agrega atributos data-i18n al archivo HTML"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Aplicar todas las traducciones
    for old, new in TRANSLATIONS.items():
        if old in content:
            content = content.replace(old, new)
    
    # Guardar archivo
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Archivo traducido: {filepath}")

if __name__ == '__main__':
    translate_file('site/secciones/info.html')
    print("\n🎉 ¡Traducción completada!")
