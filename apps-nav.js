/* Show the in-progress / published app in the sidebar on every page.

   The builder (builder-sidebar.js) records the app the user is building to
   localStorage ('onb.buildApp'). The dashboard pages have their own static
   sidebars, so without this the app would vanish the moment you navigate away
   and you couldn't get back into the build. This re-inserts it under the Apps
   group, carrying a "Draft" badge while unpublished, linking back to the
   builder so the user can resume. */
(function () {
  var rec;
  try { rec = JSON.parse(localStorage.getItem('onb.buildApp')); } catch (e) {}
  if (!rec || !rec.name) return;

  var nav = document.querySelector('.sidebar .nav') || document.querySelector('.nav');
  if (!nav || nav.querySelector('[data-built-app]')) return;

  // Don't duplicate an app that's already a static nav item (e.g. Home).
  var existing = nav.querySelectorAll('.nav-item');
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].textContent.trim().toLowerCase() === rec.name.toLowerCase()) return;
  }

  if (!document.getElementById('built-app-style')) {
    var s = document.createElement('style');
    s.id = 'built-app-style';
    s.textContent =
      '.nav-item.built .draft-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
      '.nav-item.built .draft-badge{font-size:11px;font-weight:400;color:#6b6f76;background:#f0f1f3;border-radius:5px;padding:1px 7px;flex-shrink:0;}';
    document.head.appendChild(s);
  }

  var CLOCK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#212B36" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>';

  var a = document.createElement('a');
  a.className = 'nav-item built' + (rec.status === 'draft' ? ' draft' : '');
  a.setAttribute('data-built-app', '1');
  a.setAttribute('href', 'builder.html' + (rec.hash || ''));
  a.style.cursor = 'pointer';
  a.innerHTML = CLOCK + '<span class="draft-label"></span>' +
    (rec.status === 'draft' ? '<span class="draft-badge">Draft</span>' : '');
  a.querySelector('.draft-label').textContent = rec.name;

  // Insert just above "Add app" so it sits with the other apps.
  var addItem = nav.querySelector('.nav-item.add');
  if (addItem) nav.insertBefore(a, addItem);
  else nav.appendChild(a);
})();
