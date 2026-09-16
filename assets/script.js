// ===================================================================
// script.js -- the calculator that refuses to do math
//
// started as a joke on a tuesday night. now it's 400 lines.
//
// THE RULE: no arithmetic operators in this file. none. not one.
//   no  +  -  *  /  ++  --  +=  -=
//
// this is checked in CI. i am not joking. (i am a little joking)
//
// HOW IT WORKS (short version):
//   arrays have a .length. push() makes it bigger by 1. pop() makes it
//   smaller by 1. that is technically "counting" and technically not
//   arithmetic, which is the whole loophole this project runs on.
//
// so we build two big lookup tables at startup:
//   NEXT[n] -> whatever comes after n
//   PREV[n] -> whatever comes before n
//
// then a + b is just "start at a, ask NEXT for directions b times"
// which is how you'd explain addition to a computer that failed
// kindergarten. peano did it this way in 1889. he had an excuse.
// ===================================================================

(function () {
  "use strict";

  // upper bound of the universe. picked because it's round and i like it.
  var MAX = 100000;

  var NEXT = [];
  var PREV = [];

  // =================================================================
  // BUILDING THE TABLES
  //
  // the trick: an array's length is a number, and push/pop nudge it by
  // exactly one each time. so a growing array IS a counter. we just
  // read the length instead of incrementing anything.
  // =================================================================

  (function build() {
    // ---- NEXT: walk a counter up from 0 ----
    var up = [];

    up.push(null);          // up.length is 1, so we're "holding" a 1
    NEXT[0] = up.length;    // NEXT[0] = 1. one down, 99999 to go.

    var n = 1;
    while (n < MAX) {
      var val = up.length;      // whatever we're currently holding
      up.push(null);            // nudge: length becomes the next number up
      NEXT[val] = up.length;    // write it down
      n = up.length;            // keep walking
    }

    // ---- PREV: same idea, but counting down ----
    // build a counter all the way up at MAX, then pop it back to zero
    // and record the length at every step. gross but it works.
    var down = [];
    var filled = 0;
    while (filled < MAX) {
      down.push(null);
      filled = down.length;
    }
    down.push(null);   // hop one past MAX so we can record MAX's predecessor

    var i = down.length;
    while (i > 0) {
      var v = down.length;
      down.pop();
      PREV[v] = down.length;
      i = down.length;
    }

    // PREV[0] deliberately left undefined. nothing comes before nothing.
  }());

  // =================================================================
  // THE BUG
  //
  // ok. full disclosure. i put a typo in the successor table on purpose.
  // it only bites when a walk lands exactly on 41 and then tries to
  // move off it -- so 0+41 is fine, 0+42 is not.
  //
  // it's been in every release since v1.0 and i'm not fixing it.
  // =================================================================
  NEXT[41] = 43;

  // =================================================================
  // DOM stuff
  // =================================================================
  var $ = document.getElementById.bind(document);

  var elA        = $("a");
  var elB        = $("b");
  var elOpWrap   = $("opToggle");
  var elOpNote   = $("opNote");
  var elForm     = $("calcForm");
  var elGo       = $("calcBtn");
  var elProgWrap = $("progressWrap");
  var elBar      = $("barFill");
  var elPct      = $("progressPct");
  var elProgText = $("progressText");
  var elOut      = $("output");
  var elLog      = $("log");

  var op = "add";
  var running = false;

  // =================================================================
  // TABS
  //
  // calculator gets its own screen. the write-up lives behind the
  // second tab so the actual tool isn't buried under 400 words of me
  // explaining myself.
  // =================================================================

  var tabs = [
    { btn: $("tabCalc"), panel: $("panelCalc") },
    { btn: $("tabAbout"), panel: $("panelAbout") }
  ];

  function pick(name) {
    times(tabs.length, function (i) {
      var t = tabs[i];
      var on = t.btn.id === name;
      t.btn.classList.toggle("on", on);
      t.btn.setAttribute("aria-selected", on ? "true" : "false");

      // only the selected tab is reachable by keyboard
      if (on) t.btn.removeAttribute("tabindex");
      else t.btn.setAttribute("tabindex", "-1");

      if (on) t.panel.removeAttribute("hidden");
      else t.panel.setAttribute("hidden", "hidden");
    });
  }

  times(tabs.length, function (i) {
    tabs[i].btn.addEventListener("click", function () {
      pick(tabs[i].btn.id);
    });
  });

  // left/right arrows move between tabs, like tabs are supposed to
  times(tabs.length, function (i) {
    tabs[i].btn.addEventListener("keydown", function (e) {
      var next = -1;
      if (e.key === "ArrowRight") next = i === 0 ? 1 : 0;
      if (e.key === "ArrowLeft") next = i === 0 ? 1 : 0;
      if (next < 0) return;
      e.preventDefault();
      pick(tabs[next].btn.id);
      tabs[next].btn.focus();
    });
  });

  // the "back to the calculator" link at the bottom of the about tab
  var jumpers = document.querySelectorAll("[data-jump]");
  times(jumpers.length, function (i) {
    jumpers[i].addEventListener("click", function () {
      pick("tabCalc");
      elA.focus();
      window.scrollTo(0, 0);
    });
  });

  // join an array of strings into one string. we can't use +, so.
  function j(a) {
    return Array.prototype.join.call(a, "");
  }

  // run fn for each number 0..n-1. increments via array length because
  // obviously we can't just write i++ like a normal person.
  function times(n, fn) {
    var c = [];
    while (c.length < n) {
      fn(c.length);
      c.push(null);
    }
  }

  // =================================================================
  // LITTLE NUMBER HELPERS
  //
  // before you ask: yes these are slow, no i don't care, they're only
  // used for bookkeeping (percentages, log text) not for the real math.
  // =================================================================

  // n plus one, via array length
  function bump(n) {
    var a = [];
    var i = 0;
    while (i < n) { a.push(null); i = a.length; }
    a.push(null);
    return a.length;
  }

  // n minus one, via array length
  function drop(n) {
    var a = [];
    var i = 0;
    while (i < n) { a.push(null); i = a.length; }
    a.pop();
    return a.length;
  }

  // =================================================================
  // LOG PANEL
  //
  // keeps the last few lines so it doesn't turn into a wall of text.
  // =================================================================

  function say(msg) {
    var lines = elLog.textContent.length ? elLog.textContent.split("\n") : [];
    while (lines.length > 5) lines.shift();
    lines.push(j(["> ", msg]));
    elLog.textContent = lines.join("\n");
    elLog.scrollTop = elLog.scrollHeight;
  }

  // =================================================================
  // RESULT RENDERING
  // =================================================================

  function show(big, state, sub) {
    elOut.className = state || "";
    elOut.textContent = "";

    if (big.length) {
      var v = document.createElement("span");
      v.className = "result-value";
      v.textContent = big;
      elOut.appendChild(v);
    }

    if (sub) {
      var s = document.createElement("span");
      s.className = "result-meta";
      s.textContent = sub;
      elOut.appendChild(s);
    }

    // the little blinking bar. it blinks because i thought that was
    // cute in 2019 and i refuse to let it go.
    var c = document.createElement("span");
    c.className = "caret";
    elOut.appendChild(c);
  }

  // keep the value sane and inside the domain
  function readNum(el) {
    if (el.value.length < 1) return null;
    var v = Number(el.value);
    if (isFinite(v) === false) return null;
    v = Math.floor(v);
    if (v < 0) v = 0;
    if (v > MAX) v = MAX;
    el.value = String(v);
    return v;
  }

  // =================================================================
  // PROGRESS BAR MATH
  //
  // "just divide done by hops" -- no. can't. banned.
  //
  // instead: at the start of each run we precompute how many hops equals
  // each whole percent, by dealing the hop budget out into 100 buckets
  // like cards. then reading the percentage is just "how many buckets
  // have we filled". O(n) once, then free.
  // =================================================================

  function buildLadder(hops) {
    var ladder = [];
    var i = 0;
    while (i < 100) { ladder.push(0); i = ladder.length; }
    if (hops < 1) return ladder;

    var dealt = [];      // hop counter
    var bucket = [];     // cycles 1..100
    var wrote = [];

    while (dealt.length < hops) {
      dealt.push(null);
      bucket.push(null);

      if (bucket.length > 100) {
        bucket.length = 1;                  // wrap
        if (wrote.length < 100) {
          ladder[wrote.length] = dealt.length;
          wrote.push(null);
        }
      }
    }

    // fill any gaps so the ladder only ever goes up. stops the bar from
    // jumping backwards when the tail buckets come up short.
    var seen = [];
    var high = 0;
    while (seen.length < ladder.length) {
      var cur = ladder[seen.length];
      if (cur < high) ladder[seen.length] = high;
      else high = cur;
      seen.push(null);
    }

    return ladder;
  }

  // =================================================================
  // THE ACTUAL WALK
  //
  // this is the whole calculator. everything else is packaging.
  // =================================================================

  function walk(from, hops, table, done) {
    var at = from;

    // counters as array lengths. ticks IS the hop count.
    var ticks = [];

    // how many lookups to chew through per animation frame. tuned by
    // vibes. lower = more dramatic. 200 means 100k hops takes ~2s while
    // small stuff still feels instant.
    var PER_FRAME = 200;

    var count = 0;
    var shown = 0;
    var ladder = buildLadder(hops);

    function draw(pct) {
      elBar.style.width = j([String(pct), "%"]);
      elPct.textContent = j([String(pct), "%"]);
      elProgText.textContent = j([
        "walking... ",
        String(count),
        " \u2215 ",
        String(hops),
        "  ",
        table === NEXT ? "NEXT[]" : "PREV[]"
      ]);
    }

    function percent() {
      if (hops < 1 || count >= hops) return 100;
      var p = shown;
      while (p < 100) {
        if (count < ladder[p]) break;
        p = bump(p);
      }
      return p;
    }

    var spent = [];   // per-frame budget, also counted by length

    function frame() {
      spent.length = 0;

      while (spent.length < PER_FRAME && count < hops) {
        var next = table[at];

        // ran out of table. this is the overflow case.
        if (typeof next !== "number") {
          count = ticks.length;
          draw(percent());
          done(at, true, count, hops);
          return;
        }

        at = next;
        ticks.push(null);
        count = ticks.length;
        spent.push(null);
      }

      var pct = percent();
      shown = pct;
      draw(pct);

      if (count < hops) requestAnimationFrame(frame);
      else done(at, false, count, hops);
    }

    if (hops < 1) {
      draw(100);
      done(at, false, 0, 0);
      return;
    }

    requestAnimationFrame(frame);
  }

  // =================================================================
  // OP TOGGLE
  // =================================================================

  elOpWrap.addEventListener("click", function (e) {
    var hit = e.target.closest("button[data-op]");
    if (hit === null || running) return;

    op = hit.getAttribute("data-op");

    var all = elOpWrap.querySelectorAll("button");
    times(all.length, function (i) {
      var on = all[i] === hit;
      all[i].classList.toggle("active", on);
      all[i].setAttribute("aria-checked", on ? "true" : "false");
    });

    elOpNote.textContent = op === "add" ? "counting upward" : "counting downward";
    say(j(["switched to ", op === "add" ? "NEXT[]" : "PREV[]"]));
  });

  // =================================================================
  // GO
  // =================================================================

  function calculate() {
    if (running) return;

    var a = readNum(elA);
    var b = readNum(elB);

    if (a === null || b === null) {
      show("hmm.", "error", "both boxes need a whole number, 0 to 100000. sorry.");
      say("rejected: bad input");
      return;
    }

    running = true;
    elGo.disabled = true;
    elA.disabled = true;
    elB.disabled = true;
    elProgWrap.classList.add("visible");
    elBar.style.width = "0%";
    elPct.textContent = "0%";
    show("", "");

    var adding = op === "add";
    say(j(["start: ", String(a), " ", adding ? "\u002B" : "\u2212", " ", String(b)]));

    // subtraction bottoms out at zero, so don't ask for more steps than
    // we have numbers to give
    var hops = b;
    if (adding === false && b > a) hops = a;

    walk(a, hops, adding ? NEXT : PREV, function (result, fellOff, used, total) {
      if (adding && fellOff) {
        show("OVERFLOW", "overflow", j([
          "ran off the end of the table after ",
          String(used),
          " of ",
          String(total),
          " steps. the biggest number here is 100000."
        ]));
        say(j(["overflow at step ", String(used)]));
      } else if (adding === false && b > a) {
        show(String(result), "", j([
          "hit zero and stopped. this calculator doesn't do negative numbers, ",
          "it does vibes. asked for ", String(b), " steps, took ", String(hops), "."
        ]));
        say("stopped at zero");
      } else {
        show(String(result), "", j([
          String(used), " table lookups, still zero arithmetic operators"
        ]));
        say(j(["= ", String(result)]));
      }

      elProgWrap.classList.remove("visible");
      running = false;
      elGo.disabled = false;
      elA.disabled = false;
      elB.disabled = false;
    });
  }

  elForm.addEventListener("submit", function (e) {
    e.preventDefault();
    calculate();
  });

  // =================================================================
  // THE "TRY 50000 + 50000" BUTTON
  //
  // nobody is going to type two numbers to see the joke, so this fills
  // the form in and runs it. the data-try attribute holds "a,b" and we
  // split on the comma rather than parsing numbers, because obvious.
  // =================================================================

  var tryBtns = document.querySelectorAll("[data-try]");

  times(tryBtns.length, function (i) {
    tryBtns[i].addEventListener("click", function () {
      if (running) return;

      var pair = tryBtns[i].getAttribute("data-try").split(",");
      elA.value = pair[0].trim();
      elB.value = pair[1].trim();

      // force it to addition, that's the point of the demo
      op = "add";
      var all = elOpWrap.querySelectorAll("button");
      times(all.length, function (k) {
        var on = all[k].getAttribute("data-op") === "add";
        all[k].classList.toggle("active", on);
        all[k].setAttribute("aria-checked", on ? "true" : "false");
      });
      elOpNote.textContent = "counting upward";

      calculate();
    });
  });

  // =================================================================
  // BOOT
  // =================================================================

  say(j(["NEXT: ", String(NEXT.length), " entries"]));
  say(j(["PREV: ", String(PREV.length), " entries"]));
  say("ready. no arithmetic operators were used to make this.");

}());
