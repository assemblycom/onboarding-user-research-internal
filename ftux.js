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
      '.inv-title{font-size:18px;font-weight:600;margin:0 0 6px;}' +
      '.inv-sub{font-size:13.5px;color:#6b6f76;line-height:1.5;margin:0 0 18px;}' +
      '.inv-input-row{display:flex;align-items:center;border:1px solid #dfe1e4;border-radius:8px;overflow:hidden;margin-bottom:16px;}' +
      '.inv-input-row input{flex:1;border:none;outline:none;font-family:inherit;font-size:14px;padding:0 14px;height:42px;color:#212b36;}' +
      '.inv-role{display:flex;align-items:center;gap:5px;border-left:1px solid #dfe1e4;padding:0 12px;height:42px;font-size:13px;color:#212b36;cursor:pointer;white-space:nowrap;}' +
      '.inv-list{border:1px solid #dfe1e4;border-radius:10px;overflow:hidden;}' +
      '.inv-person{display:flex;align-items:center;gap:11px;padding:9px 13px;}' +
      '.inv-person+.inv-person{border-top:1px solid #f1f3f4;}' +
      '.inv-av{width:30px;height:30px;border-radius:50%;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.inv-nm{font-size:13.5px;font-weight:500;line-height:1.3;}' +
      '.inv-em{font-size:12.5px;color:#6b6f76;line-height:1.3;}' +
      '.inv-foot{padding:16px 22px 22px;flex-shrink:0;}' +
      '.inv-btn{width:100%;height:44px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;}' +
      '.inv-btn:hover{background:#000;}';
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
      '<div class="inv-foot"><button class="inv-btn">Invite</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) { if (e.target === ov) closeInvite(); });
    ov.querySelector('.inv-btn').addEventListener('click', closeInvite);
    return ov;
  }
  function openInvite() { ensureModal().classList.add('show'); }
  function closeInvite() {
    var ov = document.querySelector('.inv-overlay');
    if (ov) ov.classList.remove('show');
    var s = get(); if (!s.invite) { s.invite = 'done'; save(s); render(); }
  }

  var keys = ['publish', 'explore', 'invite'];

  function render() {
    var cl = document.querySelector('.checklist');
    if (!cl) return;
    var items = [].slice.call(cl.querySelectorAll('.checklist-item'));
    var st = get();
    var doneCount = 0, firstIncomplete = -1;
    keys.forEach(function (k, i) { if (st[k]) doneCount++; else if (firstIncomplete < 0) firstIncomplete = i; });
    items.forEach(function (it, i) {
      var k = keys[i];
      var img = it.querySelector('img');
      it.classList.remove('ftux-done', 'active');
      var src;
      if (st[k]) { src = 'assets/check-green.svg'; it.classList.add('ftux-done'); }
      else if (i === firstIncomplete) { src = 'assets/progress-indication.svg'; it.classList.add('active'); }
      else { src = 'assets/todo.svg'; }
      if (img) img.setAttribute('src', src);
    });
    var fill = cl.querySelector('.ftux-bar-fill');
    if (fill) fill.style.width = Math.max(7, Math.round(doneCount / keys.length * 100)) + '%';
  }

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
        else if (i === 1) location.href = 'portal.html' + suffix; // Explore the client experience → client portal
        else openInvite();                                        // Invite your team → modal
      });
    });

    render();
  }

  window.ftuxInit = ftuxInit;
  window.ftuxOpenInvite = openInvite;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ftuxInit);
  else ftuxInit();
})();
