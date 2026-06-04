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

  var CSS =
    '.asm-sb{--text:#212b36;--muted:#6b6f76;--border:#dfe1e4;--bg-hover:#eff1f4;--dark:#1a1a1a;' +
      'height:100%;display:flex;flex-direction:column;padding:14px 12px;gap:4px;box-sizing:border-box;' +
      "font-family:'Inter',system-ui,-apple-system,sans-serif;color:var(--text);background:#fff;letter-spacing:normal;font-size:14px;line-height:normal;}" +
    '.asm-sb *{box-sizing:border-box;}' +
    '.asm-sb .ws{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;cursor:pointer;}' +
    '.asm-sb .ws:hover{background:var(--bg-hover);}' +
    '.asm-sb .ws-avatar{width:26px;height:26px;border-radius:7px;background:#f0f1f3;border:1px solid rgba(0,0,0,0.06);display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#5a6068;font-size:13px;font-weight:400;}' +
    '.asm-sb .ws-name{font-weight:500;font-size:14px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
    '.asm-sb .nav{display:flex;flex-direction:column;gap:1px;margin-top:8px;}' +
    '.asm-sb .nav-group-label{font-size:11px;font-weight:500;letter-spacing:0.04em;text-transform:uppercase;color:var(--muted);padding:14px 8px 5px;}' +
    '.asm-sb .nav-item{display:flex;align-items:center;gap:10px;padding:7px 8px;border-radius:8px;font-size:13.5px;color:var(--text);cursor:pointer;text-decoration:none;}' +
    '.asm-sb .nav-item:hover{background:var(--bg-hover);}' +
    '.asm-sb .nav-item.active{background:var(--bg-hover);font-weight:500;}' +
    '.asm-sb .nav-item svg{color:var(--muted);flex-shrink:0;}' +
    '.asm-sb .nav-item .ic,.asm-sb .ws-caret-img,.asm-sb .checklist-item .ic{display:block;flex-shrink:0;}' +
    '.asm-sb .nav-item.add{color:var(--muted);}' +
    '.asm-sb .nav-item.draft .draft-label{flex:1;}' +
    '.asm-sb .draft-badge{font-size:11px;font-weight:400;color:var(--muted);background:#f0f1f3;border-radius:5px;padding:1px 7px;}' +
    '.asm-sb .spacer{flex:1;}' +
    '.asm-sb .checklist{border:1px solid var(--border);border-radius:12px;padding:12px;margin-top:10px;}' +
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
    '#asm-components-link{display:none !important;}';

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
  // The label tracks the builder's own app title (read from its breadcrumb);
  // this is just the fallback before that title is available.
  var DRAFT_APP = 'Time Tracker';

  // Read the app name the builder is using, from its "Workspace / App"
  // breadcrumb in the top bar. Empty string if not found yet.
  function appTitle() {
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

  // The builder surfaces an "...version published" checkpoint once the app
  // is published; at that point it is no longer a draft.
  function isPublished() {
    return document.body && /version published/i.test(document.body.innerText);
  }

  // Keep the draft entry's name in sync with the builder, and drop the
  // Draft badge once published.
  function syncDraft(host) {
    var label = host.querySelector('.draft-label');
    if (label) { var t = appTitle(); if (t && label.textContent !== t) label.textContent = t; }
    if (isPublished()) {
      var badge = host.querySelector('.draft-badge');
      if (badge) badge.remove();
      if (window.ftuxMarkPublishDone) window.ftuxMarkPublishDone();
    }
  }

  function buildHTML() {
    var co = company();
    var initial = ((co.trim()[0]) || 'S').toUpperCase();
    // data-asm-brand-applied trips the bundle override's global guard so its
    // ensureBrandMagesLogo() never rewrites our workspace avatar.
    return '<div class="asm-sb" data-asm-brand-applied="1">' +
      '<div class="ws"><div class="ws-avatar">' + initial + '</div><span class="ws-name">' + co + '</span><img class="ws-caret-img" src="assets/chevron.svg" alt="" width="12" height="12" /></div>' +
      '<nav class="nav">' +
        '<a class="nav-item" data-nav="crm.html"><img class="ic" src="assets/crm.svg" alt="" width="16" height="16" />CRM</a>' +
        '<a class="nav-item" data-nav="team.html"><img class="ic" src="assets/team.svg" alt="" width="18" height="18" />Team</a>' +
        '<a class="nav-item" data-nav="notifications.html">' + BELL + 'Notifications</a>' +
        '<div class="nav-group-label">Apps</div>' +
        '<a class="nav-item" data-nav="home.html"><img class="ic" src="assets/home.svg" alt="" width="18" height="18" />Home</a>' +
        '<a class="nav-item" data-nav="messages.html"><img class="ic" src="assets/message.svg" alt="" width="18" height="18" />Messages</a>' +
        '<a class="nav-item draft active">' + CLOCK + '<span class="draft-label">' + DRAFT_APP + '</span><span class="draft-badge">Draft</span></a>' +
        '<a class="nav-item add" data-nav="studio.html"><img class="ic" src="assets/pls.svg" alt="" width="15" height="15" />Add app</a>' +
        '<div class="nav-group-label">Customize</div>' +
        '<a class="nav-item" data-nav="brand.html"><img class="ic" src="assets/brand.svg" alt="" width="18" height="18" />Brand</a>' +
        '<a class="nav-item" data-nav="studio.html"><img class="ic" src="assets/apps.svg" alt="" width="18" height="18" />Apps</a>' +
      '</nav>' +
      '<div class="spacer"></div>' +
      '<div class="checklist">' +
        '<div class="checklist-title">Getting started</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Publish your first app</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Explore the client experience</div>' +
        '<div class="checklist-item"><img class="ic" src="assets/todo.svg" alt="" width="14" height="14" />Invite your team</div>' +
      '</div>' +
      '<div class="sidebar-foot">' +
        '<div class="foot-actions">' +
          '<button class="icon-btn" type="button"><img src="assets/settings.svg" alt="Settings" width="16" height="16" /></button>' +
          '<button class="icon-btn" type="button"><img src="assets/helpcenter.svg" alt="Help" width="16" height="16" /></button>' +
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

  function apply() {
    ensureStyle();
    rebrandText();
    var sb = findBundleSidebar();
    if (!sb) return;
    // Already replaced and still intact — just keep the draft entry in sync.
    if (sb.getAttribute(MARK) === '1' && sb.querySelector('.asm-sb')) { syncDraft(sb); return; }
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
  }

  setInterval(apply, 200);
  apply();
})();
