(function(){
  var html = document.documentElement;
  html.classList.add('js');
  /* each page may carry its own titles on <html data-title-en/-ar data-desc-en/-ar> */
  var D = html.dataset;
  var META = {
    en: { title: D.titleEn || 'Hashem Alahdal — Full-Stack Developer',
          desc: D.descEn || 'Full-stack developer specializing in Laravel, React/TypeScript and Flutter — production-grade web & mobile marketplaces.' },
    ar: { title: D.titleAr || 'هاشم الاهدل — مطوّر ويب متكامل',
          desc: D.descAr || 'مطوّر ويب متكامل متخصص في Laravel وReact/TypeScript وFlutter — منصات ويب وجوال جاهزة للإنتاج.' }
  };
  var reduced = matchMedia('(prefers-reduced-motion: reduce)');
  function fmt(n, arab){
    return arab ? new Intl.NumberFormat('ar-SA-u-nu-arab', { useGrouping:false }).format(n) : String(n);
  }

  var stored = localStorage.getItem('lang');
  var initial = stored || 'ar';
  setLang(initial, false);

  document.getElementById('langToggle').addEventListener('click', function(){
    var next = html.getAttribute('data-lang') === 'en' ? 'ar' : 'en';
    setLang(next, true);
    writeName();
  });

  function setLang(lang, persist){
    html.setAttribute('data-lang', lang);
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.title = META[lang].title;
    document.querySelector('meta[name="description"]').setAttribute('content', META[lang].desc);
    document.querySelectorAll('[data-i18n]').forEach(function(el){
      el.setAttribute('aria-hidden', el.getAttribute('data-i18n') !== lang ? 'true' : 'false');
    });
    if(persist) localStorage.setItem('lang', lang);
  }

  /* ink writer — reveals text letter by letter by stepping the ink edge
     through each measured glyph, so Arabic letters stay perfectly joined */
  var QUILL = '<span class="pen"><svg viewBox="0 0 48 48" fill="none">'
    + '<path d="M13.5 31 C 15 19, 25 8, 43 3.5 C 41 13, 37.5 20, 31.5 26 C 26 31.5, 20 32.5, 13.8 31.6 Z" fill="currentColor"/>'
    + '<path d="M5 43.5 C 13 35, 20 28, 30 17" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'
    + '<path d="M21 26 C 27 21, 31 16, 35 10.5 M18 29 C 24.5 23.5, 29.5 18.5, 34 13" stroke="var(--paper)" stroke-width="0.9" stroke-linecap="round" opacity="0.65"/>'
    + '</svg></span>';

  function inkWrite(el, quill, charDur, done){
    var node = el.firstChild;
    if(reduced.matches || !node || node.nodeType !== 3){ el.style.clipPath = ''; if(done) done(); return; }
    var text = node.data;
    var rtl = getComputedStyle(el).direction === 'rtl';
    var box = el.getBoundingClientRect();
    if(!box.width){ el.style.clipPath = ''; if(done) done(); return; }
    var range = document.createRange();
    var timeline = [], lines = [], t = 0, prevD = 0, li = -1;
    for(var i = 0; i < text.length; i++){
      if(text[i] === ' '){ t += 170; continue; }
      range.setStart(node, i); range.setEnd(node, i + 1);
      var r = range.getBoundingClientRect();
      if(!r.width && !r.height) continue;
      var top = r.top - box.top, bot = r.bottom - box.top;
      if(li < 0 || top >= lines[li].bot - 2){
        li++; lines.push({ top: top, bot: bot }); prevD = 0;
      } else {
        lines[li].top = Math.min(lines[li].top, top);
        lines[li].bot = Math.max(lines[li].bot, bot);
      }
      var d = rtl ? (box.right - r.left) : (r.right - box.left);
      if(d < prevD) d = prevD;
      timeline.push({ t0: t, t1: t + charDur, d0: prevD, d1: d, li: li });
      t += charDur; prevD = d;
    }
    var total = t, W = box.width, H = box.height, pad = Math.max(8, H * 0.2);
    function setEdge(d, ln){
      if(lines.length < 2){
        el.style.clipPath = rtl
          ? 'inset(-25% 0 -25% ' + Math.max(0, W - d) + 'px)'
          : 'inset(-25% ' + Math.max(0, W - d) + 'px -25% 0)';
      } else {
        /* finished lines fully visible, current line revealed up to the ink edge, rest hidden */
        var topB = ln === 0 ? -pad : (lines[ln - 1].bot + lines[ln].top) / 2;
        var botB = ln === lines.length - 1 ? H + pad : (lines[ln].bot + lines[ln + 1].top) / 2;
        var x = rtl ? Math.max(0, W - d) : Math.min(W, d);
        el.style.clipPath = rtl
          ? 'polygon(' + W + 'px ' + (-pad) + 'px, 0 ' + (-pad) + 'px, 0 ' + topB + 'px, ' + x + 'px ' + topB + 'px, ' + x + 'px ' + botB + 'px, ' + W + 'px ' + botB + 'px)'
          : 'polygon(0 ' + (-pad) + 'px, ' + W + 'px ' + (-pad) + 'px, ' + W + 'px ' + topB + 'px, ' + x + 'px ' + topB + 'px, ' + x + 'px ' + botB + 'px, 0 ' + botB + 'px)';
      }
      if(quill){
        quill.style.left = (rtl ? Math.max(0, W - d) : Math.min(W, d)) + 'px';
        if(lines.length > 1) quill.style.top = (lines[ln].top + (lines[ln].bot - lines[ln].top) * 0.72) + 'px';
      }
    }
    setEdge(0, 0);
    if(quill) quill.style.opacity = '1';
    var start = null;
    function frame(ts){
      if(start === null) start = ts;
      var now = ts - start, d = 0, ln = 0;
      for(var k = 0; k < timeline.length; k++){
        var s = timeline[k];
        if(now < s.t0){ d = s.d0; ln = s.li; break; }
        if(now <= s.t1){ var p = (now - s.t0) / (s.t1 - s.t0); d = s.d0 + (s.d1 - s.d0) * (1 - Math.pow(1 - p, 2)); ln = s.li; break; }
        d = s.d1; ln = s.li;
      }
      setEdge(d, ln);
      if(now < total + 60){ requestAnimationFrame(frame); }
      else { el.style.clipPath = ''; if(quill) quill.style.opacity = '0'; if(done) done(); }
    }
    requestAnimationFrame(frame);
  }

  function writeName(){
    var h1 = document.querySelector('[data-i18n="' + html.getAttribute('data-lang') + '"] h1.name');
    if(!h1) return;
    h1.classList.add('in');
    var inkEl = h1.querySelector('.name-ink');
    if(reduced.matches || !inkEl) return;
    var q = h1.querySelector('.qalam');
    if(!q){
      q = document.createElement('span');
      q.className = 'qalam'; q.setAttribute('aria-hidden', 'true'); q.innerHTML = QUILL;
      h1.appendChild(q);
    }
    var rtl = html.getAttribute('dir') === 'rtl';
    inkEl.style.clipPath = rtl ? 'inset(-25% 0 -25% 100%)' : 'inset(-25% 100% -25% 0)';
    h1.classList.add('writing');
    nameBusy = true;
    setTimeout(function(){
      inkWrite(inkEl, q, 100, function(){
        h1.classList.remove('writing');
        nameBusy = false;
        flushTitles();
      });
    }, 250);
  }
  /* titles wait for the name AND for the visitor's first scroll (6s safety release),
     so nothing writes alongside the name on tall screens */
  var titleQueue = [], nameBusy = false, titlesHeld = !!document.querySelector('h1.name');
  function flushTitles(){
    if(nameBusy || titlesHeld) return;
    titleQueue.splice(0).forEach(function(h, i){
      setTimeout(function(){ writeTitle(h); }, 150 + i * 300);
    });
  }
  function releaseTitles(){ titlesHeld = false; flushTitles(); }
  addEventListener('scroll', function onFirstScroll(){
    if(scrollY > 40){ removeEventListener('scroll', onFirstScroll); releaseTitles(); }
  }, { passive: true });
  setTimeout(releaseTitles, 6000);
  writeName();

  /* section titles write themselves — with a small quill — as they scroll into view.
     The clip lives on an inner .h2-ink wrapper so the quill itself is not clipped. */
  if(!reduced.matches){
    var h2s = document.querySelectorAll('.sec-head h2, footer h2');
    h2s.forEach(function(h){
      var rtlH = h.closest('[data-i18n]').getAttribute('data-i18n') === 'ar';
      var w = document.createElement('span');
      w.className = 'h2-ink';
      while(h.firstChild) w.appendChild(h.firstChild);
      h.appendChild(w);
      w.style.clipPath = rtlH ? 'inset(-15% 0 -15% 100%)' : 'inset(-15% 100% -15% 0)';
    });
    var writeTitle = function(h){
      var w = h.querySelector('.h2-ink');
      var q = h.querySelector('.qalam');
      if(!q){
        q = document.createElement('span');
        q.className = 'qalam'; q.setAttribute('aria-hidden', 'true'); q.innerHTML = QUILL;
        h.appendChild(q);
      }
      h.classList.add('writing');
      var len = (w.textContent || '').length || 1;
      inkWrite(w, q, Math.max(30, Math.min(70, Math.round(1500 / len))), function(){ h.classList.remove('writing'); });
    };
    /* observe the parent .sec-head — a fully clipped element reports intersectionRatio 0 in Chrome.
       Titles triggered while the hero name is still being written are queued until it finishes,
       so only one quill writes at a time on load. */
    var hio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(!e.isIntersecting) return;
        hio.unobserve(e.target);
        var h = e.target.querySelector('h2');
        if(!h) return;
        if(nameBusy || titlesHeld){ titleQueue.push(h); } else { writeTitle(h); }
      });
    }, { threshold: 0.6, rootMargin: '0px 0px -18% 0px' });
    h2s.forEach(function(h){ hio.observe(h.parentNode); });
  }

  /* stat counters */
  var cio = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(!e.isIntersecting) return;
      cio.unobserve(e.target);
      var el = e.target, target = +el.dataset.count, suffix = el.dataset.suffix || '', arab = el.dataset.numerals === 'arab';
      if(reduced.matches){ el.textContent = fmt(target, arab) + suffix; return; }
      var t0 = null, dur = 900;
      function step(ts){
        if(!t0) t0 = ts;
        var p = Math.min(1, (ts - t0) / dur);
        p = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(Math.round(target * p), arab) + suffix;
        if(p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat .n[data-count]').forEach(function(el){ cio.observe(el); });

  /* ink ruling scroll line */
  var ink = document.getElementById('inkline'), inkTick = false;
  function drawInk(){
    var d = document.documentElement;
    var max = d.scrollHeight - d.clientHeight;
    ink.style.width = (max > 0 ? (d.scrollTop / max) * 100 : 0) + '%';
    inkTick = false;
  }
  addEventListener('scroll', function(){
    if(!inkTick){ inkTick = true; requestAnimationFrame(drawInk); }
  }, { passive: true });
  drawInk();

  var y = new Date().getFullYear();
  document.querySelectorAll('.js-year').forEach(function(el){
    el.textContent = fmt(y, el.dataset.numerals === 'arab');
  });

  if(!reduced.matches){
    document.querySelectorAll('.tag-sheet span').forEach(function(s, i){
      s.style.transitionDelay = (i % 12) * 45 + 'ms';
    });
  }

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function(el){ io.observe(el); });

  /* engineering notes on project pages: the sketch draws itself, the test run ticks through */
  var nio = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('run'); nio.unobserve(e.target); }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.arch, .test-run').forEach(function(el){
    if(reduced.matches) el.classList.add('run'); else nio.observe(el);
  });

  /* pages under projects/ reach the rest of the site one folder up */
  var BASE = /\/projects\/[^\/]*$/.test(location.pathname) ? '../' : '';
  function el(tag, cls, text){
    var e = document.createElement(tag);
    if(cls) e.className = cls;
    if(text != null) e.textContent = text;
    return e;
  }

  /* Ctrl/⌘ + K — jump anywhere on the site, the way developer tools do */
  var mac = /Mac|iPhone|iPad/.test(navigator.platform);
  var ITEMS = [
    { en: 'About', ar: 'نبذة', kind: 'section', go: 'index.html#about' },
    { en: 'Projects', ar: 'المشاريع', kind: 'section', go: 'index.html#projects' },
    { en: 'Zad — restaurant operations', ar: 'زاد — تشغيل المطاعم', kind: 'project', go: 'projects/zad.html' },
    { en: 'Nuzul — booking marketplace', ar: 'نُزُل — منصة حجز عقارات', kind: 'project', go: 'projects/nuzul.html' },
    { en: 'Nuzul Umrah — Umrah operations', ar: 'نُزُل عمرة — تشغيل شركات العمرة', kind: 'project', go: 'projects/nuzul-os.html' },
    { en: 'Healthy Meals — meal subscriptions', ar: 'وجبات صحية — اشتراكات الوجبات', kind: 'project', go: 'projects/meals.html' },
    { en: 'Baydaq Tech — tech company website', ar: 'بيدق تك — موقع شركة تقنية', kind: 'project', go: 'projects/baydaq.html' },
    { en: 'Visit the Zad site', ar: 'اذهب إلى موقع زاد', kind: 'demo', go: 'https://zad.laravel.cloud/demo', tab: true },
    { en: 'Try the Nuzul Umrah demo', ar: 'جرّب نموذج نُزُل عمرة', kind: 'demo', go: 'demos/nuzul-os.html', tab: true },
    { en: 'Try the Healthy Meals demo', ar: 'جرّب نموذج وجبات صحية', kind: 'demo', go: 'demos/healthy-food.html', tab: true },
    { en: 'Visit the Baydaq Tech site', ar: 'اذهب إلى موقع بيدق تك', kind: 'demo', go: 'https://baydaqtech.com', tab: true },
    { en: 'Other work', ar: 'مشاريع أخرى', kind: 'section', go: 'index.html#work' },
    { en: 'Skills', ar: 'المهارات', kind: 'section', go: 'index.html#skills' },
    { en: 'Contact', ar: 'تواصل', kind: 'section', go: '#contact', here: true },
    { en: 'Copy my email', ar: 'انسخ بريدي الإلكتروني', kind: 'action', run: 'email' },
    { en: 'Switch to Arabic', ar: 'التبديل إلى الإنجليزية', kind: 'action', run: 'lang' },
    { en: 'GitHub', ar: 'GitHub', kind: 'link', go: 'https://github.com/hshoom17', tab: true },
    { en: 'LinkedIn', ar: 'LinkedIn', kind: 'link', go: 'https://www.linkedin.com/in/hashemalahdal', tab: true }
  ];
  var KIND = {
    section: { en: 'Section', ar: 'قسم' }, project: { en: 'Project', ar: 'مشروع' }, demo: { en: 'Live demo', ar: 'نموذج تفاعلي' },
    action: { en: 'Action', ar: 'إجراء' }, link: { en: 'Link', ar: 'رابط' }
  };
  var pal = el('dialog', 'palette');
  pal.setAttribute('aria-label', 'Quick search / بحث سريع');
  var input = el('input');
  input.type = 'search'; input.autocomplete = 'off'; input.spellcheck = false;
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-controls', 'palette-list'); input.setAttribute('aria-expanded', 'true');
  var list = el('ul');
  list.id = 'palette-list'; list.setAttribute('role', 'listbox');
  var foot = el('p', 'palette-foot');
  pal.appendChild(input); pal.appendChild(list); pal.appendChild(foot);
  document.body.appendChild(pal);
  var shown = [], sel = 0;

  function langNow(){ return html.getAttribute('data-lang'); }
  function renderList(){
    var lang = langNow(), q = input.value.trim().toLowerCase();
    shown = ITEMS.filter(function(it){
      return !q || (it.en + ' ' + it.ar + ' ' + KIND[it.kind].en + ' ' + KIND[it.kind].ar).toLowerCase().indexOf(q) > -1;
    });
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    list.innerHTML = '';
    shown.forEach(function(it, i){
      var li = el('li');
      li.id = 'pal-' + i; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      li.appendChild(el('span', 'pl-t', it[lang]));
      li.appendChild(el('span', 'pl-k', KIND[it.kind][lang]));
      li.addEventListener('mousemove', function(){ if(sel !== i){ sel = i; mark(); } });
      li.addEventListener('click', function(){ sel = i; choose(); });
      list.appendChild(li);
    });
    if(!shown.length) list.appendChild(el('li', 'pl-empty', lang === 'ar' ? 'لا نتائج' : 'No matches'));
    mark();
  }
  function mark(){
    [].forEach.call(list.children, function(li, i){ li.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
    var cur = list.children[sel];
    if(cur && cur.id){ input.setAttribute('aria-activedescendant', cur.id); cur.scrollIntoView({ block: 'nearest' }); }
  }
  function choose(){
    var it = shown[sel];
    if(!it) return;
    pal.close();
    if(it.run === 'lang'){ document.getElementById('langToggle').click(); return; }
    if(it.run === 'email'){
      var mail = 'hashemalahdal17@gmail.com';
      (navigator.clipboard ? navigator.clipboard.writeText(mail) : Promise.reject()).catch(function(){ location.href = 'mailto:' + mail; });
      return;
    }
    var url = /^https?:/.test(it.go) || it.here ? it.go : BASE + it.go;
    if(it.tab) window.open(url, '_blank', 'noopener'); else location.href = url;
  }
  function openPalette(){
    var lang = langNow();
    pal.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    pal.setAttribute('lang', lang);
    input.placeholder = lang === 'ar' ? 'إلى أين؟ اكتب اسم مشروع أو قسم…' : 'Where to? Type a project or section…';
    foot.textContent = lang === 'ar' ? '↑↓ للتنقل · Enter للفتح · Esc للإغلاق' : '↑↓ to move · Enter to open · Esc to close';
    input.value = ''; sel = 0;
    renderList();
    pal.showModal();
    input.focus();
  }
  input.addEventListener('input', function(){ sel = 0; renderList(); });
  input.addEventListener('keydown', function(e){
    if(e.key === 'ArrowDown'){ e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); mark(); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); mark(); }
    else if(e.key === 'Enter'){ e.preventDefault(); choose(); }
  });
  pal.addEventListener('click', function(e){ if(e.target === pal) pal.close(); });
  addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      if(pal.open) pal.close(); else openPalette();
    }
  });
  /* a visible hint for mouse users; touch screens have no keyboard shortcut to advertise */
  var controls = document.querySelector('.nav-controls');
  if(controls){
    var chip = el('button', 'kbd-chip', mac ? '⌘ K' : 'Ctrl K');
    chip.type = 'button';
    chip.setAttribute('aria-label', 'Quick search / بحث سريع');
    chip.addEventListener('click', openPalette);
    controls.insertBefore(chip, controls.firstChild);
  }
})();
