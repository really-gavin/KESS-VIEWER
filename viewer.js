/* Kestrel Web Viewer: shows kes:// and kess:// pages from the KESTREL-WEB GitHub repository.
   Pages are never inserted as HTML: they are parsed, filtered through a small allow-list, and rebuilt. */
(function () {
  "use strict";
  var CONFIG = { owner: "really-gavin", repo: "KESTREL-WEB", branch: "main" };
  try { var o = window.KESTREL_VIEWER_CONFIG; if (o) for (var k in o) CONFIG[k] = o[k]; } catch (e) {}
  var BASE = CONFIG.base || ("https://raw.githubusercontent.com/" + CONFIG.owner + "/" + CONFIG.repo + "/" + CONFIG.branch + "/");
  var $ = function (id) { return document.getElementById(id); };
  var pageEl = $("page"), statusEl = $("status"), addr = $("addr"), badge = $("badge");
  $("src").href = "https://github.com/" + CONFIG.owner + "/" + CONFIG.repo;

  /* ---- addresses ---- */
  function isWeb(u) { return /^kess?:\/\//.test(u); }
  function toReal(url) {                       // kes://docs/wifi -> .../sites/docs/wifi.html
    var secure = url.indexOf("kess://") === 0;
    var rest = url.slice(secure ? 7 : 6).split("#")[0];
    if (rest.indexOf("/") < 0) rest += "/index.html";
    else if (rest.slice(-1) === "/") rest += "index.html";
    else { var last = rest.slice(rest.lastIndexOf("/")); if (last.indexOf(".") < 0) rest += ".html"; }
    return BASE + (secure ? "secure/" : "sites/") + rest;
  }
  function toKes(real) {
    var s = BASE + "sites/", c = BASE + "secure/", out;
    if (real.indexOf(s) === 0) out = "kes://" + real.slice(s.length);
    else if (real.indexOf(c) === 0) out = "kess://" + real.slice(c.length);
    else return real;
    return out.replace(/\/index\.html$/, "/");
  }
  function queryText(raw) { return raw.replace(/[^A-Za-z0-9]+/g, " ").trim().split(" ").filter(Boolean).join("+"); }
  function normalize(raw) {
    raw = raw.trim();
    if (!raw) return "kes://home/";
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
    if (/[ ./]/.test(raw)) return "kes://search?q=" + queryText(raw);
    return "kes://" + raw.toLowerCase() + "/";
  }

  /* ---- fetching (a changing query string keeps GitHub's cache from serving an old "not found") ---- */
  function get(url) {
    var u = url + (url.indexOf("?") < 0 ? "?" : "&") + "t=" + Math.floor(Date.now() / 20000);
    return fetch(u, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
  }

  /* ---- safe rendering ---- */
  var ALLOW = { H1: 1, H2: 1, H3: 1, H4: 1, P: 1, UL: 1, OL: 1, LI: 1, A: 1, STRONG: 1, B: 1, EM: 1, I: 1, CODE: 1, PRE: 1, BR: 1, HR: 1, BLOCKQUOTE: 1 };
  function resolve(href, pageReal) {
    try { return new URL(href, pageReal).href; } catch (e) { return null; }
  }
  function build(node, out, pageReal) {
    for (var c = node.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3) { out.appendChild(document.createTextNode(c.nodeValue)); continue; }
      if (c.nodeType !== 1) continue;
      var tag = c.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "IFRAME" || tag === "OBJECT" || tag === "EMBED" || tag === "TEMPLATE") continue;
      if (!ALLOW[tag]) { build(c, out, pageReal); continue; }   // unknown tag: keep its text, drop the tag
      var el;
      if (tag === "A") {
        var href = c.getAttribute("href") || "", real = resolve(href, pageReal), target = real && toKes(real);
        if (target && isWeb(target)) { el = document.createElement("a"); el.setAttribute("href", "#" + target); }
        else { el = document.createElement("span"); el.className = "blocked"; el.title = "Only kes:// and kess:// pages can be opened here"; }
      } else el = document.createElement(tag.toLowerCase());
      build(c, el, pageReal);
      out.appendChild(el);
    }
  }
  function show(title, url, fill) {
    pageEl.textContent = "";
    fill(pageEl);
    document.title = (title ? title + " - " : "") + "Kestrel Web Viewer";
    addr.value = url;
    badge.style.display = url.indexOf("kess://") === 0 ? "block" : "none";
    window.scrollTo(0, 0);
  }
  function message(url, title, text, links) {
    show(title, url, function (el) {
      var h = document.createElement("h1"); h.textContent = title; el.appendChild(h);
      var p = document.createElement("p"); p.textContent = text; el.appendChild(p);
      (links || []).forEach(function (l) { var q = document.createElement("p"), a = document.createElement("a"); a.href = "#" + l[1]; a.textContent = l[0]; q.appendChild(a); el.appendChild(q); });
    });
  }

  /* ---- search (the same index the Kestrel browser uses) ---- */
  function normTerm(w) { var t = w.toLowerCase(); if (t.length > 3 && t.slice(-1) === "s" && t.slice(-2, -1) !== "s") t = t.slice(0, -1); return t; }
  var STOP = " the and for are but not you all any can had her was one our out has have this that with from they will what when your then them were been into more some such than also its who how ";
  function isStop(t) { return t.length < 2 || t.length > 24 || STOP.indexOf(" " + t + " ") >= 0; }
  function parseTerm(txt) {
    var rows = [];
    txt.split("\n").forEach(function (l) { var p = l.split("|"); if (p.length >= 4 && /^\d/.test(p[0])) rows.push({ addr: p[1], title: p[2], snip: p.slice(3).join("|") }); });
    return rows;
  }
  function search(q, url) {
    var words = q.split("+").map(normTerm).filter(function (w) { return !isStop(w); }).slice(0, 3);
    if (!words.length) return message(url, "Search the Kestrel web", "Type a few words in the address bar.", [["Home", "kes://home/"]]);
    statusEl.textContent = "Searching...";
    return Promise.all(words.map(function (w) { return get(BASE + "_search/" + encodeURIComponent(w) + ".txt").then(parseTerm, function () { return []; }); })).then(function (lists) {
      var rows = lists[0].filter(function (r) { return lists.slice(1).every(function (l) { return l.some(function (x) { return x.addr === r.addr; }); }); }).slice(0, 10);
      show("Search: " + words.join(" "), url, function (el) {
        var h = document.createElement("h1"); h.textContent = "Search results"; el.appendChild(h);
        if (!rows.length) { var p = document.createElement("p"); p.textContent = "No pages matched. Try fewer or different words."; el.appendChild(p); }
        rows.forEach(function (r) {
          var d = document.createElement("div"); d.className = "result";
          var a = document.createElement("a"); a.href = "#" + r.addr; a.textContent = r.title || r.addr;
          var ad = document.createElement("div"); ad.className = "addr"; ad.textContent = r.addr;
          var p = document.createElement("p"); p.textContent = r.snip;
          d.appendChild(a); d.appendChild(ad); d.appendChild(p); el.appendChild(d);
        });
        var home = document.createElement("p"), ha = document.createElement("a"); ha.href = "#kes://home/"; ha.textContent = "Home"; home.appendChild(ha); el.appendChild(home);
      });
    });
  }

  /* ---- loading a page ---- */
  var token = 0;
  function load(url) {
    var my = ++token;
    statusEl.textContent = "Loading " + url + " ...";
    var done = function () { if (my === token) statusEl.textContent = ""; };
    if (!isWeb(url)) {
      message(url, "Not on the Kestrel web", "This viewer only opens kes:// and kess:// pages. " + url + " is outside the Kestrel web, so it was not opened.", [["Home", "kes://home/"]]);
      return done();
    }
    if (url.indexOf("kes://search?q=") === 0) { return search(url.slice(15), url).then(done, done); }
    var real = toReal(url);
    get(real).then(function (html) {
      if (my !== token) return;
      var doc = new DOMParser().parseFromString(html, "text/html");
      var title = (doc.title || "").trim();
      show(title, toKes(real), function (el) { build(doc.body, el, real); if (!el.firstChild) el.textContent = "(This page is empty.)"; });
    }, function () {
      if (my !== token) return;
      var host = url.replace(/^kess?:\/\//, "").split("/")[0];
      message(url, "Page not found", "There is no page at " + url + " or it could not be downloaded.", [["Search for " + host, "kes://search?q=" + queryText(host)], ["Home", "kes://home/"]]);
    }).then(done, done);
  }

  /* ---- navigation: the address lives in the URL hash, so Back, Forward and sharing all work ---- */
  function current() { var h = decodeURIComponent((location.hash || "").slice(1)); return h || "kes://home/"; }
  function go(raw) { var u = normalize(raw); if ("#" + u === location.hash) load(u); else location.hash = u; }
  window.addEventListener("hashchange", function () { load(current()); });
  $("f").addEventListener("submit", function (e) { e.preventDefault(); go(addr.value); addr.blur(); });
  $("home").addEventListener("click", function () { go("kes://home/"); });
  $("back").addEventListener("click", function () { history.back(); });
  $("fwd").addEventListener("click", function () { history.forward(); });
  document.addEventListener("keydown", function (e) { if (e.key === "h" && document.activeElement !== addr && !e.ctrlKey && !e.metaKey) go("kes://home/"); });
  $("back").disabled = $("fwd").disabled = false;
  load(current());
})();
