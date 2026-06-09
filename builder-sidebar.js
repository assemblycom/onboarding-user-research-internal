/* Replace the AI builder bundle's own workspace sidebar with the shared
   Studio sidebar used across the rest of the prototype, and mount the
   "Getting started" FTUX checklist into it (state carried via localStorage,
   so already-completed items show as done).

   The builder is a self-contained Figma code-export: its loader swaps the
   whole document (documentElement.replaceWith) after parse, so we cannot
   inject markup once. Instead we register a window-level interval — exactly
   like the bundle's own override layer — that re-applies into whatever the
   live document becomes. */
(function () {
  var STYLE_ID = 'asm-sb-style';
  var MARK = 'data-asm-sb';

  function hashParam(n) { var m = location.hash.match(new RegExp('[#&]' + n + '=([^&]*)')); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
  function navSuffix() { var p = []; ['company', 'name', 'email', 'theme'].forEach(function (k) { var v = hashParam(k); if (v) p.push(k + '=' + encodeURIComponent(v)); }); return p.length ? '#' + p.join('&') : ''; }
  function company() { return hashParam('company') || 'Studio'; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  // In-app build (an app already exists) → skip the branded loading cover and
  // show a neutral skeleton instead. The website/first-run flow (no apps yet)
  // keeps the branded "Setting up the builder…" loading.
  var IN_APP = (function () {
    try { var l = JSON.parse(localStorage.getItem('onb.buildApps')); return Array.isArray(l) && l.length > 0; }
    catch (e) { return false; }
  })();

  var CSS =
    '.asm-sb{--text:#212b36;--muted:#6b6f76;--border:#dfe1e4;--bg-hover:#eff1f4;--dark:#1a1a1a;' +
      'height:100%;display:flex;flex-direction:column;padding:14px 12px;gap:4px;box-sizing:border-box;' +
      "font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--text);background:#fff;letter-spacing:normal;font-size:14px;line-height:normal;}" +
    '.asm-sb *{box-sizing:border-box;}' +
    '.asm-sb .ws{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:4px;cursor:pointer;}' +
    '.asm-sb .ws:hover{background:var(--bg-hover);}' +
    '.asm-sb .ws-avatar{width:26px;height:26px;border-radius:7px;background:#f0f1f3;border:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#5a6068;font-size:13px;font-weight:400;}' +
    '.asm-sb .ws-name{font-weight:500;font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.asm-sb .nav{display:flex;flex-direction:column;gap:1px;margin-top:8px;}' +
    '.asm-sb .nav-group-label{font-size:11px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);padding:14px 8px 5px;}' +
    '.asm-sb .nav-item{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:4px;font-size:13.5px;color:var(--text);cursor:pointer;text-decoration:none;}' +
    '.asm-sb .nav-item:hover{background:var(--bg-hover);}' +
    '.asm-sb .nav-item.active{background:var(--bg-hover);}' +
    '.asm-sb .nav-item svg{color:var(--muted);flex-shrink:0;}' +
    '.asm-sb .nav-item .ic,.asm-sb .ws-caret-img,.asm-sb .checklist-item .ic{display:block;flex-shrink:0;}' +
    '.asm-sb .nav-item.add{color:var(--muted);}' +
    '.asm-sb .nav-item.draft .draft-label,.asm-sb .nav-item.built .draft-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.asm-sb .draft-badge{font-size:11px;font-weight:400;color:var(--muted);background:#f0f1f3;border-radius:5px;padding:1px 7px;}' +
    // Sheen sweeps a draft's label while it is still building (another app open).
    '@keyframes asmTextShimmer{0%{background-position:180% 0;}100%{background-position:-180% 0;}}' +
    '.asm-sb .draft-label.shimmer-text{background:linear-gradient(90deg,#6b6f76 0%,#6b6f76 40%,#c6cad0 50%,#6b6f76 60%,#6b6f76 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:asmTextShimmer 1.4s linear infinite;}' +
    '.asm-sb .spacer{flex:1;}' +
    '.asm-sb .checklist{border:1px solid var(--border);border-radius:8px;padding:12px;margin-top:10px;}' +
    '.asm-sb .checklist-title{font-size:12.5px;font-weight:500;margin-bottom:10px;}' +
    '.asm-sb .checklist-item{display:flex;align-items:center;gap:10px;padding:5px 0;font-size:12.5px;color:var(--muted);position:relative;}' +
    '.asm-sb .checklist-item.active{color:var(--text);font-weight:500;}' +
    '.asm-sb .sidebar-foot{display:flex;align-items:center;justify-content:space-between;padding:12px 4px 2px;}' +
    '.asm-sb .foot-actions{display:flex;align-items:center;gap:8px;}' +
    '.asm-sb .icon-btn{display:flex;align-items:center;justify-content:center;padding:7px;border:1px solid var(--border);background:#fff;border-radius:999px;cursor:pointer;transition:background .12s;}' +
    '.asm-sb .icon-btn:hover{background:var(--bg-hover);}' +
    '.asm-sb .open-portal{display:flex;align-items:center;gap:6px;height:32px;padding:0 11px;border:1px solid var(--border);background:#fff;border-radius:999px;font-size:12px;font-weight:500;color:var(--text);cursor:pointer;font-family:inherit;transition:background .12s;}' +
    '.asm-sb .open-portal:hover{background:var(--bg-hover);}' +
    // The bundle's own design-system jump-out link duplicates our nav now.
    '#asm-components-link{display:none !important;}' +
    // White cover that hides the bundle's default render until our sidebar
    // is in place — prevents the "BrandMages" flash on load.
    '#asm-load-cover{position:fixed;inset:0;z-index:9998;background:#FFFFFF;display:flex;align-items:center;justify-content:center;transition:opacity .3s ease;}' +
    '#asm-load-cover.asm-hide{opacity:0;pointer-events:none;}' +
    '.asm-load-inner{display:flex;flex-direction:column;align-items:center;gap:14px;}' +
    '.asm-load-mark{width:38px;height:38px;animation:asmLoadPulse 1.4s ease-in-out infinite;}' +
    ".asm-load-text{font-size:13px;color:#6b6f76;font-family:'Inter',system-ui,-apple-system,sans-serif;}" +
    '@keyframes asmLoadPulse{0%,100%{opacity:0.4;transform:scale(0.97);}50%{opacity:1;transform:scale(1);}}' +
    // Neutral skeleton variant of the cover (in-app builds) — white, no
    // branding and no off-white wash, so it reads as the app skeleton loader.
    '#asm-load-cover.asm-skel{background:#FFFFFF;}' +
    '#asm-load-cover.asm-skel .asm-cover-skel{display:flex;flex-direction:column;gap:16px;position:absolute;top:64px;left:244px;width:520px;max-width:calc(100% - 300px);}' +
    '#asm-load-cover .asm-cover-skel span{display:block;height:13px;border-radius:6px;background:linear-gradient(90deg,rgba(16,16,16,0.06) 0%,rgba(16,16,16,0.11) 50%,rgba(16,16,16,0.06) 100%);background-size:200% 100%;animation:asmLoadShimmer 1.4s ease-in-out infinite;}' +
    '#asm-load-cover .asm-cover-skel span:nth-child(2){width:78%;}#asm-load-cover .asm-cover-skel span:nth-child(3){width:54%;}' +
    '@keyframes asmLoadShimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}' +
    // Notifications preview tab is disabled in the prototype — tooltip on hover.
    '.asm-notif-disabled{cursor:default !important;}' +
    // Body-appended fixed tooltip — a ::after would be clipped by the topbar's
    // overflow:hidden, so we position this outside the clipping container.
    '#asm-notif-tip{position:fixed;z-index:99999;display:none;background:#1a1a1a;color:#fff;font-size:12px;font-weight:500;line-height:1;padding:7px 10px;border-radius:7px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.18);pointer-events:none;}' +
    // Workspace switcher isn't built for the prototype — tooltip on hover.
    '.asm-sb .ws[data-asm-tip]{position:relative;cursor:default;}' +
    '.asm-sb .ws[data-asm-tip]::after{content:attr(data-asm-tip);position:absolute;top:calc(100% + 6px);left:8px;background:#1a1a1a;color:#fff;font-size:12px;font-weight:500;line-height:1;padding:7px 10px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s;box-shadow:0 4px 14px rgba(0,0,0,0.18);z-index:300;}' +
    '.asm-sb .ws[data-asm-tip]:hover::after{opacity:1;}' +
    // Footer settings/help buttons aren't built for the prototype — tooltip
    // above (they sit at the bottom of the sidebar).
    '.asm-sb .icon-btn[data-asm-tip]{position:relative;cursor:default;}' +
    '.asm-sb .icon-btn[data-asm-tip]::after{content:attr(data-asm-tip);position:absolute;bottom:calc(100% + 8px);left:0;background:#1a1a1a;color:#fff;font-size:12px;font-weight:500;line-height:1;padding:7px 10px;border-radius:7px;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s;box-shadow:0 4px 14px rgba(0,0,0,0.18);z-index:300;}' +
    '.asm-sb .icon-btn[data-asm-tip]:hover::after{opacity:1;}' +
    // ── Service Request Intake app preview (hand-built, Assembly UI) ──
    // Injected over the bundle's preview pane so the built app reads as a
    // service-request intake instead of the Time Tracker artboard.
    ".asm-sri-app{display:flex;flex-direction:column;height:100%;background:#fff;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#212b36;overflow:hidden;letter-spacing:normal;container-type:inline-size;}" +
    '.asm-sri-app *{box-sizing:border-box;}' +
    '.asm-sri-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px 12px;flex-shrink:0;}' +
    '.asm-sri-title{flex:1;min-width:0;font-size:17px;font-weight:500;letter-spacing:-0.01em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.asm-sri-new{flex-shrink:0;display:inline-flex;align-items:center;gap:6px;background:#1a1a1a;color:#fff;border:0;border-radius:8px;padding:7px 12px;font-size:13px;font-weight:500;font-family:inherit;cursor:pointer;white-space:nowrap;}' +
    '.asm-sri-tabs{display:flex;gap:18px;padding:0 20px;border-bottom:1px solid #dfe1e4;flex-shrink:0;overflow:hidden;}' +
    '.asm-sri-tab{padding:8px 2px;font-size:13.5px;color:#6b6f76;border-bottom:1.5px solid transparent;margin-bottom:-1px;cursor:pointer;white-space:nowrap;}' +
    '.asm-sri-tab.active{color:#212b36;font-weight:500;border-bottom-color:#1a1a1a;}' +
    '.asm-sri-body{flex:1;overflow:auto;padding:8px 16px 16px;}' +
    '.asm-sri-table{width:100%;border-collapse:collapse;}' +
    '.asm-sri-table th{text-align:left;font-size:11px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:#6b6f76;padding:12px 12px 10px;border-bottom:1px solid #dfe1e4;white-space:nowrap;}' +
    '.asm-sri-table td{padding:11px 12px;border-bottom:1px solid #eceef1;font-size:13px;color:#212b36;vertical-align:middle;}' +
    '.asm-sri-table tbody tr:last-child td{border-bottom:0;}' +
    '.asm-sri-table tbody tr:hover{background:#f8f9fb;}' +
    '.asm-sri-req{font-weight:500;}' +
    '.asm-sri-muted{color:#6b6f76;}' +
    '.asm-sri-prio{display:inline-flex;align-items:center;gap:7px;white-space:nowrap;}' +
    '.asm-sri-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0;}' +
    '.asm-sri-badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:6px;font-size:12px;font-weight:500;white-space:nowrap;}' +
    '.asm-sri-badge.open{background:#e1edff;color:#2456c7;}' +
    '.asm-sri-badge.review{background:#fdeccb;color:#946200;}' +
    '.asm-sri-badge.resolved{background:#d8f0df;color:#1d7a45;}' +
    '.asm-sri-badge.closed{background:#eceef1;color:#6b6f76;}' +
    // Client-facing portal wrapper: our own dark sidebar + the SRI app, so the
    // Portal view always has the client sidebar and stays responsive.
    ".asm-sri-portal{display:flex;height:100%;background:#fff;overflow:hidden;font-family:'Inter',system-ui,-apple-system,sans-serif;container-type:inline-size;}" +
    '.asm-sri-portal *{box-sizing:border-box;}' +
    '.asm-sri-pnav{width:200px;max-width:42%;flex-shrink:0;background:#0e1726;color:#c7d0dc;display:flex;flex-direction:column;padding:14px 12px;gap:2px;overflow:hidden;}' +
    '.asm-sri-pnav .pn-ws{display:flex;align-items:center;gap:10px;padding:6px 8px 14px;}' +
    '.asm-sri-pnav .pn-ws-av{width:26px;height:26px;border-radius:7px;background:#26334a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;flex-shrink:0;}' +
    '.asm-sri-pnav .pn-ws-name{font-weight:500;font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.asm-sri-pnav .pn-item{display:flex;align-items:center;gap:11px;padding:8px 10px;border-radius:8px;font-size:13.5px;color:#c7d0dc;cursor:pointer;white-space:nowrap;}' +
    '.asm-sri-pnav .pn-item svg{width:17px;height:17px;color:#8b97a8;flex-shrink:0;}' +
    '.asm-sri-pnav .pn-item span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
    '.asm-sri-pnav .pn-item.active{background:#fff;color:#1a1a1a;font-weight:500;}' +
    '.asm-sri-pnav .pn-item.active svg{color:#1a1a1a;}' +
    '.asm-sri-portal .asm-sri-app{flex:1;min-width:0;}' +
    // Simplified placeholder canvas (non-service-request prompts).
    ".asm-ph-app{display:flex;flex-direction:column;height:100%;background:#fff;font-family:'Inter',system-ui,-apple-system,sans-serif;color:#212b36;overflow:hidden;letter-spacing:normal;}" +
    '.asm-sri-portal .asm-ph-app{flex:1;min-width:0;}' +
    '.asm-ph-mid{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 28px;gap:10px;}' +
    '.asm-ph-badge{width:48px;height:48px;border-radius:12px;background:#f0f1f3;display:flex;align-items:center;justify-content:center;color:#6b6f76;}' +
    '.asm-ph-badge svg{width:24px;height:24px;}' +
    '.asm-ph-name{font-size:16px;font-weight:500;color:#212b36;margin-top:2px;}' +
    '.asm-ph-msg{font-size:13px;color:#6b6f76;max-width:300px;line-height:1.5;}' +
    '.asm-sri-body{flex:1;overflow:auto;}' +
    '.asm-sri-table{min-width:520px;}' +
    // Narrow preview pane → switch the requests table to a stacked card layout
    // (mobile view). Container query keys off the app width, not the viewport.
    '@container (max-width: 460px){' +
      '.asm-sri-table{min-width:0;}' +
      '.asm-sri-table thead{display:none;}' +
      '.asm-sri-table tbody tr{display:block;border:1px solid #e8eaed;border-radius:10px;padding:10px 12px;margin-bottom:10px;}' +
      '.asm-sri-table tbody tr:hover{background:#fff;}' +
      '.asm-sri-table td{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;border:0;}' +
      '.asm-sri-table td::before{content:attr(data-label);color:#6b6f76;font-size:12px;font-weight:500;}' +
      '.asm-sri-table td.asm-sri-req{display:block;font-size:14px;font-weight:500;margin-bottom:4px;}' +
      '.asm-sri-table td.asm-sri-req::before{display:none;}' +
    '}' +
    // Mobile: a sidebar can't live on mobile, so hide the client-portal nav
    // when the portal is narrow — the app fills the screen like a mobile app.
    '@container (max-width: 520px){.asm-sri-pnav{display:none;}}';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var BELL = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#212B36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  var CLOCK = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#212B36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>';

  // The app being built shows as a Draft entry under the Apps group.
  // The label tracks the app name derived from the user's prompt, shared by
  // builder.html as window.__asmAppName; falls back to "Time Tracker".
  var DRAFT_APP = (typeof window !== 'undefined' && window.__asmAppName) ? window.__asmAppName : 'Time Tracker';

  // Read the app name the builder is using. Prefer the derived name shared
  // by builder.html; otherwise fall back to the bundle's "Workspace / App"
  // breadcrumb in the top bar. Empty string if not found yet.
  function appTitle() {
    if (typeof window !== 'undefined' && window.__asmAppName) return window.__asmAppName;
    var nodes = document.querySelectorAll('div, span');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var own = '';
      for (var c = 0; c < el.childNodes.length; c++) {
        if (el.childNodes[c].nodeType === 3) own += el.childNodes[c].textContent;
      }
      own = own.trim();
      if (own.indexOf(' / ') !== -1 && el.getBoundingClientRect().top < 70) {
        var parts = own.split(' / ');
        var t = parts[parts.length - 1].trim();
        if (t) return t;
      }
    }
    return '';
  }

  // The app name derived from the prompt (shared by builder.html). Read live so
  // it's current even though this script loads before builder.html sets it.
  function appNameNow() { return (typeof window !== 'undefined' && window.__asmAppName) ? window.__asmAppName : 'Service Requests'; }
  // Only the service-request prompt has a fully hand-built preview; every other
  // prompt gets a simplified placeholder canvas instead.
  function isServiceApp() {
    var p = (hashParam('prompt') || '').toLowerCase();
    if (/service\s*request/.test(p)) return true;
    return (appNameNow() || '').toLowerCase() === 'requests';
  }

  // The builder surfaces an "...version published" checkpoint once the app
  // is published; at that point it is no longer a draft.
  function isPublished() {
    return document.body && /version published/i.test(document.body.innerText);
  }

  // Persist EVERY built app (keyed by name) so they all stay in the sidebar
  // across pages — the user can build any number of apps and navigate freely
  // without losing them. Re-building the same app updates its entry rather
  // than appending a duplicate.
  var lastPersist = '';
  function readApps() {
    try { var l = JSON.parse(localStorage.getItem('onb.buildApps')); return Array.isArray(l) ? l : []; }
    catch (e) { return []; }
  }
  function persistApp() {
    try {
      var name = appTitle() || DRAFT_APP;
      if (!name) return;
      var rec = { name: name, status: isPublished() ? 'published' : 'draft', hash: location.hash || '' };
      // Record how far the build got, so resuming can skip back to that phase
      // (e.g. a ready plan) instead of replaying the Q&A + reasoning typing.
      var _ph = (window.__ASM_STATE || {}).phase;
      if (_ph) rec.phase = _ph;
      var list = readApps();
      var found = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i] && list[i].name && list[i].name.toLowerCase() === name.toLowerCase()) { list[i] = rec; found = true; break; }
      }
      if (!found) list.push(rec);
      var json = JSON.stringify(list);
      if (json !== lastPersist) { localStorage.setItem('onb.buildApps', json); lastPersist = json; }
    } catch (e) {}
  }

  // Keep the draft entry's name in sync with the builder, and drop the
  // Draft badge once published.
  function syncDraft(host) {
    // The active (currently-building) item — not necessarily the first one now
    // that new apps render at the bottom. Only its label tracks the builder.
    var active = host.querySelector('.nav-item.active');
    var label = active && active.querySelector('.draft-label');
    if (label) { var t = appTitle(); if (t && label.textContent !== t) label.textContent = t; }
    if (isPublished() && active) {
      var badge = active.querySelector('.draft-badge');
      if (badge) badge.remove();
      if (window.ftuxMarkPublishDone) window.ftuxMarkPublishDone();
    }
    persistApp();
  }

  // Every built app in build order (oldest first), so a newly-started app sits
  // BELOW the previous ones rather than jumping to the top. The app currently
  // being built is the active draft; others link back to their builder session.
  function appsNavHTML() {
    var current = appTitle() || DRAFT_APP;
    var currentLc = current.toLowerCase();
    var seen = {};
    var html = '';
    var currentRendered = false;
    readApps().forEach(function (a) {
      if (!a || !a.name) return;
      var lc = a.name.toLowerCase();
      if (seen[lc]) return;
      seen[lc] = 1;
      if (lc === currentLc) {
        html += '<a class="nav-item draft active">' + CLOCK + '<span class="draft-label">' + esc(a.name) + '</span><span class="draft-badge">Draft</span></a>';
        currentRendered = true;
      } else {
        var bShim = (a.phase === 'building' && a.status !== 'published') ? ' shimmer-text' : '';
        html += '<a class="nav-item built" href="builder.html' + (a.hash || '') + '">' + CLOCK + '<span class="draft-label' + bShim + '">' + esc(a.name) + '</span>' + (a.status === 'draft' ? '<span class="draft-badge">Draft</span>' : '') + '</a>';
      }
    });
    // Active app not persisted yet → show it last (newest at the bottom).
    if (!currentRendered) {
      html += '<a class="nav-item draft active">' + CLOCK + '<span class="draft-label">' + esc(current) + '</span><span class="draft-badge">Draft</span></a>';
    }
    return html;
  }

  function buildHTML() {
    var co = company();
    var initial = ((co.trim()[0]) || 'S').toUpperCase();
    // data-asm-brand-applied trips the bundle override's global guard so its
    // ensureBrandMagesLogo() never rewrites our workspace avatar.
    return '<div class="asm-sb" data-asm-brand-applied="1">' +
      '<div class="ws" data-asm-tip="Not part of this prototype"><div class="ws-avatar">' + initial + '</div><span class="ws-name">' + co + '</span><img class="ws-caret-img" src="assets/chevron.svg" alt="" width="12" height="12" /></div>' +
      '<nav class="nav">' +
        '<a class="nav-item" data-nav="crm.html"><img class="ic" src="assets/crm.svg" alt="" width="16" height="16" />CRM</a>' +
        '<a class="nav-item" data-nav="team.html"><img class="ic" src="assets/team.svg" alt="" width="18" height="18" />Team</a>' +
        '<a class="nav-item" data-nav="notifications.html">' + BELL + 'Notifications</a>' +
        '<div class="nav-group-label">Apps</div>' +
        '<a class="nav-item" data-nav="home.html"><img class="ic" src="assets/home.svg" alt="" width="18" height="18" />Home</a>' +
        '<a class="nav-item" data-nav="messages.html"><img class="ic" src="assets/message.svg" alt="" width="18" height="18" />Messages</a>' +
        appsNavHTML() +
        '<a class="nav-item add" data-nav="studio.html"><img class="ic" src="assets/pls.svg" alt="" width="15" height="15" />Add app</a>' +
        '<div class="nav-group-label">Customize</div>' +
        '<a class="nav-item" data-nav="brand.html"><img class="ic" src="assets/brand.svg" alt="" width="18" height="18" />Brand</a>' +
        '<a class="nav-item" data-nav="app-library.html"><img class="ic" src="assets/apps.svg" alt="" width="18" height="18" />App Library</a>' +
      '</nav>' +
      '<div class="spacer"></div>' +
      '<div class="checklist">' +
        '<div class="checklist-title">Getting started</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Add your first app</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Create test client</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Explore the client experience</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Invite your team</div>' +
      '</div>' +
      '<div class="sidebar-foot">' +
        '<div class="foot-actions">' +
          '<button class="icon-btn" type="button" data-asm-tip="Not part of this prototype"><img src="assets/settings.svg" alt="Settings" width="16" height="16" /></button>' +
          '<button class="icon-btn" type="button" data-asm-tip="Not part of this prototype"><img src="assets/helpcenter.svg" alt="Help" width="16" height="16" /></button>' +
        '</div>' +
        '<button class="open-portal" type="button">Open Portal <img src="assets/openportal.svg" alt="" width="12" height="12" /></button>' +
      '</div>' +
    '</div>';
  }

  function findBundleSidebar() {
    return document.querySelector('div[style*="width: 180px"][style*="min-width: 180px"]');
  }

  function wire(host) {
    var suffix = navSuffix();
    host.querySelectorAll('[data-nav]').forEach(function (el) {
      el.addEventListener('click', function () { location.href = el.getAttribute('data-nav') + suffix; });
    });
    var op = host.querySelector('.open-portal');
    if (op) op.addEventListener('click', function () { location.href = 'portal.html' + suffix; });
    // Switching to another built app reloads the builder — show the cover the
    // instant it's clicked so the old app doesn't flash during the swap.
    host.querySelectorAll('.nav-item.built').forEach(function (el) {
      el.addEventListener('click', function () { ensureCover(); });
    });
  }

  // The bundle bakes "BrandMages" into its breadcrumb and chat copy; rewrite
  // it to the entered company so the whole builder reads consistently.
  function rebrandText() {
    var co = company();
    if (co === 'BrandMages') return;
    if (!document.body || document.body.innerText.indexOf('BrandMages') === -1) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE')) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf('BrandMages') !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(function (t) { t.nodeValue = t.nodeValue.split('BrandMages').join(co); });
  }

  // Relabel the bundle's "Time Tracker" text (e.g. the client-portal nav item
  // and app titles) to "Service Requests". Skips our own sidebar/overlay/popover.
  function relabelTimeTracker() {
    if (!document.body || document.body.innerText.indexOf('Time Tracker') === -1) return;
    var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        var p = n.parentNode;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return NodeFilter.FILTER_REJECT;
        if (p.closest && (p.closest('.asm-sb') || p.closest('#asm-sri-overlay') || p.closest('#asm-publish-popover'))) return NodeFilter.FILTER_REJECT;
        return n.nodeValue.indexOf('Time Tracker') !== -1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });
    var nodes = [], n;
    while ((n = w.nextNode())) nodes.push(n);
    var nm = appNameNow();
    nodes.forEach(function (t) { t.nodeValue = t.nodeValue.split('Time Tracker').join(nm); });
  }

  function ensureCover() {
    if (document.getElementById('asm-load-cover')) return;
    var c = document.createElement('div');
    c.id = 'asm-load-cover';
    if (window.__asmResumePublished) {
      // Returning to a finished/published app — quiet plain cover that just
      // fades to the app. No skeleton/loader; it shouldn't read as "building".
    } else if (IN_APP) {
      // In-app build: neutral skeleton, no website branding.
      c.className = 'asm-skel';
      c.innerHTML = '<div class="asm-cover-skel" aria-hidden="true"><span></span><span></span><span></span></div>';
    } else {
      c.innerHTML = '<div class="asm-load-inner">' +
        '<img class="asm-load-mark" src="assets/studio-mark.svg" alt="" />' +
        '<div class="asm-load-text">Setting up the builder…</div></div>';
    }
    document.body.appendChild(c);
  }
  function removeCover() {
    var c = document.getElementById('asm-load-cover');
    if (!c || c.classList.contains('asm-hide')) return;
    c.classList.add('asm-hide');
    setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 280);
  }

  // The generated-app client-portal preview ships a couple of mismatched nav
  // icons (Time Tracker as a house, Helpdesk as an empty square). We can't edit
  // the compiled bundle, so swap just the icon paths in place — same size, so
  // layout/resize is untouched. Re-runs each tick to survive React re-renders.
  var PREVIEW_ICONS = {
    'Service Requests': '<rect x="8" y="3" width="8" height="4" rx="1"></rect><path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2"></path><path d="M9 12h6"></path><path d="M9 16h4"></path>',
    'Helpdesk': '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="3.4"></circle><path d="m4.9 4.9 4.3 4.3"></path><path d="m14.8 14.8 4.3 4.3"></path><path d="m19.1 4.9-4.3 4.3"></path><path d="m9.2 14.8-4.3 4.3"></path>'
  };
  function fixPreviewIcons() {
    var rows = document.querySelectorAll('div[style*="gap: 9px"]');
    for (var i = 0; i < rows.length; i++) {
      var d = rows[i];
      var svg = d.querySelector(':scope > svg');
      if (!svg) continue;
      var label = '';
      for (var c = 0; c < d.childNodes.length; c++) {
        var n = d.childNodes[c];
        if (n.nodeType === 3) label += n.textContent;
        else if (n.nodeName === 'SPAN') label += n.textContent;
      }
      label = label.trim();
      var paths = PREVIEW_ICONS[label];
      if (paths && svg.getAttribute('data-asm-icon') !== label) {
        svg.innerHTML = paths;
        svg.setAttribute('data-asm-icon', label);
      }
    }
  }

  // The Dashboard/Portal/Notifications preview tabs are bundle buttons. The
  // Notifications tab isn't built for the prototype — neutralise its click and
  // show a "Not part of this prototype" tooltip on hover. Re-runs each tick so
  // it survives the bundle's React re-renders.
  function disableNotifTab() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var txt = '';
      for (var c = 0; c < b.childNodes.length; c++) { if (b.childNodes[c].nodeType === 3) txt += b.childNodes[c].textContent; }
      if (txt.trim() !== 'Notifications') continue;
      var st = b.getAttribute('style') || '';
      // Top-tab signature (padding 4px 10px + 12px) — avoids matching anything else.
      if (st.indexOf('padding: 4px 10px') === -1 || st.indexOf('font-size: 12px') === -1) continue;
      if (!b.classList.contains('asm-notif-disabled')) b.classList.add('asm-notif-disabled');
      // Keep the tab reliably painted — the bundle's re-renders can leave it
      // present-but-unpainted, so re-assert visibility every tick.
      b.style.setProperty('opacity', '1', 'important');
      b.style.setProperty('visibility', 'visible', 'important');
      b.style.setProperty('display', 'block', 'important');
      if (!b.hasAttribute('data-asm-noclick')) {
        b.setAttribute('data-asm-noclick', '1');
        // Capture phase + stopImmediatePropagation beats the bundle's onClick.
        b.addEventListener('click', function (e) { e.preventDefault(); e.stopImmediatePropagation(); }, true);
        // Body-appended tooltip (escapes the topbar's overflow:hidden).
        b.addEventListener('mouseenter', function () {
          var tip = notifTip();
          var r = this.getBoundingClientRect();
          tip.style.display = 'block';
          tip.style.left = Math.round(r.left) + 'px';
          tip.style.top = Math.round(r.bottom + 8) + 'px';
        });
        b.addEventListener('mouseleave', function () { var t = document.getElementById('asm-notif-tip'); if (t) t.style.display = 'none'; });
      }
    }
  }
  function notifTip() {
    var t = document.getElementById('asm-notif-tip');
    if (!t) { t = document.createElement('div'); t.id = 'asm-notif-tip'; t.textContent = 'Not part of this prototype'; document.body.appendChild(t); }
    return t;
  }

  // Hand-built Service Request Intake app preview (Assembly UI). Replaces the
  // bundle's Time Tracker artboard in the preview pane so the built app reads
  // as a service-request intake. Re-applied each tick (survives re-renders).
  var SRI_ROWS = [
    ['Login page won’t load', 'Meridian Corp', 'Bug', 'Apr 10', 'High', 'open', 'Open'],
    ['Onboard new team member', 'Oakwood LLC', 'Onboarding', 'Apr 10', 'Normal', 'review', 'In review'],
    ['Update billing contact', 'Meridian', 'Account', 'Apr 9', 'Normal', 'resolved', 'Resolved'],
    ['Export account data', '—', 'Data', 'Apr 9', 'Low', 'open', 'Open'],
    ['Integration not syncing', 'Bloom Studios', 'Bug', 'Apr 9', 'High', 'review', 'In review'],
    ['Add 5 user seats', 'NovaTech Inc', 'Account', 'Apr 8', 'Normal', 'resolved', 'Resolved'],
    ['Reset team passwords', 'Bloom Studios', 'Security', 'Apr 8', 'High', 'resolved', 'Resolved'],
    ['Question about an invoice', 'NovaTech Inc', 'Billing', 'Apr 7', 'Low', 'closed', 'Closed']
  ];
  var PRIO_COLOR = { High: '#d9634a', Normal: '#c69b3c', Low: '#9aa0a6' };
  function sriAppHTML() {
    var rows = SRI_ROWS.map(function (r) {
      return '<tr><td class="asm-sri-req" data-label="Request">' + r[0] + '</td><td data-label="Client">' + r[1] + '</td><td data-label="Type">' + r[2] + '</td>' +
        '<td class="asm-sri-muted" data-label="Submitted">' + r[3] + '</td>' +
        '<td data-label="Priority"><span class="asm-sri-prio"><span class="asm-sri-dot" style="background:' + (PRIO_COLOR[r[4]] || '#9aa0a6') + '"></span>' + r[4] + '</span></td>' +
        '<td data-label="Status"><span class="asm-sri-badge ' + r[5] + '">' + r[6] + '</span></td></tr>';
    }).join('');
    return '<div class="asm-sri-app">' +
      '<div class="asm-sri-head"><div class="asm-sri-title">' + esc(appNameNow()) + '</div>' +
        '<button class="asm-sri-new" type="button">+ New request</button></div>' +
      '<div class="asm-sri-tabs"><div class="asm-sri-tab active">My queue</div><div class="asm-sri-tab">Team</div><div class="asm-sri-tab">All requests</div></div>' +
      '<div class="asm-sri-body"><table class="asm-sri-table"><thead><tr>' +
        '<th>Request</th><th>Client</th><th>Type</th><th>Submitted</th><th>Priority</th><th>Status</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';
  }
  // Find the bundle's app-preview card: the smallest visible container in the
  // right pane that holds both the "Time Tracker" title and the table.
  function findAppCard() {
    var els = document.querySelectorAll('h1,h2,h3,div,span');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var own = '';
      for (var c = 0; c < e.childNodes.length; c++) { if (e.childNodes[c].nodeType === 3) own += e.childNodes[c].textContent; }
      var label = own.trim();
      // Title may already be relabelled to the app name by the time this runs.
      // Our own overlay has no "log time"/"description", so it's excluded.
      if (label !== 'Time Tracker' && label !== appNameNow()) continue;
      if (e.closest('#asm-sri-overlay')) continue;
      var r = e.getBoundingClientRect();
      if (r.width === 0 || r.left < 320) continue; // hidden VH modal or left chrome
      var node = e;
      for (var d = 0; d < 9 && node.parentElement; d++) {
        node = node.parentElement;
        if (/\+\s*log time/i.test(node.textContent) && /description/i.test(node.textContent)) return node;
      }
    }
    return null;
  }
  // Which preview tab is active (Dashboard/Portal/Notifications) — the active
  // one carries a non-transparent background (we tint it #eff1f4).
  function activePreviewTab() {
    var active = null;
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      var txt = b.textContent.trim();
      if (txt !== 'Dashboard' && txt !== 'Portal' && txt !== 'Notifications') continue;
      var st = b.getAttribute('style') || '';
      if (st.indexOf('padding: 4px 10px') === -1) continue;
      var bg = getComputedStyle(b).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') active = txt;
    }
    return active;
  }

  // Simplified placeholder canvas for any prompt that isn't the hand-built
  // service-request app — shows the app name and tells the user it's simplified.
  function placeholderAppHTML() {
    return '<div class="asm-ph-app">' +
      '<div class="asm-sri-head"><div class="asm-sri-title">' + esc(appNameNow()) + '</div></div>' +
      '<div class="asm-ph-mid">' +
        '<div class="asm-ph-badge">' + CLOCK + '</div>' +
        '<div class="asm-ph-name">' + esc(appNameNow()) + '</div>' +
        '<div class="asm-ph-msg">This preview is simplified for the prototype — your built app will be fully designed here.</div>' +
      '</div></div>';
  }
  // Client-facing portal preview = our own dark sidebar + the app canvas, so the
  // Portal view always keeps the client sidebar and is fully responsive.
  function portalShell(appHTML) {
    var co = company();
    var initial = ((co.trim()[0]) || 'A').toUpperCase();
    var S = function (p, fill) { return '<svg viewBox="0 0 24 24" fill="' + (fill ? 'currentColor' : 'none') + '" stroke="' + (fill ? 'none' : 'currentColor') + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>'; };
    var ICONS = {
      home: S('<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>'),
      msg: S('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>'),
      req: S('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>')
    };
    var items = [['home', 'Home', ''], ['msg', 'Messages', ''], ['req', appNameNow(), 'active']];
    var nav = items.map(function (n) { return '<div class="pn-item ' + n[2] + '">' + ICONS[n[0]] + '<span>' + esc(n[1]) + '</span></div>'; }).join('');
    return '<div class="asm-sri-portal">' +
      '<div class="asm-sri-pnav"><div class="pn-ws"><div class="pn-ws-av">' + initial + '</div><span class="pn-ws-name">' + esc(co) + '</span></div>' + nav + '</div>' +
      appHTML +
    '</div>';
  }
  function sriPortalHTML() { return portalShell(sriAppHTML()); }
  function placeholderPortalHTML() { return portalShell(placeholderAppHTML()); }
  // The full portal preview card: an ancestor of the dark nav (Helpdesk) that
  // also holds the app ("+ Log Time").
  function findPortalCard() {
    var hd = null, els = document.querySelectorAll('div,span,a');
    for (var i = 0; i < els.length; i++) {
      var own = '';
      for (var c = 0; c < els[i].childNodes.length; c++) { if (els[i].childNodes[c].nodeType === 3) own += els[i].childNodes[c].textContent; }
      if (own.trim() === 'Helpdesk' && !els[i].closest('#asm-sri-overlay')) { hd = els[i]; break; }
    }
    if (!hd) return null;
    var node = hd;
    for (var d = 0; d < 9 && node.parentElement; d++) {
      node = node.parentElement;
      if (/\+\s*log time/i.test(node.textContent)) { var r = node.getBoundingClientRect(); if (r.width > 0) return node; }
    }
    return null;
  }
  function previewPaneLeft() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].textContent.trim() === 'Dashboard' && (btns[i].getAttribute('style') || '').indexOf('padding: 4px 10px') > -1) {
        return btns[i].getBoundingClientRect().left - 16;
      }
    }
    return 0;
  }
  // Overlay (not innerHTML replace) so we never fight the bundle's React
  // reconciliation. Dashboard → just the SRI app; Portal → our own client
  // portal (dark sidebar + app), so the client sidebar is always present.
  // The bundle card we've hidden behind our overlay, so its edges/shadow can't
  // peek out as a "second layer". Kept layout-present (visibility, not display)
  // so its rect still measures for positioning the overlay.
  var overlaidCard = null;
  function restoreOverlaidCard() { if (overlaidCard) { try { overlaidCard.style.visibility = ''; } catch (e) {} overlaidCard = null; } }
  function injectSriApp() {
    var ov = document.getElementById('asm-sri-overlay');
    // Only show the finished app once the build is done — during qa/plan/
    // building the bundle's own progress visuals must be visible.
    var phase = (window.__ASM_STATE || {}).phase;
    if (phase !== 'done') { if (ov) ov.style.display = 'none'; restoreOverlaidCard(); return; }
    var tab = activePreviewTab();
    var card = null, mode = null;
    if (tab === 'Portal') { card = findPortalCard(); mode = 'portal'; }
    else if (tab === null || tab === 'Dashboard') { card = findAppCard(); mode = 'dash'; }
    if (!card) { if (ov) ov.style.display = 'none'; restoreOverlaidCard(); return; }
    if (!ov) { ov = document.createElement('div'); ov.id = 'asm-sri-overlay'; document.body.appendChild(ov); }
    // Service-request prompts get the hand-built app; everything else gets the
    // simplified placeholder. Both Dashboard and Portal previews show just the
    // app canvas — no client sidebar in the built-app preview.
    var svc = isServiceApp();
    var key = mode + (svc ? ':s' : ':p');
    if (ov.getAttribute('data-mode') !== key) {
      ov.innerHTML = svc ? sriAppHTML() : placeholderAppHTML();
      ov.setAttribute('data-mode', key);
    }
    var r = card.getBoundingClientRect();
    // Hide the bundle card underneath so it can't peek out behind our overlay.
    if (overlaidCard && overlaidCard !== card) { try { overlaidCard.style.visibility = ''; } catch (e) {} }
    try { card.style.visibility = 'hidden'; } catch (e) {}
    overlaidCard = card;
    // Clamp the left to the preview pane so the overlay never bleeds over chat.
    var left = Math.max(r.left, previewPaneLeft());
    var width = Math.max(0, r.right - left);
    ov.style.cssText = 'position:fixed;z-index:140;background:#fff;overflow:hidden;border-radius:12px;' +
      'box-shadow:0 1px 3px rgba(16,24,40,0.06);left:' + left + 'px;top:' + r.top + 'px;width:' + width + 'px;height:' + r.height + 'px;display:block;';
  }

  function apply() {
    ensureStyle();
    rebrandText();
    relabelTimeTracker();
    fixPreviewIcons();
    disableNotifTab();
    injectSriApp();
    var sb = findBundleSidebar();
    if (!sb) { ensureCover(); return; }
    // Already replaced and still intact — just keep the draft entry in sync.
    if (sb.getAttribute(MARK) === '1' && sb.querySelector('.asm-sb')) { syncDraft(sb); removeCover(); return; }
    ensureCover();
    sb.setAttribute(MARK, '1');
    // Neutralise the bundle's inline chrome so our sidebar owns the column.
    sb.style.padding = '0';
    sb.style.background = '#fff';
    sb.style.borderRight = '1px solid #dfe1e4';
    sb.style.overflow = 'hidden';
    sb.style.boxShadow = 'none';
    sb.innerHTML = buildHTML();
    wire(sb);
    if (typeof window.ftuxInit === 'function') window.ftuxInit();
    // Reaching the builder means a prompt was entered → publish is in-progress.
    if (window.ftuxMarkPublishProgress) window.ftuxMarkPublishProgress();
    syncDraft(sb);
    removeCover();
  }

  setInterval(apply, 60);
  apply();
})();
