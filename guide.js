/* تنقّل بالروابط داخل الدليل/التعليمات: كل رابط يعرض قسمه فقط (يدعم #رابط_مباشر) */
(function(){
  var secs = Array.prototype.slice.call(document.querySelectorAll('.g-sec'));
  var box = document.getElementById('gLinks');
  secs.forEach(function(s, i){
    var h = document.createElement('div');
    h.className = 'g-sec-title';
    h.innerHTML = '<span class="ico">' + (s.getAttribute('data-ico') || '') + '</span>' + s.getAttribute('data-title');
    s.insertBefore(h, s.firstChild);
    if (box) {
      var part = s.getAttribute('data-part');
      if (part && part !== box._lastPart) {
        var ph = document.createElement('div'); ph.className = 'part'; ph.textContent = part; box.appendChild(ph); box._lastPart = part;
      }
      var a = document.createElement('a');
      a.href = '#' + s.id; a.id = 'lnk-' + s.id;
      a.innerHTML = '<span class="n">' + (i + 1) + '</span>' + s.getAttribute('data-title');
      box.appendChild(a);
    }
  });
  function show(){
    var id = (location.hash || '').slice(1);
    var target = secs.filter(function(s){ return s.id === id; })[0] || secs[0];
    secs.forEach(function(s){ s.classList.toggle('show', s === target); });
    document.querySelectorAll('.g-links a, .ins-link').forEach(function(a){
      a.classList.toggle('active', a.getAttribute('href') === '#' + target.id);
    });
    /* الرجوع لبداية القسم داخل إطار المحتوى فقط (بدون تحريك الصفحة كلها) */
    var m = document.getElementById('gMain');
    if (m) { if (m.scrollHeight > m.clientHeight) m.scrollTop = 0; else if (id && window.innerWidth <= 900) m.scrollIntoView({block:'start'}); }
  }
  window.addEventListener('hashchange', show);
  show();
})();
