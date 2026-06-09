/* Show every in-progress / published app in the sidebar on every page.

   The builder (builder-sidebar.js) records the apps the user has built to
   localStorage ('onb.buildApps' — a list, keyed by name). The dashboard pages
   have their own static sidebars, so without this the apps would vanish the
   moment you navigate away and you couldn't get back into a build. This
   re-inserts each one under the Apps group, carrying a "Draft" badge while
   unpublished, linking back to the builder so the user can resume. */
(function () {
  var list;
  try { list = JSON.parse(localStorage.getItem('onb.buildApps')); } catch (e) {}
  if (!Array.isArray(list)) list = [];
  // Back-compat with the old single-record key.
  if (!list.length) {
    try { var one = JSON.parse(localStorage.getItem('onb.buildApp')); if (one && one.name) list = [one]; } catch (e) {}
  }
  if (!list.length) return;

  var nav = document.querySelector('.sidebar .nav') || document.querySelector('.nav');
  if (!nav) return;

  if (!document.getElementById('built-app-style')) {
    var s = document.createElement('style');
    s.id = 'built-app-style';
    s.textContent =
      '.nav-item.built .draft-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.nav-item.built .draft-badge{font-size:11px;font-weight:400;color:#6b6f76;background:#f0f1f3;border-radius:5px;padding:1px 7px;flex-shrink:0;}' +
      // A sheen sweeps the label while the app is still building in the background.
      '@keyframes asmTextShimmer{0%{background-position:180% 0;}100%{background-position:-180% 0;}}' +
      '.draft-label.shimmer-text{background:linear-gradient(90deg,#6b6f76 0%,#6b6f76 40%,#c6cad0 50%,#6b6f76 60%,#6b6f76 100%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:asmTextShimmer 1.4s linear infinite;}' +
      '@media (prefers-reduced-motion: reduce){.draft-label.shimmer-text{animation:none;}}';
    document.head.appendChild(s);
  }

  var CLOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#212B36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>';

  // Names already in the nav (static items like Home, plus any apps we've
  // already inserted) — so we never duplicate.
  var seen = {};
  nav.querySelectorAll('.nav-item').forEach(function (el) {
    seen[el.textContent.trim().toLowerCase()] = 1;
  });

  var addItem = nav.querySelector('.nav-item.add');

  list.forEach(function (rec) {
    if (!rec || !rec.name) return;
    var lc = rec.name.toLowerCase();
    if (seen[lc]) return;
    seen[lc] = 1;

    var building = rec.phase === 'building' && rec.status !== 'published';
    var a = document.createElement('a');
    a.className = 'nav-item built' + (rec.status === 'draft' ? ' draft' : '');
    a.setAttribute('data-built-app', '1');
    a.setAttribute('href', 'builder.html' + (rec.hash || ''));
    a.style.cursor = 'pointer';
    a.innerHTML = CLOCK + '<span class="draft-label' + (building ? ' shimmer-text' : '') + '"></span>' +
      (rec.status === 'draft' ? '<span class="draft-badge">Draft</span>' : '');
    a.querySelector('.draft-label').textContent = rec.name;

    // Insert just above "Add app" so apps sit together, in build order.
    if (addItem) nav.insertBefore(a, addItem);
    else nav.appendChild(a);
  });
})();
