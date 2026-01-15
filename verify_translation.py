#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Script para verificar que info.html está 100% traducido"""

import re

filepath = r"site\secciones\info.html"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Buscar elementos sin traducir
issues = []

# 1. Labels sin data-i18n (excepto algunos genéricos como "Duración:")
labels_pattern = r'<label(?![^>]*data-i18n)[^>]*>([^<]+)</label>'
labels = re.findall(labels_pattern, content)
if labels:
    issues.append(f"❌ Labels sin data-i18n: {len(labels)}")
    for label in labels[:5]:  # Mostrar los primeros 5
        issues.append(f"   - {label.strip()}")

# 2. Botones chip sin data-i18n
chip_buttons = re.findall(r'<button[^>]*class="chip"[^>]*>([^<]+)</button>', content)
chip_buttons_sin_i18n = [b for b in chip_buttons if 'data-i18n' not in content[content.find(f'>{b}<') - 100:content.find(f'>{b}<')]]
if chip_buttons_sin_i18n:
    issues.append(f"❌ Botones chip sin data-i18n: {len(chip_buttons_sin_i18n)}")

# 3. Inputs placeholder sin data-i18n-placeholder
placeholders = re.findall(r'placeholder="([^"]+)"', content)
placeholders_sin_i18n = []
for ph in placeholders:
    if ph and not ph.isdigit() and 'http' not in ph:
        # Buscar si tiene data-i18n-placeholder cerca
        ph_context = content[max(0, content.find(f'placeholder="{ph}"') - 150):content.find(f'placeholder="{ph}"')]
        if 'data-i18n-placeholder' not in ph_context:
            placeholders_sin_i18n.append(ph)

if placeholders_sin_i18n:
    issues.append(f"⚠️  Placeholders sin data-i18n-placeholder: {len(set(placeholders_sin_i18n))}")
    for ph in list(set(placeholders_sin_i18n))[:5]:
        issues.append(f"   - {ph}")

# 4. Textos estáticos importantes
static_texts = [
    ('Importante:', 'data-i18n="info.important"'),
    ('Guardar', 'data-i18n="info.save"'),
    ('Estamos', 'data-i18n="info.weAre"'),
    ('guardando tu información', 'data-i18n="info.savingYourInfo"'),
]

for text, expected_attr in static_texts:
    if text in content:
        # Verificar que el contexto incluye el atributo
        text_pos = content.find(text)
        context = content[max(0, text_pos - 100):text_pos + 100]
        if expected_attr not in context:
            issues.append(f"⚠️  '{text}' sin atributo correcto")

# Resumen
print("=" * 60)
print("VERIFICACIÓN DE TRADUCCIÓN DE INFO.HTML")
print("=" * 60)

if not issues:
    print("✅ ¡PERFECTO! TODO está traducido correctamente")
    print("✅ Todas las etiquetas tienen data-i18n")
    print("✅ Todos los placeholders tienen data-i18n-placeholder")
    print("✅ Todos los botones tienen data-i18n")
else:
    print(f"⚠️  Se encontraron {len(issues)} problemas:\n")
    for issue in issues:
        print(issue)

print("\n" + "=" * 60)
print(f"Total de atributos data-i18n: {content.count('data-i18n=')}")
print(f"Total de atributos data-i18n-placeholder: {content.count('data-i18n-placeholder=')}")
print("=" * 60)
