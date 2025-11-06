# Copilot Instructions - Gestor de Correos Frontend

## 🏗️ Architecture Overview

**Vanilla JavaScript SPA** with server-side backend integration. No framework - direct DOM manipulation with DOMPurify sanitization.

### Key Components:
- **`site/js/pages/`** - Page controllers (inbox.js, email.js, perfil.js, plans.js)
- **`site/js/components/`** - Reusable UI (sidebar.js)  
- **`site/js/utils/`** - Core utilities (api.js, flow-gate.js, notify.js)
- **`site/css/`** - Organized as base → layout → components → pages
- **`site/secciones/`** - HTML pages loaded dynamically

### Data Flow:
```
Page Controller → api.js (fetchWithAuth) → FastAPI Backend
                ↓
         DOM Manipulation + DOMPurify
                ↓
         CSS Grid/Flexbox Layout
```

## 🎨 CSS Standards

**CRITICAL**: All CSS must use `rem` units - NEVER `px` or `vh`:
- Sizes: `1rem = 16px` (e.g., `2.5rem` for 40px)
- Font sizes: `0.75rem` (12px), `0.875rem` (14px), `1rem` (16px)

### Left Sidebar Behavior:
- Starts collapsed at `5.7rem` (~91px)
- Expands to `17.5rem` (~280px) on `:hover`
- Grid layout controlled via CSS `:has(.sidebar:hover)` pseudo-class
- No JavaScript toggle for desktop (pure CSS solution)

### Color Palette:
- Background: `#2a2a2a` (sidebars), `#0a0a0a` (main darker areas)
- Surfaces: `#3a3a3a`, `#1a1a1a`
- Text: `#ffffff` (primary), `#d1d5db` (secondary), `#9ca3af` (muted)
- Accent: `#e879f9` (primary purple), `#32ff7a` (success green)

### Badge Colors (Email Classification):
```css
.badge-postventa   → rgba(239, 68, 68,  .28)   /* red */
.badge-envios      → rgba(249,115, 22,  .28)   /* orange */
.badge-producto    → rgba(234,179,  8,  .24)   /* yellow */
.badge-tienda      → rgba( 59,130,246, .24)   /* blue */
.badge-shopify     → rgba( 34,197, 94,  .24)   /* green */
.badge-comerciales → rgba(236, 72,153, .24)   /* pink */
.badge-otros       → rgba(148,163,184, .20)   /* gray */
```

## 🔐 Authentication & Flow Control

### Flow Gates (`flow-gate.js`):
1. **Profile Complete** → Onboarding required
2. **Onboarding Complete** → Full access

Gated actions use `enforceFlowGate()` at page load. Check with:
```javascript
const store = await getStoreCached();
const profileOk = isProfileComplete(store);
const onboardingOk = isOnboardingComplete();
```

### API Calls:
Always use `fetchWithAuth()` from `api.js`:
```javascript
const res = await fetchWithAuth('/emails/get?email_id=123');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

## � Page Controllers

**Pattern**: Each page has a controller class in `site/js/pages/[name].js`

### Common Methods:
- `render()` - Main rendering method
- `setupEventListeners()` - Initialize event handlers
- `cleanup()` - Cleanup on page navigation
- `showLoading()` / `hideLoading()` - Loading state management

### Data Fetching:
Always use `fetchWithAuth()` from `api.js` for backend communication:
```javascript
const res = await fetchWithAuth('/endpoint?param=value');
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

## 🛠️ Development Workflow

### File Versioning:
Scripts use `?v=%ASSET_VERSION%` query param - replaced during deployment.

## 🧩 Component Patterns

### Sidebar Menu Items:
```html
<li class="menu-item" data-section="inbox">
  <a href="/secciones/inbox.html" class="menu-link">
    <i class="fas fa-inbox"></i>
    <span class="menu-text">Inbox</span>
  </a>
</li>
```

### Notification Dot:
```css
.has-pending-ideas .menu-item[data-section="info"] .notif-dot {
  display: inline-block; /* shows red dot */
}
```

### Badge with Label:
```html
<span class="badge class badge-postventa">
  <i class="fas fa-tag"></i> Postventa
</span>
```

### Accordion Panel:
```javascript
<div class="accordion" data-panel="order-details">
  <div class="accordion-header">
    <div class="accordion-title">...</div>
    <i class="fas fa-chevron-down accordion-icon"></i>
  </div>
  <div class="accordion-content">...</div>
</div>
```

## ⚠️ Common Pitfalls

1. **Never** use `innerHTML` without `DOMPurify.sanitize()` for user content
2. **Never** mix units - stick to `rem` exclusively
3. **Always** check `res.ok` before calling `.json()` on fetch responses
4. **Always** use `await getStoreCached()` instead of reading localStorage directly
5. **Grid layout**: Use `:has(.sidebar:hover)` for state, not JS classList toggle

## 📝 Naming Conventions

- **CSS classes**: kebab-case (`primary-card`, `order-number-large`)
- **JS methods**: camelCase (`renderShopifySidebar`, `formatShopifyDate`)
- **Data attributes**: `data-section="inbox"`, `data-panel="order-details"`
- **IDs**: camelCase (`contextualHeader`, `orderCard`, `customerCard`)

## 🔄 State Management

No centralized store - component-based caching:
- Page-specific caches (e.g., pre-loaded data for navigation)
- `sessionStorage` - Current navigation position and page state
- `localStorage` - Profile + onboarding state via `flow-gate.js`

### Event System:
```javascript
window.addEventListener('profile-complete-changed', (e) => {
  const complete = e.detail?.complete;
});

window.dispatchEvent(new CustomEvent('sidebar:state', { 
  detail: { collapsed: this.isCollapsed }
}));
```

## 🎯 When Implementing New Features

1. Add page controller to `site/js/pages/[name].js`
2. Create corresponding CSS in `site/css/pages/[name].css`  
3. Use `rem` for all measurements
4. Call `enforceFlowGate()` if gating required
5. Use `fetchWithAuth()` for API calls
6. Sanitize with `DOMPurify` before DOM insertion
7. Follow existing badge/card/accordion patterns
8. Test sidebar expand/collapse behavior (if applicable)
9. Verify responsive breakpoints (48rem, 87.5rem)

---

*Generated: 2025-01-04 | Framework: Vanilla JS | Backend: FastAPI*
