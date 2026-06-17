/* Shared "Getting started" FTUX checklist logic across the portal pages.
   - Progress bar + per-item state (todo / in-progress / done) persisted in localStorage.
   - Publish → build page · Explore → client portal (completes on visit) · Invite → modal (completes on close — Invite, "Maybe later", or backdrop all mark it done).
   Exposed as window.ftuxInit() and idempotent, so callers that rebuild the
   sidebar (e.g. the AI builder, which swaps its whole document on load) can
   safely re-run it after re-injecting the checklist markup. */
(function () {
  var KEY = 'onb.ftux';
  var STYLE_ID = 'ftux-style';
  function get() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function hashParam(n) { var m = location.hash.match(new RegExp('[#&]' + n + '=([^&]*)')); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
  function navSuffix() { var p = []; ['company', 'name', 'email', 'theme'].forEach(function (k) { var v = hashParam(k); if (v) p.push(k + '=' + encodeURIComponent(v)); }); return p.length ? '#' + p.join('&') : ''; }

  var AVCOL = [['#f4f5f7', '#1f1f1f'], ['#e4f1eb', '#44856f'], ['#ece8f6', '#7a6cb2'], ['#f6e5e6', '#ac5462'], ['#efe9d2', '#a5812b'], ['#dce9f0', '#6e96ad'], ['#e8eee0', '#8a9070'], ['#f2e6f1', '#9c4f92']];
  function avc(s) { var h = 0; s = (s || '') + ''; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVCOL[h % AVCOL.length]; }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement('style');
    css.id = STYLE_ID;
    css.textContent =
      '.ftux-bar{height:4px;border-radius:99px;background:#e7e9ec;overflow:hidden;margin:0 0 12px;}' +
      '.ftux-bar-fill{height:100%;background:#1a1a1a;border-radius:99px;transition:width .35s ease;}' +
      '.checklist-item{cursor:pointer;border-radius:6px;margin:0 -8px;padding:6px 8px;gap:8px;transition:background .12s;}' +
      '.checklist-item:hover{background:var(--bg-hover,#eff1f4);}' +
      '.checklist-item.ftux-done{color:#8a9099;}' +
      '.checklist{transition:opacity .45s ease, transform .45s ease;}' +
      '.checklist.ftux-dismiss-out{opacity:0;transform:translateY(10px);pointer-events:none;}' +
      '.checklist-item img{flex-shrink:0;}' +
      '.ci-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      // ── "Explore the client experience" interstitial (shown before the portal) ──
      '.pi-ov{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .2s;font-family:Inter,system-ui,sans-serif;}' +
      '.pi-ov.show{opacity:1;pointer-events:auto;}' +
      '.pi-card{width:720px;max-width:100%;max-height:90vh;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.28);display:flex;}' +
      '.pi-left{flex:1;min-width:0;padding:32px;display:flex;flex-direction:column;}' +
      '.pi-title{font-size:21px;font-weight:500;letter-spacing:-0.01em;line-height:1.25;margin:0 0 14px;color:#212b36;}' +
      '.pi-copy{font-size:14px;line-height:1.6;color:#6b6f76;margin:0 0 28px;}' +
      '.pi-btn{align-self:flex-start;margin-top:auto;background:#1a1a1a;color:#fff;border:none;border-radius:8px;padding:11px 18px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;}' +
      '.pi-btn:hover{background:#000;}' +
      '.pi-right{width:340px;flex-shrink:0;background:#f3f4ef;border-left:1px solid #dfe1e4;padding:30px 0 0 30px;overflow:hidden;display:flex;align-items:stretch;}' +
      '.pi-portal{width:100%;height:400px;background:#fff;border:1px solid #dfe1e4;border-right:none;border-bottom:none;border-radius:12px 0 0 0;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,0.12);display:flex;}' +
      '.pi-side{width:132px;flex-shrink:0;background:var(--pi-side,#d9def9);padding:13px 10px;display:flex;flex-direction:column;gap:8px;}' +
      '.pi-ws{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;color:var(--pi-tx,#2f3650);}' +
      '.pi-av{width:20px;height:20px;border-radius:6px;background:#f0f1f3;color:#5a6068;font-size:10px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.pi-nav{display:flex;flex-direction:column;gap:4px;margin-top:8px;}' +
      '.pi-item{font-size:11px;color:var(--pi-tx,#2f3650);padding:6px 7px;border-radius:6px;display:flex;align-items:center;gap:7px;}' +
      '.pi-item.active{background:rgba(255,255,255,0.75);}' +
      '.pi-item svg{width:14px;height:14px;flex-shrink:0;opacity:0.85;}' +
      '.pi-client{margin-top:auto;display:flex;align-items:center;gap:8px;padding:8px;border-radius:9px;background:rgba(255,255,255,0.6);}' +
      '.pi-cav{width:24px;height:24px;border-radius:50%;background:#e4f1eb;color:#44856f;font-size:9px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.pi-cname{min-width:0;flex:1;color:var(--pi-tx,#2f3650);line-height:1.3;}' +
      '.pi-cname b{display:block;font-size:10.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '.pi-cname span{display:block;font-size:8.5px;opacity:0.6;white-space:nowrap;}' +
      '.pi-main{flex:1;padding:16px;display:flex;flex-direction:column;gap:11px;min-width:0;}' +
      '.pi-greet{font-size:15px;font-weight:500;color:#1a1a1a;}' +
      '.pi-sub{height:7px;width:68%;border-radius:4px;background:#eef0f2;}' +
      '.pi-hero{height:104px;border-radius:10px 0 0 10px;margin-right:-16px;background:linear-gradient(115deg,#1c1f26,#5b6675 70%,#aeb6c2);flex-shrink:0;}' +
      '.pi-line{height:8px;border-radius:4px;background:#eef0f2;}' +
      '.pi-line.short{width:56%;}' +
      '.pi-head2{height:10px;width:38%;border-radius:4px;background:#eef0f2;margin-top:6px;}' +
      // ── "Meet your test client first" gate (Open Portal before visiting the CRM) ──
      '.cf-ov{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .2s;font-family:Inter,system-ui,sans-serif;}' +
      '.cf-ov.show{opacity:1;pointer-events:auto;}' +
      '.cf-card{position:relative;width:760px;max-width:100%;max-height:90vh;background:#fff;border:1px solid #eff1f4;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,0.07);display:flex;overflow:hidden;}' +
      '.cf-left{flex:1;min-width:0;padding:24px;display:flex;flex-direction:column;gap:24px;}' +
      '.cf-content{flex:1;display:flex;flex-direction:column;gap:12px;}' +
      '.cf-title{font-size:20px;font-weight:500;line-height:28px;margin:0;color:#212b36;}' +
      '.cf-copy{font-size:13px;line-height:21px;color:#6b6f76;margin:0;}' +
      '.cf-go{align-self:flex-start;height:28px;padding:0 9px;background:#212b36;color:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:4px;font-family:inherit;font-size:12px;font-weight:500;cursor:pointer;}' +
      '.cf-go:hover{background:#0f1620;}' +
      '.cf-x{position:absolute;top:7px;right:6px;width:26px;height:26px;border-radius:999px;background:#fff;border:1px solid #dfe1e4;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#6b6f76;padding:0;z-index:2;}' +
      '.cf-x svg{width:12px;height:12px;}' +
      '.cf-x:hover{background:#f8f9fb;}' +
      '.cf-right{width:380px;flex-shrink:0;background:#eff1f4;padding:20px 0 0 20px;display:flex;align-items:stretch;overflow:hidden;}' +
      '.cf-crm{width:100%;height:420px;background:#fff;border:1px solid #dfe1e4;border-right:none;border-bottom:none;border-radius:8px 0 0 0;overflow:hidden;display:flex;}' +
      '.cf-side{width:152px;flex-shrink:0;background:#f8f9fb;border-right:1px solid #dfe1e4;padding:8px;display:flex;flex-direction:column;gap:1px;}' +
      '.cf-ws{display:flex;align-items:center;gap:7px;font-size:11.5px;color:#212b36;padding:5px 7px 9px;}' +
      '.cf-ws-av{width:17px;height:17px;border-radius:4px;background:#101010;color:#fff;font-size:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.cf-nv{display:flex;align-items:center;gap:7px;font-size:9.9px;color:#212b36;padding:4px 6px;border-radius:4px;}' +
      '.cf-nv.active{background:#e6e8eb;}' +
      '.cf-nv svg{width:13px;height:13px;flex-shrink:0;}' +
      '.cf-lbl{font-size:10px;color:#6b6f76;padding:8px 7px 2px;}' +
      '.cf-main{flex:1;min-width:0;display:flex;flex-direction:column;}' +
      '.cf-main-h{font-size:11px;font-weight:500;color:#212b36;padding:11px 14px;border-bottom:1px solid #dfe1e4;}' +
      '.cf-tabs{display:flex;gap:16px;font-size:11.5px;color:#212b36;padding:9px 14px 0;border-bottom:1px solid #dfe1e4;}' +
      '.cf-tabs span{padding-bottom:8px;}' +
      '.cf-tabs .on{border-bottom:1.5px solid #212b36;}' +
      '.cf-cname{font-size:10px;color:#6b6f76;padding:11px 14px 7px;}' +
      '.cf-ct{display:flex;align-items:center;gap:9px;padding:7px 14px;}' +
      '.cf-av{width:24px;height:24px;border-radius:50%;background:#f2f2f3;color:#212b36;font-size:9px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;}' +
      '.cf-ct b{display:block;font-size:11px;font-weight:500;color:#212b36;line-height:1.35;}' +
      '.cf-ct span{display:block;font-size:10px;color:#6b6f76;line-height:1.35;}' +
      '@media (max-width:680px){.cf-right{display:none;}}' +
      '@media (max-width:640px){.pi-right{display:none;}}';
    document.head.appendChild(css);
  }

  var keys = ['publish', 'client', 'explore'];

  function render() {
    var cl = document.querySelector('.checklist');
    if (!cl) return;
    var items = [].slice.call(cl.querySelectorAll('.checklist-item'));
    var st = get();
    var visCount = 0, doneCount = 0;
    items.forEach(function (it, i) {
      var k = keys[i];
      var img = it.querySelector('img');
      it.classList.remove('ftux-done', 'active');
      var src;
      // Done → green check. Any step set to 'progress' shows the in-progress
      // indicator + is highlighted; otherwise it's a plain todo.
      if (st[k] === 'done') { src = 'assets/check-green.svg?v=2'; it.classList.add('ftux-done'); }
      else if (st[k] === 'progress') { src = 'assets/progress-indication.svg'; it.classList.add('active'); }
      else { src = 'assets/todo.svg'; }
      if (img) img.setAttribute('src', src);
      // Progress reflects only visible steps (some options hide the test-client /
      // explore steps), so the bar can't read as partially full with nothing checked.
      if (it.style.display !== 'none') { visCount++; if (st[k] === 'done') doneCount++; }
    });
    var fill = cl.querySelector('.ftux-bar-fill');
    if (fill) fill.style.width = Math.max(7, Math.round(doneCount / Math.max(1, visCount) * 100)) + '%';
    // Everything complete → show the all-done state briefly, then retire the card.
    if (visCount > 0 && doneCount === visCount) finishFtux(cl);
  }

  // All steps done: flip the title to an "all set" confirmation and leave it visible
  // for the rest of this view — it does NOT fade away on its own. The done flag keeps
  // it retired on the next page load / new session (handled in ftuxInit).
  function finishFtux(cl) {
    if (cl.getAttribute('data-ftux-finishing') === '1') return;
    cl.setAttribute('data-ftux-finishing', '1');
    var title = cl.querySelector('.checklist-title');
    if (title) title.textContent = 'You’re all set';
    try { localStorage.setItem('onb.ftuxDone', '1'); } catch (e) {}
  }

  // Mark "Publish your first app" as in-progress (a prompt was entered) or done
  // (the app was published). Never downgrade a completed item.
  function markPublish(state) {
    var s = get();
    if (s.publish === 'done') return;
    if (state === 'progress' && s.publish === 'progress') return;
    s.publish = state; save(s); render();
  }

  // ── "Explore the client experience" interstitial ──
  var PI_THEME = { brand: ['#d9def9', '#2f3650'], dark: ['#1f1f22', '#d6d6db'], light: ['#e8eee0', '#3a3a3a'] };
  function ensurePortalIntro() {
    var ov = document.querySelector('.pi-ov');
    if (ov) return ov;
    var co = hashParam('company') || 'Studio';
    var coShort = co.trim().split(/\s+/)[0];
    var initial = (co.trim()[0] || 'S').toUpperCase();
    var t = PI_THEME[hashParam('theme')] || PI_THEME.brand;
    var HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>';
    var MSG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    var FILES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
    var lines = '<div class="pi-line"></div><div class="pi-line short"></div><div class="pi-head2"></div><div class="pi-line"></div><div class="pi-line"></div><div class="pi-line short"></div><div class="pi-line"></div><div class="pi-line short"></div>';
    // Option 3 reframes this interstitial as the single onboarding moment: explain the
    // test client here (not on the CRM) and offer Continue to Portal / Manage Clients.
    var pv = '1'; try { var cvv = localStorage.getItem('onb.crmVariant'); if (cvv) pv = cvv; } catch (e) {}
    var leftHtml;
    if (pv === '3') {
      var AV = 'width:24px;height:24px;border-radius:50%;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
      leftHtml = '<div class="pi-left">' +
        '<h2 class="pi-title">Preview the client portal</h2>' +
        '<p class="pi-copy">See exactly what your client experiences — the branded sign-in and their portal. You can switch which client you preview once you\'re inside.</p>' +
        '<div style="margin-bottom:6px;">' +
          '<div style="font-size:12px;color:#6b6f76;margin-bottom:6px;">Preview as</div>' +
          '<div style="display:inline-flex;align-items:center;gap:9px;background:#fff;border:1px solid #dfe1e4;border-radius:10px;padding:9px 12px;font-size:14px;color:#212b36;">' +
            '<span style="' + AV + 'background:#e4f1eb;color:#44856f;">TC</span>Test Client' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:auto;">' +
          '<button class="pi-btn" id="piOpen" type="button" style="margin-top:0;">Open client portal</button>' +
        '</div>' +
      '</div>';
    } else {
      leftHtml = '<div class="pi-left">' +
        '<h2 class="pi-title">Step into your client\'s view</h2>' +
        '<p class="pi-copy">You\'ve met your test client in the CRM — now see the portal from their side. This is exactly what your clients log in to, on any app you build or enable.</p>' +
        '<button class="pi-btn" type="button">Launch client view</button>' +
      '</div>';
    }
    ov = document.createElement('div');
    ov.className = 'pi-ov';
    ov.style.setProperty('--pi-side', t[0]);
    ov.style.setProperty('--pi-tx', t[1]);
    ov.innerHTML = '<div class="pi-card">' +
      leftHtml +
      '<div class="pi-right"><div class="pi-portal">' +
        '<div class="pi-side">' +
          '<div class="pi-ws"><span class="pi-av">' + initial + '</span><span>' + coShort + '</span></div>' +
          '<div class="pi-nav"><span class="pi-item active">' + HOME + 'Home</span><span class="pi-item">' + MSG + 'Messages</span><span class="pi-item">' + FILES + 'Files</span></div>' +
          '<div class="pi-client"><span class="pi-cav">TC</span><span class="pi-cname"><span>Viewing as</span><b>Test Client</b></span></div>' +
        '</div>' +
        '<div class="pi-main"><div class="pi-greet">Good morning</div><div class="pi-sub"></div><div class="pi-hero"></div>' + lines + '</div>' +
      '</div></div>' +
    '</div>';
    document.body.appendChild(ov);
    function seenThenGo(url) { try { localStorage.setItem('onb.portalIntroSeen', '1'); } catch (e) {} location.href = url; }
    if (pv === '3') {
      // Launcher: single "Open client portal" → branded sign-in (skippable) → portal.
      // Switching the previewed client happens inside the portal, not here.
      var sfx = navSuffix();
      var openBtn = ov.querySelector('#piOpen');
      if (openBtn) openBtn.addEventListener('click', function () { seenThenGo('portal.html#signin=1' + (sfx ? '&' + sfx.slice(1) : '')); });
    } else {
      ov.querySelector('.pi-btn').addEventListener('click', function () { seenThenGo('portal.html' + navSuffix()); });
    }
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('show'); });
    return ov;
  }
  // Gate shown when "Open Portal" is clicked before the test client has been
  // engaged in the CRM — points the user there to go through the coachmark first.
  function ensureClientFirst() {
    var ov = document.querySelector('.cf-ov');
    if (ov) return ov;
    var CRM_IC = '<svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1.17969 2.6375C1.17969 1.37504 2.20316 0.351562 3.46563 0.351562H10.9469C11.9807 0.351562 12.8172 1.18801 12.8172 2.22188V8.87188C12.8172 9.52129 12.4873 10.0928 11.9859 10.4279V12.4047H12.1938C12.5392 12.4047 12.8172 12.6826 12.8172 13.0281C12.8172 13.3736 12.5392 13.6516 12.1938 13.6516H3.25781C2.10965 13.6516 1.17969 12.7216 1.17969 11.5734V2.6375ZM2.42656 11.5734C2.42656 12.0332 2.79803 12.4047 3.25781 12.4047H10.7391V10.7422H3.25781C2.79803 10.7422 2.42656 11.1137 2.42656 11.5734ZM2.42656 9.66936C2.68113 9.55766 2.96168 9.49531 3.25781 9.49531H10.9469C11.2924 9.49531 11.5703 9.21736 11.5703 8.87188V2.22188C11.5703 1.87639 11.2924 1.59844 10.9469 1.59844H3.46563C2.89154 1.59844 2.42656 2.06342 2.42656 2.6375V9.66936ZM5.75156 4.50781C5.75156 3.81998 6.31061 3.26094 6.99844 3.26094C7.68627 3.26094 8.24531 3.81998 8.24531 4.50781C8.24531 5.19564 7.68627 5.75469 6.99844 5.75469C6.31061 5.75469 5.75156 5.19564 5.75156 4.50781ZM5.25801 8.04063C4.87355 8.04063 4.57742 7.68475 4.79043 7.36524C5.09955 6.89766 5.63207 6.58594 6.23732 6.58594H7.76215C8.3674 6.58594 8.89732 6.89506 9.20904 7.36524C9.41945 7.68475 9.12592 8.04063 8.74147 8.04063H5.25801Z" fill="currentColor"/></svg>';
    ov = document.createElement('div');
    ov.className = 'cf-ov';
    var co = (hashParam('company') || 'Studio').trim();
    var initial = (co[0] || 'S').toUpperCase();
    var esc = function (s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
    var SK = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    var IC = {
      crm: '<svg viewBox="0 0 24 24" ' + SK + '><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M15 9h3M15 13h3"/></svg>',
      team: '<svg viewBox="0 0 24 24" ' + SK + '><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
      bell: '<svg viewBox="0 0 24 24" ' + SK + '><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      home: '<svg viewBox="0 0 24 24" ' + SK + '><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
      msg: '<svg viewBox="0 0 24 24" ' + SK + '><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
      plus: '<svg viewBox="0 0 24 24" ' + SK + '><path d="M12 5v14M5 12h14"/></svg>',
      brand: '<svg viewBox="0 0 24 24" ' + SK + '><circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10.5" r="1"/><circle cx="12" cy="8.5" r="1"/><circle cx="15.5" cy="10.5" r="1"/></svg>',
      apps: '<svg viewBox="0 0 24 24" ' + SK + '><path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
    };
    var X = '<svg viewBox="0 0 24 24" ' + SK + '><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    ov.innerHTML = '<div class="cf-card">' +
      '<div class="cf-left">' +
        '<div class="cf-content">' +
          '<h2 class="cf-title">Meet your test client first</h2>' +
          '<p class="cf-copy">To preview the client portal, head to your CRM and open it as your test client — we’ll walk you through it from there.</p>' +
        '</div>' +
        '<button class="cf-go" type="button">Go to CRM</button>' +
      '</div>' +
      '<div class="cf-right"><div class="cf-crm">' +
        '<div class="cf-side">' +
          '<div class="cf-ws"><span class="cf-ws-av">' + esc(initial) + '</span>' + esc(co) + '</div>' +
          '<div class="cf-nv active">' + IC.crm + 'CRM</div>' +
          '<div class="cf-nv">' + IC.team + 'Team</div>' +
          '<div class="cf-nv">' + IC.bell + 'Notifications</div>' +
          '<div class="cf-lbl">Apps</div>' +
          '<div class="cf-nv">' + IC.home + 'Home</div>' +
          '<div class="cf-nv">' + IC.msg + 'Messages</div>' +
          '<div class="cf-nv">' + IC.plus + 'Add app</div>' +
          '<div class="cf-lbl">Customize</div>' +
          '<div class="cf-nv">' + IC.brand + 'Brand</div>' +
          '<div class="cf-nv">' + IC.apps + 'Apps</div>' +
        '</div>' +
        '<div class="cf-main">' +
          '<div class="cf-main-h">CRM</div>' +
          '<div class="cf-tabs"><span>Companies</span><span class="on">Contacts</span></div>' +
          '<div class="cf-cname">Name</div>' +
          '<div class="cf-ct"><span class="cf-av">TC</span><div><b>Test Client</b><span>name@test.com</span></div></div>' +
          '<div class="cf-ct"><span class="cf-av">JD</span><div><b>Jane Doe</b><span>jane@rocket.com</span></div></div>' +
          '<div class="cf-ct"><span class="cf-av">JD</span><div><b>John Doe</b><span>john@rocket.com</span></div></div>' +
        '</div>' +
      '</div></div>' +
      '<button class="cf-x" type="button" aria-label="Close">' + X + '</button>' +
    '</div>';
    document.body.appendChild(ov);
    // Dismissing the gate (✕ or backdrop) remembers it — it won't show again.
    function close() { ov.classList.remove('show'); try { localStorage.setItem('onb.clientFirstSeen', '1'); } catch (e) {} }
    ov.querySelector('.cf-x').addEventListener('click', close);
    // On the CRM the user is already where they need to be — relabel the CTA and just
    // close (the coachmark points at the row's "Open portal as client"). Elsewhere it
    // routes to the CRM.
    var goBtn = ov.querySelector('.cf-go');
    if (location.pathname.indexOf('crm.html') > -1) {
      goBtn.textContent = 'Got it';
      goBtn.addEventListener('click', close);
    } else {
      goBtn.addEventListener('click', function () { location.href = 'crm.html' + navSuffix(); });
    }
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    return ov;
  }
  function showClientFirst() {
    var ov = ensureClientFirst();
    requestAnimationFrame(function () { ov.classList.add('show'); });
  }

  function openPortalIntro() {
    // First-timers must pass the CRM tutorial before opening the portal freely.
    // "Passed" = they opened the portal as the test client FROM the CRM, which is
    // the only thing that sets explore='done'. Until then we funnel them to the CRM.
    var exp; try { exp = (get() || {}).explore; } catch (e) {}
    if (exp === 'done') { location.href = 'portal.html' + navSuffix(); return; }
    // Test client isn't active yet (explore !== 'done'). The generic "Open Portal" must
    // NOT open the portal directly — even on the CRM. Activation happens only via the
    // row's "Open portal as client" action. Show the gate once; if it's already been
    // dismissed, don't nag — send them to the branded sign-in page instead.
    var seen = false; try { seen = localStorage.getItem('onb.clientFirstSeen') === '1'; } catch (e) {}
    if (seen) {
      var sfx2 = navSuffix();
      location.href = 'portal.html#signin=1' + (sfx2 ? '&' + sfx2.slice(1) : '');
      return;
    }
    showClientFirst();
  }
  window.ftuxOpenPortalIntro = openPortalIntro;

  function ftuxInit() {
    ensureStyle();

    var cl = document.querySelector('.checklist');

    // Pages with no checklist but a portal sidebar — "Explore the client experience"
    // completes ONLY when the portal is opened as the test client from the CRM
    // (from=crm.html), not via a direct "Open Portal".
    if (!cl) {
      if (document.querySelector('.side') && hashParam('from') === 'crm.html') {
        var s = get(); if (s.explore !== 'done') { s.explore = 'done'; save(s); }
      }
      return;
    }

    // Onboarding already finished on a prior visit → the card stays retired.
    try { if (localStorage.getItem('onb.ftuxDone') === '1') { if (cl.parentNode) cl.parentNode.removeChild(cl); return; } } catch (e) {}

    // The test client is no longer its own checklist step — it's surfaced via the
    // CRM coachmark. Hide that row on every page (kept in the DOM so the keys[]
    // index mapping stays aligned), leaving only "Explore the client experience".
    (function () {
      [].forEach.call(cl.querySelectorAll('.checklist-item'), function (it) {
        var txt = it.textContent;
        if (txt.indexOf('Create test client') > -1 || txt.indexOf('Meet your test client') > -1) it.style.display = 'none';
      });
    })();

    var title = cl.querySelector('.checklist-title');
    if (title && !cl.querySelector('.ftux-bar')) {
      var bar = document.createElement('div'); bar.className = 'ftux-bar'; bar.innerHTML = '<div class="ftux-bar-fill"></div>';
      title.parentNode.insertBefore(bar, title.nextSibling);
    }

    var suffix = navSuffix();
    var items = [].slice.call(cl.querySelectorAll('.checklist-item'));
    items.forEach(function (it, i) {
      if (it.getAttribute('data-ftux-bound') === '1') return;
      var clone = it.cloneNode(true); // strip any prior click handlers
      // Wrap the bare label text so it truncates with an ellipsis when tight.
      [].slice.call(clone.childNodes).forEach(function (node) {
        if (node.nodeType === 3 && node.textContent.trim() && !clone.querySelector('.ci-label')) {
          var span = document.createElement('span');
          span.className = 'ci-label';
          span.textContent = node.textContent.trim();
          clone.replaceChild(span, node);
        }
      });
      it.parentNode.replaceChild(clone, it);
      clone.setAttribute('data-ftux-bound', '1');
      clone.addEventListener('click', function () {
        if (i === 0) {
          // If a build was already started, resume it in the builder (where they
          // left off) instead of dropping back on the "Add app" start page.
          var app = null;
          try { var al = JSON.parse(localStorage.getItem('onb.buildApps')); if (Array.isArray(al) && al.length) app = al[al.length - 1]; } catch (e) {}
          location.href = app ? ('builder.html' + (app.hash || suffix)) : ('studio.html' + suffix);
        }
        else if (i === 1) location.href = 'crm.html' + suffix;    // (hidden) test-client step
        else if (i === 2) location.href = 'crm.html' + suffix;    // Explore → CRM coachmark (resumes at the last step if in-progress)
      });
    });

    // "Open Portal" buttons go through the same interstitial. Clone to strip
    // any page-level handler that would navigate directly.
    var op = document.querySelector('.open-portal');
    if (op && op.getAttribute('data-ftux-bound') !== '1') {
      var opc = op.cloneNode(true);
      op.parentNode.replaceChild(opc, op);
      opc.setAttribute('data-ftux-bound', '1');
      opc.addEventListener('click', function (e) { e.preventDefault(); openPortalIntro(); });
    }

    render();
  }

  window.ftuxInit = ftuxInit;
  window.ftuxMarkPublishProgress = function () { markPublish('progress'); };
  window.ftuxMarkPublishDone = function () { markPublish('done'); };
  // Keep the checklist in sync across open tabs — without this a page only
  // re-renders on load, so two tabs can show different progress until reloaded.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY || e.key === 'onb.ftuxDone') { try { ftuxInit(); } catch (_) {} }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ftuxInit);
  else ftuxInit();
})();
