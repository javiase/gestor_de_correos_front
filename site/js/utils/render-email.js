// render-email.js
// Depende de window.DOMPurify (ya lo cargas en la app).

function escRe(s){ return (s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function stripInlineImages(html = '', attachments = []) {
  let out = html || '';
  attachments.forEach(a => {
    if (!a || a.inline !== true) return;
    if (a.contentId) {
      const reCid = new RegExp(`<img\\b[^>]*\\bsrc\\s*=\\s*["']\\s*cid:\\s*<?${escRe(a.contentId)}>?["'][^>]*>`, 'gi');
      out = out.replace(reCid, '');
    }
    if (a.attachmentId) {
      const reAtt = new RegExp(`<img\\b[^>]*\\bsrc\\s*=\\s*["'][^"']*?/emails/attachment[^"']*?att_id=${escRe(a.attachmentId)}[^"']*?["'][^>]*>`, 'gi');
      out = out.replace(reAtt, '');
    }
    if (a.filename) {
      const reFile = new RegExp(`<img\\b[^>]*\\bsrc\\s*=\\s*["'][^"']*?${escRe(a.filename)}[^"']*?["'][^>]*>`, 'gi');
      out = out.replace(reFile, '');
    }
  });
  out = out.replace(/<img\b[^>]*\bsrc\s*=\s*["']\s*cid:[^"']+["'][^>]*>/gi, '');
  return out;
}

function analyzeEmailHtml(rawHtml = "") {
  const h = (rawHtml || "").toLowerCase();
  if (!h.trim()) return { isStructured:false, preferWhite:false };
  let score = 0;
  const tableCount = (h.match(/<table\b/gi) || []).length;
  if (tableCount >= 2) score += 2;
  if (h.includes('<!--[if mso]')) score += 2;
  if (/\bwidth\s*=\s*["']?5\d{2,3}["']?/.test(h) || /width\s*:\s*5\d{2,3}px/.test(h)) score += 1;
  if (/margin\s*:\s*0\s*auto/.test(h)) score += 1;
  const styleCount = (h.match(/style=/gi) || []).length;
  if (styleCount >= 12) score += 1;
  if (styleCount >= 25) score += 1;
  if (/<a[^>]+(background|border-radius|display:\s*inline-block|padding:\s*[^;]{2,})/i.test(h)) score += 1;
  if (/<img[^>]+(width=["']?[34-7]\d{2}["']?|style=["'][^"']*width:\s*[34-7]\d{2}px)/i.test(h)) score += 1;
  if (/\balign=["']?center|valign=["']?top|bgcolor=|cellpadding=|cellspacing=/i.test(h)) score += 1;

  const hasWhiteBg =
    /\bbgcolor=['"]?#?fff/i.test(h) ||
    /background(-color)?:\s*#?fff/i.test(h) ||
    /rgb\(\s*255\s*,\s*255\s*,\s*255\s*\)/.test(h);

  const tagNames = (h.match(/<([a-z0-9-]+)/gi) || []).map(m => m.replace('<',''));
  const nonTrivial = tagNames.filter(t => !['p','br','a','span','strong','em','b','i'].includes(t));
  const looksPlain = tableCount === 0 && nonTrivial.length <= 2 && styleCount < 6;

  const isStructured = !looksPlain && (score >= 3);
  const preferWhite  = hasWhiteBg;
  return { isStructured, preferWhite };
}

export function renderHtmlEmail(container, rawHtml, fallbackText = '', attachments = []) {
  const appThemeAttr = document.documentElement.getAttribute('data-theme') || 'dark';
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const appTheme = appThemeAttr === 'auto' ? (systemDark ? 'dark' : 'light') : appThemeAttr;

  const { isStructured, preferWhite } = analyzeEmailHtml(rawHtml || '');
  const useWhite = isStructured || preferWhite || appTheme === 'light';
  const bg = useWhite ? '#ffffff' : '#2a2a2a';
  const fg = useWhite ? '#111111' : '#e6e6e6';

  let innerHtml;
  if (rawHtml && rawHtml.trim()) {
    const stripped = stripInlineImages(rawHtml, attachments);
    innerHtml = isStructured ? stripped : `<div class="panel-content">${stripped}</div>`;
  } else {
    const paragraphs = (fallbackText || '').split('\n').map(p => `<p>${p}</p>`).join('');
    innerHtml = `<div class="panel-content" id="receivedContent">${paragraphs}</div>`;
  }

 const purifier =
    (typeof window !== 'undefined' && window.DOMPurify) ||
    (typeof DOMPurify !== 'undefined' ? DOMPurify : null);

    const safeHtml = purifier
    ? purifier.sanitize(innerHtml, {
        ALLOW_UNKNOWN_PROTOCOLS: true,
        ADD_TAGS: ['style','svg','path'],
        ADD_ATTR: ['style','target','align','border','cellpadding','cellspacing','background'],
        FORBID_TAGS: ['script','iframe','object','embed','form'],
        })
    : innerHtml;

  const baseCSS = `
    :root { color-scheme: ${useWhite ? 'light' : 'dark'}; }
    html,body{margin:0;padding:0;background:${bg}!important;color:${fg}!important;
      font:14px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;}
    a{color:inherit!important;text-decoration:underline;}
    a:visited,a:active{color:inherit!important}
    a:hover{opacity:.85;text-decoration:underline}
    img{max-width:100%!important;height:auto!important;border:0;outline:0}
    img[src^="cid:"],img[src*="/emails/attachment"]{display:none!important}
    table{border-collapse:collapse!important;max-width:100%}
    blockquote{margin:.5em 0 .5em 1em;padding-left:.8em;border-left:3px solid rgba(0,0,0,.2)}
    hr{border:0;border-top:1px solid rgba(0,0,0,.15)}
    .panel-content{font-size:1.2rem;line-height:1.45;color:inherit}
    .panel-content p,.panel-content div,.panel-content span,.panel-content li{font:inherit;color:inherit}
    .panel-content p{margin:.45em 0}
    ${!useWhite ? `
      body,p,div,span,td,li,a,h1,h2,h3,h4,h5,h6{color:${fg}!important}
      table[bgcolor],td[bgcolor],
      div[style*="background"],td[style*="background"],
      table[style*="background-color:#fff"],td[style*="background-color:#fff"],
      table[style*="background-color: #fff"],td[style*="background-color: #fff"]{
        background-color:${bg}!important;
      }
    ` : ``}
  `;

  const srcdoc = `
    <!doctype html><html><head>
      <meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
      <base target="_blank"><style>${baseCSS}</style>
    </head><body>${safeHtml}</body></html>
  `;

  // Probe offscreen para altura
  const probe = document.createElement('iframe');
  probe.setAttribute('sandbox', 'allow-same-origin');
  probe.style.position='absolute'; probe.style.visibility='hidden'; probe.style.pointerEvents='none';
  probe.style.width = container.clientWidth + 'px'; probe.style.height='0';
  probe.srcdoc = srcdoc;
  document.body.appendChild(probe);

  probe.addEventListener('load', () => {
    const pdoc = probe.contentDocument || probe.contentWindow.document;
    const measured = ((pdoc?.body?.scrollHeight) || 300) + 16;
    probe.remove();

    const iframe = document.createElement('iframe');
    iframe.className = 'gmail-frame';
    iframe.setAttribute(
      'sandbox',
      'allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation'
    );
    iframe.style.display='block'; iframe.style.width='100%'; iframe.style.border='0';
    iframe.style.height = measured + 'px'; iframe.style.transition='height .12s ease';
    iframe.srcdoc = srcdoc;

    container.innerHTML = '';
    container.appendChild(iframe);

    const fix = () => {
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      const h = (idoc?.body?.scrollHeight || measured) + 16;
      iframe.style.height = h + 'px';
    };
    iframe.addEventListener('load', () => {
      const idoc = iframe.contentDocument || iframe.contentWindow.document;
      Array.from(idoc.images || []).forEach(img => img.addEventListener('load', fix));
      if ('ResizeObserver' in window) new ResizeObserver(fix).observe(idoc.body);
      setTimeout(fix, 300);
    });
  });
}
