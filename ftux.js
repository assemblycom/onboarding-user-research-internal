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
      '.inv-overlay{position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .2s;font-family:Inter,system-ui,sans-serif;}' +
      '.inv-overlay.show{opacity:1;pointer-events:auto;}' +
      '.inv-modal{width:448px;max-width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 24px 70px rgba(0,0,0,0.28);max-height:90vh;display:flex;flex-direction:column;}' +
      '.inv-banner{height:150px;flex-shrink:0;background:linear-gradient(180deg,#ffffff 0%,#c4cbf0 48%,#d9ed92 100%);}' +
      '.inv-body{padding:22px 22px 0;overflow-y:auto;color:#212b36;}' +
      '.inv-title{font-size:18px;font-weight:500;margin:0 0 6px;}' +
      '.inv-sub{font-size:13.5px;color:#6b6f76;line-height:1.5;margin:0 0 18px;}' +
      '.inv-input-row{display:flex;align-items:stretch;border:1px solid #dfe1e4;border-radius:8px;overflow:hidden;margin-bottom:16px;}' +
      '.inv-input-row:focus-within{border-color:#b9bcc1;}' +
      '.inv-chips{flex:1;min-width:0;display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:7px 8px 7px 10px;}' +
      '.inv-chips input{flex:1;min-width:130px;border:none;outline:none;font-family:inherit;font-size:14px;padding:4px 0;color:#212b36;background:transparent;}' +
      '.inv-chip{display:inline-flex;align-items:center;gap:5px;background:#eef0f4;border-radius:6px;padding:3px 4px 3px 9px;font-size:13px;color:#212b36;max-width:100%;}' +
      '.inv-chip-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.inv-chip-x{border:0;background:none;cursor:pointer;color:#6b6f76;padding:1px;border-radius:4px;display:flex;align-items:center;line-height:1;}' +
      '.inv-chip-x:hover{background:rgba(0,0,0,0.07);color:#212b36;}' +
      '.inv-chip-x svg{width:13px;height:13px;}' +
      '.inv-role{position:relative;display:flex;align-items:center;gap:5px;border-left:1px solid #dfe1e4;padding:0 12px;height:42px;font-size:13px;color:#212b36;cursor:default;white-space:nowrap;}' +
      '.inv-role::after{content:attr(data-na);position:absolute;bottom:calc(100% + 9px);right:0;white-space:nowrap;background:#1a1a1a;color:#fff;font-size:12px;font-weight:400;line-height:1;padding:7px 10px;border-radius:7px;opacity:0;pointer-events:none;transition:opacity .12s ease;box-shadow:0 4px 14px rgba(0,0,0,0.18);z-index:5;}' +
      '.inv-role:hover::after{opacity:1;}' +
      '.inv-list{border:1px solid #dfe1e4;border-radius:10px;overflow:hidden;}' +
      '.inv-person{display:flex;align-items:center;gap:11px;padding:9px 13px;cursor:pointer;transition:background .12s;}' +
      '.inv-person:hover{background:#f8f9fb;}' +
      '.inv-person.selected{background:#f2f4fc;}' +
      '.inv-person+.inv-person{border-top:1px solid #f1f3f4;}' +
      '.inv-av{width:30px;height:30px;border-radius:50%;font-size:11px;font-weight:500;display:flex;align-items:center;justify-content:center;flex-shrink:0;}' +
      '.inv-person-add{margin-left:auto;flex-shrink:0;color:#6e7cbb;opacity:0;display:flex;align-items:center;}' +
      '.inv-person-add svg{width:17px;height:17px;}' +
      '.inv-person.selected .inv-person-add{opacity:1;}' +
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
      // ── "Meet your test client first" gate (Open Portal before visiting the CRM) ──
      '.cf-ov{position:fixed;inset:0;z-index:1300;background:rgba(0,0,0,0.42);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;pointer-events:none;transition:opacity .2s;font-family:Inter,system-ui,sans-serif;}' +
      '.cf-ov.show{opacity:1;pointer-events:auto;}' +
      '.cf-card{width:420px;max-width:100%;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,0.28);padding:28px;}' +
      '.cf-ic{width:44px;height:44px;border-radius:11px;background:#f0f1f3;color:#5a6068;display:flex;align-items:center;justify-content:center;margin-bottom:16px;}' +
      '.cf-ic svg{width:22px;height:22px;}' +
      '.cf-title{font-size:19px;font-weight:500;margin:0 0 8px;color:#212b36;}' +
      '.cf-copy{font-size:14px;line-height:1.55;color:#6b6f76;margin:0 0 22px;}' +
      '.cf-actions{display:flex;gap:10px;justify-content:flex-end;}' +
      '.cf-cancel{height:40px;padding:0 16px;background:#fff;border:1px solid #dfe1e4;border-radius:8px;font-family:inherit;font-size:14px;font-weight:500;color:#212b36;cursor:pointer;}' +
      '.cf-cancel:hover{background:#eff1f4;}' +
      '.cf-go{height:40px;padding:0 18px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;font-family:inherit;font-size:14px;font-weight:500;cursor:pointer;}' +
      '.cf-go:hover{background:#000;}' +
      '@media (max-width:640px){.pi-right{display:none;}}';
    document.head.appendChild(css);
  }

  // ── Invite-team modal (injected once per document) ──
  function ensureModal() {
    var ov = document.querySelector('.inv-overlay');
    if (ov) return ov;
    // Suggested teammates use generic names and emails on the user's own
    // domain (from their signup email) — or the company domain for Google /
    // personal-email signups.
    var inviteDomain = (function () {
      var COMMON = ['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'live.com', 'aol.com', 'proton.me'];
      var email = hashParam('email');
      if (email && email.indexOf('@') > -1) {
        var d = email.split('@')[1].toLowerCase().trim();
        if (d && COMMON.indexOf(d) === -1) return d;
      }
      var co = (hashParam('company') || 'Studio').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return (co || 'studio') + '.com';
    })();
    var people = [
      ['Jordan Lee', 'jordan'], ['Sam Carter', 'sam'], ['Riley Chen', 'riley'],
      ['Taylor Brooks', 'taylor'], ['Morgan Diaz', 'morgan']
    ].map(function (p) { return [p[0], p[1] + '@' + inviteDomain]; });
    function initials(n) { var p = n.trim().split(/\s+/); return ((p[0] ? p[0][0] : '') + (p[1] ? p[1][0] : '')).toUpperCase(); }
    var listHtml = people.map(function (p) { var c = avc(p[0]); return '<div class="inv-person" data-email="' + p[1] + '"><span class="inv-av" style="background:' + c[0] + ';color:' + c[1] + '">' + initials(p[0]) + '</span><div><div class="inv-nm">' + p[0] + '</div><div class="inv-em">' + p[1] + '</div></div><span class="inv-person-add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></div>'; }).join('');
    ov = document.createElement('div');
    ov.className = 'inv-overlay';
    ov.innerHTML = '<div class="inv-modal">' +
      '<div class="inv-banner"></div>' +
      '<div class="inv-body">' +
      '<h2 class="inv-title">Bring your team into Studio</h2>' +
      '<p class="inv-sub">Your app is now available to your team. Add teammates to get everyone working in one place.</p>' +
      '<div class="inv-input-row"><div class="inv-chips" id="invChips"><input type="text" inputmode="email" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="name@company.com" /></div><span class="inv-role" data-na="Not part of this prototype">Member <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span></div>' +
      '<div class="inv-list">' + listHtml + '</div>' +
      '</div>' +
      '<div class="inv-foot"><button class="inv-btn">Invite</button><button class="inv-later">Maybe later</button></div>' +
      '</div>';
    document.body.appendChild(ov);
    // Closing the modal any way — "Invite", "Maybe later", or the backdrop —
    // marks the checklist item done.
    ov.addEventListener('click', function (e) { if (e.target === ov) completeInvite(); });
    // Emails live as chips in the top box. Clicking a suggested teammate adds
    // their email as a chip (clicking again removes it); typing + Enter/comma
    // adds a typed one. The Invite button reflects the chip count.
    var inviteBtn = ov.querySelector('.inv-btn');
    var chipBox = ov.querySelector('#invChips');
    var emailInput = ov.querySelector('#invChips input');
    var X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    function chipFor(email) { return chipBox.querySelector('.inv-chip[data-email="' + email.replace(/"/g, '') + '"]'); }
    function rowFor(email) { return ov.querySelector('.inv-person[data-email="' + email.replace(/"/g, '') + '"]'); }
    function syncInviteCount() {
      var n = chipBox.querySelectorAll('.inv-chip').length;
      inviteBtn.textContent = n ? 'Invite ' + n + (n > 1 ? ' members' : ' member') : 'Invite';
    }
    function addChip(email) {
      email = (email || '').trim().replace(/,$/, '');
      if (!email || chipFor(email)) return;
      var chip = document.createElement('span');
      chip.className = 'inv-chip';
      chip.setAttribute('data-email', email);
      chip.innerHTML = '<span class="inv-chip-label"></span><button type="button" class="inv-chip-x" aria-label="Remove">' + X + '</button>';
      chip.querySelector('.inv-chip-label').textContent = email;
      chip.querySelector('.inv-chip-x').addEventListener('click', function (e) { e.stopPropagation(); removeChip(email); });
      chipBox.insertBefore(chip, emailInput);
      var row = rowFor(email); if (row) row.classList.add('selected');
      syncInviteCount();
    }
    function removeChip(email) {
      var chip = chipFor(email); if (chip) chip.remove();
      var row = rowFor(email); if (row) row.classList.remove('selected');
      syncInviteCount();
    }
    [].forEach.call(ov.querySelectorAll('.inv-person'), function (p) {
      var email = p.getAttribute('data-email');
      p.addEventListener('click', function () { if (chipFor(email)) removeChip(email); else addChip(email); });
    });
    if (emailInput) {
      emailInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addChip(emailInput.value); emailInput.value = ''; }
        else if (e.key === 'Backspace' && !emailInput.value) {
          var chips = chipBox.querySelectorAll('.inv-chip'); if (chips.length) { removeChip(chips[chips.length - 1].getAttribute('data-email')); }
        }
      });
      emailInput.addEventListener('blur', function () { if (emailInput.value.trim()) { addChip(emailInput.value); emailInput.value = ''; } });
    }
    // Clicking anywhere in the box focuses the text input.
    if (chipBox) chipBox.addEventListener('click', function (e) { if (e.target === chipBox) emailInput && emailInput.focus(); });
    inviteBtn.addEventListener('click', completeInvite);
    ov.querySelector('.inv-later').addEventListener('click', completeInvite);
    return ov;
  }
  function openInvite() { ensureModal().classList.add('show'); }
  function hideInvite() { var ov = document.querySelector('.inv-overlay'); if (ov) ov.classList.remove('show'); }
  function completeInvite() {
    hideInvite();
    var s = get(); if (s.invite !== 'done') { s.invite = 'done'; save(s); render(); }
  }

  var keys = ['publish', 'client', 'explore', 'invite'];

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

  // All steps done: flip the title to an "all set" confirmation, then fade the
  // card out and remove it. A flag keeps it gone on reload.
  function finishFtux(cl) {
    if (cl.getAttribute('data-ftux-finishing') === '1') return;
    cl.setAttribute('data-ftux-finishing', '1');
    var title = cl.querySelector('.checklist-title');
    if (title) title.textContent = 'You’re all set';
    setTimeout(function () {
      try { localStorage.setItem('onb.ftuxDone', '1'); } catch (e) {}
      cl.classList.add('ftux-dismiss-out');
      setTimeout(function () { if (cl && cl.parentNode) cl.parentNode.removeChild(cl); }, 480);
    }, 1300);
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
    ov.innerHTML = '<div class="cf-card">' +
      '<div class="cf-ic">' + CRM_IC + '</div>' +
      '<h2 class="cf-title">Meet your test client first</h2>' +
      '<p class="cf-copy">To preview the client portal, head to your CRM and open it as your test client — we’ll walk you through it from there.</p>' +
      '<div class="cf-actions"><button class="cf-cancel" type="button">Not now</button><button class="cf-go" type="button">Go to CRM</button></div>' +
    '</div>';
    document.body.appendChild(ov);
    function close() { ov.classList.remove('show'); }
    ov.querySelector('.cf-cancel').addEventListener('click', close);
    ov.querySelector('.cf-go').addEventListener('click', function () { location.href = 'crm.html' + navSuffix(); });
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    return ov;
  }
  function showClientFirst() {
    var ov = ensureClientFirst();
    requestAnimationFrame(function () { ov.classList.add('show'); });
  }

  function openPortalIntro() {
    // Guard: only redirect to the CRM if the user has never engaged the test client
    // there (Explore not even started). Once they've been through the CRM coachmark
    // (in-progress) they can open the portal directly — but note this direct route
    // does NOT complete "Explore"; that only happens via the CRM (from=crm.html).
    var exp; try { exp = (get() || {}).explore; } catch (e) {}
    if (exp !== 'progress' && exp !== 'done') { showClientFirst(); return; }
    location.href = 'portal.html' + navSuffix();
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

    ensureModal();

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
        if (i === 0) location.href = 'studio.html' + suffix;      // Add app → build
        else if (i === 1) location.href = 'crm.html' + suffix;    // (hidden) test-client step
        else if (i === 2) location.href = 'crm.html' + suffix;    // Explore → CRM coachmark (preview the portal as the test client)
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
