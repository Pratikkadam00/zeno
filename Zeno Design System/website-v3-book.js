/* ZENO — THE LEDGER BOOK engine, v2: a real page turn.
   The sheet turns around its LEFT edge (the spine), right-to-left, with:
   · a true paper BACK FACE (blank ruled stock) visible mid-turn
   · paper BEND — the outer half of the sheet lags a few degrees (two hinged
     segments, like real flipbook engines), so the page flexes, not a card
   · moving light: the lifting face darkens, the back is lit from the spine,
     a fold shadow sweeps across the page beneath, which brightens as it's
     revealed
   · a soft landing — smootherstep release, page fades onto the read stack
   Rails: transform/opacity only · rAF-driven with a watchdog (the book can
   never wedge) · gestures respect in-page scrolling · no-JS / reduced-motion
   / no-WAAPI → plain scrolling document. */
(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canBook = document.documentElement.classList.contains("book") && !reduced && "animate" in Element.prototype;
  var live = document.getElementById("live");

  /* ══════════════ shared page interactions (both modes) ═══════════════ */

  document.querySelectorAll("form[data-wl]").forEach(function (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var rc = form.nextElementSibling;
      rc.querySelector("[data-wl-time]").textContent = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
      rc.classList.add("show");
      form.querySelector("input").value = "";
      live.textContent = "Waitlist entry logged.";
    });
  });

  document.querySelectorAll(".qa .qq").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var qa = btn.parentElement, open = qa.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  /* ── the audit ledger: switches, totals, inline cancel flow ── */
  var rows = Array.prototype.slice.call(document.querySelectorAll("#rows .aRow"));
  var BASE = rows.reduce(function (a, r) { return a + parseFloat(r.dataset.amt); }, 0);
  var current = { total: BASE, yearly: 0 };
  function animateTo(id, target, prefix) {
    var el = document.getElementById(id), from = current[id];
    current[id] = target;
    if (!canBook) { el.textContent = prefix + target.toFixed(2); return; }
    var t0 = performance.now(), dur = 380;
    function tick(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (from + (target - from) * e).toFixed(2);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    setTimeout(function () { el.textContent = prefix + target.toFixed(2); }, dur + 200);
  }
  function update() {
    var saved = rows.reduce(function (a, r) { return a + (r.classList.contains("off") ? parseFloat(r.dataset.amt) : 0); }, 0);
    animateTo("total", BASE - saved, "$");
    animateTo("yearly", saved * 12, "+$");
    var n = rows.filter(function (r) { return !r.classList.contains("off"); }).length;
    document.getElementById("billing").textContent = n + " BILLING";
    if (canBook && saved > 0) { var y = document.getElementById("yearly"); y.classList.remove("pulse"); void y.offsetWidth; y.classList.add("pulse"); }
    chipRetally();
  }
  var FLOWS = {
    "Netflix": [
      { c: "run", t: "OPENING NETFLIX \u2192 ACCOUNT \u2192 CANCEL MEMBERSHIP" },
      { c: "ok", t: "SUBMITTED \u2014 TWO TAPS, NO TRAPS" }],
    "Adobe CC": [
      { c: "run", t: "OPENING ADOBE \u2192 PLANS \u2192 MANAGE PLAN" },
      { c: "fee", t: "FEE CHECK \u00b7 TERM ENDS JUL 14 \u2014 CANCELLING TODAY COSTS $0" },
      { c: "trap", pre: "OFFER 1/3", q: "\u201c50% OFF FOR 3 MONTHS\u201d" },
      { c: "trap", pre: "OFFER 2/3", q: "\u201c2 MONTHS FREE\u201d" },
      { c: "trap", pre: "OFFER 3/3", q: "\u201cSWITCH TO $9.99 PHOTOGRAPHY\u201d" },
      { c: "ok", t: "SUBMITTED \u2014 3 OFFERS DECLINED" }],
    "Spotify": [
      { c: "run", t: "OPENING SPOTIFY \u2192 ACCOUNT \u2192 YOUR PLAN" },
      { c: "ok", t: "SUBMITTED \u2014 ONE CONFIRM SCREEN" }],
    "Disney+": [
      { c: "run", t: "OPENING ACCOUNT \u2192 SUBSCRIPTION \u2192 CANCEL" },
      { c: "trap", pre: "OFFER 1/1", q: "\u201cSTAY FOR $4.99/MO\u201d" },
      { c: "ok", t: "SUBMITTED \u2014 TRIAL ENDS JUL 12, $0" }],
    "iCloud+": [
      { c: "run", t: "SETTINGS \u2192 ICLOUD \u2192 MANAGE STORAGE" },
      { c: "ok", t: "SUBMITTED \u2014 DOWNGRADED TO 5 GB FREE" }]
  };
  var GLYPH = { run: "\u2192", fee: "!", trap: "\u2715", ok: "\u2713" };
  function reveal2(el, cls, ms) {
    var done = false;
    function go() { if (done) return; done = true; el.classList.add(cls); }
    requestAnimationFrame(function () { requestAnimationFrame(go); });
    setTimeout(go, ms || 70);
  }
  function playFlow(row, name, sw, done) {
    var lines = FLOWS[name];
    var log = document.createElement("div"); log.className = "aLog";
    var inner = document.createElement("div"), wrap = document.createElement("div");
    wrap.className = "flWrap"; inner.appendChild(wrap); log.appendChild(inner);
    row.parentNode.insertBefore(log, row.nextSibling);
    reveal2(log, "open");
    var i = 0;
    function step() {
      if (i >= lines.length) {
        done();
        setTimeout(function () {
          log.classList.remove("open");
          setTimeout(function () { log.remove(); sw.disabled = false; }, 260);
        }, 1400);
        return;
      }
      var L = lines[i++];
      var fl = document.createElement("div"); fl.className = "fl " + L.c;
      fl.innerHTML = "<b>" + GLYPH[L.c] + "</b><span>" +
        (L.c === "trap" ? L.pre + ' <span class="q">' + L.q + '<i></i></span> <span class="dcl">\u2014 DECLINED</span>' : L.t) + "</span>";
      wrap.appendChild(fl);
      reveal2(fl, "in");
      if (L.c === "trap") setTimeout(function () { fl.classList.add("dx"); }, 240);
      setTimeout(step, L.c === "trap" ? 430 : 280);
    }
    setTimeout(step, 200);
  }
  function finishCancelled(row, name) {
    row.querySelector(".aMeta").textContent = "CANCELLED \u2014 VERIFYING NEXT STATEMENT";
    live.textContent = name + " cancelled \u2014 verifying next statement";
    update();
    row._vt = setTimeout(function () {
      if (!row.classList.contains("off")) return;
      row.querySelector(".aMeta").textContent = "VERIFIED CANCELLED \u2014 STATEMENT SHOWED NO CHARGE";
      if (canBook) { row.classList.remove("vflash"); void row.offsetWidth; row.classList.add("vflash"); }
      live.textContent = name + " verified cancelled \u2014 the charge stopped";
    }, 4200);
  }
  rows.forEach(function (row) {
    var sw = row.querySelector(".sw"), name = row.querySelector(".aName").firstChild.textContent;
    sw.addEventListener("click", function () {
      if (sw.disabled) return;
      if (row.classList.contains("off")) {
        clearTimeout(row._vt);
        row.classList.remove("off", "vflash");
        sw.setAttribute("aria-checked", "true");
        row.querySelector(".aMeta").textContent = row.dataset.meta;
        live.textContent = name + " kept";
        update();
        return;
      }
      row.classList.add("off");
      sw.setAttribute("aria-checked", "false");
      if (canBook && FLOWS[name]) {
        sw.disabled = true;
        row.querySelector(".aMeta").textContent = "RUNNING THE CANCEL FLOW\u2026";
        live.textContent = "Cancelling " + name;
        playFlow(row, name, sw, function () { finishCancelled(row, name); });
      } else {
        finishCancelled(row, name);
      }
    });
  });

  /* ══════════════ the book ═════════════════════════════════════════════ */
  var chipRetally = function () {};

  if (!canBook) {
    document.documentElement.classList.remove("book");
    document.querySelectorAll("[data-goto]").forEach(function (el) {
      el.addEventListener("click", function (ev) {
        if (el.tagName === "BUTTON") { ev.preventDefault(); location.hash = el.dataset.goto; }
      });
    });
    return;
  }

  var stage = document.getElementById("stage");
  var pages = Array.prototype.slice.call(document.querySelectorAll("#stage .pg"));
  var ids = pages.map(function (p) { return p.id; });
  var LABELS = ["COVER", "THE CASE", "THE METHOD", "THE REFUSAL", "THE BILL", "QUESTIONS", "THE CLOSE"];
  var N = pages.length;
  var DUR = 760;
  var cur = Math.max(0, ids.indexOf((location.hash || "").slice(1)));
  var turning = false;

  /* split headlines into printable words */
  document.querySelectorAll(".a-words").forEach(function (h) {
    var wd = 0, nodes = Array.prototype.slice.call(h.childNodes);
    nodes.forEach(function (nd) {
      if (nd.nodeType !== 3) return;
      var frag = document.createDocumentFragment();
      nd.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        var s = document.createElement("span"); s.className = "w"; s.textContent = part;
        s.style.setProperty("--wd", (wd * 50) + "ms"); wd++;
        frag.appendChild(s);
      });
      h.replaceChild(frag, nd);
    });
  });

  function runOdo(el) {
    if (el.dataset.done) return; el.dataset.done = "1";
    var final = el.dataset.to, strips = [];
    el.textContent = "";
    final.split("").forEach(function (ch) {
      if (/\d/.test(ch)) {
        var oc = document.createElement("span"); oc.className = "oc";
        var os = document.createElement("span"); os.className = "os";
        for (var i = 0; i <= 9; i++) { var d = document.createElement("span"); d.textContent = i; os.appendChild(d); }
        oc.appendChild(os); el.appendChild(oc); strips.push({ os: os, d: +ch });
      } else { var sp = document.createElement("span"); sp.textContent = ch; el.appendChild(sp); }
    });
    var went = false;
    function roll() {
      if (went) return; went = true;
      strips.forEach(function (o, i) {
        o.os.style.transition = "transform " + (850 + i * 220) + "ms cubic-bezier(.22,.8,.26,1)";
        o.os.style.transform = "translateY(-" + o.d + "em)";
      });
    }
    requestAnimationFrame(function () { requestAnimationFrame(roll); });
    setTimeout(roll, 90);
    setTimeout(function () { el.textContent = final; }, 1900);
  }

  /* arm / disarm a sheet's entrance choreography (rAF raced vs timeout —
     pages must never stay invisible in throttled tabs) */
  function arm(page) {
    var seen = page.dataset.seen === "1";
    page.classList.toggle("instant", seen);
    var els = page.querySelectorAll(".anim");
    var armed = false;
    function go() {
      if (armed) return; armed = true;
      els.forEach(function (el) { el.classList.add("in"); });
    }
    requestAnimationFrame(function () { requestAnimationFrame(go); });
    setTimeout(go, 80);
    if (!seen) {
      page.querySelectorAll(".odo").forEach(function (o) {
        var host = o.closest(".anim");
        var ds = host ? parseFloat(host.style.getPropertyValue("--d") || "0") * 1000 : 0;
        setTimeout(function () { runOdo(o); }, 350 + ds);
      });
    }
    page.dataset.seen = "1";
  }
  function disarm(page) {
    page.classList.add("instant");
    page.querySelectorAll(".anim.in").forEach(function (el) { el.classList.remove("in"); });
  }

  /* ── chrome: pen rule, pager, edge stacks, chip, hint, hash ── */
  var rule = document.getElementById("penRule");
  var pgCur = document.getElementById("pgCur"), pgLabel = document.getElementById("pgLabel");
  var btnPrev = document.getElementById("pgPrev"), btnNext = document.getElementById("pgNext");
  var edgeR = document.getElementById("edgeR"), edgeL = document.getElementById("edgeL");
  var hint = document.getElementById("hint");
  var chip = document.getElementById("penTally"), ptAmt = chip.querySelector(".ptAmt"), ptFloat = chip.querySelector(".ptFloat");
  var chipVal = 0, chipRaf = 0, chipSnap = 0;

  function keptSum(nRows) {
    var s = 0;
    for (var i = 0; i < nRows && i < rows.length; i++) if (!rows[i].classList.contains("off")) s += parseFloat(rows[i].dataset.amt);
    return s;
  }
  function chipTween(to) {
    cancelAnimationFrame(chipRaf); clearTimeout(chipSnap);
    var from = chipVal, t0 = performance.now(), dur = 460;
    function tick(t) {
      var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      chipVal = from + (to - from) * e;
      ptAmt.textContent = "$" + chipVal.toFixed(2);
      if (p < 1) chipRaf = requestAnimationFrame(tick);
    }
    chipRaf = requestAnimationFrame(tick);
    chipSnap = setTimeout(function () { cancelAnimationFrame(chipRaf); chipVal = to; ptAmt.textContent = "$" + to.toFixed(2); }, dur + 200);
  }
  chipRetally = function () { if (cur >= 1) chipTween(keptSum(Math.min(cur, 5))); };

  function updateChrome(prevIx, fwdFloatEligible) {
    var progress = N > 1 ? cur / (N - 1) : 0;
    rule.style.transform = "scaleX(" + progress + ")";
    pgCur.textContent = String(cur + 1).padStart(2, "0");
    pgLabel.textContent = LABELS[cur] || "";
    btnPrev.disabled = cur === 0;
    btnNext.disabled = cur === N - 1;
    edgeR.style.width = ((N - 1 - cur) * 3) + "px";
    edgeL.style.width = (cur * 3) + "px";
    if (cur > 0) hint.classList.add("gone");
    chip.classList.toggle("show", cur >= 1);
    var w = chip.offsetWidth || 150;
    var x = Math.min(Math.max(progress * innerWidth - w, 10), innerWidth - w - 10);
    chip.style.transform = "translateX(" + x + "px)";
    var target = keptSum(Math.min(cur, 5));
    if (cur >= 1 && Math.abs(target - chipVal) > 0.005) {
      chipTween(target);
      chip.classList.remove("tick"); void chip.offsetWidth; chip.classList.add("tick");
      if (fwdFloatEligible && cur >= 1 && cur <= 5) {
        var r = rows[cur - 1], off = r.classList.contains("off");
        ptFloat.textContent = off ? "CANCELLED \u00b7 $0.00" : "+ $" + parseFloat(r.dataset.amt).toFixed(2);
        ptFloat.classList.toggle("ok", off);
        ptFloat.classList.remove("go"); void ptFloat.offsetWidth; ptFloat.classList.add("go");
      }
    }
    if (history.replaceState) history.replaceState(null, "", "#" + ids[cur]);
    live.textContent = "Page " + (cur + 1) + " of " + N + " \u2014 " + pages[cur].getAttribute("data-screen-label");
  }

  /* ── the turning sheet rig: two hinged segments, real back faces ── */
  function buildFlip(page) {
    var w = page.offsetWidth, h = page.offsetHeight;
    var flip = document.createElement("div"); flip.id = "flip";
    ["segIn", "segOut"].forEach(function (segName) {
      var seg = document.createElement("div"); seg.className = "seg " + segName;
      var front = document.createElement("div"); front.className = "face front";
      var back = document.createElement("div"); back.className = "face back";
      var cl = page.cloneNode(true);
      cl.className = "pg show clonePg";
      cl.removeAttribute("id");
      cl.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });
      cl.style.width = w + "px";
      cl.style.height = h + "px";
      cl.style.left = segName === "segIn" ? "0" : (-(w / 2)) + "px";
      front.appendChild(cl);
      var litF = document.createElement("div"); litF.className = "lit"; front.appendChild(litF);
      var litB = document.createElement("div"); litB.className = "lit"; back.appendChild(litB);
      seg.appendChild(front); seg.appendChild(back);
      flip.appendChild(seg);
    });
    stage.appendChild(flip);
    var st = page.querySelector(".pgIn").scrollTop;
    flip.querySelectorAll(".clonePg .pgIn").forEach(function (sc) {
      sc.style.overflow = "hidden";
      sc.scrollTop = st;
    });
    return {
      el: flip, w: w,
      segOut: flip.querySelector(".segOut"),
      lits: flip.querySelectorAll(".lit")
    };
  }
  function smootherstep(p) { return p * p * p * (p * (p * 6 - 15) + 10); }
  var RAD = Math.PI / 180;
  function clampN(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* render one frame of a turn. prog: 0 = sheet flat on the book, 1 = folded left */
  function renderTurn(ctx, prog) {
    var theta = prog * 180, arc = Math.sin(prog * Math.PI);
    ctx.rig.el.style.transform = "translateZ(" + (arc * 26) + "px) rotateY(" + (-theta) + "deg)";
    ctx.rig.segOut.style.transform = "rotateY(" + (arc * 13) + "deg)"; /* the paper flexes */
    for (var i = 0; i < ctx.rig.lits.length; i++) ctx.rig.lits[i].style.opacity = String(arc);
    ctx.veil.style.opacity = String((1 - prog) * 0.85);
    var sx = ctx.rig.w * Math.cos(Math.min(theta, 90) * RAD);
    ctx.shade.style.transform = "translateX(" + (sx - ctx.rig.w) + "px)";
    ctx.shade.style.opacity = String(arc * (theta < 100 ? 1 : Math.max(0, 1 - (theta - 100) / 40)));
    ctx.rig.el.style.opacity = theta > 150 ? String(Math.max(0, 1 - (theta - 150) / 28)) : "1";
  }

  /* set a turn up (both pages staged, rig built). Returns null if not possible. */
  function beginTurn(n) {
    if (turning || n === cur || n < 0 || n >= N) return null;
    var fwd = n > cur;
    var fromPg = pages[cur], toPg = pages[n];
    var beneath = fwd ? toPg : fromPg;           /* the page being revealed / covered */
    var turningPg = fwd ? fromPg : toPg;         /* the sheet that physically turns */
    var shade = beneath.querySelector(".shade"), veil = beneath.querySelector(".veil");
    toPg.classList.add("show");
    arm(toPg);
    if (fwd) toPg.querySelector(".pgIn").scrollTop = 0;
    var rig = null;
    try { rig = buildFlip(turningPg); } catch (e) { rig = null; }
    if (!rig) { /* emergency: instant switch, still consistent */
      turning = true;
      fromPg.classList.remove("show");
      disarm(fromPg);
      var prevIx = cur; cur = n;
      updateChrome(prevIx, false);
      setTimeout(function () { turning = false; }, 80);
      return null;
    }
    turning = true;
    turningPg.style.visibility = "hidden";
    var ctx = { n: n, prevIx: cur, fwd: fwd, fromPg: fromPg, toPg: toPg, turningPg: turningPg, shade: shade, veil: veil, rig: rig, done: false };
    renderTurn(ctx, fwd ? 0 : 1);
    return ctx;
  }

  /* tear the rig down. committed=true lands on ctx.n; false restores ctx.prevIx */
  function endTurn(ctx, committed, fwdFloat) {
    if (ctx.done) return; ctx.done = true;
    ctx.rig.el.remove();
    ctx.turningPg.style.visibility = "";
    ctx.shade.style.opacity = "0"; ctx.shade.style.transform = "";
    ctx.veil.style.opacity = "0";
    if (committed) {
      ctx.fromPg.classList.remove("show");
      disarm(ctx.fromPg);
      cur = ctx.n;
      updateChrome(ctx.prevIx, fwdFloat);
    } else {
      ctx.toPg.classList.remove("show");
      disarm(ctx.toPg);
    }
    setTimeout(function () { turning = false; }, 120);
  }

  /* animate a turn between two progress values, with a watchdog */
  function animateTurn(ctx, fromProg, toProg, dur, committed, fwdFloat) {
    var t0 = performance.now(), fin = false;
    function done() { if (fin || ctx.done) { fin = true; return; } fin = true; endTurn(ctx, committed, fwdFloat); }
    function frame(t) {
      if (fin || ctx.done) return;
      var p = Math.min(1, (t - t0) / dur);
      renderTurn(ctx, fromProg + (toProg - fromProg) * smootherstep(p));
      if (p < 1) requestAnimationFrame(frame); else done();
    }
    requestAnimationFrame(frame);
    setTimeout(done, dur + 300); /* the book can never wedge */
  }

  function goTo(n, fwdFloatEligible) {
    var ctx = beginTurn(n);
    if (!ctx) return;
    animateTurn(ctx, ctx.fwd ? 0 : 1, ctx.fwd ? 1 : 0, DUR, true, !!fwdFloatEligible && n === ctx.prevIx + 1);
  }
  function next() { goTo(cur + 1, true); }
  function prev() { goTo(cur - 1, false); }

  /* ── input: wheel (inertia-proof, respects in-page scroll) ── */
  function scroller() { return pages[cur].querySelector(".pgIn"); }
  function atBoundary(sc, dir) {
    return dir > 0 ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : sc.scrollTop <= 2;
  }
  var lastWheel = 0, gestureUsed = false, gestureEligible = false, acc = 0;
  addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var now = performance.now();
    var fresh = now - lastWheel > 240;
    lastWheel = now;
    var dir = e.deltaY > 0 ? 1 : -1;
    if (fresh) { gestureUsed = false; acc = 0; gestureEligible = atBoundary(scroller(), dir); }
    if (turning) { gestureUsed = true; e.preventDefault(); return; }
    if (gestureUsed) { e.preventDefault(); return; }
    if (!gestureEligible) return;
    e.preventDefault();
    acc += e.deltaY;
    if (Math.abs(acc) > 80) { gestureUsed = true; dir > 0 ? next() : prev(); }
  }, { passive: false });

  /* ── input: touch — horizontal swipe turns like a book; vertical swipe
        scrolls the sheet and only turns at its boundary ── */
  var tY = 0, tX = 0, tEndY = 0, tEndX = 0, tBoundNext = false, tBoundPrev = false;
  addEventListener("touchstart", function (e) {
    if (e.touches.length !== 1) return;
    tY = tEndY = e.touches[0].clientY;
    tX = tEndX = e.touches[0].clientX;
    var sc = scroller();
    tBoundNext = atBoundary(sc, 1); tBoundPrev = atBoundary(sc, -1);
  }, { passive: true });
  addEventListener("touchmove", function (e) {
    tEndY = e.touches[0].clientY; tEndX = e.touches[0].clientX;
  }, { passive: true });
  addEventListener("touchend", function () {
    if (turning) return;
    var dy = tY - tEndY, dx = tEndX - tX;
    if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      dx < 0 ? next() : prev(); /* swipe left = turn forward */
      return;
    }
    if (Math.abs(dy) < 64 || Math.abs(dy) < Math.abs(dx)) return;
    var sc = scroller(), dir = dy > 0 ? 1 : -1;
    var boundAtStart = dir > 0 ? tBoundNext : tBoundPrev;
    if (boundAtStart && atBoundary(sc, dir)) { dir > 0 ? next() : prev(); }
  }, { passive: true });

  /* ── input: keys, pager, links ── */
  addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(N - 1); }
  });
  btnNext.addEventListener("click", next);
  btnPrev.addEventListener("click", prev);
  document.querySelectorAll("[data-goto]").forEach(function (el) {
    el.addEventListener("click", function (ev) {
      ev.preventDefault();
      goTo(ids.indexOf(el.dataset.goto));
    });
  });
  addEventListener("hashchange", function () {
    var n = ids.indexOf(location.hash.slice(1));
    if (n > -1 && n !== cur) goTo(n);
  });
  addEventListener("resize", function () { updateChrome(cur, false); }, { passive: true });

  /* ── input: hold the mouse on the page's EDGE and drag — the sheet follows
        your hand; release past halfway (or flick) to commit, else it settles
        back. Right edge turns forward, left edge turns back. Middle of the
        page never drags (clicks, text and the ledger stay usable). ── */
  var drag = null;
  function edgeW() { return Math.min(110, Math.max(56, innerWidth * 0.07)); }
  function dragZoneAt(x, y) {
    var r = pages[cur].getBoundingClientRect();
    if (y < r.top || y > r.bottom) return 0;
    if (x >= r.right - edgeW() && x <= r.right + 8 && cur < N - 1) return 1;
    if (x <= r.left + edgeW() && x >= r.left - 8 && cur > 0) return -1;
    return 0;
  }
  addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return; /* touch keeps its swipe */
    if (e.button !== 0 || turning || drag) return;
    var t = e.target;
    if (t.closest && t.closest("button, a, input, textarea, select, nav, #penTally, .sw, .qq")) return;
    var sc = scroller(), scr = sc.getBoundingClientRect();
    if (e.clientX > scr.left + sc.clientWidth) return; /* the sheet's scrollbar */
    var zone = dragZoneAt(e.clientX, e.clientY);
    if (!zone) return;
    try { e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); } catch (err) { /* capture is best-effort */ }
    drag = { pending: true, zone: zone, id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastT: performance.now(), vel: 0, prog: zone === 1 ? 0 : 1, ctx: null, raf: 0, safety: 0 };
  });
  addEventListener("pointermove", function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.pending && e.buttons === 0) { endDrag(); return; } /* the pointerup was lost — release now */
    var dx = e.clientX - drag.startX, dy = e.clientY - drag.startY;
    if (drag.pending) {
      if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      if ((drag.zone === 1 && dx > 0) || (drag.zone === -1 && dx < 0)) { drag = null; return; }
      var ctx = beginTurn(cur + drag.zone);
      if (!ctx) { drag = null; return; }
      drag.pending = false; drag.ctx = ctx;
      document.documentElement.classList.add("dragging");
    }
    e.preventDefault();
    clearTimeout(drag.safety);
    drag.safety = setTimeout(endDrag, 4000); /* stale-drag failsafe */
    var now = performance.now();
    drag.vel = (e.clientX - drag.lastX) / Math.max(1, now - drag.lastT); /* px/ms */
    drag.lastX = e.clientX; drag.lastT = now;
    var span = drag.ctx.rig.w * 0.85;
    drag.prog = drag.zone === 1 ? clampN(-dx / span, 0, 1) : 1 - clampN(dx / span, 0, 1);
    if (!drag.raf) {
      drag.raf = requestAnimationFrame(function () {
        if (drag && drag.ctx) { renderTurn(drag.ctx, drag.prog); drag.raf = 0; }
      });
    }
  }, { passive: false });
  function endDrag() {
    if (!drag) return;
    var d = drag; drag = null;
    clearTimeout(d.safety);
    document.documentElement.classList.remove("dragging");
    if (d.raf) cancelAnimationFrame(d.raf);
    if (!d.ctx) return; /* plain click in the zone — nothing started */
    var flick = Math.abs(d.vel) > 0.5;
    var commit = d.zone === 1 ? (flick ? d.vel < 0 : d.prog > 0.42) : (flick ? d.vel > 0 : d.prog < 0.58);
    var toProg = d.zone === 1 ? (commit ? 1 : 0) : (commit ? 0 : 1);
    var dur = Math.max(180, Math.min(540, Math.abs(toProg - d.prog) * 640));
    animateTurn(d.ctx, d.prog, toProg, dur, commit, commit && d.zone === 1);
  }
  addEventListener("pointerup", function (e) { if (drag && e.pointerId === drag.id) endDrag(); });
  addEventListener("pointercancel", function (e) { if (drag && e.pointerId === drag.id) endDrag(); });
  addEventListener("blur", endDrag); /* released outside the window */
  /* cursor affordance: an open hand over the grabbable edges */
  var hoverRaf = 0;
  addEventListener("mousemove", function (e) {
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(function () {
      hoverRaf = 0;
      var can = !turning && !drag && dragZoneAt(e.clientX, e.clientY) !== 0 &&
                !(e.target.closest && e.target.closest("button, a, input, nav, #penTally, .sw"));
      document.documentElement.classList.toggle("canGrab", can);
    });
  }, { passive: true });

  /* ── open the book ── */
  pages[cur].classList.add("show");
  chipVal = 0;
  arm(pages[cur]);
  updateChrome(cur, false);
})();
