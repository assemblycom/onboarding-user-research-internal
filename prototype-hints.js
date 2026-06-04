/* Hover hint for non-functional controls.

   This is a click-around prototype, so most page chrome (table rows,
   decorative buttons, filters) does nothing. Rather than build those out, we
   show a small "Not part of this prototype" tooltip on hover so test
   participants know not to expect an action — without interrupting the flow.

   The real, wired-up controls are excluded via the LIVE list below; everything
   else matching INTERACTIVE gets the hint. Mark any genuinely-working control
   with data-live="1" to opt it out. */
(function () {
  // Things that actually do something — never hint these.
  var LIVE = '[data-nav],[data-live],.nav-item,.open-portal,.checklist-item,' +
    '.start-btn,#startBuilding,.template-card,.ac-chip,.ac-item,.ac-arrow,' +
    '.studio-primary,.studio-google,.studio-theme,' +
    // FTUX flows are real, working modals — never hint inside them.
    '.pi-ov,.inv-overlay';

  // Clickable-looking things that often lack a pointer cursor (flat tabs and
  // settings rows). Inactive tabs / these rows are decorative in the prototype.
  var EXTRA = '.tab, .preview-tab, .asset-row';

  function isLive(el) {
    // The active tab is the current view, not a dead control.
    if (el.closest('.tab.active, .preview-tab.active')) return true;
    if (el.closest(LIVE)) return true;
    var a = el.closest('a[href]');
    if (a) { var h = a.getAttribute('href'); if (h && h !== '#' && h !== '') return true; }
    if (el.closest('#appCategories')) return true;
    return false;
  }

  // Hint anything the page styles as clickable (cursor:pointer), plus the
  // flat tabs/rows above, as long as it isn't a wired-up/active control.
  function isHintable(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el === tip || (tip && tip.contains(el))) return false;
    if (isLive(el)) return false;
    if (getComputedStyle(el).cursor === 'pointer') return true;
    if (el.closest(EXTRA)) return true;
    return false;
  }

  var STYLE_ID = 'proto-hint-style';
  if (!document.getElementById(STYLE_ID)) {
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent =
      '.proto-tip{position:fixed;z-index:99999;pointer-events:none;display:none;' +
        "align-items:center;gap:6px;background:#1a1a1a;color:#fff;font-family:'Inter',system-ui,-apple-system,sans-serif;" +
        'font-size:12px;font-weight:500;line-height:1;padding:7px 10px;border-radius:8px;' +
        'box-shadow:0 4px 14px rgba(0,0,0,0.18);white-space:nowrap;}' +
      '.proto-tip svg{width:13px;height:13px;flex-shrink:0;opacity:0.85;}';
    document.head.appendChild(s);
  }

  var tip = document.createElement('div');
  tip.className = 'proto-tip';
  tip.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>' +
    '<span>Not part of this prototype</span>';
  function mount() { if (!tip.parentNode && document.body) document.body.appendChild(tip); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  var visible = false;
  function show(x, y) {
    mount();
    tip.style.display = 'inline-flex';
    visible = true;
    // Position below-right of the cursor, clamped to the viewport.
    var pad = 12, tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = x + 14, top = y + 16;
    if (left + tw + pad > window.innerWidth) left = x - tw - 14;
    if (top + th + pad > window.innerHeight) top = y - th - 14;
    tip.style.left = Math.max(pad, left) + 'px';
    tip.style.top = Math.max(pad, top) + 'px';
  }
  function hide() { if (visible) { tip.style.display = 'none'; visible = false; } }

  document.addEventListener('mousemove', function (e) {
    if (isHintable(e.target)) show(e.clientX, e.clientY);
    else hide();
  });
  document.addEventListener('mouseleave', hide);
  window.addEventListener('blur', hide);
})();
