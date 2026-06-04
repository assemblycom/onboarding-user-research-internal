/* Shared "Getting started" FTUX checklist logic across the portal pages.
   - Progress bar + per-item state (todo / in-progress / done) persisted in localStorage.
   - Publish → build page · Explore → client portal (completes on visit) · Invite → modal (completes on close).
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
      '.checklist-item{cursor:pointer;border-radius:6px;margin:0 -6px;padding:6px 6px;transition:background .12s;}' +
      '.checklist-item:hover{background:var(--bg-hover,#eff1f4);}' +
      '.checklist-item.ftux-done{color:#8a9099;}' +
      '.inv-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .2s;font-family:Inter,system-ui,sans-serif;}' +
      '.inv-overlay.show{opacity:1;pointer-events:auto;}' +
      '.inv-modal{width:448px;max-width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.28);max-height:90vh;display:flex;flex-direction:column;}' +
      '.inv-banner{height:150px;flex-shrink:0;background:linear-gradient(135deg,#eef0fb 0%,#e8eee0 60%,#f6e5e6 100%);}' +
      '.inv-body{padding:22px 22px 0;overflow-y:auto;color:#212b36;}' +
      '.inv-title{font-size:18px;font-weight:500;margin:0 0 6px;}' +
      '.inv-sub{font-size:13.5px;color:#6b6f76;line-height:1.5;margin:0 0 18px;}' +
      '.inv-input-row{display:flex;align-items:center;border:1px solid #dfe1e4;border-radius:8px;overflow:hidden;margin-bottom:16px;}' +
      '.inv-input-row input{flex:1;border:none;outline:none;font-family:inherit;font-size:14px;padding:0 14px;height:42px;color:#212b36;}' +
      '.inv-role{display:flex;align-items:center;gap:5px;border-left:1px solid #dfe1e4;padding:0 12px;height:42px;font-size:13px;color:#212b36;cursor:pointer;white-space:nowrap;}' +
      '.inv-list{border:1px solid #dfe1e4;border-radius:10px;overflow:hidden;}' +
      '.inv-person{display:flex;align-items:center;gap:11px;padding:9px 13px;}' +
      '.inv-person+.inv-person{border-top:1px solid #f1f3f4;}' +
      '.inv-av{width:30px;height:30px;border-radius:50%;font-size:11px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.inv-nm{font-size:13.5px;font-weight:500;line-height:1.3;}' +
      '.inv-em{font-size:12.5px;color:#6b6f76;line-height:1.3;}' +
      '.inv-foot{padding:16px 22px 22px;flex-shrink:0;}' +
      '.inv-btn{width:100%;height:44px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;}' +
      '.inv-btn:hover{background:#000;}' +
      '.inv-later{display:block;width:100%;margin-top:8px;padding:8px;background:none;border:none;font-family:inherit;font-size:13px;color:#6b6f76;cursor:pointer;}' +
      '.inv-later:hover{color:#212b36;}' +
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
      '@media (max-width:640px){.pi-right{display:none;}}';
    document.head.appendChild(css);
  }

  // ── Invite-team modal (injected once per document) ──
  function ensureModal() {
    var ov = document.querySelector('.inv-overlay');
    if (ov) return ov;
    var people = [
      ['Neil Raina', 'neil@assembly.com'], ['Adam Schwartz', 'adam@assembly.com'],
      ['Dovid Baum', 'dovid@assembly.com'], ['Amelia Riely', 'amelia@assembly.com'],
      ['Ellie Spigelman', 'ellie@assembly.com']
    ];
    function initials(n) { var p = n.trim().split(/\s+/); return ((p[0] ? p[0][0] : '') + (p[1] ? p[1][0] : '')).toUpperCase(); }
    var listHtml = people.map(function (p) { var c = avc(p[0]); return '<div class="inv-person"><span class="inv-av" style="background:' + c[0] + ';color:' + c[1] + '">' + initials(p[0]) + '</span><div><div class="inv-nm">' + p[0] + '</div><div class="inv-em">' + p[1] + '</div></div></div>'; }).join('');
    ov = document.createElement('div');
    ov.className = 'inv-overlay';
    ov.innerHTML = '<div class="inv-modal">' +
      '<div class="inv-banner"></div>' +
      '<div class="inv-body">' +
      '<h2 class="inv-title">Bring your team into Studio</h2>' +
      '<p class="inv-sub">Your app is now available to your team. Add teammates to get everyone working in one place.</p>' +
      '<div class="inv-input-row"><input type="email" placeholder="name@company.com" /><span class="inv-role">Member <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></div>' +
      '<div class="inv-list">' + listHtml + '</div>' +
      '</div>' +
      '<div class="inv-foot"><button class="inv-btn">Invite</button><button class="inv-later">Maybe later</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    // Clicking the backdrop or "Maybe later" just dismisses (no completion);
    // only "Invite" marks the checklist item done.
    ov.addEventListener('click', function (e) { if (e.target === ov) dismissInvite(); });
    ov.querySelector('.inv-btn').addEventListener('click', completeInvite);
    ov.querySelector('.inv-later').addEventListener('click', dismissInvite);
    return ov;
  }
  function openInvite() { ensureModal().classList.add('show'); }
  function hideInvite() { var ov = document.querySelector('.inv-overlay'); if (ov) ov.classList.remove('show'); }
  function dismissInvite() { hideInvite(); }
  function completeInvite() {
    hideInvite();
    var s = get(); if (!s.invite) { s.invite = 'done'; save(s); render(); }
  }

  var keys = ['publish', 'explore', 'invite'];

  function render() {
    var cl = document.querySelector('.checklist');
    if (!cl) return;
    var items = [].slice.call(cl.querySelectorAll('.checklist-item'));
    var st = get();
    var doneCount = 0;
    keys.forEach(function (k) { if (st[k] === 'done') doneCount++; });
    items.forEach(function (it, i) {
      var k = keys[i];
      var img = it.querySelector('img');
      it.classList.remove('ftux-done', 'active');
      var src;
      // Done → green check. "Publish" shows in-progress only once a prompt
      // has been entered (st.publish === 'progress'); otherwise everything
      // defaults to todo (a fresh user who hasn't started building yet).
      if (st[k] === 'done') { src = 'assets/check-green.svg'; it.classList.add('ftux-done'); }
      else if (k === 'publish' && st.publish === 'progress') { src = 'assets/progress-indication.svg'; it.classList.add('active'); }
      else { src = 'assets/todo.svg'; }
      if (img) img.setAttribute('src', src);
    });
    var fill = cl.querySelector('.ftux-bar-fill');
    if (fill) fill.style.width = Math.max(7, Math.round(doneCount / keys.length * 100)) + '%';
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
    ov = document.createElement('div');
    ov.className = 'pi-ov';
    ov.style.setProperty('--pi-side', t[0]);
    ov.style.setProperty('--pi-tx', t[1]);
    ov.innerHTML = '<div class="pi-card">' +
      '<div class="pi-left">' +
        '<h2 class="pi-title">Explore the client experience</h2>' +
        '<p class="pi-copy">This is your Client Portal — the experience your clients log in to. We\'ve set up a test client so you can step inside and see it exactly as they would, on any app you build or enable.</p>' +
        '<button class="pi-btn" type="button">Launch client view</button>' +
      '</div>' +
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
    ov.querySelector('.pi-btn').addEventListener('click', function () {
      try { localStorage.setItem('onb.portalIntroSeen', '1'); } catch (e) {}
      location.href = 'portal.html' + navSuffix();
    });
    ov.addEventListener('click', function (e) { if (e.target === ov) ov.classList.remove('show'); });
    return ov;
  }
  // Show the interstitial first; if already seen, go straight to the portal.
  function openPortalIntro() {
    var seen; try { seen = localStorage.getItem('onb.portalIntroSeen'); } catch (e) {}
    if (seen) { location.href = 'portal.html' + navSuffix(); return; }
    var ov = ensurePortalIntro();
    requestAnimationFrame(function () { ov.classList.add('show'); });
  }
  window.ftuxOpenPortalIntro = openPortalIntro;

  function ftuxInit() {
    ensureStyle();

    var cl = document.querySelector('.checklist');

    // Pages with no checklist but a portal sidebar — visiting the client
    // portal completes "Explore the client experience".
    if (!cl) {
      if (document.querySelector('.side')) { var s = get(); if (!s.explore) { s.explore = 'done'; save(s); } }
      return;
    }

    ensureModal();

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
      it.parentNode.replaceChild(clone, it);
      clone.setAttribute('data-ftux-bound', '1');
      clone.addEventListener('click', function () {
        if (i === 0) location.href = 'studio.html' + suffix;      // Publish your first app → build
        else if (i === 1) openPortalIntro();                      // Explore → interstitial → client portal
        else openInvite();                                        // Invite your team → modal
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
  window.ftuxOpenInvite = openInvite;
  window.ftuxMarkPublishProgress = function () { markPublish('progress'); };
  window.ftuxMarkPublishDone = function () { markPublish('done'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ftuxInit);
  else ftuxInit();
})();
