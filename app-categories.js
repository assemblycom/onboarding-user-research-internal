/* Shared "category chips → dropdown of related apps" control.
   Used on the marketing site (index.html) and the build page (studio.html).

   A horizontal, arrow-scrollable row of category chips. Clicking a chip opens
   an inline panel listing related starter apps; the panel animates its height
   so anything below it (e.g. the templates section) is pushed down smoothly
   rather than jumping. Each category has the same number of items so switching
   between open categories keeps the height constant — no jitter. */
(function () {
  var ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3"/><path d="M6.5 18.5a6 6 0 0 1 11 0"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8.5 13h1a1.2 1.2 0 0 1 0 2.4h-1V13zm0 4.5V13M13 13v4.5M13 13h1.4a1.5 1.5 0 0 1 0 3H13M17 13h2M17 15.2h1.6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="13" y="7" width="3" height="10"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg>'
  };

  var CATEGORIES = [
    { id: 'tasks', label: 'Tasks & Workflow', items: [
      { icon: 'user', title: 'New client intake', desc: 'Company details, contacts, services, budget', prompt: 'A new client intake app that collects company details, contacts, services, and budget' },
      { icon: 'list', title: 'Onboarding wizard', desc: 'Multi-step flow with saved progress', prompt: 'A multi-step client onboarding wizard that saves progress between steps' },
      { icon: 'copy', title: 'Document collection', desc: 'Requested docs with upload checklist', prompt: 'A document collection app with a checklist of requested documents and uploads' },
      { icon: 'pdf', title: 'PDF to digital intake', desc: 'Turn a PDF into a guided web form', prompt: 'An app that turns a PDF into a guided digital intake web form' }
    ] },
    { id: 'crm', label: 'CRM & Sales', items: [
      { icon: 'user', title: 'Client CRM', desc: 'Contacts, companies, and activity history', prompt: 'A client CRM with contacts, companies, and activity history' },
      { icon: 'edit', title: 'Lead capture form', desc: 'Qualify and route new inquiries', prompt: 'A lead capture form that qualifies and routes new inquiries' },
      { icon: 'doc', title: 'Proposal builder', desc: 'Create, send, and track proposals', prompt: 'A proposal builder to create, send, and track client proposals' },
      { icon: 'chart', title: 'Deal pipeline', desc: 'Track deals through each stage', prompt: 'A sales deal pipeline that tracks deals through each stage' }
    ] },
    { id: 'content', label: 'Content & Sites', items: [
      { icon: 'globe', title: 'Client portal page', desc: 'A branded landing page for clients', prompt: 'A branded client portal landing page' },
      { icon: 'folder', title: 'Resource library', desc: 'Organized docs, links, and downloads', prompt: 'A resource library with organized docs, links, and downloads for clients' },
      { icon: 'chat', title: 'Help center', desc: 'Searchable articles and FAQs', prompt: 'A help center with searchable articles and FAQs' },
      { icon: 'edit', title: 'Updates & announcements', desc: 'Share news and product updates', prompt: 'An updates and announcements feed to share news with clients' }
    ] },
    { id: 'finance', label: 'Finance', items: [
      { icon: 'card', title: 'Invoices & payments', desc: 'Send invoices and collect payment', prompt: 'An app to send invoices and collect client payments' },
      { icon: 'doc', title: 'Estimates & quotes', desc: 'Build and send priced quotes', prompt: 'An app to build and send priced estimates and quotes' },
      { icon: 'chart', title: 'Expense tracker', desc: 'Log and categorize expenses', prompt: 'An expense tracker to log and categorize expenses' },
      { icon: 'list', title: 'Budget planner', desc: 'Plan and monitor client budgets', prompt: 'A budget planner to plan and monitor client budgets' }
    ] },
    { id: 'booking', label: 'Booking', items: [
      { icon: 'calendar', title: 'Appointment scheduling', desc: 'Let clients book available times', prompt: 'An appointment scheduling app that lets clients book available times' },
      { icon: 'check', title: 'Event registration', desc: 'Sign-ups with capacity limits', prompt: 'An event registration app with sign-ups and capacity limits' },
      { icon: 'list', title: 'Class & session signup', desc: 'Recurring sessions with rosters', prompt: 'A class and session signup app with recurring sessions and rosters' },
      { icon: 'calendar', title: 'Availability calendar', desc: 'Share open slots in real time', prompt: 'An availability calendar that shares open slots in real time' }
    ] },
    { id: 'ecommerce', label: 'E-Commerce', items: [
      { icon: 'cart', title: 'Product catalog', desc: 'Browse products with details', prompt: 'A product catalog where clients browse products with details' },
      { icon: 'list', title: 'Order tracking', desc: 'Status updates from order to delivery', prompt: 'An order tracking app with status updates from order to delivery' },
      { icon: 'folder', title: 'Digital downloads', desc: 'Sell and deliver files securely', prompt: 'A digital downloads store that sells and delivers files securely' },
      { icon: 'card', title: 'Checkout & payments', desc: 'Cart and secure checkout', prompt: 'A checkout and payments flow with a cart and secure checkout' }
    ] },
    { id: 'forms', label: 'Forms', items: [
      { icon: 'edit', title: 'Custom intake form', desc: 'Collect exactly the fields you need', prompt: 'A custom intake form that collects exactly the fields I need' },
      { icon: 'chat', title: 'Survey & feedback', desc: 'Gather ratings and open responses', prompt: 'A survey and feedback form that gathers ratings and open responses' },
      { icon: 'doc', title: 'Application form', desc: 'Multi-section applications with review', prompt: 'A multi-section application form with a review step' },
      { icon: 'folder', title: 'File request', desc: 'Ask clients to upload files', prompt: 'A file request app that asks clients to upload files' }
    ] }
  ];

  var STYLE_ID = 'ac-style';
  var CSS =
    '.ac{font-family:inherit;}' +
    '.ac-row{position:relative;}' +
    '.ac-scroller{display:flex;gap:8px;overflow-x:auto;scroll-behavior:smooth;min-width:0;scrollbar-width:none;-ms-overflow-style:none;padding:1px;}' +
    '.ac-scroller::-webkit-scrollbar{display:none;}' +
    '.ac-chip{flex:0 0 auto;font-size:13px;font-weight:500;color:#212b36;background:#fff;border:1px solid #dfe1e4;border-radius:4px;padding:6px 12px;cursor:pointer;font-family:inherit;white-space:nowrap;transition:background .12s,border-color .12s;}' +
    '.ac-chip:not(.is-active):hover{background:#eff1f4;border-color:#d3d6db;}' +
    '.ac-chip.is-active{background:#eff1f4;border-color:#c9cdd4;}' +
    /* The scroller itself is masked so chips fade softly to transparent at the
       edges (set in JS per scroll position) — smooth regardless of chip color.
       Arrows just float over that fade as a glyph, no hard band. */
    '.ac-arrow{position:absolute;top:0;bottom:0;width:46px;display:flex;align-items:center;border:none;background:transparent;padding:0;cursor:pointer;color:#1a1a1a;z-index:2;}' +
    '.ac-prev{left:0;justify-content:flex-start;}' +
    '.ac-next{right:0;justify-content:flex-end;}' +
    '.ac-arrow.is-hidden{display:none;}' +
    '.ac-arrow svg{width:17px;height:17px;filter:drop-shadow(0 0 6px var(--ac-fade,#fff)) drop-shadow(0 0 3px var(--ac-fade,#fff));}' +
    '.ac-panel{overflow:hidden;max-height:0;opacity:0;transition:max-height .3s cubic-bezier(.4,0,.2,1),opacity .22s ease,margin-top .3s cubic-bezier(.4,0,.2,1);}' +
    '.ac-panel.is-open{opacity:1;margin-top:14px;}' +
    '.ac-card{border:1px solid #dfe1e4;border-radius:12px;background:#fff;overflow:hidden;}' +
    '.ac-item{display:flex;align-items:center;gap:14px;width:100%;padding:13px 16px;background:transparent;border:none;border-top:1px solid #e8eaed;cursor:pointer;text-align:left;font-family:inherit;transition:background .12s;}' +
    '.ac-item:first-child{border-top:none;}' +
    '.ac-item:hover{background:#f8f9fb;}' +
    '.ac-ic{width:34px;height:34px;border-radius:9px;background:#f0f1f3;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#6b6f76;}' +
    '.ac-ic svg{width:17px;height:17px;}' +
    '.ac-tt{display:block;font-size:14px;font-weight:500;color:#212b36;line-height:1.3;}' +
    '.ac-ds{display:block;font-size:13px;color:#6b6f76;line-height:1.3;margin-top:2px;}';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

  function mount(opts) {
    ensureStyle();
    var host = opts.host;
    if (!host) return;
    var onSelect = opts.onSelect || function () {};
    var cats = opts.categories || CATEGORIES;

    host.classList.add('ac');
    if (opts.fade) host.style.setProperty('--ac-fade', opts.fade);
    host.innerHTML =
      '<div class="ac-row">' +
        '<button class="ac-arrow ac-prev is-hidden" type="button" aria-label="Scroll left">' + CHEV_L + '</button>' +
        '<div class="ac-scroller"></div>' +
        '<button class="ac-arrow ac-next" type="button" aria-label="Scroll right">' + CHEV_R + '</button>' +
      '</div>' +
      '<div class="ac-panel"></div>';

    var scroller = host.querySelector('.ac-scroller');
    var prev = host.querySelector('.ac-prev');
    var next = host.querySelector('.ac-next');
    var panel = host.querySelector('.ac-panel');
    var activeId = null;

    cats.forEach(function (cat) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'ac-chip';
      chip.textContent = cat.label;
      chip.addEventListener('click', function () { toggle(cat, chip); });
      scroller.appendChild(chip);
    });

    function renderItems(cat) {
      var html = '<div class="ac-card">';
      cat.items.forEach(function (it, i) {
        html += '<button class="ac-item" type="button" data-i="' + i + '">' +
          '<span class="ac-ic">' + (ICONS[it.icon] || '') + '</span>' +
          '<span><span class="ac-tt">' + it.title + '</span><span class="ac-ds">' + it.desc + '</span></span>' +
        '</button>';
      });
      html += '</div>';
      panel.innerHTML = html;
      panel.querySelectorAll('.ac-item').forEach(function (btn) {
        btn.addEventListener('click', function () { onSelect(cat.items[+btn.dataset.i], cat); });
      });
    }

    var isOpen = false;
    function openPanel() {
      // Already open (switching categories): heights match, so just keep it
      // unconstrained — avoids re-clipping the card's bottom border.
      if (isOpen) { panel.style.maxHeight = 'none'; return; }
      isOpen = true;
      panel.classList.add('is-open');
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
    function closePanel() {
      isOpen = false;
      // Lock current height, then collapse so the transition has a start value.
      panel.style.maxHeight = panel.scrollHeight + 'px';
      void panel.offsetHeight;
      panel.classList.remove('is-open');
      panel.style.maxHeight = '0px';
    }
    // Once the open animation finishes, drop the max-height cap so the bottom
    // border is never sub-pixel clipped by overflow:hidden.
    panel.addEventListener('transitionend', function (e) {
      if (e.propertyName === 'max-height' && isOpen) panel.style.maxHeight = 'none';
    });

    function closeActive() {
      if (!activeId) return;
      activeId = null;
      scroller.querySelectorAll('.ac-chip').forEach(function (c) { c.classList.remove('is-active'); });
      closePanel();
    }

    function toggle(cat, chip) {
      if (activeId === cat.id) { closeActive(); return; }
      activeId = cat.id;
      scroller.querySelectorAll('.ac-chip').forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      renderItems(cat);
      openPanel();
    }

    // Clicking anywhere outside the control closes the open dropdown.
    document.addEventListener('mousedown', function (e) {
      if (activeId && !host.contains(e.target)) closeActive();
    });

    function updateArrows() {
      var max = scroller.scrollWidth - scroller.clientWidth;
      var atStart = scroller.scrollLeft <= 1;
      var atEnd = scroller.scrollLeft >= max - 1;
      prev.classList.toggle('is-hidden', atStart);
      next.classList.toggle('is-hidden', atEnd);
      // Fade the chips to transparent at any edge that can still scroll, so the
      // row dissolves smoothly under the arrow instead of cutting off hard.
      var l = atStart ? '0px' : '30px';
      var r = atEnd ? '0px' : '58px';
      var mask = 'linear-gradient(to right, transparent 0, #000 ' + l + ', #000 calc(100% - ' + r + '), transparent 100%)';
      scroller.style.webkitMaskImage = mask;
      scroller.style.maskImage = mask;
    }
    function scrollByStep(dir) {
      scroller.scrollBy({ left: dir * Math.max(200, scroller.clientWidth * 0.7), behavior: 'smooth' });
    }
    prev.addEventListener('click', function () { scrollByStep(-1); });
    next.addEventListener('click', function () { scrollByStep(1); });
    scroller.addEventListener('scroll', updateArrows);
    window.addEventListener('resize', function () {
      updateArrows();
      if (activeId) panel.style.maxHeight = 'none';
    });
    updateArrows();
  }

  window.AppCategories = { mount: mount, data: CATEGORIES };
})();
