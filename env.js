/* ==========================================================================
   env.js — الملف المشترك لبيئة التعلم المدمج (نفس الملف في المستودعات الخمسة)
   --------------------------------------------------------------------------
   • شريط تبويبات موحّد ظاهر في كل الشاشات من الدخول حتى الخروج
   • تسجيل الدخول والخروج + حفظ تقدّم كل طالب على حدة
   • مسار السير: دخول ← اختبار قبلي ← اختبار أساليب التعلم ← توجيه تلقائي
     لنمط الدعم المناسب ← المحتوى التعليمي ← الاختبار البعدي (آخر شاشة)
   • شعار جامعة الزقازيق يمينًا وشعار كلية التربية النوعية يسارًا في كل الشاشات
   • تسجيل دخول الطلاب وتقدّمهم في قاعدة بيانات Firebase لتتبعهم
   --------------------------------------------------------------------------
   ★ النسختان: المغلقة (للطلاب) والمفتوحة (للتحكيم) ★
     • النسخة المغلقة هي الافتراضية: دخول إلزامي + أقفال المسار + تسجيل التقدّم.
     • النسخة المفتوحة للمحكّمين بدون أي مستودعات إضافية: يُرسل لهم الرابط
         .../testmain/index.html?review=tahkeem2026
       فتُفتح لهم كل الشاشات والأنماط الأربعة على متصفحهم فقط (والطلاب لا يتأثرون).
       لإلغائها على نفس المتصفح: index.html?review=off
     • أو اجعل OPEN_MODE: true لعمل نسخة مفتوحة بالكامل مستقلة.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    OPEN_MODE: true,   /* ★ نسخة التحكيم المفتوحة: بلا دخول ولا أقفال ★ */
    /* حسابات الطلاب في Firebase Authentication تُنشأ داخليًا بالصيغة: اسم_المستخدم@هذا_النطاق */
    STUDENT_EMAIL_DOMAIN: 'students.salwa-env.app',
    /* البريد الوحيد المسموح له بإنشاء حساب الباحثة الأول (مقيَّد أيضًا في firestore.rules) */
    RESEARCHER_EMAIL: 'salwa@gmail.com',
    REVIEW_KEY: 'tahkeem2026',   /* كود رابط نسخة التحكيم — غيّره كما تشاء */

    /* أسماء المستودعات كما هي على GitHub Pages (المجلدات المتجاورة) */
    SITES: {
      main: { repo: 'testmain' },
      g1: { repo: 'testFixed-Support--g1',     support: 'fixed', style: 'dep', label: 'نمط الدعم الثابت', styleLabel: 'معتمد على المجال' },
      g2: { repo: 'testFixed-Support--g2',     support: 'fixed', style: 'ind', label: 'نمط الدعم الثابت', styleLabel: 'مستقل عن المجال' },
      g3: { repo: 'testFlexible-Support---g3', support: 'flex',  style: 'dep', label: 'نمط الدعم المرن',  styleLabel: 'معتمد على المجال' },
      g4: { repo: 'testFlexible-Support---g4', support: 'flex',  style: 'ind', label: 'نمط الدعم المرن',  styleLabel: 'مستقل عن المجال' }
    },

    /* قاعدة البيانات: مشروع Firebase الخاص بالبيئة (classroom-8de04) — Cloud Firestore + Authentication */
    FIREBASE: {
      apiKey: "AIzaSyAt3Rco9l1z_L0s5fYaJhlI4JSiIttFKvc",
      authDomain: "classroom-8de04.firebaseapp.com",
      projectId: "classroom-8de04",
      storageBucket: "classroom-8de04.firebasestorage.app",
      messagingSenderId: "85766910317",
      appId: "1:85766910317:web:e00a6be7155936b4ebaa64"
    }
  };

  /* مفاتيح التقدّم المحفوظة لكل طالب */
  var PROGRESS_KEYS = ['preTestCompleted', 'preTestScore', 'stylesTestCompleted', 'stylesResult',
                       'assignedEnv', 'postTestCompleted', 'postTestScore'];

  /* ---------- أدوات عامة ---------- */
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* تفعيل/إلغاء نسخة التحكيم من الرابط */
  try {
    var rv = new URLSearchParams(location.search).get('review');
    if (rv === CONFIG.REVIEW_KEY) localStorage.setItem('envReviewMode', '1');
    else if (rv === 'off') localStorage.removeItem('envReviewMode');
    if (localStorage.getItem('envReviewMode') === '1') CONFIG.OPEN_MODE = true;
  } catch (e) {}

  /* الباحثة ترى كل الشاشات والأنماط الأربعة بدون أقفال ولا يُسجَّل لها تقدّم */
  try {
    var _su = JSON.parse(localStorage.getItem('envUser') || 'null');
    if (_su && _su.role === 'researcher') { CONFIG.OPEN_MODE = true; CONFIG.RESEARCHER = true; }
  } catch (e) {}

  var scriptEl = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
  var SITE = (scriptEl && scriptEl.getAttribute('data-site')) || 'main';
  var PAGE = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  if (PAGE.indexOf('.html') === -1) PAGE = 'index.html';

  function url(site, page) {
    page = page || '';
    if (site === SITE) return page || 'index.html';
    return '../' + CONFIG.SITES[site].repo + '/' + page;
  }

  /* ---------- المستخدم والتقدّم ---------- */
  function user() { try { return JSON.parse(ls('envUser') || 'null'); } catch (e) { return null; } }
  function flag(k) { return !!ls(k); }
  function progressSnapshot() {
    var o = {};
    PROGRESS_KEYS.forEach(function (k) { var v = ls(k); if (v !== null && v !== undefined) o[k] = v; });
    return o;
  }
  function saveProgress() {
    var u = user(); if (!u) return;
    ls('envProgress_' + u.u, JSON.stringify(progressSnapshot()));
  }
  function applyProgress(p) {
    PROGRESS_KEYS.forEach(function (k) { ls(k, null); });
    Object.keys(p || {}).forEach(function (k) { if (PROGRESS_KEYS.indexOf(k) !== -1) ls(k, String(p[k])); });
  }
  function setProgress(k, v) { ls(k, v === null ? null : String(v)); saveProgress(); setProgressRemote(k, v); }

  /* الخطوة التالية في مسار السير */
  function nextStepUrl() {
    if (CONFIG.OPEN_MODE) return url('main', 'home.html');
    if (!flag('preTestCompleted')) return url('main', 'befor.html');
    if (!flag('stylesTestCompleted') || !ls('assignedEnv')) return url('main', 'trian.html');
    return url(ls('assignedEnv'), groupOK(ls('assignedEnv')) ? 'mods.html' : 'index.html');
  }

  /* ---------- قاعدة البيانات Firebase (اختيارية، لا توقف البيئة لو فشلت) ---------- */
  var fbPromise = null;
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
    });
  }
  /* يحمّل Firebase (التطبيق + Cloud Firestore + تسجيل الدخول) وينتظر استرجاع جلسة الدخول */
  var FB_V = 'https://www.gstatic.com/firebasejs/9.23.0/';
  function fb() {
    if (fbPromise) return fbPromise;
    var need = function (name, file) {
      return (window.firebase && firebase[name]) ? Promise.resolve() : loadScript(FB_V + file);
    };
    fbPromise = need('initializeApp', 'firebase-app-compat.js')
      .then(function () { return need('firestore', 'firebase-firestore-compat.js'); })
      .then(function () { return need('auth', 'firebase-auth-compat.js'); })
      .then(function () {
        if (!firebase.apps.length) firebase.initializeApp(CONFIG.FIREBASE);
        return new Promise(function (res) {
          var done = false;
          var un = firebase.auth().onAuthStateChanged(function () { if (!done) { done = true; un(); res(firebase.firestore()); } });
          setTimeout(function () { if (!done) { done = true; res(firebase.firestore()); } }, 5000);
        });
      })['catch'](function () { return null; });
    return fbPromise;
  }
  function authUser() { try { return firebase.auth().currentUser; } catch (e) { return null; } }
  function isStudentSession() { var u = user(); return !!(u && u.role === 'student' && u.uid && !CONFIG.OPEN_MODE); }
  function now() { return new Date().toISOString(); }
  function clean(o) { return JSON.parse(JSON.stringify(o === undefined ? null : o)); }

  /* ── هيكل قاعدة البيانات (Cloud Firestore) ──
       config/app                 { setupDone }
       researchers/{uid}          { name, email, createdAt, lastLogin }
       students/{uid}             { username, name, active, initialPassword, createdAt, lastLogin }
       usernames/{username}       { uid }
       progress/{uid}             { preTestCompleted, preTestScore, stylesTestCompleted, stylesResult, assignedEnv, ... }
       results/{uid}              { pre:{…}, post:{…}, styles:{…} }   + results/{uid}/attempts/{auto}
       activities/{uid}           { m3_l1:{answer,…}, … }
       logs/{auto}                { uid, ev, at, site, page, … }
       counters/{dep|ind}         { n }                                ── */
  function withStudent(fn) {
    if (!isStudentSession()) return Promise.resolve();
    var u = user();
    return fb().then(function (db) {
      if (!db || !authUser()) return;
      return fn(db, u.uid);
    })['catch'](function () {});
  }
  function setProgressRemote(k, v) {
    return withStudent(function (db, uid) {
      var o = {}; o[k] = (v === null || v === undefined) ? firebase.firestore.FieldValue['delete']() : v;
      return db.collection('progress').doc(uid).set(o, { merge: true });
    });
  }
  function track(ev, data) {
    return withStudent(function (db, uid) {
      var rec = { uid: uid, ev: ev, at: now(), site: SITE, page: PAGE };
      if (data) Object.keys(data).forEach(function (k) { rec[k] = data[k]; });
      return db.collection('logs').add(clean(rec));
    });
  }
  /* حفظ نتيجة اختبار كاملة (قبلي/بعدي/أساليب التعلم) لتظهر للباحثة وتُحمَّل كدرجات */
  function saveResult(kind, data) {
    /* قبل تسجيل الدخول (الاختبار القبلي وأساليب التعلم مفتوحين بدون دخول):
       تُحفظ النتيجة على الجهاز، وتُرفع لحساب الطالب تلقائيًا عند دخوله لبيئة الدعم */
    if (!user() && !CONFIG.OPEN_MODE) {
      try {
        var pend = JSON.parse(ls('envPending') || '{}');
        pend[kind] = clean(Object.assign({ at: now() }, data || {}));
        pend.name = pend.name || ls('preTestStudentName') || '';
        ls('envPending', JSON.stringify(pend));
      } catch (e) {}
      return Promise.resolve();
    }
    return withStudent(function (db, uid) {
      data = clean(Object.assign({ at: now() }, data || {}));
      var o = {}; o[kind] = data;
      return Promise.all([
        db.collection('results').doc(uid).set(o, { merge: true }),
        db.collection('results').doc(uid).collection('attempts').add(Object.assign({ kind: kind }, data))
      ]);
    });
  }
  /* حفظ إجابة نشاط تعليمي (تراها الباحثة وتحمّلها) */
  function saveActivity(mod, lesson, title, answer) {
    return withStudent(function (db, uid) {
      var key = 'm' + mod + '_l' + lesson, ref = db.collection('activities').doc(uid);
      return ref.get().then(function (s) {
        var old = ((s.exists && s.data()) || {})[key] || {};
        var o = {};
        o[key] = { module: mod, lesson: String(lesson), title: title || '', answer: answer, at: now(),
                   firstAt: old.firstAt || now(), count: (old.count || 0) + 1, env: SITE };
        return ref.set(o, { merge: true });
      }).then(function () { return track('activity', { module: mod, lesson: String(lesson) }); });
    });
  }
  /* عدّاد التوزيع المتوازن لنمط الدعم (معاملة ذرّية) — يرجع الرقم الجديد أو null */
  function counterNext(name) {
    return fb().then(function (db) {
      if (!db) return null;   /* يعمل قبل تسجيل الدخول (الاختبارات مفتوحة بدون دخول) */
      var ref = db.collection('counters').doc(name);
      return db.runTransaction(function (t) {
        return t.get(ref).then(function (s) {
          var n = ((s.exists && s.data().n) || 0) + 1;
          t.set(ref, { n: n });
          return n;
        });
      });
    })['catch'](function () { return null; });
  }
  /* استرجاع التقدّم المحفوظ في قاعدة البيانات (يعمل من أي جهاز) */
  function fetchRemoteProgress(uid) {
    var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, 5000); });
    var get = fb().then(function (db) {
      if (!db) return null;
      return db.collection('progress').doc(uid).get()
        .then(function (s) { return { ok: true, val: s.exists ? s.data() : null }; })['catch'](function () { return null; });
    });
    return Promise.race([get, timeout]);
  }

  /* ---------- الدخول والخروج (Firebase Authentication + Cloud Firestore) ---------- */
  function authMsg(e) {
    var c = (e && e.code) || '';
    if (c === 'env/disabled') return 'هذا الحساب موقوف — تواصل مع الباحثة.';
    if (c === 'env/not-student') return 'هذا الحساب ليس حساب طالب.';
    if (c === 'env/not-researcher') return 'هذا الحساب ليس له صلاحية الباحثة.';
    if (c === 'env/offline') return 'تعذّر الاتصال بقاعدة البيانات — تأكد من الإنترنت ثم حاول مرة أخرى.';
    if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(c)) return 'اسم المستخدم أو كلمة المرور غير صحيحة.';
    if (/email-already-in-use/.test(c)) return 'هذا البريد مسجّل من قبل — استخدم «دخول الباحثة».';
    if (/weak-password/.test(c)) return 'كلمة المرور ضعيفة — 6 أحرف على الأقل.';
    if (/too-many-requests/.test(c)) return 'محاولات كثيرة خاطئة — انتظر قليلًا ثم حاول مرة أخرى.';
    if (/network-request-failed|unavailable/.test(c)) return 'تعذّر الاتصال بالإنترنت — حاول مرة أخرى.';
    if (/operation-not-allowed|configuration-not-found/.test(c)) return 'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase (Authentication ← Sign-in method ← Email/Password).';
    if (/permission-denied/.test(c)) return 'قواعد قاعدة البيانات لا تسمح بهذه العملية — الصق ملف firestore.rules في Firestore ← Rules ثم Publish.';
    return 'حدث خطأ: ' + ((e && (e.message || e.code)) || 'غير معروف');
  }
  function err(code) { var e = new Error(code); e.code = code; return e; }
  function studentEmail(username) { return String(username).trim().toLowerCase() + '@' + CONFIG.STUDENT_EMAIL_DOMAIN; }

  function startSession(profile) {
    var prev = user();
    var local = null;
    try { local = JSON.parse(ls('envProgress_' + profile.u) || 'null'); } catch (e) {}
    if (!prev || prev.u !== profile.u) applyProgress(local || {});
    profile.at = now();
    ls('envUser', JSON.stringify(profile));
  }

  /* دخول الطالب: اسم المستخدم + كلمة المرور */
  /* رفع نتائج الاختبارات التي أُدّيت قبل تسجيل الدخول إلى حساب الطالب */
  function flushAnon(db, uid, anon) {
    var pend = null; try { pend = JSON.parse(ls('envPending') || 'null'); } catch (e) {}
    var jobs = [db.collection('progress').doc(uid).set(clean(anon), { merge: true })];
    ['pre', 'styles'].forEach(function (k) {
      if (pend && pend[k]) {
        var o = {}; o[k] = pend[k];
        jobs.push(db.collection('results').doc(uid).set(o, { merge: true }));
        jobs.push(db.collection('results').doc(uid).collection('attempts').add(Object.assign({ kind: k }, pend[k])));
        jobs.push(db.collection('logs').add(clean(Object.assign({ uid: uid, ev: k === 'pre' ? 'pretest' : 'styles', at: pend[k].at || now(), site: 'main', page: k === 'pre' ? 'befor.html' : 'trian.html' },
          k === 'pre' ? { score: pend[k].score } : { score: pend[k].score, style: pend[k].style, env: pend[k].env }))));
      }
    });
    if (pend && pend.name) jobs.push(db.collection('students').doc(uid).set({ testName: pend.name }, { merge: true }));
    return Promise.all(jobs.map(function (p) { return p['catch'](function () {}); })).then(function () { ls('envPending', null); });
  }

  function loginStudent(username, password) {
    username = String(username || '').trim().toLowerCase();
    var prevU = user();
    var anon = (!prevU) ? progressSnapshot() : null;      // تقدّم الاختبارات قبل الدخول
    return fb().then(function (db) {
      if (!db) throw err('env/offline');
      return firebase.auth().signInWithEmailAndPassword(studentEmail(username), password).then(function (cred) {
        var uid = cred.user.uid;
        return db.collection('students').doc(uid).get().then(function (snap) {
          var st = snap.exists ? snap.data() : null;
          if (!st) { firebase.auth().signOut(); throw err('env/not-student'); }
          if (st.active === false) { firebase.auth().signOut(); throw err('env/disabled'); }
          startSession({ u: username, name: st.name || username, uid: uid, role: 'student' });
          CONFIG.OPEN_MODE = false;
          return fetchRemoteProgress(uid).then(function (res) {
            /* قاعدة البيانات هي المرجع: تقدّم الطالب يُسترجع منها على أي جهاز،
               وإذا أعادت الباحثة ضبط الطالب يبدأ من جديد */
            var remote = (res && res.ok) ? (res.val || {}) : null;
            var up = Promise.resolve();
            if (remote && remote.preTestCompleted) applyProgress(remote);              // أدّى الاختبارات من قبل
            else if (anon && anon.preTestCompleted) { applyProgress(anon); up = flushAnon(db, uid, anon); }  // أدّاها الآن قبل الدخول
            else if (remote) applyProgress(remote);
            saveProgress();
            return Promise.all([up,
              db.collection('students').doc(uid).update({ lastLogin: now() })['catch'](function () {}),
              track('login')
            ]);
          });
        });
      });
    });
  }

  /* دخول الباحثة: البريد الإلكتروني + كلمة المرور */
  function loginResearcher(email, password) {
    return fb().then(function (db) {
      if (!db) throw err('env/offline');
      return firebase.auth().signInWithEmailAndPassword(String(email || '').trim(), password).then(function (cred) {
        var uid = cred.user.uid;
        return db.collection('researchers').doc(uid).get().then(function (snap) {
          var r = snap.exists ? snap.data() : null;
          if (!r) { firebase.auth().signOut(); throw err('env/not-researcher'); }
          applyProgress({});
          ls('envUser', JSON.stringify({ u: r.email || email, name: r.name || 'الباحثة', uid: uid, role: 'researcher', at: now() }));
          return db.collection('researchers').doc(uid).set({ lastLogin: now() }, { merge: true })['catch'](function () {});
        });
      });
    });
  }

  /* إنشاء حساب الباحثة لأول مرة فقط (يُقفل بعدها تلقائيًا) */
  function setupStatus() {
    return fb().then(function (db) {
      if (!db) return null;
      return db.collection('config').doc('app').get().then(function (s) { return !!(s.exists && s.data().setupDone); })['catch'](function () { return null; });
    });
  }
  function createFirstResearcher(name, email, password) {
    return fb().then(function (db) {
      if (!db) throw err('env/offline');
      if (String(email).trim().toLowerCase() !== CONFIG.RESEARCHER_EMAIL) throw err('env/not-researcher');
      var signIn = firebase.auth().createUserWithEmailAndPassword(String(email).trim(), password)['catch'](function (e) {
        /* لو الحساب موجود في Authentication من محاولة سابقة: ندخل به ونكمل الإعداد */
        if (/email-already-in-use/.test(e.code || '')) return firebase.auth().signInWithEmailAndPassword(String(email).trim(), password);
        throw e;
      });
      return signIn.then(function (cred) {
        var uid = cred.user.uid, b = db.batch();
        b.set(db.collection('researchers').doc(uid), { name: name, email: String(email).trim().toLowerCase(), createdAt: now() });
        b.set(db.collection('config').doc('app'), { setupDone: true, setupAt: now() });
        return b.commit().then(function () {
          ls('envUser', JSON.stringify({ u: email, name: name, uid: uid, role: 'researcher', at: now() }));
        });
      });
    });
  }

  /* جهاز مشترك (معمل): طالب جديد يبدأ الاختبارات بعد طالب لم يسجّل دخوله بعد */
  function newDeviceStudent() {
    if (user()) return;
    if (ls('envPending') && !confirm('نتائج الطالب السابق على هذا الجهاز لم تُرفع بعد (لم يسجّل دخوله لبيئة الدعم). هل تريد مسحها والبدء كطالب جديد؟')) return;
    applyProgress({}); ls('envPending', null); ls('preTestStudentName', null); ls('completedPreTest', null);
    location.href = url('main', 'home.html');
  }

  function logout() {
    var u = user();
    saveProgress();
    var p = (u && u.role === 'student') ? track('logout') : Promise.resolve();
    ls('envUser', null);
    ls('envGroupOK', null);
    applyProgress({});
    p.then(function () { return fb(); }).then(function (db) { if (db) return firebase.auth().signOut(); })['catch'](function () {})
      .then(function () { location.href = url('main', 'home.html'); });
    setTimeout(function () { location.href = url('main', 'home.html'); }, 2500);
  }

  /* ---------- رسائل قصيرة ---------- */
  function toast(msg) {
    var t = document.getElementById('envToast');
    if (!t) {
      t = document.createElement('div'); t.id = 'envToast';
      t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1b4a4a;color:#fff;padding:12px 26px;border-radius:50px;font-size:13px;font-weight:700;z-index:100000;box-shadow:0 8px 28px rgba(27,74,74,.4);border:2px solid #2dd4bf;font-family:Cairo,sans-serif;max-width:92vw;text-align:center;direction:rtl;';
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.display = 'block';
    clearTimeout(t._t); t._t = setTimeout(function () { t.style.display = 'none'; }, 3800);
  }

  /* هل سجّل الطالب دخوله في بيئة نمطه؟ */
  function groupOK(site) { var u = user(); return !!(u && ls('envGroupOK') === u.u + '|' + site); }
  function setGroupOK(site) { var u = user(); if (u) ls('envGroupOK', u.u + '|' + site); }

  /* ---------- الحماية (النسخة المغلقة فقط) ---------- */
  var PUBLIC_PAGES = ['index.html', 'guied.html', 'instructions.html', 'contact.html'];
  function guard() {
    var go = function (to) { location.replace(to); return false; };
    if (PAGE === 'admin.html') { var ru = user(); return (ru && ru.role === 'researcher') ? true : go(url('main', 'index.html') + '#researcher'); }
    if (CONFIG.OPEN_MODE) return true;
    if (SITE === 'main' && PUBLIC_PAGES.indexOf(PAGE) !== -1) return true; // شاشة الدخول + الدليل والتعليمات (تُقرأ قبل الدخول)
    if (SITE === 'main') {
      /* الشاشة الرئيسية والاختبار القبلي واختبار أساليب التعلم مفتوحة بدون تسجيل دخول */
      if (PAGE === 'trian.html' && !flag('preTestCompleted')) return go(url('main', 'befor.html'));
      if (PAGE === 'after.html' && !user()) return go(url('main', 'pretest.html'));
      return true;
    }
    /* بيئات الدعم: الدخول باسم المستخدم وكلمة المرور من شاشة دخول البيئة */
    if (!user()) return PAGE === 'index.html' ? true : go(url(SITE, 'index.html'));
    if (SITE !== 'main') {
      if (!flag('stylesTestCompleted') || !ls('assignedEnv')) return go(url('main', 'mods.html'));
      var a = ls('assignedEnv');
      if (a !== SITE && CONFIG.SITES[a]) return go(url(a, PAGE));       // كل طالب داخل نمطه فقط
      /* تسجيل الدخول الثاني: بعد التوجيه للنمط تظهر شاشة دخول البيئة المناسبة قبل المحتوى */
      if (PAGE !== 'index.html' && !groupOK(SITE)) return go(url(SITE, 'index.html'));
    } else {
      if (PAGE === 'trian.html' && !flag('preTestCompleted')) return go(url('main', 'befor.html'));
    }
    return true;
  }

  /* ---------- شريط التبويبات الموحّد ---------- */
  function tabs() {
    var a = ls('assignedEnv');
    var contentSite = (SITE !== 'main') ? SITE : (CONFIG.SITES[a] ? a : null);
    var T = [
      { k: 'home',    ico: '🏠', label: 'الرئيسية',             href: url('main', 'home.html') },
      { k: 'guide',   ico: '📘', label: 'دليل المتعلم',          href: url('main', 'guied.html') },
      { k: 'aims',    ico: '🎯', label: 'أهداف البيئة',          href: url('main', 'aims.html') },
      { k: 'eval',    ico: '📝', label: 'التقويم',               href: url('main', 'pretest.html') },
      { k: 'styles',  ico: '🧩', label: 'اختبار أساليب التعلم',  href: url('main', 'trian.html'),
        lock: !CONFIG.OPEN_MODE && !flag('preTestCompleted') ? 'أكمل الاختبار التحصيلي القبلي أولاً للوصول لاختبار أساليب التعلم' : '' },
      { k: 'content', ico: '📖', label: 'المحتوى التعليمي',      href: contentSite ? url(contentSite, 'mods.html') : url('main', 'mods.html'),
        lock: !CONFIG.OPEN_MODE && !(flag('preTestCompleted') && flag('stylesTestCompleted') && contentSite)
              ? (flag('preTestCompleted') ? 'أكمل اختبار أساليب التعلم أولاً للوصول إلى المحتوى التعليمي'
                                          : 'أكمل الاختبار التحصيلي القبلي ثم اختبار أساليب التعلم أولاً للوصول إلى المحتوى التعليمي') : '' },
      { k: 'poster',  ico: '📢', label: 'لوحة الإعلانات',        href: contentSite ? url(contentSite, 'poster.html') : (CONFIG.OPEN_MODE ? url('g1', 'poster.html') : url('main', 'mods.html')),
        lock: !CONFIG.OPEN_MODE && !contentSite ? 'تظهر لوحة إعلانات مجموعتك بعد اختبار أساليب التعلم وتحديد نمط الدعم' : '' },
      { k: 'contact', ico: '📞', label: 'اتصل بنا',              href: url('main', 'contact.html') }
    ];
    if (CONFIG.OPEN_MODE) T.push({ k: 'patterns', ico: '🔀', label: 'الأنماط الأربعة', href: url('main', 'mods.html') });
    if (CONFIG.RESEARCHER) T.push({ k: 'admin', ico: '📊', label: 'لوحة الباحثة', href: url('main', 'admin.html') });
    return T;
  }
  function activeKey() {
    var map = {
      'home.html': 'home', 'guied.html': 'guide', 'instructions.html': 'guide', 'aims.html': 'aims',
      'pretest.html': 'eval', 'befor.html': 'eval', 'after.html': 'eval', 'trian.html': 'styles',
      'mods.html': 'content', 'mod3lessons.html': 'content', 'mod4lessons.html': 'content',
      'poster.html': 'poster', 'contact.html': 'contact', 'admin.html': 'admin'
    };
    return map[PAGE] || '';
  }
  function buildNav() {
    var nav = document.querySelector('.nav');
    if (!nav) return;
    var act = activeKey();
    nav.setAttribute('data-env-nav', '1');
    nav.innerHTML = tabs().map(function (t) {
      var cls = [];
      if (t.k === act) cls.push('active');
      if (t.lock) cls.push('env-locked');
      return '<a href="' + esc(t.href) + '" data-tab="' + t.k + '"' + (cls.length ? ' class="' + cls.join(' ') + '"' : '') +
             (t.lock ? ' data-lock="' + esc(t.lock) + '"' : '') + ' target="_self">' + t.ico + ' ' + esc(t.label) + '</a>';
    }).join('') + (function () {
      /* منطقة الحساب أعلى الشاشة: أزرار الدخول، أو «أهلاً + الاسم + تسجيل خروج» */
      var u = user();
      if (u) {
        return '<span class="env-auth"><span class="env-hello">👋 أهلاً، <b>' + esc(u.name) + '</b>' +
               (u.role === 'researcher' ? ' <small>(الباحثة)</small>' : '') + '</span>' +
               '<a href="' + esc(url('main', 'index.html')) + '" data-tab="logout" class="env-btn env-out" target="_self">🚪 تسجيل خروج</a></span>';
      }
      if (CONFIG.OPEN_MODE) return '<span class="env-auth"><span class="env-hello">🔓 نسخة التحكيم — كل الشاشات مفتوحة</span></span>';
      var onLogin = (SITE === 'main' && PAGE === 'index.html');
      var role = (location.hash === '#researcher') ? 'researcher' : 'student';
      return '<span class="env-auth">' + (CONFIG.OPEN_MODE ? '<span class="env-hello">🔓 نسخة التحكيم</span>' : '') +
             '<a href="' + esc(url('main', 'index.html')) + '#researcher" data-tab="login-researcher" class="env-btn env-in' + (onLogin && role === 'researcher' ? ' on' : '') + '" target="_self">🎓 تسجيل دخول الباحثة</a></span>';
    })();
    if (nav._envBound) return;            // يُربط مرة واحدة حتى لو أُعيد بناء الشريط
    nav._envBound = true;
    nav.addEventListener('click', function (e) {
      var a = e.target.closest('a'); if (!a) return;
      var k = a.getAttribute('data-tab');
      var inExam = document.body.classList.contains('exam-active');
      if (inExam) {
        /* أثناء الاختبار: دليل المتعلم يُفتح في نافذة جديدة حتى لا يضيع الاختبار */
        if (k === 'guide') { e.preventDefault(); window.open(a.href, '_blank'); return; }
        e.preventDefault(); toast('🔒 لا يمكنك مغادرة الصفحة أثناء الاختبار — يمكنك فتح «دليل المتعلم» فقط'); return;
      }
      if (a.classList.contains('env-locked')) { e.preventDefault(); toast('🔒 ' + a.getAttribute('data-lock')); return; }
      if (k === 'logout' && user()) { e.preventDefault(); logout(); return; }
      if ((k === 'login-student' || k === 'login-researcher') && SITE === 'main' && PAGE === 'index.html') {
        e.preventDefault();
        var r = k === 'login-student' ? 'student' : 'researcher';
        if (location.hash !== '#' + r) history.replaceState(null, '', '#' + r);
        window.dispatchEvent(new Event('hashchange'));
      }
    }, true);
  }

  /* ---------- الشعارات + شارة المستخدم ---------- */
  var LOGO_UNI = 'img/logo-zu.png', LOGO_COL = 'img/logo-col.jpeg';
  function injectChrome() {
    var css = document.createElement('style');
    css.textContent =
      '.nav[data-env-nav]{display:flex;flex-wrap:wrap;justify-content:center;gap:5px;}' +
      '.nav[data-env-nav] a{white-space:nowrap;font-size:11.5px!important;padding:4px 9px!important;}' +
      '.nav a.env-locked{opacity:.5;cursor:not-allowed!important;}' +
      '.nav a.env-locked::after{content:"🔒";font-size:10px;margin-right:4px;}' +
      '.nav .env-auth{display:inline-flex;align-items:center;gap:6px;margin-right:10px;padding-right:10px;border-right:2px solid rgba(167,243,208,.35);flex-wrap:wrap;}' +
      '.nav .env-hello{color:#fde68a;font:700 12px Cairo,sans-serif;white-space:nowrap;}' +
      '.nav .env-hello small{color:#ccfbf1;font-weight:600;}' +
      '.nav a.env-btn{border-radius:50px;font-weight:800!important;}' +
      '.nav a.env-in{background:#fde68a!important;color:#1b4a4a!important;border-color:#fde68a!important;}' +
      '.nav a.env-in.on{background:#fff!important;border-color:#fff!important;box-shadow:0 0 0 2px #fde68a;}' +
      '.nav a.env-out{background:#fee2e2!important;color:#991b1b!important;border-color:#fecaca!important;}' +
      '.header .brand-logos.env-logos{position:absolute;top:0;bottom:0;left:12px;right:12px;display:flex;justify-content:space-between;align-items:center;pointer-events:none;direction:rtl;z-index:1;}' +
      '.header .brand-logos.env-logos img{height:34px;width:auto;background:#fff;border-radius:9px;padding:2px 4px;box-shadow:0 2px 8px rgba(0,0,0,.25);object-fit:contain;}' +
      '.header{position:relative;}' +
      '.header.env-has-logos{padding-left:150px!important;padding-right:70px!important;}' +
      '.header.env-has-logos .support-badge{left:140px!important;}' +

      '@media (max-width:900px){.header.env-has-logos{padding-left:12px!important;padding-right:12px!important;padding-top:48px!important;}.header .brand-logos.env-logos{bottom:auto;height:46px;}.header.env-has-logos .support-badge{display:none;}}';
    document.head.appendChild(css);

    var header = document.querySelector('.header');
    if (header && !header.querySelector('.brand-logos')) {
      var base = (SITE === 'main') ? '' : url('main', '');
      var box = document.createElement('div');
      box.className = 'brand-logos env-logos';
      box.innerHTML = '<img src="' + base + LOGO_UNI + '" alt="شعار جامعة الزقازيق"><img src="' + base + LOGO_COL + '" alt="شعار كلية التربية النوعية">';
      header.insertBefore(box, header.firstChild);
      header.classList.add('env-has-logos');
    }
  }

  /* ---------- واجهة عامة ---------- */
  window.ENV = {
    CONFIG: CONFIG, SITE: SITE, PAGE: PAGE,
    url: url, user: user, flag: flag, logout: logout,
    loginStudent: loginStudent, loginResearcher: loginResearcher, authMsg: authMsg,
    setupStatus: setupStatus, createFirstResearcher: createFirstResearcher, studentEmail: studentEmail,
    setProgress: setProgress, saveProgress: saveProgress, nextStepUrl: nextStepUrl,
    track: track, fb: fb, counterNext: counterNext, toast: toast, rebuildNav: buildNav,
    saveResult: saveResult, saveActivity: saveActivity, groupOK: groupOK, setGroupOK: setGroupOK,
    newDeviceStudent: newDeviceStudent
  };

  if (!guard()) { document.documentElement.style.visibility = 'hidden'; return; }
  /* التحقق من أن جلسة الدخول ما زالت صالحة في قاعدة البيانات (وإلا يُطلب الدخول من جديد) */
  function verifySession() {
    var u = user();
    if (!u || !u.uid) return;
    fb().then(function (db) {
      if (!db) return;                                   // بدون إنترنت: لا نطرد الطالب
      var au = authUser();
      if (!au || au.uid !== u.uid) {
        ls('envUser', null); applyProgress({});
        if (SITE !== 'main') location.replace(url(SITE, 'index.html'));
        else if (window.ENV && ENV.rebuildNav) location.reload();
      }
    });
  }
  function init() { buildNav(); injectChrome(); saveProgress(); verifySession(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
