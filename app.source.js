var AI_ENABLED = false;
const {
  useState,
  useEffect,
  useMemo,
  useRef
} = React, CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdAFEpJDVvI1L_f5GgtZjscx7IyDlbDma2nwlFqZt-UdbeoXNwDOOijfZtV6jmeDmKkpD6BDD3fZ1y/pub?gid=1511245025&single=true&output=csv", DATA_SOURCE = "api", APP_DATA_VERSION = 1, PROXY_URL = "/.netlify/functions/fringe", SITE_YEAR = new Date().getFullYear(), PLAN_KEY = "fringe-public-plan-v1", NOTES_KEY = "fringe-public-notes-v1", RATINGS_KEY = "fringe-public-ratings-v1", COMPANIONS_KEY = "fringe-public-companions-v1", LTF_KEY = "fringe-public-ltf-v1", BOOKER_KEY = "fringe-public-booker-v1", FRIENDS_KEY = "fringe-public-friends-v1", VENUE_NOTES_KEY = "fringe-public-venue-notes-v1", SHOW_TAGS_KEY = "fringe-public-show-tags-v1", HELP_URL = "https://docs.google.com/spreadsheets/d/15aHnYGBL73-n6MOf2Su1hlEG7FxReUjEyc90_AZugB0/gviz/tq?tqx=out:csv&sheet=" + encodeURIComponent("Help - Public"), C = {
  bg: "var(--bg)",
  card: "var(--card)",
  border: "var(--border)",
  txt: "var(--txt)",
  txt2: "var(--txt2)",
  txt3: "var(--txt3)",
  accent: "var(--accent)",
  pink: "var(--pink)"
}, GENRE_COLOR = {
  Theatre: "#f472b6",
  Comedy: "#ffba08",
  "Cabaret and Variety": "#a855f7",
  Music: "#22c55e",
  "Musicals and Opera": "#f97316",
  "Dance, Physical Theatre and Circus": "#3b82f6",
  "Children's Shows": "#14b8a6",
  "Spoken Word": "#eab308",
  Exhibitions: "#94a3b8",
  Events: "#64748b"
};
var THEME = "dark";
const gcolor = t => THEME === "nocolor" ? "#7c789a" : GENRE_COLOR[t] || "#64748b";
var TAG_PALETTE = ["#f472b6","#ffba08","#a855f7","#22c55e","#f97316","#3b82f6","#14b8a6","#eab308","#e11d48","#8b5cf6","#ec4899","#10b981","#d97706","#0ea5e9","#ef4444","#06b6d4","#84cc16","#f59e0b"];
var _tagColorCache = {};
var _genreColorsUsed = Object.values(GENRE_COLOR);
function tagColor(t) {
  if (!t) return "#a855f7";
  if (_tagColorCache[t]) return _tagColorCache[t];
  if (GENRE_COLOR[t]) { _tagColorCache[t] = GENRE_COLOR[t]; return GENRE_COLOR[t]; }
  var used = Object.values(_tagColorCache).concat(_genreColorsUsed);
  for (var i = 0; i < TAG_PALETTE.length; i++) {
    if (used.indexOf(TAG_PALETTE[i]) < 0) { _tagColorCache[t] = TAG_PALETTE[i]; return TAG_PALETTE[i]; }
  }
  var h = 0;
  for (var j = 0; j < t.length; j++) h = (h * 31 + t.charCodeAt(j)) & 0xffff;
  _tagColorCache[t] = TAG_PALETTE[h % TAG_PALETTE.length];
  return _tagColorCache[t];
}

function resizePhoto(file, maxW, cb) {
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      var canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

function sanitizeAIInput(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[<>]/g, "").slice(0, 2000).trim();
}

function askAI(messages, maxTokens) {
  return fetch("/.netlify/functions/fringe", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      action: "ai",
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens || 1000,
      messages: messages
    })
  }).then(function(r) { return r.json(); });
}

function poundsOf(t) {
  if (t == null) return NaN;
  const n = String(t).replace(/[^0-9.]/g, "");
  return n === "" ? NaN : parseFloat(n)
}

function priceLabel(t) {
  const n = poundsOf(t);
  return isNaN(n) ? "" : n === 0 ? "Free" : "\xA3" + (Number.isInteger(n) ? n : n.toFixed(2))
}
function showPrice_(t) {
  if (!t) return null;
  return t.priceFullMax != null ? t.priceFullMax : t.priceFull;
}
function venueLabel_(t) {
  if (!t) return "";
  return t.space ? t.space + ", " + (t.venue || "") : t.venue || "";
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(t) {
  if (!t) return "";
  const n = new Date(t + "T12:00:00");
  return isNaN(n.getTime()) ? t : n.getDate() + " " + MONTHS[n.getMonth()]
}

function dateRange(t, n) {
  return !t && !n ? "" : t === n || !n ? fmtDate(t) : fmtDate(t) + " \u2013 " + fmtDate(n)
}

function mapFilterCalOK(t, n) {
  return n === "all" || n === t
}

function ageNum(t) {
  const n = String(t || "").match(/\d+/);
  return n ? parseInt(n[0]) : -1
}

var ErrorBoundary = function() {
  function EB(props) {
    React.Component.call(this, props);
    this.state = { hasError: false, error: null };
  }
  EB.prototype = Object.create(React.Component.prototype);
  EB.prototype.constructor = EB;
  EB.getDerivedStateFromError = function(error) {
    return { hasError: true, error: error };
  };
  EB.prototype.componentDidCatch = function(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  };
  EB.prototype.render = function() {
    if (this.state.hasError) {
      return React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: C.bg,
          color: C.txt,
          padding: 32,
          textAlign: "center",
          fontFamily: "inherit"
        }
      }, React.createElement("h1", {
        style: { fontSize: 28, marginBottom: 12, color: C.accent }
      }, "Something went wrong"),
      React.createElement("p", {
        style: { fontSize: 15, color: C.txt2, marginBottom: 24, maxWidth: 420 }
      }, "An unexpected error occurred. Please reload the page to try again."),
      React.createElement("button", {
        onClick: function() { window.location.reload(); },
        style: {
          padding: "12px 32px",
          fontSize: 15,
          fontWeight: 700,
          border: "none",
          borderRadius: 10,
          cursor: "pointer",
          background: "linear-gradient(135deg, var(--pink), var(--accent))",
          color: "#fff",
          boxShadow: "0 4px 14px rgba(168,85,247,0.4)"
        }
      }, "Reload page"));
    }
    return this.props.children;
  };
  return EB;
}();
ErrorBoundary.getDerivedStateFromError = function(error) {
  return { hasError: true, error: error };
};

function loadLeaflet() {
  return window.L ? Promise.resolve(window.L) : (window._llp || (window._llp = new Promise((t, n) => {
    const o = document.createElement("link");
    o.rel = "stylesheet", o.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", document.head.appendChild(o);
    const a = document.createElement("script");
    a.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js", a.onload = () => t(window.L), a.onerror = n, document.head.appendChild(a)
  })), window._llp)
}

function parseRows(t) {
  const n = [];
  return t.forEach(o => {
    const a = (o.Code || "").trim(),
      s = (o.Title || "").trim();
    !a || !s || n.push({
      code: a,
      title: s,
      subtitle: (o.Subtitle || "").trim(),
      teaser: (o.Teaser || "").trim(),
      description: (o.Description || "").trim(),
      genre: (o.Genre || "").trim(),
      tags: (o["Genre tags"] || "").split(",").map(d => d.trim()).filter(Boolean),
      warnings: (o.Warnings || "").trim(),
      age: (o["Age category"] || "").trim(),
      artist: (o.Artist || "").trim(),
      artistType: (o["Artist type"] || "").trim(),
      country: (o.Country || "").trim(),
      space: "",
      venue: (o.Venue || "").trim(),
      venueCode: (o["Venue code"] || "").trim(),
      venueAddr: (o["Venue address"] || "").trim(),
      venuePostcode: (o["Venue postcode"] || "").trim(),
      access: (o["Venue accessibility"] || "").trim(),
      startStr: (o["Start time"] || o["Start Time"] || "").trim(),
      endStr: (o["End Time"] || o["End time"] || "").trim(),
      duration: parseInt(o.Duration) || 0,
      lat: parseFloat(String(o.Latitude || "").replace(/[^0-9.\-]/g, "")),
      lng: parseFloat(String(o.Longitude || "").replace(/[^0-9.\-]/g, "")),
      perfs: (o["Performances #"] || "").trim(),
      performers: (o["Performers #"] || "").trim(),
      priceFull: o["Lowest full price"],
      priceConc: o["Lowest concession price"],
      first: (o["First performance date"] || "").trim(),
      last: (o["Last performance date"] || "").trim(),
      website: (o.Website || "").trim()
    })
  }), n
}

function parseApiEvent(t) {
  if (!t || typeof t.title != "string" || !t.title || !t.code) return null;
  var n = t.venue || {},
    o = n.position || {},
    ps = t.performance_space || {},
    a = (t.performances || []).map(function(f) {
      var R = String(f.start || ""),
        E = String(f.end || "");
      return {
        date: R.slice(0, 10),
        start: R.slice(11, 16),
        end: E ? E.slice(11, 16) : "",
        duration: f.duration_minutes || 0,
        price: f.price == null ? null : Number(f.price),
        conc: f.concession == null ? null : Number(f.concession),
        onSale: f.on_sale === !0,
        pct: typeof f.percent_remaining == "number" ? f.percent_remaining : null,
        exhausted: f.allocation_exhausted === !0,
        availKnown: f.on_sale != null || f.allocation_exhausted != null || f.percent_remaining != null
      }
    }).filter(function(f) {
      return f.date
    }),
    s = a.map(function(f) {
      return f.date
    }).filter(Boolean).sort(),
    d = a.map(function(f) {
      return f.price
    }).filter(function(f) {
      return f != null && !isNaN(f)
    }),
    w = a.map(function(f) {
      return f.conc
    }).filter(function(f) {
      return f != null && !isNaN(f)
    }),
    p = [];
  a.forEach(function(f) {
    f.start && p.indexOf(f.start) < 0 && p.push(f.start)
  });
  var h = a[0] || {},
    b = a.some(function(f) {
      return f.availKnown
    }),
    y = null;
  if (b) {
    var g = a.filter(function(f) {
      return f.onSale
    });
    if (g.length === 0) y = "soldout";
    else {
      var S = g.map(function(f) {
          return f.pct
        }).filter(function(f) {
          return typeof f == "number"
        }),
        I = S.length ? Math.max.apply(null, S) : null;
      y = I != null && I > 0 && I < 30 ? "low" : "good"
    }
  }
  return {
    code: t.code,
    title: t.title,
    subtitle: t.sub_title || "",
    teaser: t.teaser || "",
    description: t.description || "",
    genre: t.genre || "",
    tags: String(t.genre_tags || "").split(",").map(function(f) {
      return f.trim()
    }).filter(Boolean),
    warnings: t.warnings || "",
    age: t.age_category || "",
    artist: t.artist || "",
    artistType: t.artist_type || "",
    country: t.country || "",
    space: ps.name || "",
    venue: n.name || "",
    venueCode: n.code || "",
    venueAddr: n.address || "",
    venuePostcode: n.post_code || "",
    access: n.disabled_description || "",
    lat: o.lat != null ? parseFloat(o.lat) : NaN,
    lng: o.lon != null ? parseFloat(o.lon) : NaN,
    website: t.website || "",
    availability: y,
    perfs: String(a.length),
    performers: String(t.performers_number || ""),
    performances: a,
    startStr: p.length === 1 ? p[0] : p.length > 1 ? "Various times" : "",
    endStr: p.length === 1 ? h.end : "",
    duration: h.duration || 0,
    priceFull: d.length ? Math.min.apply(null, d) : null,
    priceFullMax: d.length ? Math.max.apply(null, d) : null,
    priceConc: w.length ? Math.min.apply(null, w) : null,
    priceConcMax: w.length ? Math.max.apply(null, w) : null,
    first: s[0] || "",
    last: s[s.length - 1] || ""
  }
}

function loadAllFromApi(t) {
  var CACHE_URL = "/.netlify/functions/fringe-cache";

  // Try cached data first (fast path)
  function tryCache() {
    return fetch(CACHE_URL).then(function(r) {
      if (!r.ok) throw new Error("cache HTTP " + r.status);
      return r.json();
    }).then(function(d) {
      if (d && d.cached && Array.isArray(d.events) && d.events.length > 0) {
        t && t(d.events.length);
        return d.events;
      }
      throw new Error("cache miss");
    });
  }

  // Fallback: paginated API fetch
  function fetchFromApi() {
    var n = [],
      o = 0,
      a = 100;

    function fetchWithTimeout(url) {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, 15000);
      return fetch(url, { signal: controller.signal }).finally(function() { clearTimeout(timer); });
    }

    function fetchPage(retries) {
      if (retries === undefined) retries = 0;
      return fetchWithTimeout(PROXY_URL + "?endpoint=events&size=" + a + "&from=" + o).then(function(d) {
        if (!d.ok) throw new Error("proxy HTTP " + d.status);
        return d.json();
      }).then(function(d) {
        if (!Array.isArray(d)) throw new Error("unexpected proxy response");
        return n = n.concat(d), t && t(n.length), d.length < a || o > 2e4 ? n : (o += a, fetchPage(0));
      }).catch(function(err) {
        if (retries < 2) return fetchPage(retries + 1);
        return n;
      });
    }
    return fetchPage(0);
  }

  return tryCache().catch(function() { return fetchFromApi(); });
}

function RowsIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "4",
    rx: "1"
  }), React.createElement("rect", {
    x: "3",
    y: "10",
    width: "18",
    height: "4",
    rx: "1"
  }), React.createElement("rect", {
    x: "3",
    y: "16",
    width: "18",
    height: "4",
    rx: "1"
  }))
}

function ColsIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "15",
    height: "15",
    viewBox: "0 0 24 24",
    fill: "currentColor"
  }, React.createElement("rect", {
    x: "4",
    y: "3",
    width: "4",
    height: "18",
    rx: "1"
  }), React.createElement("rect", {
    x: "10",
    y: "3",
    width: "4",
    height: "18",
    rx: "1"
  }), React.createElement("rect", {
    x: "16",
    y: "3",
    width: "4",
    height: "18",
    rx: "1"
  }))
}

function ShareLinkIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("path", {
    d: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"
  }), React.createElement("path", {
    d: "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"
  }))
}

function ShareThisIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("circle", {
    cx: "18",
    cy: "5",
    r: "2.5"
  }), React.createElement("circle", {
    cx: "6",
    cy: "12",
    r: "2.5"
  }), React.createElement("circle", {
    cx: "18",
    cy: "19",
    r: "2.5"
  }), React.createElement("path", {
    d: "M8.2 13.3l7.6 4.4M15.8 6.3l-7.6 4.4"
  }))
}

function ChevronIcon({
  open: t
}) {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: {
      transform: t ? "none" : "rotate(-90deg)",
      transition: "transform 0.15s"
    }
  }, React.createElement("path", {
    d: "M6 9l6 6 6-6"
  }))
}

function ScheduleIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "14",
    height: "14",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("rect", {
    x: "3",
    y: "4.5",
    width: "18",
    height: "16",
    rx: "2"
  }), React.createElement("path", {
    d: "M3 9h18M8 2.5v4M16 2.5v4"
  }), React.createElement("path", {
    d: "M12 12.5v5M9.5 15h5"
  }))
}

function ThemeToggleCollapsible({
  theme: t,
  set: n
}) {
  var o = useState(!1),
    a = o[0],
    s = o[1],
    d = {
      dark: "\u{1F319}",
      light: "\u2600\uFE0F",
      nocolor: "\u25D1"
    } [t] || "\u{1F319}",
    w = function(p, h, b) {
      return React.createElement("button", {
        key: p,
        title: b,
        onClick: function() {
          n(p), s(!1)
        },
        style: {
          padding: "5px 9px",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          background: t === p ? C.accent : "transparent",
          color: t === p ? "#fff" : C.txt2
        }
      }, h)
    };
  return a ? React.createElement("div", {
    style: {
      display: "inline-flex",
      borderRadius: 8,
      border: "1px solid " + C.border,
      overflow: "hidden",
      flexShrink: 0
    }
  }, w("dark", "\u{1F319}", "Dark"), w("light", "\u2600\uFE0F", "Light"), w("nocolor", "\u25D1", "No colour")) : React.createElement("button", {
    onClick: function() {
      s(!0)
    },
    "aria-label": "Change colour theme",
    title: "Theme",
    style: {
      width: 40,
      height: 36,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 8,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontSize: 15,
      cursor: "pointer",
      flexShrink: 0
    }
  }, d)
}

function LayoutToggle({
  layout: t,
  set: n
}) {
  return React.createElement("div", {
    style: {
      display: "inline-flex",
      borderRadius: 8,
      border: "1px solid " + C.border,
      overflow: "hidden",
      flexShrink: 0
    }
  }, React.createElement("button", {
    title: "Stack",
    onClick: () => n("vertical"),
    style: {
      padding: "5px 8px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      background: t === "vertical" ? C.accent : "transparent",
      color: t === "vertical" ? "#fff" : C.txt2
    }
  }, React.createElement(RowsIcon, null)), React.createElement("button", {
    title: "Side by side",
    onClick: () => n("horizontal"),
    style: {
      padding: "5px 8px",
      border: "none",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      background: t === "horizontal" ? C.accent : "transparent",
      color: t === "horizontal" ? "#fff" : C.txt2
    }
  }, React.createElement(ColsIcon, null)))
}

function ThemeToggle({
  theme: t,
  set: n
}) {
  var o = function(a, s, d) {
    return React.createElement("button", {
      key: a,
      title: d,
      onClick: function() {
        n(a)
      },
      style: {
        padding: "5px 9px",
        border: "none",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1,
        background: t === a ? C.accent : "transparent",
        color: t === a ? "#fff" : C.txt2
      }
    }, s)
  };
  return React.createElement("div", {
    style: {
      display: "inline-flex",
      borderRadius: 8,
      border: "1px solid " + C.border,
      overflow: "hidden",
      flexShrink: 0
    }
  }, o("dark", "\u{1F319}", "Dark"), o("light", "\u2600\uFE0F", "Light"), o("nocolor", "\u25D1", "No colour"))
}

function PropRow({
  s: t,
  onOpen: n,
  onRemove: o
}) {
  return React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "9px 11px",
      borderRadius: 10,
      background: "#17142b",
      border: "1px solid " + C.border
    }
  }, React.createElement("div", {
    onClick: n,
    style: {
      flex: 1,
      minWidth: 0,
      cursor: "pointer"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, t.title), React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt2,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, venueLabel_(t), " \xB7 ", priceLabel(showPrice_(t)) || "\u2014"), (t.startStr || t.duration) && React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      marginTop: 1
    }
  }, t.startStr || "", t.endStr ? "\u2013" + t.endStr : "", t.duration ? " \xB7 " + t.duration + " min" : "")), o && React.createElement("button", {
    onClick: o,
    style: {
      background: "none",
      border: "none",
      color: C.txt3,
      fontSize: 16,
      cursor: "pointer",
      flexShrink: 0
    }
  }, "\u2715"))
}

function LinkIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "13",
    height: "13",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("path", {
    d: "M14 4h6v6"
  }), React.createElement("path", {
    d: "M20 4l-9 9"
  }), React.createElement("path", {
    d: "M17 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h6"
  }))
}


function GuideModal({ onClose }) {
  var C = window.__FRINGE_C__ || { bg: "#1a1a2e", card: "#242444", border: "#333355", txt: "#e8e2f0", txt2: "#a99fc4", txt3: "#7a6e94", accent: "#a855f7" };
  try { var cs = getComputedStyle(document.documentElement); C = { bg: cs.getPropertyValue("--bg").trim() || C.bg, card: cs.getPropertyValue("--card").trim() || C.card, border: cs.getPropertyValue("--border").trim() || C.border, txt: cs.getPropertyValue("--txt").trim() || C.txt, txt2: cs.getPropertyValue("--txt2").trim() || C.txt2, txt3: cs.getPropertyValue("--txt3").trim() || C.txt3, accent: cs.getPropertyValue("--accent").trim() || C.accent }; } catch(e) {}
  var sectionStyle = { marginBottom: 28 };
  var headingStyle = { fontSize: 18, fontWeight: 800, color: C.txt, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 };
  var paraStyle = { fontSize: 13.5, color: C.txt2, lineHeight: 1.6, marginBottom: 8 };
  var cardStyle = { background: "rgba(168,85,247,0.06)", border: "1px solid " + C.border, borderRadius: 8, padding: "10px 14px", marginBottom: 6 };
  var cardLabel = { fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 2 };
  var cardDesc = { fontSize: 12.5, color: C.txt2, lineHeight: 1.5 };
  var iconGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, margin: "8px 0" };
  var iconItemStyle = { background: "rgba(168,85,247,0.06)", border: "1px solid " + C.border, borderRadius: 6, padding: "8px 10px", fontSize: 12.5, display: "flex", alignItems: "center", gap: 7 };
  var tipStyle = { background: "rgba(168,85,247,0.08)", borderLeft: "3px solid " + C.accent, borderRadius: "0 8px 8px 0", padding: "10px 14px", margin: "10px 0", fontSize: 13, color: C.txt2 };
  var keyStyle = { display: "inline-block", padding: "1px 6px", borderRadius: 4, background: "rgba(168,85,247,0.12)", color: C.accent, fontSize: 11, fontWeight: 700 };

  function S(title, emoji, children) {
    return React.createElement("div", { style: sectionStyle },
      React.createElement("div", { style: headingStyle }, React.createElement("span", null, emoji), title),
      children);
  }
  function P(text) { return React.createElement("p", { style: paraStyle }, text); }
  function Card(label, desc) { return React.createElement("div", { style: cardStyle }, React.createElement("div", { style: cardLabel }, label), React.createElement("div", { style: cardDesc }, desc)); }
  function Icon(emoji, text) { return React.createElement("div", { style: iconItemStyle }, React.createElement("span", { style: { fontSize: 15 } }, emoji), React.createElement("span", null, text)); }
  function Tip(text) { return React.createElement("div", { style: tipStyle }, React.createElement("strong", null, "Tip: "), text); }
  function Key(t) { return React.createElement("span", { style: keyStyle }, t); }

  return React.createElement("div", {
    onClick: function(ev) { if (ev.target === ev.currentTarget) onClose(); },
    style: { position: "fixed", inset: 0, zIndex: 10001, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "20px 0" }
  }, React.createElement("div", {
    style: { background: C.card, border: "1px solid " + C.border, borderRadius: 14, width: "100%", maxWidth: 640, margin: "20px 12px", padding: "24px 20px 32px", position: "relative" }
  },
    React.createElement("button", {
      onClick: onClose,
      "aria-label": "Close guide",
      style: { position: "absolute", top: 12, right: 14, width: 32, height: 32, borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }
    }, "✕"),
    React.createElement("div", { style: { fontSize: 22, fontWeight: 900, marginBottom: 4, background: "linear-gradient(90deg,var(--pink),var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } }, "How to Guide"),
    React.createElement("p", { style: { fontSize: 13, color: C.txt3, marginBottom: 24 } }, "Everything you need to navigate the Edinburgh Fringe Planner."),

    // Getting Started
    S("Getting started", "\u{1F3AD}", React.createElement(React.Fragment, null,
      P("The Fringe Planner is a free tool for browsing every show at the Edinburgh Festival Fringe and organising your schedule. Everything is saved on your device — no account needed."),
      P("On desktop, navigation tabs run along the top. On mobile, a bottom bar shows the main tabs, with a burger menu (top-left) for the full list. A floating filter button appears in the bottom-right corner on most tabs."),
      Tip("Your data lives in your browser. If you clear your browser data, your bookings will be lost — use the backup feature to save a copy.")
    )),

    // Bookings
    S("Bookings", "\u{1F3AB}", React.createElement(React.Fragment, null,
      P("Your home base. Shows you’ve booked are grouped by date with time-of-day dividers. Each day displays a visual timeline so you can spot clashes and gaps at a glance."),
      P("Switch between Overview (high-level) and My Bookings (full cards) using the sub-view toggle."),
      React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: C.txt, margin: "12px 0 6px" } }, "Booking card icons:"),
      React.createElement("div", { style: iconGridStyle },
        Icon("⭐", "Rate the show"),
        Icon("\u{1F3AB}", "Edit booking date/time"),
        Icon("\u{1F34E}", "Add to Apple Calendar"),
        Icon("\u{1F4C5}", "Add to Google Calendar"),
        Icon("\u{1FA84}", "Toggle wishlist"),
        Icon("\u{1F310}", "Open show website"),
        Icon("✏️", "Add notes / review"),
        Icon("✕", "Delete booking")
      ),
      P("Shows whose end time has passed are automatically hidden. Tap the eye button to reveal past shows — the page scrolls to today’s date."),
      P("You can drag and drop cards within a day to reorder them. Travel-time warnings appear between shows at different venues.")
    )),

    // Browse
    S("Browse all", "\u{1F3AD}", React.createElement(React.Fragment, null,
      P("Search and explore every show in the festival programme. Use the search box or the floating filter button for detailed filtering by genre, price, date, venue, and more."),
      Card("✨ For you", "Personalised suggestions based on genres you’ve already booked. Appears as a horizontal scroll row at the top."),
      Card("\u{1F3AF} Smart picks", "Preset filters like Short runs, Free shows, Cheapest, Rarest genre, and more."),
      Tip("Use the Discover button on the Bookings toolbar to jump straight to Browse with recommendations.")
    )),

    // Calendar
    S("Calendar", "\u{1F4C5}", P("A calendar view of your booked shows laid out by date. Tap any day to see your schedule. Useful for spotting free days.")),

    // Map
    S("Map", "\u{1F5FA}️", P("Venues plotted on a map of Edinburgh. Useful for planning walking routes between shows or finding what’s on near you.")),

    // Wishlist
    S("Wishlist", "\u{1FA84}", React.createElement(React.Fragment, null,
      P("Shows you’re interested in but haven’t booked yet. Tap the wand icon on any show card to add it."),
      P("You can also create custom lists (like “Rainy day picks” or “Date night”) to group shows however you like.")
    )),

    // Planner
    S("Planner", "\u{1F9ED}", React.createElement(React.Fragment, null,
      P("Build a day out. Set your availability — which day, time window, how many shows — and it suggests an itinerary from your wishlist and the full programme."),
      P("Handy when you have a free afternoon and want to fill it without scrolling through the whole programme.")
    )),

    // Pitch a Day
    S("Pitch a Day!", "\u{1F4CB}", React.createElement(React.Fragment, null,
      P("Going with friends? Group shows into options and suggest them to the group. Create a pitch with a few show options, then share it so others can vote."),
      P("You can also create polls — list a few shows and let your group vote on which one to book.")
    )),

    // Reviews
    S("Reviews", "⭐", P("See all the ratings and notes you’ve left on shows. A personal record of your Fringe — useful during the festival and for looking back afterwards.")),

    // Stats
    S("Stats", "\u{1F4CA}", React.createElement(React.Fragment, null,
      P("A dashboard of your festival in numbers with three collapsible sections:"),
      Card("\u{1F440} At a Glance", "Total shows, hours of entertainment, average rating, top genre, and more."),
      Card("\u{1F4CD} Venue Heatmap", "See which venues you’re visiting most."),
      Card("\u{1F4B0} Spending Breakdown", "Track spending across bookings. Set a budget and see how you’re tracking."),
      P("You can share your stats summary as text for social media.")
    )),

    // Next Year
    S("Next Year", "\u{1F52E}", P("Add acts you’d love to catch again to your Next Year list. You can add notes against each one.")),

    // Filters
    S("Filters", "\u{1F39B}️", React.createElement(React.Fragment, null,
      P("The floating filter button (bottom-right) opens a panel that works across Browse, Bookings, Wishlist, and Map. Filter by search text, genre, age suitability, accessibility, venue, price range, duration, date range, time of day, country, show type, companions, tags, and sorting."),
      P("There’s a Simple Search toggle that strips the panel to just a search box. The reset button clears all filters at once.")
    )),

    // Toolbar
    S("Bookings toolbar", "\u{1F527}", React.createElement(React.Fragment, null,
      P("The row of buttons at the top of the Bookings tab:"),
      React.createElement("div", { style: iconGridStyle },
        Icon("\u{1F4E4}", "Export — download .ics or CSV"),
        Icon("\u{1F517}", "Share — share shows or today’s schedule"),
        Icon("\u{1F441}", "Show/hide past shows"),
        Icon("➕", "Add show (opens date picker)"),
        Icon("\u{1F465}", "Companions schedule"),
        Icon("✨", "Discover — jump to Browse")
      )
    )),

    // Themes
    S("Themes", "\u{1F3A8}", React.createElement(React.Fragment, null,
      Card("\u{1F319} Dark", "The default. Easy on the eyes for late-night planning."),
      Card("☀️ Light", "A lighter look."),
      Card("◑ No colour", "Greyscale view for accessibility or reduced distraction.")
    )),

    // Backup
    S("Backup & restore", "\u{1F4BE}", React.createElement(React.Fragment, null,
      P("Your data lives in your browser, so back it up. The planner saves a backup file (JSON) with all your bookings, wishlist, ratings, notes, tags, and settings. Restore from a backup at any time."),
      P("You can also paste a backup link from another device to sync data across browsers."),
      Tip("Take a backup before clearing browser data, switching devices, or at the end of each day during the festival.")
    ))
  ));
}

function HelpIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "17",
    height: "17",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), React.createElement("path", {
    d: "M9.3 9a2.7 2.7 0 0 1 5.2 1c0 1.9-2.5 2.2-2.5 3.4"
  }), React.createElement("circle", {
    cx: "12",
    cy: "17",
    r: "0.6",
    fill: "currentColor"
  }))
}

function HelpModal({
  rows: t,
  onClose: n
}) {
  return React.createElement("div", {
    onClick: n,
    onKeyDown: function(o) {
      o.key === "Escape" && n()
    },
    tabIndex: -1,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      zIndex: 1100,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      overflowY: "auto",
      padding: "30px 12px"
    }
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Help and about",
    onClick: o => o.stopPropagation(),
    style: {
      background: C.card,
      border: "1px solid " + C.border,
      borderRadius: 16,
      maxWidth: 600,
      width: "100%",
      padding: "22px 22px 26px",
      position: "relative"
    }
  }, React.createElement("button", {
    onClick: n,
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 12,
      right: 12,
      background: "none",
      border: "none",
      color: C.txt2,
      fontSize: 22,
      cursor: "pointer"
    }
  }, "\u2715"), React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 900,
      marginBottom: 14
    }
  }, "Help"), t === "loading" && React.createElement("div", {
    style: {
      color: C.txt2,
      fontSize: 14
    }
  }, "Loading\u2026"), t === "error" && React.createElement("div", {
    style: {
      color: "#fca5a5",
      fontSize: 14
    }
  }, "Couldn't load help right now \u2014 make sure the \u201CHelp - Public\u201D sheet exists and the spreadsheet is shared as \u201CAnyone with the link can view\u201D."), Array.isArray(t) && t.length === 0 && React.createElement("div", {
    style: {
      color: C.txt3,
      fontSize: 14
    }
  }, "No help content yet."), Array.isArray(t) && t.map((o, a) => {
    const s = (o[0] || "").trim(),
      d = (o.length > 1 ? o.slice(1).filter(Boolean).join("  ") : "").trim();
    return !s && !d ? null : s && d ? React.createElement("div", {
      key: a,
      style: {
        marginBottom: 14
      }
    }, React.createElement("div", {
      style: {
        fontSize: 15,
        fontWeight: 800,
        color: C.txt,
        marginBottom: 3
      }
    }, s), React.createElement("div", {
      style: {
        fontSize: 14,
        color: C.txt2,
        lineHeight: 1.55,
        whiteSpace: "pre-wrap"
      }
    }, d)) : React.createElement("div", {
      key: a,
      style: {
        fontSize: 14,
        color: C.txt2,
        lineHeight: 1.55,
        marginBottom: 10,
        whiteSpace: "pre-wrap"
      }
    }, s || d)
  })))
}
var ORG_COLORS = {
  Assembly: "#FF4D6A",
  Pleasance: "#FFBA08",
  "Gilded Balloon": "#FF6FB7",
  Underbelly: "#A855F7",
  "The Stand": "#3B82F6",
  "Just The Tonic": "#F97316",
  "Monkey Barrel": "#22C55E",
  PBH: "#14B8A6",
  theSpace: "#0EA5E9",
  Zoo: "#14B8A6",
  "C ARTS": "#E11D48",
  Summerhall: "#8B5CF6",
  Traverse: "#EC4899",
  Heroes: "#10B981",
  Greenside: "#D97706",
  "Free Festival": "#059669",
  Other: "#64748B"
};

function orgColor(t) {
  if (THEME === "nocolor") return "#7c789a";
  for (var n = (t || "").toLowerCase(), o = Object.keys(ORG_COLORS), a = 0; a < o.length; a++)
    if (o[a] !== "Other" && n.indexOf(o[a].toLowerCase()) >= 0) return ORG_COLORS[o[a]];
  return ORG_COLORS.Other
}

function timeToMin_(t) {
  var n = String(t || "").match(/(\d{1,2}):(\d{2})/);
  return n ? parseInt(n[1], 10) * 60 + parseInt(n[2], 10) : null
}

function walkMin_(t, n) {
  if (!t || !n || t.lat == null || n.lat == null || isNaN(t.lat) || isNaN(n.lat) || isNaN(t.lng) || isNaN(n.lng)) return null;
  var o = 6371e3,
    a = function(h) {
      return h * Math.PI / 180
    },
    s = a(n.lat - t.lat),
    d = a(n.lng - t.lng),
    w = Math.sin(s / 2) * Math.sin(s / 2) + Math.cos(a(t.lat)) * Math.cos(a(n.lat)) * Math.sin(d / 2) * Math.sin(d / 2),
    p = 2 * o * Math.asin(Math.min(1, Math.sqrt(w)));
  return Math.max(1, Math.round(p / 80))
}

function fmtMin_(t) {
  t = (t % 1440 + 1440) % 1440;
  var n = Math.floor(t / 60),
    o = t % 60,
    a = n < 12 ? "am" : "pm",
    s = n % 12;
  return s === 0 && (s = 12), s + (o ? ":" + ("0" + o).slice(-2) : "") + a
}

function TimedDay({
  items: t,
  onOpen: n
}) {
  var o = 64,
    a = function(v) {
      var A = timeToMin_(v);
      return A == null ? null : (A < 360 && (A += 1440), A)
    },
    s = t.map(function(v) {
      var A = a(v.startStr);
      if (A == null) return null;
      var _ = a(v.endStr);
      return (_ == null || _ <= A) && (_ = A + (v.duration || 60)), Object.assign({}, v, {
        _s: A,
        _e: _
      })
    }).filter(Boolean).sort(function(v, A) {
      return v._s - A._s
    });
  if (!s.length) return React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt3,
      padding: "12px",
      textAlign: "center"
    }
  }, "Add shows that have a start time to see the day laid out.");
  for (var d = 0; d < s.length; d++) {
    for (var w = [], p = 0; p < d; p++) s[p]._e > s[d]._s && s[d]._e > s[p]._s && w.push(s[p]._lane);
    for (var h = 0; w.indexOf(h) >= 0;) h++;
    s[d]._lane = h
  }
  var b = 1;
  s.forEach(function(v) {
    v._lane + 1 > b && (b = v._lane + 1)
  }), s.forEach(function(v) {
    v._clash = s.some(function(A) {
      return A !== v && A._e > v._s && v._e > A._s
    })
  });
  for (var y = Math.min.apply(null, s.map(function(v) {
      return v._s
    })), g = Math.max.apply(null, s.map(function(v) {
      return v._e
    })), S = y - 30, I = g + 30, f = (I - S) / 60 * o, R = Math.floor(S / 60), E = Math.ceil(I / 60), U = [], O = 0; O < s.length - 1; O++) {
    var M = s[O],
      K = s[O + 1],
      x = K._s - M._e;
    if (!(x < 0)) {
      var D = walkMin_(M, K) || 0,
        J = D + 30;
      U.push({
        top: (M._e - S) / 60 * o,
        height: J / 60 * o,
        gap: x,
        walk: D,
        need: J,
        ok: x >= J
      })
    }
  }
  return React.createElement("div", {
    style: {
      display: "flex",
      background: "rgba(255,255,255,0.02)",
      borderRadius: 12,
      border: "1px solid " + C.border,
      overflowY: "auto",
      overflowX: "hidden",
      maxHeight: "min(1200px, calc(100vh - 220px))"
    }
  }, React.createElement("div", {
    style: {
      width: 52,
      flexShrink: 0,
      position: "relative",
      height: f
    }
  }, Array.from({
    length: E - R + 1
  }).map(function(v, A) {
    var _ = R + A,
      fe = (_ * 60 - S) / 60 * o;
    return React.createElement("div", {
      key: A,
      style: {
        position: "absolute",
        top: fe - 6,
        right: 6,
        fontSize: 10,
        color: C.txt3,
        whiteSpace: "nowrap"
      }
    }, fmtMin_(_ * 60))
  })), React.createElement("div", {
    style: {
      flex: 1,
      position: "relative",
      height: f,
      minWidth: 0
    }
  }, Array.from({
    length: E - R + 1
  }).map(function(v, A) {
    var _ = R + A,
      fe = (_ * 60 - S) / 60 * o;
    return React.createElement("div", {
      key: "g" + A,
      style: {
        position: "absolute",
        top: fe,
        left: 0,
        right: 0,
        borderTop: "1px solid rgba(255,255,255,0.06)"
      }
    })
  }), U.map(function(v, A) {
    return React.createElement("div", {
      key: "t" + A,
      style: {
        position: "absolute",
        top: v.top,
        height: Math.max(15, v.height),
        left: 3,
        right: 3,
        zIndex: 1,
        borderRadius: 6,
        background: v.ok ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.22)",
        border: v.ok ? "1px dashed rgba(34,197,94,0.6)" : "1px dashed rgba(239,68,68,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        padding: "0 4px"
      }
    }, React.createElement("span", {
      style: {
        fontSize: 9,
        fontWeight: 800,
        color: v.ok ? "#22c55e" : "#fca5a5",
        textAlign: "center",
        lineHeight: 1.1
      }
    }, "\u{1F6B6} " + v.walk + "m + 30 mins buffer" + (v.ok ? "" : " \xB7 tight!")))
  }), s.map(function(v, A) {
    var _ = (v._s - S) / 60 * o,
      fe = Math.max(26, (v._e - v._s) / 60 * o - 2),
      ue = 100 / b,
      Re = orgColor(v.venue);
    return React.createElement("div", {
      key: A,
      onClick: function() {
        n && n(v)
      },
      title: venueLabel_(v) + (v.venueCode ? " (#" + v.venueCode + ")" : ""),
      style: {
        position: "absolute",
        top: _,
        height: fe,
        left: "calc(" + v._lane * ue + "% + 3px)",
        width: "calc(" + ue + "% - 6px)",
        background: v.wish ? "transparent" : Re,
        border: v.wish ? "1.5px dashed " + Re : "1.5px solid transparent",
        borderRadius: 8,
        padding: "4px 7px",
        overflow: "hidden",
        color: v.wish ? C.txt : "#fff",
        boxSizing: "border-box",
        zIndex: 2,
        opacity: v.wish ? .85 : 1,
        boxShadow: v._clash ? "0 0 0 2px #ef4444" : "none",
        cursor: n ? "pointer" : "default"
      }
    }, v.website && React.createElement("a", {
      href: v.website,
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: function(ee) {
        ee.stopPropagation()
      },
      title: "View on edfringe.com (opens in a new tab)",
      "aria-label": "View " + (v.title || "this show") + " on edfringe.com (opens in a new tab)",
      style: {
        position: "absolute",
        top: 2,
        right: 3,
        color: v.wish ? C.txt2 : "rgba(255,255,255,0.92)",
        textDecoration: "none",
        zIndex: 4,
        display: "inline-flex"
      }
    }, React.createElement(LinkIcon, null)), React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 1.2,
        wordBreak: "break-word",
        paddingRight: v.website ? 15 : 0,
        textShadow: v.wish ? "none" : "0 1px 2px rgba(0,0,0,0.35)"
      }
    }, v.title), v.artist && React.createElement("div", {
      style: {
        fontSize: 10,
        opacity: .85,
        lineHeight: 1.2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, v.artist), React.createElement("div", {
      style: {
        fontSize: 11,
        opacity: .92,
        marginTop: 1
      }
    }, fmtMin_(v._s), "\u2013", fmtMin_(v._e)), fe > 48 && React.createElement("div", {
      style: {
        fontSize: 10,
        opacity: .85,
        marginTop: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, "\u{1F4CD} ", venueLabel_(v), v.venueAddr ? ", " + v.venueAddr.split(",")[0].trim() : "", v.venuePostcode ? ", " + v.venuePostcode : ""))
  })))
}

function Tag({
  children: t,
  color: n
}) {
  return React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 8px",
      borderRadius: 6,
      background: "transparent",
      color: n || "#c084fc",
      border: "1px solid " + ((n || "#a855f7") + "66"),
      whiteSpace: "nowrap"
    }
  }, t)
}

function availInfo(t) {
  var n = t.availability;
  return t.soldOut === !0 || n === "soldout" || n === "sold_out" || n === "sold out" || n === 0 ? {
    status: "soldout",
    color: "#ef4444",
    label: "Sold out",
    soldout: !0
  } : typeof n == "number" ? n < 30 ? {
    status: "low",
    color: "#f59e0b",
    label: "Limited \u2014 running low",
    soldout: !1
  } : {
    status: "good",
    color: "#22c55e",
    label: "Good availability",
    soldout: !1
  } : n === "low" || n === "limited" ? {
    status: "low",
    color: "#f59e0b",
    label: "Limited \u2014 running low",
    soldout: !1
  } : n === "good" || n === "available" ? {
    status: "good",
    color: "#22c55e",
    label: "Good availability",
    soldout: !1
  } : {
    status: "unknown",
    color: null,
    label: "",
    soldout: !1
  }
}

function ShowTable({
  rows: t,
  limit: n,
  cardFields: o,
  sortKey: a,
  sortDir: s,
  setSortKey: d,
  setSortDir: w,
  plan: p,
  booked: h,
  toggle: b,
  onBookClick: y,
  onOpen: g
}) {
  var S = o || {},
    I = {
      padding: "8px 10px",
      fontSize: 10,
      fontWeight: 800,
      textTransform: "uppercase",
      letterSpacing: .4,
      color: C.txt3,
      textAlign: "left",
      whiteSpace: "nowrap"
    },
    f = {
      padding: "8px 10px",
      verticalAlign: "top"
    },
    R = function(x) {
      return {
        padding: "4px 7px",
        borderRadius: 7,
        border: "1px solid " + C.border,
        cursor: "pointer",
        fontSize: 12,
        fontWeight: 800,
        background: x ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)",
        color: x ? "#34d399" : C.txt2
      }
    },
    E = function(x, D) {
      a === x ? w(function(J) {
        return J === "asc" ? "desc" : "asc"
      }) : (d(x), w(D || "asc"))
    },
    U = function(x) {
      switch (a) {
        case "title":
          return (x.title || "").toLowerCase();
        case "artist":
          return (x.artist || "").toLowerCase();
        case "venue":
          return (x.venue || "").toLowerCase();
        case "genre":
          return (x.genre || "").toLowerCase();
        case "dates":
          return x.first || "9999-99-99";
        case "start": {
          var D = timeToMin_(x.startStr);
          return D ?? 99999
        }
        case "end": {
          var J = timeToMin_(x.endStr);
          return J ?? 99999
        }
        case "duration": {
          var v = Number(x.duration);
          return isNaN(v) ? 99999 : v
        }
        case "price": {
          var A = poundsOf(x.priceFull);
          return isNaN(A) ? -1 : A
        }
        case "wish":
          return p.has(x.code) ? 0 : 1;
        case "booked":
          return h[x.code] ? 0 : 1;
        default:
          return ""
      }
    },
    O = function(x) {
      if (!a) return x;
      var D = s === "desc" ? -1 : 1;
      return x.slice().sort(function(J, v) {
        var A = U(J),
          _ = U(v);
        return A < _ ? -1 * D : A > _ ? 1 * D : 0
      })
    },
    M = function(x, D, J) {
      return React.createElement("th", {
        onClick: function() {
          E(x, J)
        },
        style: Object.assign({}, I, {
          cursor: "pointer",
          userSelect: "none"
        })
      }, D, a === x ? s === "asc" ? " \u25B2" : " \u25BC" : "")
    },
    K = O(t).slice(0, n || 99999);
  return React.createElement("div", {
    style: {
      overflowX: "auto",
      WebkitOverflowScrolling: "touch",
      border: "1px solid " + C.border,
      borderRadius: 12
    }
  }, React.createElement("table", {
    style: {
      width: "100%",
      minWidth: 700,
      borderCollapse: "collapse",
      fontSize: 13,
      color: C.txt
    }
  }, React.createElement("thead", null, React.createElement("tr", {
    style: {
      background: "rgba(255,255,255,0.03)"
    }
  }, M("title", "Show"), S.artist !== !1 && M("artist", "Artist"), S.venue !== !1 && M("venue", "Venue"), S.dates !== !1 && M("dates", "Dates"), S.time !== !1 && M("start", "Start"), S.time !== !1 && M("end", "End"), S.time !== !1 && M("duration", "Duration"), S.price !== !1 && M("price", "Price", "desc"), S.genre !== !1 && M("genre", "Genre"), React.createElement("th", {
    style: Object.assign({}, I, {
      cursor: "pointer"
    })
  }, React.createElement("span", {
    onClick: function() {
      E("wish")
    },
    title: "Sort: wishlisted first",
    style: {
      cursor: "pointer",
      opacity: a === "wish" ? 1 : .6
    }
  }, "🪄"), " ", React.createElement("span", {
    onClick: function() {
      E("booked")
    },
    title: "Sort: booked first",
    style: {
      cursor: "pointer",
      opacity: a === "booked" ? 1 : .6
    }
  }, "\u{1F39F}")))), React.createElement("tbody", null, K.map(function(x) {
    var D = orgColor(x.venue);
    return React.createElement("tr", {
      key: x.code,
      style: {
        borderTop: "1px solid " + C.border
      }
    }, React.createElement("td", {
      style: Object.assign({}, f, {
        borderLeft: "3px solid " + D
      })
    }, React.createElement("span", {
      onClick: function() {
        g(x)
      },
      style: {
        fontWeight: 700,
        cursor: "pointer"
      }
    }, x.title)), S.artist !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2
      })
    }, x.artist || "\u2014"), S.venue !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2
      })
    }, venueLabel_(x), x.venueCode ? " (#" + x.venueCode + ")" : ""), S.dates !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2,
        whiteSpace: "nowrap"
      })
    }, dateRange(x.first, x.last)), S.time !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2,
        whiteSpace: "nowrap"
      })
    }, x.startStr || "\u2014"), S.time !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2,
        whiteSpace: "nowrap"
      })
    }, x.endStr || "\u2014"), S.time !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2,
        whiteSpace: "nowrap"
      })
    }, x.duration ? x.duration + "m" : "\u2014"), S.price !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        fontWeight: 700,
        whiteSpace: "nowrap"
      })
    }, priceLabel(showPrice_(x)) || "\u2014"), S.genre !== !1 && React.createElement("td", {
      style: Object.assign({}, f, {
        color: C.txt2
      })
    }, x.genre || "\u2014"), React.createElement("td", {
      style: Object.assign({}, f, {
        whiteSpace: "nowrap"
      })
    }, React.createElement("button", {
      onClick: function() {
        b(x.code)
      },
      title: "Wishlist",
      style: R(p.has(x.code))
    }, p.has(x.code) ? "\u2713" : "+", "🪄"), " ", React.createElement("button", {
      onClick: function() {
        y(x)
      },
      title: "Booked",
      style: R(!!h[x.code])
    }, h[x.code] ? "\u2713" : "+", "\u{1F39F}")))
  }))))
}

function ShowCard({
  s: t,
  inPlan: n,
  isBk: o,
  hasNote: a,
  fields: s,
  compact: _compact,
  rating: _rating,
  userTags: _userTags,
  onWish: d,
  onBook: w,
  onOpen: p
}) {
  var h = s || {},
    b = availInfo(t),
    y = {
      width: _compact ? 30 : 38,
      height: _compact ? 30 : 38,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 10,
      cursor: "pointer",
      flexShrink: 0,
      textDecoration: "none"
    };
  return React.createElement("div", {
    style: {
      position: "relative",
      background: C.card,
      border: "1px solid " + C.border,
      borderLeft: "4px solid " + orgColor(t.artist),
      borderRadius: _compact ? 10 : 14,
      padding: _compact ? "8px 10px" : "12px 14px",
      display: "flex",
      flexDirection: "row",
      gap: _compact ? 6 : 10,
      height: "100%",
      opacity: b.soldout ? .55 : 1
    }
  }, b.status !== "unknown" && React.createElement("span", {
    role: "img",
    "aria-label": b.label,
    title: b.label,
    style: {
      position: "absolute",
      top: 9,
      right: 10,
      width: 16,
      height: 16,
      borderRadius: 8,
      background: b.color,
      color: "#0b0b14",
      fontSize: 11,
      fontWeight: 900,
      lineHeight: "16px",
      textAlign: "center",
      boxShadow: "0 0 0 2px " + C.card,
      zIndex: 2
    }
  }, b.status === "soldout" ? "\u2715" : b.status === "low" ? "!" : "\u2713"), b.soldout && React.createElement("span", {
    style: {
      position: "absolute",
      top: 9,
      right: 28,
      fontSize: 9,
      fontWeight: 900,
      color: "#ef4444",
      letterSpacing: .5,
      zIndex: 2
    }
  }, "SOLD OUT"), React.createElement("div", {
    onClick: p,
    style: {
      cursor: "pointer",
      flex: "1 1 0",
      minWidth: 0,
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      fontSize: _compact ? 14 : 16,
      fontWeight: 800,
      lineHeight: 1.2,
      paddingRight: 16,
      display: "-webkit-box",
      WebkitLineClamp: _compact ? 1 : 2,
      WebkitBoxOrient: "vertical",
      overflow: "hidden"
    }
  }, t.title, a ? " \u{1F4DD}" : ""), _rating >= 1 && _rating <= 5 && React.createElement("div", {style: {fontSize: 11, color: "#FBBF24", letterSpacing: 1, marginTop: 1}}, "★".repeat(_rating)), h.artist !== !1 && t.artist && React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt2,
      marginTop: 2
    }
  }, t.artist), h.venue !== !1 && React.createElement("div", {
    style: {
      fontSize: 14,
      color: C.txt2,
      marginTop: 6
    }
  }, "\u{1F4CD} ", venueLabel_(t)), h.dates !== !1 && React.createElement("div", {
    style: {
      fontSize: 14,
      color: C.txt2,
      marginTop: 3
    }
  }, "\u{1F5D3} ", dateRange(t.first, t.last), t.age ? " \xB7 " + t.age : ""), h.time !== !1 && t.startStr && React.createElement("div", {
    style: {
      fontSize: 14,
      color: C.txt2,
      marginTop: 3
    }
  }, "\u{1F550} ", t.startStr, t.endStr ? "\u2013" + t.endStr : "", t.duration ? " \xB7 " + t.duration + " min" : ""), !_compact && h.genre !== !1 && React.createElement("div", {
    style: {
      display: "flex",
      gap: 3,
      flexWrap: "wrap",
      marginTop: 6
    }
  }, t.genre && React.createElement(Tag, {
    color: gcolor(t.genre)
  }, t.genre), t.tags.slice(0, 2).map((g, S) => React.createElement(Tag, {
    key: S,
    color: tagColor(g)
  }, g)), _userTags && _userTags.length > 0 && _userTags.slice(0, 3).map(function(tg, ti) {
    return React.createElement("span", {
      key: "ut-" + ti,
      style: { display: "inline-block", padding: "1px 7px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "rgba(99,102,241,0.18)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
    }, tg);
  })), h.price !== !1 && React.createElement("div", {
    style: { fontSize: 14, fontWeight: 800, color: priceLabel(showPrice_(t)) === "Free" ? "#34d399" : C.txt, marginTop: 6, whiteSpace: "nowrap" }
  }, priceLabel(showPrice_(t)))), React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: _compact ? 4 : 6,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 2
    }
  }, React.createElement("button", {
    onClick: d,
    "aria-label": n ? "Remove " + (t.title || "this show") + " from your wishlist" : "Add " + (t.title || "this show") + " to your wishlist",
    title: n ? "On your wishlist" : "Add to wishlist",
    style: {
      ...y,
      border: "1px solid " + (n ? "#34d399" : C.border),
      background: n ? "rgba(52,211,153,0.16)" : "transparent",
      color: n ? "#34d399" : C.txt2,
      fontSize: 17
    }
  }, n ? "🪄" : "🪄"), React.createElement("button", {
    onClick: w,
    "aria-label": o ? "Edit booking for " + (t.title || "this show") : "Mark " + (t.title || "this show") + " as booked",
    title: o ? "Booked" : "Mark as booked",
    style: {
      ...y,
      border: "1px solid " + (o ? "#f472b6" : C.border),
      background: o ? "rgba(244,114,182,0.18)" : "transparent",
      color: o ? "#f472b6" : C.txt2,
      fontSize: 15
    }
  }, "🎫"), t.website && React.createElement("a", {
    href: t.website,
    target: "_blank",
    rel: "noopener noreferrer",
    onClick: g => g.stopPropagation(),
    title: "View listing on edfringe.com (opens in a new tab)",
    "aria-label": "View " + (t.title || "this show") + " listing on edfringe.com (opens in a new tab)",
    style: {
      ...y,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2
    }
  }, React.createElement(LinkIcon, null))))
}

function fetchAdminEmail(t) {
  try {
    var n = "__fa" + Math.floor(Math.random() * 1e9);
    window[n] = function(a) {
      var s = null;
      try {
        s = a.table.rows[0].c[0].v
      } catch {}
      try {
        delete window[n]
      } catch {}
      t(s)
    };
    var o = document.createElement("script");
    o.src = "https://docs.google.com/spreadsheets/d/15aHnYGBL73-n6MOf2Su1hlEG7FxReUjEyc90_AZugB0/gviz/tq?tqx=out:json;responseHandler:" + n + "&sheet=" + encodeURIComponent("Admin email") + "&range=A1", o.onerror = function() {
      t(null)
    }, document.head.appendChild(o)
  } catch {
    t(null)
  }
}

function exportAllData() {
  try {
    for (var t = {}, n = 0; n < localStorage.length; n++) {
      var o = localStorage.key(n);
      o && o.indexOf("fringe") === 0 && (t[o] = localStorage.getItem(o))
    }
    return LZString.compressToEncodedURIComponent(JSON.stringify(t))
  } catch {
    return ""
  }
}

function importAllData(t) {
  try {
    var n = JSON.parse(LZString.decompressFromEncodedURIComponent(t));
    return !n || typeof n != "object" ? !1 : (Object.keys(n).forEach(function(o) {
      o.indexOf("fringe") === 0 && localStorage.setItem(o, n[o])
    }), !0)
  } catch {
    return !1
  }
}

function pubBackupData() {
  var t = {};
  try {
    for (var n = 0; n < localStorage.length; n++) {
      var o = localStorage.key(n);
      o && o.indexOf("fringe") === 0 && (t[o] = localStorage.getItem(o))
    }
  } catch {}
  return t
}

function downloadBackup() {
  try {
    var t = {
        app: "fringe-public",
        version: APP_DATA_VERSION,
        savedAt: new Date().toISOString(),
        data: pubBackupData()
      },
      n = new Blob([JSON.stringify(t, null, 2)], {
        type: "application/json"
      }),
      o = URL.createObjectURL(n),
      a = document.createElement("a");
    a.href = o, a.download = "fringe-planner-backup-" + new Date().toISOString().slice(0, 10) + ".json", document.body.appendChild(a), a.click(), document.body.removeChild(a), setTimeout(function() {
      URL.revokeObjectURL(o)
    }, 1500)
  } catch (s) {
    try {
      window.alert("Backup failed: " + (s && s.message || s))
    } catch {}
  }
}

function restoreBackup(t, n) {
  var o = new FileReader;
  o.onload = function() {
    try {
      var a = JSON.parse(o.result),
        s = a && a.data;
      if (!s || typeof s != "object") throw new Error("this doesn't look like a planner backup file");
      if (!window.confirm("Restore this backup? It replaces the wishlist, bookings, options and settings saved on this device.")) return;
      Object.keys(s).forEach(function(d) {
        d.indexOf("fringe") === 0 && typeof s[d] == "string" && localStorage.setItem(d, s[d])
      }), a.version && a.version < APP_DATA_VERSION && (a.version, void 0), localStorage.setItem("fringe-public-data-version", String(APP_DATA_VERSION)), n && n()
    } catch (d) {
      try {
        window.alert("Couldn't restore: " + (d && d.message || d))
      } catch {}
    }
  }, o.onerror = function() {
    try {
      window.alert("Couldn't read that file.")
    } catch {}
  }, o.readAsText(t)
}

function SyncIcon() {
  return React.createElement("svg", {
    "aria-hidden": "true",
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, React.createElement("path", {
    d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"
  }), React.createElement("polyline", {
    points: "17 8 12 3 7 8"
  }), React.createElement("line", {
    x1: "12", y1: "3", x2: "12", y2: "15"
  }))
}

function SyncModal({
  onClose: t
}) {
  var n = useState(""),
    o = n[0],
    a = n[1],
    s = window.location.origin + window.location.pathname + "#sync=" + exportAllData(),
    d = function() {
      try {
        navigator.clipboard.writeText(s)
      } catch {}
      try {
        window.prompt("Copy this link, then open it on your other device:", s)
      } catch {}
    },
    w = function() {
      var h = (o || "").trim(),
        b = h.match(/[#&]sync=([^&\s]+)/);
      if (b && (h = b[1]), h && importAllData(h)) try {
        window.location.replace(window.location.pathname)
      } catch {} else try {
        window.alert("Couldn't read that link or code.")
      } catch {}
    },
    p = {
      width: "100%",
      padding: "11px",
      borderRadius: 11,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    };
  return React.createElement("div", {
    onClick: t,
    onKeyDown: function(h) {
      h.key === "Escape" && t()
    },
    tabIndex: -1,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      zIndex: 1400,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "40px 12px",
      overflowY: "auto"
    }
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Copy my data to another device",
    onClick: function(h) {
      h.stopPropagation()
    },
    style: {
      background: C.card,
      border: "1px solid " + C.border,
      borderRadius: 16,
      maxWidth: 460,
      width: "100%",
      padding: "20px",
      position: "relative"
    }
  }, React.createElement("button", {
    onClick: t,
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 12,
      right: 12,
      background: "none",
      border: "none",
      color: C.txt2,
      fontSize: 20,
      cursor: "pointer"
    }
  }, "\u2715"), React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 900,
      marginBottom: 4
    }
  }, "Copy my data to another device"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt2,
      lineHeight: 1.5,
      marginBottom: 16
    }
  }, "One link moves everything saved on this device \u2014 wishlist, bookings, Pitch-a-Day options, availability and settings. No login."), React.createElement("button", {
    onClick: d,
    style: p
  }, React.createElement(SyncIcon, null), " Copy my transfer link"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 8
    }
  }, React.createElement("button", {
    onClick: downloadBackup,
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 11,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt,
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer"
    }
  }, "\u2B07 Download backup file"), React.createElement("label", {
    style: {
      flex: 1,
      padding: "10px",
      borderRadius: 11,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt,
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer",
      textAlign: "center",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, "\u21A5 Restore from file", React.createElement("input", {
    type: "file",
    accept: "application/json,.json",
    style: {
      display: "none"
    },
    onChange: function(h) {
      var b = h.target.files && h.target.files[0];
      b && restoreBackup(b, function() {
        window.location.reload()
      })
    }
  }))), React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.txt3,
      textAlign: "center",
      margin: "14px 0 10px"
    }
  }, "\u2014 then on the other device \u2014"), React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: .5,
      marginBottom: 6
    }
  }, "Paste your transfer link"), React.createElement("textarea", {
    value: o,
    onChange: function(h) {
      a(h.target.value)
    },
    "aria-label": "Paste your transfer link",
    placeholder: "Paste the link here (or just open it directly)\u2026",
    rows: 2,
    style: {
      width: "100%",
      boxSizing: "border-box",
      padding: "9px 11px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 13,
      outline: "none",
      resize: "vertical",
      fontFamily: "inherit"
    }
  }), React.createElement("button", {
    onClick: w,
    style: {
      width: "100%",
      marginTop: 8,
      padding: "10px",
      borderRadius: 11,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt,
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer"
    }
  }, "Import & replace this device\u2019s data")))
}

function parseHash() {
  try {
    var t = typeof window < "u" && window.location && window.location.hash || "";
    if (t.indexOf("view=") < 0) return {};
    var n = new URLSearchParams(t.replace(/^#/, "")),
      o = {};
    return n.forEach(function(a, s) {
      o[s] = a
    }), o
  } catch {
    return {}
  }
}

function weekdayOf_(t) {
  var n = new Date(t + "T12:00:00");
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][n.getDay()]
}

function fitsAvail_(t, n, o, a) {
  return !a || !a.length ? !0 : a.some(function(s) {
    return s.day === o && t >= s.from && n <= s.to
  })
}

function autoPlan_(t, n, o, existBk) {
  o = o || {};
  existBk = existBk || {};
  var a = o.priceCap != null && o.priceCap !== "" ? Number(o.priceCap) : null,
    s = o.maxPerDay ? Number(o.maxPerDay) : 99,
    d = !!o.evenings,
    w = !!o.weekends,
    p = 30,
    h = [],
    b = {};
  (t || []).forEach(function(I) {
    if (a != null && typeof I.priceFull == "number" && I.priceFull > a) {
      h.push({
        s: I,
        reason: "Over your \xA3" + a + " cap"
      });
      return
    }
    var f = [];
    if ((I.performances || []).forEach(function(R) {
        if (!(!R.date || !R.start)) {
          var E = timeToMin_(R.start);
          if (E != null) {
            var U = R.duration || I.duration || 60,
              O = E + U,
              M = weekdayOf_(R.date);
            fitsAvail_(E, O, M, n) && (I.availability != null && R.availKnown && R.onSale === !1 || f.push({
              code: I.code,
              s: I,
              date: R.date,
              sm: E,
              em: O,
              wd: M,
              evening: E >= 1020,
              weekend: M === "Sat" || M === "Sun"
            }))
          }
        }
      }), !f.length) {
      h.push({
        s: I,
        reason: n && n.length ? "No on-sale time inside your free windows" : "No usable performance time"
      });
      return
    }
    b[I.code] = f
  });
  var y = Object.keys(b).sort(function(I, f) {
      return b[I].length - b[f].length
    }),
    g = [];
  Object.keys(existBk).forEach(function(ck) {
    (existBk[ck] || []).forEach(function(bk) {
      if (bk.date && bk.start) {
        var sm = timeToMin_(bk.start), em = bk.end ? timeToMin_(bk.end) : (sm != null ? sm + 60 : null);
        if (sm != null) g.push({ code: ck, date: bk.date, sm: sm, em: em || sm + 60, s: {}, _existing: true });
      }
    });
  });
  var S = function(I) {
      var f = 0;
      return d && I.evening && (f -= 2), w && I.weekend && (f -= 2), f
    };
  return y.forEach(function(I) {
    for (var f = b[I].slice().sort(function(v, A) {
        var _ = S(v) - S(A);
        return _ || (v.date !== A.date ? v.date < A.date ? -1 : 1 : v.sm - A.sm)
      }), R = null, E = 0; E < f.length && !R; E++) {
      var U = f[E],
        O = g.filter(function(v) {
          return v.date === U.date
        });
      if (!(O.length >= s)) {
        for (var M = !0, K = 0; K < O.length; K++) {
          var x = O[K];
          if (U.sm < x.em && x.sm < U.em) {
            M = !1;
            break
          }
          var D = walkMin_(U.s, x.s) || 0,
            J = D + p;
          if (U.sm >= x.em) {
            if (U.sm - x.em < J) {
              M = !1;
              break
            }
          } else if (x.sm - U.em < J) {
            M = !1;
            break
          }
        }
        M && (R = U)
      }
    }
    R ? g.push(R) : h.push({
      s: b[I][0].s,
      reason: "Clashes / no free slot with travel time"
    })
  }), {
    assigned: g.filter(function(v) { return !v._existing; }),
    unsched: h
  }
}

function parseAvailability(t) {
  if (!t) return [];
  var n = {
      monday: "Mon",
      mon: "Mon",
      tuesday: "Tue",
      tues: "Tue",
      tue: "Tue",
      wednesday: "Wed",
      weds: "Wed",
      wed: "Wed",
      thursday: "Thu",
      thurs: "Thu",
      thur: "Thu",
      thu: "Thu",
      friday: "Fri",
      fri: "Fri",
      saturday: "Sat",
      sat: "Sat",
      sunday: "Sun",
      sun: "Sun"
    },
    o = {
      weekends: ["Sat", "Sun"],
      weekend: ["Sat", "Sun"],
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      weekday: ["Mon", "Tue", "Wed", "Thu", "Fri"],
      everyday: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      daily: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    },
    a = String(t).toLowerCase().replace(/every day|all week|any day|anytime|all days/g, "everyday").replace(/\band\b/g, ",").replace(/[;&]/g, ","),
    s = function(p) {
      if (p = p.trim(), p === "noon" || p === "midday") return 720;
      if (p === "midnight") return 0;
      var h = p.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?/);
      if (!h) return null;
      var b = parseInt(h[1], 10),
        y = h[2] ? parseInt(h[2], 10) : 0,
        g = h[3];
      return g === "pm" && b < 12 && (b += 12), g === "am" && b === 12 && (b = 0), !g && b <= 7 && (b += 12), b * 60 + y
    },
    d = function(p) {
      if (/all day|whole day|any ?time/.test(p)) return {
        from: 0,
        to: 1440
      };
      if (/morning/.test(p)) return {
        from: 360,
        to: 720
      };
      if (/afternoon/.test(p)) return {
        from: 720,
        to: 1020
      };
      if (/evening/.test(p)) return {
        from: 1020,
        to: 1320
      };
      if (/late|night/.test(p)) return {
        from: 1320,
        to: 1440
      };
      var h = p.match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?|noon|midday|midnight)\s*(?:-|to|until|til)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?|noon|midday|midnight)/);
      if (h) {
        var b = s(h[1]),
          y = s(h[2]);
        if (b != null && y != null) return {
          from: b,
          to: y <= b ? 1440 : y
        }
      }
      var g = p.match(/(?:from|after)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?|noon|midday|midnight)/);
      if (g) {
        var S = s(g[1]);
        if (S != null) return {
          from: S,
          to: 1440
        }
      }
      var I = p.match(/(?:before|until|til|by)\s*(\d{1,2}(?:[:.]\d{2})?\s*(?:am|pm)?|noon|midday|midnight)/);
      if (I) {
        var f = s(I[1]);
        if (f != null) return {
          from: 0,
          to: f
        }
      }
      return {
        from: 0,
        to: 1440
      }
    },
    w = [];
  return a.split(",").forEach(function(p) {
    if (p = p.trim(), !!p) {
      var h = [];
      if (Object.keys(o).forEach(function(y) {
          p.indexOf(y) >= 0 && o[y].forEach(function(g) {
            h.indexOf(g) < 0 && h.push(g)
          })
        }), Object.keys(n).forEach(function(y) {
          new RegExp("\\b" + y + "\\b").test(p) && h.indexOf(n[y]) < 0 && h.push(n[y])
        }), !!h.length) {
        var b = d(p);
        h.forEach(function(y) {
          w.push({
            day: y,
            from: b.from,
            to: b.to
          })
        })
      }
    }
  }), w
}

function planSet_(picked, opts, existBk) {
  opts = opts || {};
  existBk = existBk || {};
  var maxCost = (opts.maxCost != null && opts.maxCost !== "") ? Number(opts.maxCost) : Infinity;
  var maxPer = opts.maxPer ? Number(opts.maxPer) : Infinity;
  var brk = opts.breakMin ? Number(opts.breakMin) : 0;
  var walkMax = (opts.walkMax != null && opts.walkMax !== "") ? Number(opts.walkMax) : Infinity;
  var prefEve = !!opts.prefEve, prefWk = !!opts.prefWk, venClose = !!opts.venClose;
  function walkMin(a, b) {
    if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return 0;
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(x))) * 12.5);
  }
  function endOf(s) { var st = timeToMin_(s.startStr); return (timeToMin_(s.endStr) != null ? timeToMin_(s.endStr) : (st != null ? st + (Number(s.duration) || 60) : null)); }
  var byDate = {};
  (picked || []).forEach(function(s) {
    var dates = (s.performances && s.performances.length) ? s.performances.map(function(pf) { return pf.date; }) : (s.first ? [s.first] : []);
    dates.forEach(function(d) { if (d) (byDate[d] = byDate[d] || []).push(s); });
  });
  var best = null;
  Object.keys(byDate).forEach(function(d) {
    var cand = byDate[d].filter(function(s) { return timeToMin_(s.startStr) != null; }).sort(function(a, b) { return timeToMin_(a.startStr) - timeToMin_(b.startStr); });
    var sched = [], cost = 0, unfit = [];
    Object.keys(existBk).forEach(function(ck) {
      (existBk[ck] || []).forEach(function(bk) {
        if (bk.date === d && bk.start) {
          var sm = timeToMin_(bk.start), em = bk.end ? timeToMin_(bk.end) : (sm != null ? sm + 60 : null);
          if (sm != null) sched.push({ startStr: bk.start, endStr: bk.end || "", duration: (em||sm+60)-sm, title: "(existing booking)", code: ck, lat: null, lng: null, _existing: true });
        }
      });
    });
    sched.sort(function(a, b) { return (timeToMin_(a.startStr)||0) - (timeToMin_(b.startStr)||0); });
    cand.forEach(function(s) {
      var reason = null, st = timeToMin_(s.startStr), pr = Number(s.priceFull) || 0, last = sched[sched.length - 1];
      if (sched.length >= maxPer) reason = "Over your max shows/day";
      else if (last) {
        var w = walkMin(last, s), need = endOf(last) + brk + w;
        if (st < need) reason = (w > 0) ? ("Not enough time to get there (" + w + " min walk)") : ("Clashes with " + last.title);
        else if (w > walkMax) reason = "Too far to walk (" + w + " min)";
      }
      if (!reason && cost + pr > maxCost) reason = "Would exceed your day budget";
      if (reason) unfit.push({ show: s, reason: reason });
      else { sched.push(s); cost += pr; }
    });
    var score = sched.length * 100;
    if (prefEve) score += sched.filter(function(s) { return timeToMin_(s.startStr) >= 1020; }).length * 8;
    if (prefWk) { var dow = new Date(d + "T12:00:00").getDay(); if (dow === 0 || dow === 6) score += 25; }
    if (venClose && sched.length > 1) { var tw = 0; for (var i = 1; i < sched.length; i++) tw += walkMin(sched[i - 1], sched[i]); score -= tw; }
    var newSched = sched.filter(function(s) { return !s._existing; });
    if (!best || score > best.score) best = { date: d, sched: newSched, cost: cost, unfit: unfit, score: score };
  });
  if (!best) return { date: null, sched: [], cost: 0, unfit: (picked || []).map(function(s) { return { show: s, reason: "No performance date/time" }; }) };
  var inSched = {};
  best.sched.forEach(function(s) { inSched[s.code] = 1; });
  var reasoned = {};
  best.unfit.forEach(function(u) { reasoned[u.show.code] = 1; });
  (picked || []).forEach(function(s) { if (!inSched[s.code] && !reasoned[s.code]) best.unfit.push({ show: s, reason: "No performance on the chosen day" }); });
  return best;
}
function PlannerView({
  avail: t,
  setAvail: n,
  planShows: o,
  shows: cat,
  isMobile: a,
  onAddToBookings: s,
  existingBookings: existBk
}) {
  var d = useState(""),
    w = d[0],
    p = d[1],
    h = useState("Fri"),
    b = h[0],
    y = h[1],
    g = useState("18:00"),
    S = g[0],
    I = g[1],
    f = useState("23:00"),
    R = f[0],
    E = f[1],
    U = useState(""),
    O = U[0],
    M = U[1],
    K = useState("4"),
    x = K[0],
    D = K[1],
    J = useState(!1),
    v = J[0],
    A = J[1],
    _ = useState(!1),
    fe = _[0],
    ue = _[1],
    Re = useState(null),
    ee = Re[0],
    ct = Re[1],
    Qe = useState(!1),
    it = Qe[0],
    $e = Qe[1],
    OAcW = useState(false), openWish = OAcW[0], setOpenWish = OAcW[1], OAcF = useState(false), openFree = OAcF[0], setOpenFree = OAcF[1], OAcS = useState(false), openSet = OAcS[0], setOpenSet = OAcS[1],
    cyo_Q = useState(""),
    cyo_R = useState(null),
    cyo_L = useState(!1), freestyleQ = useState(""), freeQ = freestyleQ[0], setFreeQ = freestyleQ[1], freestyleR = useState(null), freeR = freestyleR[0], setFreeR = freestyleR[1], freestyleL = useState(!1), freeL = freestyleL[0], setFreeL = freestyleL[1], PKc = useState(new Set()), pickedCodes = PKc[0], setPicked = PKc[1], MCc = useState(""), maxCost = MCc[0], setMaxCost = MCc[1], MPc = useState("4"), maxPer = MPc[0], setMaxPer = MPc[1], PEc = useState(!1), prefEve = PEc[0], setPrefEve = PEc[1], PWc = useState(!1), prefWk = PWc[0], setPrefWk = PWc[1], BKc = useState("30"), breakMin = BKc[0], setBreakMin = BKc[1], VCc = useState(!1), venClose = VCc[0], setVenClose = VCc[1], WMc = useState("20"), walkMax = WMc[0], setWalkMax = WMc[1],
    PSgenres = useState(new Set()), pickGenres = PSgenres[0], setPickGenres = PSgenres[1],
    PSdurs = useState(new Set()), pickDurs = PSdurs[0], setPickDurs = PSdurs[1],
    PStods = useState(new Set()), pickTods = PStods[0], setPickTods = PStods[1],
    PSvens = useState(new Set()), pickVens = PSvens[0], setPickVens = PSvens[1],
    PQc = useState(""), pickQ = PQc[0], setPickQ = PQc[1], PLc = useState(null), plannedSet = PLc[0], setPlannedSet = PLc[1], numStyle = {width:"100%",boxSizing:"border-box",padding:"6px 8px",borderRadius:8,border:"1px solid "+C.border,background:"rgba(255,255,255,0.06)",color:C.txt,fontSize:13,colorScheme:THEME==="light"?"light":"dark"}, mkLbl = function(txt,input){return React.createElement("label",{style:{display:"flex",flexDirection:"column",gap:3,fontSize:11,color:C.txt2,fontWeight:700}},txt,input);}, mkChk = function(txt,val,onT){return React.createElement("label",{style:{display:"flex",alignItems:"center",gap:8,fontSize:13,color:C.txt2,cursor:"pointer"}},React.createElement("input",{type:"checkbox",checked:val,onChange:onT,style:{width:16,height:16,cursor:"pointer"}}),txt);}, at = function() {
      $e(!1), ct(autoPlan_(o || [], t || [], {
        priceCap: O,
        maxPerDay: x,
        evenings: v,
        weekends: fe
      }, existBk))
    },
    se = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    et = function(W) {
      !W || !W.length || n(function(te) {
        var q = (te || []).slice();
        return W.forEach(function(ae) {
          q.some(function(Y) {
            return Y.day === ae.day && Y.from === ae.from && Y.to === ae.to
          }) || q.push(ae)
        }), q
      })
    },
    X = function() {
      var W = parseAvailability(w);
      if (W.length) et(W), p("");
      else try {
        window.alert("Couldn't read that. Try e.g. all day Sat, Sun from 6pm")
      } catch {}
    },
    xe = function() {
      var W = timeToMin_(S),
        te = timeToMin_(R);
      if (!(W == null || te == null)) {
        var q = b === "Weekend" ? ["Sat", "Sun"] : b === "Weekdays" ? ["Mon", "Tue", "Wed", "Thu", "Fri"] : b === "Any" ? se : [b];
        et(q.map(function(ae) {
          return {
            day: ae,
            from: W,
            to: te <= W ? 1440 : te
          }
        }))
      }
    },
    lt = function(W) {
      return W.day + " \xB7 " + (W.from <= 0 && W.to >= 1440 ? "all day" : fmtMin_(W.from) + "\u2013" + fmtMin_(W.to))
    },
    Le = (t || []).map(function(W, te) {
      return {
        w: W,
        i: te
      }
    }).sort(function(W, te) {
      return se.indexOf(W.w.day) - se.indexOf(te.w.day) || W.w.from - te.w.from
    }),
    ye = {
      padding: "9px 11px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 14,
      colorScheme: THEME === "light" ? "light" : "dark",
      outline: "none"
    },
    tt = {
      padding: "9px 16px",
      borderRadius: 10,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer"
    };
  return React.createElement("div", null, React.createElement("p", {
    style: {
      fontSize: 16,
      color: C.txt2,
      margin: "0 0 18px",
      lineHeight: 1.5
    }
  }, "Let me know when you're free and I can help you to plan your Fringe experience for you."), React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 900,
      marginBottom: 12
    }
  }, "\u{1F5D3}\uFE0F Availability"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 16,
      flexDirection: a ? "column" : "row",
      alignItems: "stretch",
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      flex: "1 1 50%",
      minWidth: 0
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: .5,
      marginBottom: 6
    }
  }, "Tell me when you're free\u2026"), React.createElement("textarea", {
    value: w,
    onChange: function(W) {
      p(W.target.value)
    },
    "aria-label": "Describe your free times in words",
    placeholder: "e.g. free all day Fri and Sat from 6pm; Sun mornings; weekdays after 5pm",
    rows: 2,
    style: Object.assign({}, ye, {
      width: "100%",
      boxSizing: "border-box",
      resize: "vertical",
      fontFamily: "inherit"
    })
  }), React.createElement("button", {
    onClick: X,
    style: Object.assign({}, tt, {
      marginTop: 8
    })
  }, "\u2795 Add from text")), React.createElement("div", {
    style: {
      flex: "1 1 50%",
      minWidth: 0
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: .5,
      marginBottom: 6
    }
  }, "\u2026 or pick"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("select", {
    "aria-label": "Day I am free",
    value: b,
    onChange: function(W) {
      y(W.target.value)
    },
    style: ye
  }, ["Any", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Weekend", "Weekdays"].map(function(W) {
    return React.createElement("option", {
      key: W,
      value: W
    }, W === "Any" ? "Any day" : W)
  })), React.createElement("input", {
    type: "time",
    value: S,
    onChange: function(W) {
      I(W.target.value)
    },
    style: ye
  }), React.createElement("span", {
    style: {
      color: C.txt2,
      fontSize: 13
    }
  }, "to"), React.createElement("input", {
    type: "time",
    value: R,
    onChange: function(W) {
      E(W.target.value)
    },
    style: ye
  }), React.createElement("button", {
    onClick: xe,
    style: tt
  }, "📅 Add from date picker")))), React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: .5,
      marginBottom: 8
    }
  }, "Your availability (", Le.length, ")"), Le.length === 0 ? React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt3
    }
  }, "Nothing added yet.") : React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, Le.map(function(W) {
    return React.createElement("span", {
      key: W.i,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 20,
        background: "rgba(52,211,153,0.14)",
        border: "1px solid rgba(52,211,153,0.4)",
        color: "#34d399",
        fontSize: 13,
        fontWeight: 700
      }
    }, lt(W.w), React.createElement("button", {
      onClick: function() {
        n(function(te) {
          return te.filter(function(q, ae) {
            return ae !== W.i
          })
        })
      },
      style: {
        background: "none",
        border: "none",
        color: "#34d399",
        cursor: "pointer",
        fontSize: 14,
        lineHeight: 1
      }
    }, "\u2715"))
  })), Le.length > 0 && React.createElement("button", {
    onClick: function() {
      n([])
    },
    style: {
      marginTop: 12,
      padding: "6px 12px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt3,
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer"
    }
  }, "Clear all"), React.createElement("div", {style:{marginTop:22,borderTop:"1px solid "+C.border,paddingTop:16,display:"flex",flexDirection:"column",gap:12}}, React.createElement("div", {style:{border:"1px solid "+C.border,borderRadius:14,padding:16,flex:"1 1 auto"}}, React.createElement("div", {
    onClick: function() { setOpenWish(!openWish); },
    style: {
      fontSize: 16,
      fontWeight: 900,
      marginBottom: openWish?8:0,
      cursor: "pointer"
    }
  }, "\u2728 Plan from wishlist " + (openWish ? "▲" : "▼")), openWish && React.createElement("div", null, React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      marginBottom: 12
    }
  }, React.createElement("label", {
    style: {
      fontSize: 12,
      color: C.txt2,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, "Max \xA3", React.createElement("input", {
    type: "number",
    min: 0,
    value: O,
    onChange: function(W) {
      M(W.target.value)
    },
    "aria-label": "Maximum ticket price",
    placeholder: "any",
    style: Object.assign({}, ye, {
      width: 64,
      padding: "6px 8px"
    })
  })), React.createElement("label", {
    style: {
      fontSize: 12,
      color: C.txt2,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, "Max/day", React.createElement("input", {
    type: "number",
    min: 1,
    value: x,
    onChange: function(W) {
      D(W.target.value)
    },
    style: Object.assign({}, ye, {
      width: 52,
      padding: "6px 8px"
    })
  })), React.createElement("label", {
    style: {
      fontSize: 12,
      color: C.txt2,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: v,
    onChange: function(W) {
      A(W.target.checked)
    }
  }), "Prefer evenings"), React.createElement("label", {
    style: {
      fontSize: 12,
      color: C.txt2,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      cursor: "pointer"
    }
  }, React.createElement("input", {
    type: "checkbox",
    checked: fe,
    onChange: function(W) {
      ue(W.target.checked)
    }
  }), "Prefer weekends")), React.createElement("button", {
    onClick: at,
    style: Object.assign({}, tt, {
      padding: "10px 18px"
    })
  }, "\u2728 Plan my ", (o || []).length, " wishlisted show", (o || []).length === 1 ? "" : "s"), ee && function() {
    var W = {};
    ee.assigned.forEach(function(q) {
      (W[q.date] = W[q.date] || []).push(q)
    });
    var te = Object.keys(W).sort();
    return React.createElement("div", {
      style: {
        marginTop: 16
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 10
      }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        fontWeight: 800,
        color: ee.assigned.length ? "#34d399" : C.txt2
      }
    }, ee.assigned.length, " of ", ee.assigned.length + ee.unsched.length, " shows fit", t && t.length ? " your free windows" : "", "."), ee.assigned.length > 0 && (it ? React.createElement("span", {
      role: "status",
      "aria-live": "polite",
      style: {
        fontSize: 12,
        fontWeight: 800,
        color: "#34d399"
      }
    }, "\u2713 Added to Bookings") : React.createElement("button", {
      onClick: function() {
        s(ee.assigned), $e(!0)
      },
      style: {
        padding: "7px 14px",
        borderRadius: 10,
        border: "none",
        background: "rgba(96,165,250,0.22)",
        color: "#93c5fd",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer"
      }
    }, "\u2795 Add these ", ee.assigned.length, " to my Bookings"))), te.map(function(q) {
      var ae = W[q].map(function(Y) {
        return Object.assign({}, Y.s, {
          startStr: fmtMin_(Y.sm),
          endStr: fmtMin_(Y.em)
        })
      });
      return React.createElement("div", {
        key: q,
        style: {
          marginBottom: 16
        }
      }, React.createElement("div", {
        style: {
          fontSize: 13,
          fontWeight: 800,
          margin: "0 2px 6px"
        }
      }, function() {
        var Y = new Date(q + "T12:00:00");
        return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Y.getDay()] + " " + dateRange(q, q)
      }()), React.createElement(TimedDay, {
        items: ae,
        onOpen: null
      }))
    }), ee.unsched.length > 0 && React.createElement("div", {
      style: {
        marginTop: 10
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.txt3,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: .5,
        marginBottom: 6
      }
    }, "Couldn't fit (", ee.unsched.length, ")"), ee.unsched.map(function(q, ae) {
      return React.createElement("div", {
        key: ae,
        style: {
          fontSize: 13,
          color: C.txt2,
          marginBottom: 3
        }
      }, "\u2022 ", React.createElement("b", {
        style: {
          color: C.txt
        }
      }, q.s.title), " \u2014 ", q.reason)
    })), React.createElement("div", {
      style: {
        marginTop: 10,
        fontSize: 11,
        color: C.txt3
      }
    }, "These are suggested times from your wishlist \u2014 tap a block to view the show or open its edfringe listing, then book on edfringe.com."))
  }())),
  React.createElement("div", {style:{height:16}}),
  AI_ENABLED && React.createElement("div", {style: {border: "1px solid " + C.border, borderRadius: 14, padding: 16, flex: "1 1 auto"}},
      React.createElement("div", {onClick:function(){setOpenFree(!openFree);},style:{fontSize:16,fontWeight:900,marginBottom:openFree?6:0,cursor:"pointer"}}, "💬 Freestyle planning " + (openFree ? "▲" : "▼")),
      openFree && React.createElement("div", null, React.createElement("p", {style: {fontSize: 13, color: C.txt2, margin: "0 0 10px", lineHeight: 1.5}}, "Describe what you’re looking for and I’ll find shows that match."),
      React.createElement("textarea", {value: freeQ, onChange: function(e) { setFreeQ(e.target.value); }, placeholder: "e.g. I want 3 comedy shows on Saturday afternoon under £15 each", rows: 3, style: {width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 13, lineHeight: 1.5, outline: "none", resize: "vertical", fontFamily: "inherit"}}),
      React.createElement("button", {onClick: function() { if (!freeQ.trim()) return; setFreeL(true); setFreeR(null); var sd = (cat || []).map(function(s) { return {title: s.title, venue: s.venue, genre: s.genre, price: s.priceFull, duration: s.duration, start: s.startStr, dates: s.first + " to " + s.last}; }); askAI([{role: "user", content: "You are an Edinburgh Fringe planner. Shows:\n" + JSON.stringify(sd.slice(0, 200)) + "\nUser wants: " + sanitizeAIInput(freeQ) + "\nRespond ONLY with JSON array: [{title:\"Name\",venue:\"V\",time:\"HH:MM\",price:\"\u00a3X\",reason:\"Why\"},...]. Max 8."}], 1500).then(function(d) { try { var t2 = (d.content || []).map(function(b) { return b.text || ""; }).join(""); t2 = t2.replace(/```json|```/g, "").trim(); setFreeR(JSON.parse(t2)); } catch(e2) { setFreeR([{title: "Error", reason: "Parse error"}]); } }).catch(function() { setFreeR([{title: "Error", reason: "Request failed"}]); }).finally(function() { setFreeL(false); }); }, disabled: freeL || !freeQ.trim(), style: {marginTop: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: freeQ.trim() ? C.accent : "rgba(168,85,247,0.3)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: freeQ.trim() ? "pointer" : "not-allowed"}}, freeL ? "Searching…" : "🔍 Find shows"),
      freeR && React.createElement("div", {style: {marginTop: 14}}, freeR.map(function(m, idx) { var CL = ["#F472B6","#34D399","#60A5FA","#FBBF24","#A78BFA","#FB923C","#2DD4BF","#F87171"]; return React.createElement("div", {key: idx, style: {padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", marginBottom: 8}}, React.createElement("div", {style: {fontSize: 15, fontWeight: 800, color: CL[idx % CL.length]}}, m.title), React.createElement("div", {style: {fontSize: 12, color: C.txt2, marginTop: 3}}, [m.venue, m.time, m.price].filter(Boolean).join(" · ")), m.reason && React.createElement("div", {style: {fontSize: 12, color: C.txt3, marginTop: 4, fontStyle: "italic"}}, m.reason)); })))),
  React.createElement("div", {style:{height:16}}),
  React.createElement("div", {style:{border:"1px solid "+C.border,borderRadius:14,padding:16,flex:"1 1 auto"}}, React.createElement("div", {onClick:function(){setOpenSet(!openSet);},style:{fontSize:16,fontWeight:900,marginBottom:openSet?8:0,cursor:"pointer"}}, "🎯 Plan a set of shows " + (openSet ? "▲" : "▼")), openSet && React.createElement("div", null, React.createElement("div", {style:{fontSize:12,color:C.txt2,marginBottom:10,lineHeight:1.5}}, "Pick shows from the full programme, set your limits, and I’ll build the best day using your availability."), React.createElement("input", {value:pickQ, onChange:function(e){setPickQ(e.target.value);}, placeholder:"Search shows to add…", "aria-label":"Search shows to add", style:{width:"100%",boxSizing:"border-box",padding:"8px 10px",borderRadius:10,border:"1px solid "+C.border,background:"rgba(255,255,255,0.06)",color:C.txt,fontSize:13,outline:"none",marginBottom:6}}),
    function() {
      var allG = {}, allV = {}, durOpts = ["Under 30 min","30-60 min","60-90 min","90+ min"], todOpts = ["Morning (before 12)","Afternoon (12-17)","Evening (17-21)","Late (after 21)"];
      (cat||[]).forEach(function(sh) { if (sh.genre) allG[sh.genre] = 1; if (sh.venue) allV[venueLabel_(sh)] = 1; });
      var gList = Object.keys(allG).sort(), vList = Object.keys(allV).sort();
      var chipStyle = function(active) { return {display:"inline-flex",alignItems:"center",gap:4,padding:"4px 10px",borderRadius:16,border:"1px solid "+(active?C.accent:C.border),background:active?"rgba(168,85,247,0.15)":"transparent",color:active?"#c084fc":C.txt2,fontSize:11,fontWeight:700,cursor:"pointer"}; };
      var toggleSet = function(setter, val) { setter(function(prev) { var s2 = new Set(prev); s2.has(val) ? s2.delete(val) : s2.add(val); return s2; }); };
      var sectStyle = {marginBottom:8};
      var lblStyle = {fontSize:11,fontWeight:800,color:C.txt3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:4};
      return React.createElement("div", {style:{marginBottom:10}},
        React.createElement("div", {style:sectStyle},
          React.createElement("div", {style:lblStyle}, "Genres"),
          React.createElement("div", {style:{display:"flex",gap:4,flexWrap:"wrap"}},
            gList.map(function(g) { return React.createElement("span", {key:g, onClick:function(){toggleSet(setPickGenres,g);}, style:chipStyle(pickGenres.has(g))}, g); }))),
        React.createElement("div", {style:sectStyle},
          React.createElement("div", {style:lblStyle}, "Show length"),
          React.createElement("div", {style:{display:"flex",gap:4,flexWrap:"wrap"}},
            durOpts.map(function(d) { return React.createElement("span", {key:d, onClick:function(){toggleSet(setPickDurs,d);}, style:chipStyle(pickDurs.has(d))}, d); }))),
        React.createElement("div", {style:sectStyle},
          React.createElement("div", {style:lblStyle}, "Show times"),
          React.createElement("div", {style:{display:"flex",gap:4,flexWrap:"wrap"}},
            todOpts.map(function(t) { return React.createElement("span", {key:t, onClick:function(){toggleSet(setPickTods,t);}, style:chipStyle(pickTods.has(t))}, t); }))),
        React.createElement("div", {style:sectStyle},
          React.createElement("div", {style:lblStyle}, "Venues"),
          React.createElement("div", {style:{display:"flex",gap:4,flexWrap:"wrap",maxHeight:100,overflowY:"auto"}},
            vList.map(function(v) { return React.createElement("span", {key:v, onClick:function(){toggleSet(setPickVens,v);}, style:chipStyle(pickVens.has(v))}, v); }))),
        (pickGenres.size||pickDurs.size||pickTods.size||pickVens.size) ? React.createElement("button", {onClick:function(){setPickGenres(new Set());setPickDurs(new Set());setPickTods(new Set());setPickVens(new Set());}, style:{fontSize:11,color:C.txt3,background:"transparent",border:"1px solid "+C.border,borderRadius:8,padding:"3px 10px",cursor:"pointer",marginTop:4}}, "Clear filters") : null);
    }(),
    function() {
      function durMatch(sh) {
        if (!pickDurs.size) return true;
        var d = Number(sh.duration) || 0;
        if (pickDurs.has("Under 30 min") && d > 0 && d < 30) return true;
        if (pickDurs.has("30-60 min") && d >= 30 && d <= 60) return true;
        if (pickDurs.has("60-90 min") && d > 60 && d <= 90) return true;
        if (pickDurs.has("90+ min") && d > 90) return true;
        return false;
      }
      function todMatch(sh) {
        if (!pickTods.size) return true;
        var m = timeToMin_(sh.startStr);
        if (m == null) return true;
        if (pickTods.has("Morning (before 12)") && m < 720) return true;
        if (pickTods.has("Afternoon (12-17)") && m >= 720 && m < 1020) return true;
        if (pickTods.has("Evening (17-21)") && m >= 1020 && m < 1260) return true;
        if (pickTods.has("Late (after 21)") && m >= 1260) return true;
        return false;
      }
      var hasFilters = pickGenres.size || pickDurs.size || pickTods.size || pickVens.size;
      var results = (cat||[]).filter(function(sh) {
        if (pickGenres.size && !pickGenres.has(sh.genre)) return false;
        if (!durMatch(sh)) return false;
        if (!todMatch(sh)) return false;
        if (pickVens.size && !pickVens.has(venueLabel_(sh))) return false;
        if (pickQ.trim()) {
          var q = pickQ.trim().toLowerCase();
          if ((sh.title||"").toLowerCase().indexOf(q) < 0 && (sh.venue||"").toLowerCase().indexOf(q) < 0 && (sh.artist||"").toLowerCase().indexOf(q) < 0 && (sh.space||"").toLowerCase().indexOf(q) < 0) return false;
        }
        return true;
      });
      // Deduplicate by show code
      var seen = {};
      results = results.filter(function(sh) { if (seen[sh.code]) return false; seen[sh.code] = true; return true; });
      if (!pickQ.trim() && !hasFilters) return null;
      return React.createElement("div", {style:{maxHeight:200,overflowY:"auto",border:"1px solid "+C.border,borderRadius:10,marginBottom:8}},
        results.length === 0 ? React.createElement("div", {style:{padding:12,fontSize:12,color:C.txt3,textAlign:"center"}}, "No matching shows") :
        results.slice(0,60).map(function(sh) {
          var inP = pickedCodes.has(sh.code);
          return React.createElement("div", {key:sh.code, onClick:function(){setPicked(function(pc){var s2=new Set(pc); s2.has(sh.code)?s2.delete(sh.code):s2.add(sh.code); return s2;});}, style:{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderBottom:"1px solid "+C.border,cursor:"pointer",background:inP?"rgba(52,211,153,0.12)":"transparent"}},
            React.createElement("span", {style:{width:14,textAlign:"center",color:inP?"#34d399":C.accent,fontWeight:800,flexShrink:0}}, inP?"✓":"+"),
            React.createElement("span", {style:{flex:1,minWidth:0,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, (sh.title||"")),
            React.createElement("span", {style:{fontSize:10,color:C.txt3,flexShrink:0,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, venueLabel_(sh)),
            sh.priceFull?React.createElement("span", {style:{fontSize:12,fontWeight:800,flexShrink:0}}, (typeof sh.priceFull==="number"?"£"+sh.priceFull:sh.priceFull)):null);
        }));
    }(), pickedCodes.size>0 && React.createElement("div", {style:{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}, Array.from(pickedCodes).map(function(cd){var sh=(cat||[]).find(function(x){return x.code===cd;}); return React.createElement("span", {key:cd, style:{display:"inline-flex",alignItems:"center",gap:5,background:"rgba(168,85,247,0.15)",color:"#c084fc",padding:"3px 6px 3px 9px",borderRadius:14,fontSize:11,fontWeight:700}}, (sh&&sh.title)||cd, React.createElement("span", {onClick:function(){setPicked(function(pc){var s2=new Set(pc);s2.delete(cd);return s2;});}, style:{cursor:"pointer"}}, "✕"));})), React.createElement("div", {style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}, mkLbl("Max day cost £", React.createElement("input", {type:"number",min:0,value:maxCost,onChange:function(e){setMaxCost(e.target.value);},placeholder:"any",style:numStyle})), mkLbl("Max shows/day", React.createElement("input", {type:"number",min:1,value:maxPer,onChange:function(e){setMaxPer(e.target.value);},style:numStyle})), mkLbl("Break between (min)", React.createElement("input", {type:"number",min:0,value:breakMin,onChange:function(e){setBreakMin(e.target.value);},style:numStyle})), mkLbl("Max walk between (min)", React.createElement("input", {type:"number",min:0,value:walkMax,onChange:function(e){setWalkMax(e.target.value);},style:numStyle}))), React.createElement("div", {style:{display:"flex",flexDirection:"row",flexWrap:"wrap",gap:16,marginBottom:12}}, mkChk("Evenings preferred", prefEve, function(){setPrefEve(function(v2){return !v2;});}), mkChk("Weekends preferred", prefWk, function(){setPrefWk(function(v2){return !v2;});}), mkChk("Keep venues close together", venClose, function(){setVenClose(function(v2){return !v2;});})), React.createElement("button", {disabled:pickedCodes.size===0, onClick:function(){setPlannedSet(planSet_((cat||[]).filter(function(s){return pickedCodes.has(s.code);}), {maxCost:maxCost,maxPer:maxPer,breakMin:breakMin,walkMax:walkMax,prefEve:prefEve,prefWk:prefWk,venClose:venClose}, existBk));}, style:{width:"100%",padding:"11px",borderRadius:12,border:"none",background:pickedCodes.size?C.accent:"rgba(168,85,247,0.3)",color:"#fff",fontSize:14,fontWeight:800,cursor:pickedCodes.size?"pointer":"not-allowed"}}, "Plan my day (" + pickedCodes.size + " show" + (pickedCodes.size===1?"":"s") + ")"), plannedSet && React.createElement("div", {style:{marginTop:14,borderTop:"1px solid "+C.border,paddingTop:12}}, plannedSet.sched.length ? React.createElement("div", null, React.createElement("div", {style:{fontSize:13,fontWeight:800,marginBottom:8,color:C.txt}}, "Your day" + (plannedSet.date?" \u2014 "+(function(){var dt=new Date(plannedSet.date+"T12:00:00");var DN=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],MN=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];return isNaN(dt.getTime())?plannedSet.date:DN[dt.getDay()]+" "+dt.getDate()+" "+MN[dt.getMonth()];})():"") + " \u00b7 " + plannedSet.sched.length + " show" + (plannedSet.sched.length===1?"":"s") + " \u00b7 \u00a3" + plannedSet.cost.toFixed(2)), plannedSet.sched.map(function(s){return React.createElement("div", {key:s.code, style:{display:"flex",gap:8,padding:"6px 0",borderBottom:"1px solid "+C.border,fontSize:12,alignItems:"baseline"}}, React.createElement("span",{style:{color:C.accent,fontWeight:800,flexShrink:0,minWidth:46}}, s.startStr||"\u2014"), React.createElement("span",{style:{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}, s.title), React.createElement("span",{style:{color:C.txt3,flexShrink:0,fontSize:11}}, s.venue||""));})) : React.createElement("div", {style:{fontSize:13,color:"#fca5a5"}}, "Couldn\u2019t fit any of these into one day with those limits \u2014 try loosening them."), (plannedSet.unfit && plannedSet.unfit.length) ? React.createElement("div", {style:{marginTop:10}}, React.createElement("div", {style:{fontSize:11,fontWeight:800,color:C.txt3,textTransform:"uppercase",letterSpacing:0.5,marginBottom:5}}, "Couldn\u2019t fit"), plannedSet.unfit.map(function(u,i){return React.createElement("div", {key:i, style:{fontSize:11,color:C.txt2,marginBottom:3,lineHeight:1.4}}, "\u2022 " + (u.show.title||u.show.code) + " \u2014 " + u.reason);})) : null)))))
}

function mapsUrl(t) {
  if (t.lat != null && !isNaN(t.lat) && t.lng != null && !isNaN(t.lng)) return "https://www.google.com/maps/search/?api=1&query=" + t.lat + "," + t.lng;
  var n = [t.venue, t.venueAddr, t.venuePostcode].filter(Boolean).join(", ");
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(n)
}

function Detail({
  s: t,
  inPlan: n,
  isBk: o,
  note: a,
  onNote: s,
  onToggle: d,
  onBook: w,
  onRemoveBooking: removeB,
  bookings: bkList,
  wdate: p,
  onWDate: h,
  onClose: b,
  proposals: y,
  onAddToProp: g,
  rating: _rating,
  onRate: _onRate,
  companion: _companion,
  onCompanion: _onCompanion,
  onUpdateBooking: updateBk,
  ltf: _ltf,
  onLtf: _onLtf,
  booker: _booker,
  onBooker: _onBooker,
  allCompanions: _allCompanions,
  venueNote: _venueNote,
  onVenueNote: _onVenueNote,
  showTags: _showTags,
  onShowTags: _onShowTags,
  allUserTags: _allUserTags,
  photos: _photos,
  onAddPhoto: _onAddPhoto,
  onRemovePhoto: _onRemovePhoto,
  onOpenGallery: _onOpenGallery,
  tickets: _tickets,
  onAddTicket: _onAddTicket,
  onRemoveTicket: _onRemoveTicket,
  favVenues: _favVenues,
  onToggleFavVenue: _toggleFavVenue
}) {
  var [ratingOpen, setRatingOpen] = useState(false);
  var [compEdit, setCompEdit] = useState(false);
  var [tagInput, setTagInput] = useState("");
  var [compInput, setCompInput] = useState("");
  var [descOpen, setDescOpen] = useState(false);
  var [bookedOpen, setBookedOpen] = useState(true),
    [expandedBkIdx, setExpandedBkIdx] = useState(null),
    [tagsBoxOpen, setTagsBoxOpen] = useState(false);
  var [detailsOpen, setDetailsOpen] = useState(true);
  var [momentosOpen, setMomentosOpen] = useState(false);
  return t ? React.createElement("div", {
    onClick: b,
    onKeyDown: function(S) {
      S.key === "Escape" && b()
    },
    tabIndex: -1,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      zIndex: 1e3,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      overflowY: "auto",
      padding: "30px 12px"
    }
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Show details",
    onClick: S => S.stopPropagation(),
    style: {
      background: C.card,
      border: "1px solid " + C.border,
      borderRadius: 16,
      maxWidth: 560,
      width: "100%",
      padding: "18px 18px 16px",
      position: "relative"
    }
  }, React.createElement("button", {
    onClick: b,
    "aria-label": "Close",
    style: {
      position: "absolute",
      top: 12,
      right: 12,
      width: 32,
      height: 32,
      borderRadius: 16,
      background: C.bg,
      border: "1px solid " + C.border,
      color: C.txt,
      fontSize: 18,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
    }
  }, "\u2715"), t.venue && React.createElement("div", {style: {display: "inline-block", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: orgColor(t.venue), color: "#fff", letterSpacing: 0.5, marginBottom: 8}}, t.venue.split(",")[0].split("@")[0].trim()), React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 900,
      paddingRight: 24,
      lineHeight: 1.2
    }
  }, t.title), t.subtitle && React.createElement("div", {
    style: {
      fontSize: 14,
      color: C.txt2,
      marginTop: 2
    }
  }, t.subtitle), t.artist && React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt3,
      marginTop: 2
    }
  }, t.artist, t.country ? " \xB7 " + t.country : ""), t.venue && React.createElement("a", {href: mapsUrl(t), target: "_blank", rel: "noopener noreferrer", "aria-label": venueLabel_(t) + " on Google Maps (opens in a new tab)", style: {display: "block", fontSize: 13, color: C.accent, marginTop: 4, textDecoration: "none", wordBreak: "break-word"}}, "\u{1F4CD} ", React.createElement("strong", null, venueLabel_(t), t.venueCode ? " (#" + t.venueCode + ")" : ""), t.venueAddr || t.venuePostcode ? " \u00b7 " + [t.venueAddr, t.venuePostcode].filter(Boolean).join(", ") + " \u2197" : ""),
  React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center",
      flexWrap: "wrap",
      marginTop: 8,
      marginBottom: 8
    }
  }, React.createElement("button", {
    onClick: d,
    "aria-label": n ? "Remove " + (t.title || "this show") + " from your wishlist" : "Add " + (t.title || "this show") + " to your wishlist",
    title: n ? "On your wishlist" : "Add to wishlist",
    style: {
      width: 38,
      height: 38,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      border: "1px solid " + (n ? "#34d399" : C.border),
      background: n ? "rgba(52,211,153,0.16)" : "transparent",
      color: n ? "#34d399" : C.txt2,
      fontSize: 20,
      cursor: "pointer"
    }
  }, n ? "🪄" : "🪄"), t.venue && _favVenues && _toggleFavVenue && React.createElement("button", {
    onClick: function(ev) { ev.stopPropagation(); _toggleFavVenue(t.venue); },
    title: _favVenues.has(t.venue) ? "Unfavourite venue" : "Favourite venue",
    style: {
      width: 38,
      height: 38,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      border: "1px solid " + (_favVenues.has(t.venue) ? "rgba(251,191,36,0.4)" : C.border),
      background: _favVenues.has(t.venue) ? "rgba(251,191,36,0.12)" : "transparent",
      color: _favVenues.has(t.venue) ? "#fbbf24" : C.txt3,
      fontSize: 14,
      cursor: "pointer"
    }
  }, _favVenues.has(t.venue) ? "\u{1F4CD}\u2605" : "\u{1F4CD}"), w && React.createElement("button", {
    onClick: () => w(t),
    "aria-label": o ? "Book again \u2014 " + (t.title || "this show") : "Mark " + (t.title || "this show") + " as booked",
    title: o ? "Booked \u2014 tap to book another date" : "Mark as booked",
    style: {
      width: 38,
      height: 38,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      border: "1px solid " + (o ? "#f472b6" : C.border),
      background: o ? "rgba(244,114,182,0.18)" : "transparent",
      color: o ? "#f472b6" : C.txt2,
      fontSize: 18,
      cursor: "pointer"
    }
  }, "\u{1F39F}"), g && React.createElement("select", {
    value: "",
    onChange: S => {
      S.target.value && g(S.target.value, t.code)
    },
    "aria-label": "Add to a proposal",
    title: "Add to a proposal",
    style: {
      width: 38,
      height: 38,
      padding: 0,
      borderRadius: 11,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontSize: 18,
      fontWeight: 700,
      colorScheme: THEME === "light" ? "light" : "dark",
      cursor: "pointer",
      textAlign: "center",
      textAlignLast: "center",
      appearance: "none",
      WebkitAppearance: "none",
      MozAppearance: "none"
    }
  }, React.createElement("option", {
    value: ""
  }, "\u{1F4CB}"), (y || []).map(S => React.createElement("option", {
    key: S.id,
    value: S.id
  }, S.title || "Untitled")), React.createElement("option", {
    value: "__new"
  }, "\uFF0B New proposal")), t.website && React.createElement("a", {
    href: t.website,
    target: "_blank",
    rel: "noopener noreferrer",
    title: "View on edfringe.com (opens in a new tab)",
    "aria-label": "View " + (t.title || "this show") + " on edfringe.com (opens in a new tab)",
    style: {
      width: 38,
      height: 38,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 11,
      border: "1px solid " + C.border,
      color: C.txt2,
      textDecoration: "none"
    }
  }, React.createElement(LinkIcon, null)),
  React.createElement("div", {style: {display: "inline-flex", alignItems: "center", gap: 2, marginLeft: "auto", position: "relative"}},
    React.createElement("button", {
      onClick: function() { setRatingOpen(!ratingOpen); },
      title: _rating ? "Your rating: " + _rating + "/5" : "Rate this show",
      style: {width: 38, height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 11, border: "1px solid " + (_rating ? "#FBBF24" : C.border), background: _rating ? "rgba(251,191,36,0.12)" : "rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 16, color: _rating ? "#FBBF24" : C.txt3}
    }, _rating ? "★" : "☆"),
    ratingOpen && React.createElement("div", {style: {display: "flex", gap: 2, marginLeft: 4}},
      [1,2,3,4,5].map(function(star) {
        return React.createElement("button", {
          key: star,
          onClick: function() { _onRate(t.code, _rating === star ? 0 : star); setRatingOpen(false); },
          title: star + " star" + (star > 1 ? "s" : ""),
          style: {width: 30, height: 30, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", background: star <= _rating ? "rgba(251,191,36,0.18)" : "rgba(255,255,255,0.06)", cursor: "pointer", fontSize: 16, color: star <= _rating ? "#FBBF24" : C.txt3, transition: "all 0.15s"}
        }, star <= _rating ? "★" : "☆");
      })
    ),
    _rating > 0 && !ratingOpen && React.createElement("span", {style: {fontSize: 11, color: "#FBBF24", fontWeight: 700, marginLeft: 4}}, _rating + "/5")
  )), React.createElement("div", {
    style: { marginTop: 6, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 12, padding: "12px 14px" }
  }, React.createElement("div", {
    onClick: function() { setDetailsOpen(!detailsOpen); },
    style: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", marginBottom: detailsOpen ? 8 : 0 }
  }, React.createElement("span", { style: { fontSize: 12, color: C.accent, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 } }, "\u{1F4CB} Show Details"), t.warnings && t.warnings !== "None" && React.createElement("span", { style: { fontSize: 13, marginLeft: 4 } }, "\u26A0\uFE0F"),
    React.createElement("span", { style: { fontSize: 14, color: C.accent, transition: "transform 0.2s", transform: detailsOpen ? "rotate(180deg)" : "rotate(0deg)" } }, "▲")),
  detailsOpen && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: (typeof window !== "undefined" && window.innerWidth > 640) ? "1fr 1fr 1fr 1fr" : "1fr 1fr",
      gap: "8px 12px",
      padding: "12px 14px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid " + C.border
    }
  }, React.createElement(Info, {
    label: "Dates",
    value: dateRange(t.first, t.last)
  }), React.createElement(Info, {
    label: "Time",
    value: t.startStr === "Various times" ? "Various" : t.startStr ? t.startStr + (t.endStr ? "\u2013" + t.endStr : "") : "\u2014"
  }), React.createElement(Info, {
    label: "Full price",
    value: priceLabel(t.priceFull) ? (t.priceFullMax != null && t.priceFullMax !== t.priceFull ? priceLabel(t.priceFull) + " \u2013 " + priceLabel(t.priceFullMax) : priceLabel(t.priceFull)) : "\u2014"
  }), React.createElement(Info, {
    label: "Concession",
    value: priceLabel(t.priceConc) ? (t.priceConcMax != null && t.priceConcMax !== t.priceConc ? priceLabel(t.priceConc) + " \u2013 " + priceLabel(t.priceConcMax) : priceLabel(t.priceConc)) : "\u2014"
  })), React.createElement("div", {style: {display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 12px", margin: "8px 0 0", padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid " + C.border}},
  React.createElement(Info, {
    label: "Duration",
    value: t.duration ? (function(){var dm=Number(t.duration);if(!dm||isNaN(dm))return t.duration+" min";var h=Math.floor(dm/60),m=dm%60;return dm+" mins"+(dm>=60?" ("+h+"h"+(m?m+"m":"")+")" :"");})() : "\u2014"
  }), React.createElement(Info, {
    label: "Age",
    value: t.age || "\u2014"
  }), React.createElement(Info, {
    label: "Performances",
    value: t.perfs || "\u2014"
  })), t.description && React.createElement("div", {
      style: { marginTop: 8, padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.border, background: "rgba(255,255,255,0.03)", cursor: "pointer" },
      onClick: function() { setDescOpen(!descOpen); }
    }, React.createElement("div", {
      style: {
        fontSize: 13,
        color: C.txt2,
        lineHeight: 1.5,
        overflow: "hidden",
        display: descOpen ? "block" : "-webkit-box",
        WebkitLineClamp: descOpen ? "none" : 2,
        WebkitBoxOrient: "vertical"
      }
    }, t.description, " ", React.createElement("span", {
      style: { fontSize: 11, color: C.accent, fontWeight: 700, whiteSpace: "nowrap" }
    }, descOpen ? "▲ Less" : "▼ Read more"))), t.warnings && t.warnings !== "None" && React.createElement("span", {
    title: t.warnings,
    onClick: function(ev) { var el = ev.currentTarget.querySelector("[data-warn]"); if (el) el.style.display = el.style.display === "none" ? "inline" : "none"; },
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      cursor: "pointer",
      fontSize: 13,
      color: "#fca5a5",
      marginBottom: 4,
      marginTop: 2,
      padding: "4px 8px",
      borderRadius: 8,
      background: "rgba(239,68,68,0.08)"
    }
  }, "\u26A0\uFE0F", React.createElement("span", {"data-warn": true, style: {display: "none", fontSize: 12, color: "#fca5a5"}}, " ", t.warnings)),
  // Genre tags, user tags, venue note — boxed collapsible
  React.createElement("div", {
    style: { marginTop: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 12, padding: "12px 14px" }
  },
  React.createElement("div", {
    onClick: function() { setTagsBoxOpen(!tagsBoxOpen); },
    style: { display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", marginBottom: tagsBoxOpen ? 8 : 0 }
  },
    React.createElement("span", { style: { fontSize: 12, color: "#818cf8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 } }, "\u{1F3F7}\uFE0F Tags & Notes"),
    React.createElement("span", { style: { fontSize: 14, color: "#818cf8", transition: "transform 0.2s", transform: tagsBoxOpen ? "rotate(180deg)" : "rotate(0deg)" } }, "\u25B2")),
  tagsBoxOpen && React.createElement("div", {
    style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }
  }, t.genre && React.createElement(Tag, { color: gcolor(t.genre) }, t.genre),
  t.tags.map(function(S, I) { return React.createElement(Tag, { key: I, color: tagColor(S) }, S); }),
  _showTags && _showTags.length > 0 && _showTags.map(function(tg, ti) {
    return React.createElement("span", {
      key: "ut-" + ti,
      style: { display: "inline-flex", alignItems: "center", gap: 3, padding: "2px 8px 2px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, background: "rgba(99,102,241,0.18)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.3)" }
    }, tg,
    React.createElement("button", {
      onClick: function() { _onShowTags(t.code, _showTags.filter(function(x) { return x !== tg; })); },
      style: { background: "transparent", border: "none", color: "#818cf8", cursor: "pointer", fontSize: 11, padding: "0 2px", lineHeight: 1 }
    }, "\u2715"));
  })),
  tagsBoxOpen && _onShowTags && React.createElement("div", {
    style: { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }
  },
    React.createElement("input", {
      type: "text",
      value: tagInput,
      onChange: function(ev) { setTagInput(ev.target.value); },
      onKeyDown: function(ev) {
        if (ev.key === "Enter" && tagInput.trim()) {
          ev.preventDefault();
          var tg = tagInput.trim().toLowerCase();
          var cur = _showTags || [];
          if (cur.indexOf(tg) < 0) _onShowTags(t.code, cur.concat([tg]));
          setTagInput("");
        }
      },
      placeholder: "+ Add tag",
      list: "detail-tag-suggestions",
      style: { padding: "4px 8px", borderRadius: 6, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", color: "#818cf8", fontSize: 11, fontFamily: "inherit", outline: "none", width: 100 }
    }),
    React.createElement("datalist", { id: "detail-tag-suggestions" },
      (_allUserTags || []).filter(function(tg) { return !(_showTags || []).includes(tg); }).map(function(tg) {
        return React.createElement("option", { key: tg, value: tg });
      })
    ),
    tagInput.trim() && React.createElement("button", {
      onClick: function() {
        var tg = tagInput.trim().toLowerCase();
        var cur = _showTags || [];
        if (cur.indexOf(tg) < 0) _onShowTags(t.code, cur.concat([tg]));
        setTagInput("");
      },
      style: { padding: "3px 8px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.12)", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }
    }, "Add")
  ),
  // Venue note (moved into Show Details)
  tagsBoxOpen && t.venue && _onVenueNote && React.createElement("div", { style: { marginTop: 6 } },
    (_venueNote || false) ? React.createElement("div", { style: { display: "flex", alignItems: "flex-start", gap: 6 } },
      React.createElement("span", { style: { fontSize: 11, color: "#FBBF24", flexShrink: 0, marginTop: 1 } }, "\ud83d\udcdd"),
      React.createElement("textarea", {
        value: _venueNote,
        onChange: function(ev) { _onVenueNote(t.venue, ev.target.value); },
        rows: 1,
        style: { flex: 1, padding: "4px 8px", borderRadius: 6, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", color: "#FBBF24", fontSize: 11, fontFamily: "inherit", resize: "vertical", outline: "none", minHeight: 22 }
      }),
      React.createElement("button", {
        onClick: function() { _onVenueNote(t.venue, ""); },
        style: { background: "transparent", border: "none", color: C.txt3, cursor: "pointer", fontSize: 11, padding: "2px 4px" }
      }, "\u2715")
    ) : React.createElement("button", {
      onClick: function() { _onVenueNote(t.venue, " "); },
      style: { background: "transparent", border: "none", color: C.txt3, cursor: "pointer", fontSize: 11, padding: 0 }
    }, "+ Add venue note/tip")
  )))),
  !o && w && React.createElement("button", {
    onClick: function() { w(t); },
    style: { marginTop: 12, width: "100%", padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(96,165,250,0.3)", background: "rgba(96,165,250,0.12)", color: "#60a5fa", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }
  }, "\u{1F39F} Book this show"),
  o && removeB && bkList && bkList.length > 0 && React.createElement("div", {
    style: { marginTop: 12, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 12, padding: "12px 14px" }
  }, React.createElement("div", {
    onClick: function() { setBookedOpen(!bookedOpen); },
    style: {display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none", marginBottom: bookedOpen ? 8 : 0}},
    React.createElement("span", { style: { fontSize: 12, color: "#60a5fa", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 } }, "\u{1F39F} Booked" + (bkList.length > 1 ? " (" + bkList.length + ")" : "")),
    React.createElement("span", { style: { fontSize: 14, color: "#60a5fa", transition: "transform 0.2s", transform: bookedOpen ? "rotate(180deg)" : "rotate(0deg)" } }, "▲")),
  bookedOpen && _onAddTicket && React.createElement("div", {
    style: { marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(96,165,250,0.15)" }
  },
    React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
      React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: "#60a5fa" } }, "\ud83c\udfab Tickets"),
      React.createElement("label", {
        style: { padding: "3px 10px", borderRadius: 6, border: "1px solid rgba(96,165,250,0.3)", background: "transparent", color: "#60a5fa", fontSize: 11, fontWeight: 700, cursor: "pointer" }
      },
        "+ Add",
        React.createElement("input", {
          type: "file",
          accept: "image/*",
          multiple: true,
          style: { display: "none" },
          onChange: function(ev) {
            var files = Array.from(ev.target.files || []);
            files.forEach(function(f) {
              resizePhoto(f, 1200, function(dataUrl) {
                _onAddTicket(t.code, dataUrl);
              });
            });
            ev.target.value = "";
          }
        })
      )
    ),
    _tickets && _tickets.length > 0 ? React.createElement("div", {
      style: { display: "flex", gap: 6, flexWrap: "wrap" }
    }, _tickets.map(function(tk, ti) {
      return React.createElement("div", {
        key: "tk-" + ti,
        style: { position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid " + C.border, background: "#000" }
      },
        React.createElement("img", {
          src: tk,
          onClick: function() { window.open(tk, "_blank"); },
          style: { width: 100, height: 70, objectFit: "contain", cursor: "pointer", display: "block" }
        }),
        React.createElement("button", {
          onClick: function(ev) { ev.stopPropagation(); _onRemoveTicket(t.code, ti); },
          style: { position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 9, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }
        }, "\u2715")
      );
    })) : React.createElement("div", { style: { fontSize: 11, color: "#93c5fd", fontStyle: "italic" } }, "Upload ticket screenshots or barcodes for quick venue entry")
  ),
  bookedOpen && bkList.map(function(bk, bi) {
    var dateStr = (function() { try { var dt = new Date(bk.date + "T12:00:00"); return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dt.getDay()] + " " + dt.getDate() + "/" + (dt.getMonth()+1); } catch(e) { return bk.date || "No date"; } })();
    return React.createElement("div", { key: bi, style: { padding: "6px 0", borderTop: bi > 0 ? "1px solid rgba(96,165,250,0.1)" : "none" } },
      React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" } },
        React.createElement("div", {style: {flex: "1 1 auto", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}},
          React.createElement("span", { style: { fontSize: 14, fontWeight: 800, color: C.txt } }, dateStr),
          React.createElement("span", { style: { fontSize: 13, color: C.txt2, marginLeft: 8 } }, (bk.start || "") + (bk.end ? " – " + bk.end : ""))),
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, flexShrink: 0 } },
          React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }, title: "Price paid" },
            React.createElement("span", { style: { fontSize: 11, color: C.txt3 } }, "£"),
            React.createElement("input", {
              type: "number",
              min: 0,
              step: "0.01",
              value: bk.price != null ? bk.price : (typeof t.priceFull === "number" ? t.priceFull : ""),
              onChange: function(ev) { var v = ev.target.value; updateBk && updateBk(t.code, bi, { price: v === "" ? null : parseFloat(v) }); },
              placeholder: "0",
              "aria-label": "Price per ticket",
              title: "Price per ticket",
              style: { width: 64, padding: "4px 6px", borderRadius: 6, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 12, outline: "none", textAlign: "right" }
            })),
          bk.paidFor && bk.paidFor.trim() && React.createElement("span", {
            title: "Total including companions you paid for",
            style: { fontSize: 10, color: "#34d399", fontWeight: 700, whiteSpace: "nowrap" }
          }, "= \u00A3" + (totalBookingCost_(t, bk) || 0).toFixed(2)),
          React.createElement("button", {
            onClick: function() { removeB(t.code, bi); w && w(t); },
            "aria-label": "Change date/time for booking on " + (bk.date || "this date"),
            title: "Change date/time",
            style: { padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(96,165,250,0.3)", background: "rgba(96,165,250,0.1)", color: "#60a5fa", fontWeight: 700, fontSize: 12, cursor: "pointer" }
          }, "✎"),
          React.createElement("button", {
            onClick: function() { if (window.confirm("Remove this booking" + (bk.date ? " on " + bk.date : "") + "?")) { removeB(t.code, bi); if (bkList.length <= 1) b(); } },
            "aria-label": "Remove booking on " + (bk.date || "this date"),
            style: { padding: "4px 8px", borderRadius: 8, border: "none", background: "rgba(239,68,68,0.18)", color: "#f87171", fontWeight: 700, fontSize: 12, cursor: "pointer" }
          }, "\u2715"),
          bkList.length > 1 && React.createElement("button", {
            onClick: function() { setExpandedBkIdx(expandedBkIdx === bi ? null : bi); },
            title: expandedBkIdx === bi ? "Collapse details" : "Show details",
            style: { padding: "4px 8px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontWeight: 700, fontSize: 10, cursor: "pointer" }
          }, expandedBkIdx === bi ? "\u25B2" : "\u25BC"))),
      (bkList.length <= 1 || expandedBkIdx === bi) && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, marginTop: 4 } },
        React.createElement("span", { style: { fontSize: 11, color: C.txt3 } }, "\u{1F4CD}"),
        React.createElement("input", {
          type: "text",
          value: bk.venue != null ? bk.venue : "",
          onChange: function(ev) { updateBk && updateBk(t.code, bi, { venue: ev.target.value || null }); },
          placeholder: venueLabel_(t) + (t.venueCode ? " (#" + t.venueCode + ")" : ""),
          "aria-label": "Venue override for this booking",
          title: "Override venue for this date (leave blank to use default)",
          style: { flex: 1, padding: "4px 6px", borderRadius: 6, border: "1px solid " + (bk.venue ? "rgba(251,191,36,0.4)" : C.border), background: bk.venue ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.06)", color: C.txt, fontSize: 11, outline: "none" }
        }),
        bk.venue && React.createElement("button", {
          onClick: function() { updateBk && updateBk(t.code, bi, { venue: null }); },
          title: "Reset to default venue",
          style: { padding: "2px 6px", borderRadius: 6, border: "none", background: "rgba(239,68,68,0.18)", color: "#f87171", fontSize: 10, cursor: "pointer" }
        }, "✕")),
      (bkList.length <= 1 || expandedBkIdx === bi) && React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 6 } },
        React.createElement("span", { style: { fontSize: 10, color: C.txt3, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 } }, "With:"),
        (function() {
          var ppl = bk.companions ? bk.companions.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
          var dlId = "comp-dl-" + t.code + "-" + bi;
          return React.createElement(React.Fragment, null,
            ppl.map(function(nm, ni) {
              var paidList = bk.paidFor ? bk.paidFor.split(",").map(function(x) { return x.trim(); }) : [];
              var isPaid = paidList.indexOf(nm) >= 0;
              return React.createElement("span", { key: ni, style: { display: "inline-flex", alignItems: "center", gap: 2, background: isPaid ? "rgba(52,211,153,0.15)" : "rgba(168,85,247,0.12)", borderRadius: 10, padding: "1px 4px 1px 2px", fontSize: 10, color: C.txt, fontWeight: 600, border: isPaid ? "1px solid rgba(52,211,153,0.3)" : "1px solid transparent" } },
                React.createElement("input", {
                  type: "checkbox",
                  checked: isPaid,
                  title: isPaid ? "You paid for " + nm : "Tick if you paid for " + nm + "'s ticket",
                  onChange: function() {
                    var newList = isPaid ? paidList.filter(function(x) { return x !== nm; }) : paidList.concat(nm);
                    updateBk && updateBk(t.code, bi, { paidFor: newList.join(", ") || null });
                  },
                  style: { width: 12, height: 12, accentColor: "#34d399", cursor: "pointer", margin: 0 }
                }),
                nm,
                React.createElement("button", {
                  onClick: function() { var upd = ppl.filter(function(x) { return x !== nm; }).join(", "); var newPaidFor = (bk.paidFor || "").split(",").map(function(x) { return x.trim(); }).filter(function(x) { return x && x !== nm; }).join(", "); updateBk && updateBk(t.code, bi, { companions: upd || null, paidFor: newPaidFor || null }); },
                  style: { background: "none", border: "none", color: C.txt3, cursor: "pointer", fontSize: 8, padding: 0, marginLeft: 2, lineHeight: 1 }
                }, "\u2715"));
            }),
            React.createElement("input", {
              type: "text",
              list: dlId,
              placeholder: "+ add",
              onKeyDown: function(ev) {
                if (ev.key === "Enter" && ev.target.value.trim()) {
                  var nm = ev.target.value.trim();
                  if (ppl.indexOf(nm) < 0) { var upd = ppl.concat(nm).join(", "); updateBk && updateBk(t.code, bi, { companions: upd }); }
                  ev.target.value = "";
                }
              },
              onChange: function(ev) {
                var nm = ev.target.value.trim();
                if (nm && (_allCompanions || []).indexOf(nm) >= 0 && ppl.indexOf(nm) < 0) {
                  var upd = ppl.concat(nm).join(", "); updateBk && updateBk(t.code, bi, { companions: upd });
                  ev.target.value = "";
                }
              },
              style: { width: 60, padding: "1px 4px", borderRadius: 6, border: "1px dashed " + C.border, background: "transparent", color: C.txt, fontSize: 10, outline: "none" }
            }),
            React.createElement("datalist", { id: dlId },
              (_allCompanions || []).filter(function(n) { return ppl.indexOf(n) < 0; }).map(function(n) { return React.createElement("option", { key: n, value: n }); })),
            ppl.length > 0 && React.createElement("div", { style: { width: "100%", fontSize: 9, color: C.txt3, marginTop: 2, fontStyle: "italic" } }, "\u2611 = you paid for their ticket"));
        })()),
      (bkList.length <= 1 || expandedBkIdx === bi) && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 4, marginTop: 4 } },
        React.createElement("span", { style: { fontSize: 10, color: C.txt3, fontWeight: 700, textTransform: "uppercase", flexShrink: 0 } }, "Booker:"),
        (function() {
          var dlId2 = "bkr-dl-" + t.code + "-" + bi;
          return React.createElement(React.Fragment, null,
            React.createElement("input", {
              type: "text",
              list: dlId2,
              value: bk.booker || "",
              onChange: function(ev) { updateBk && updateBk(t.code, bi, { booker: ev.target.value || null }); },
              placeholder: "\u2014",
              style: { flex: 1, maxWidth: 120, padding: "2px 6px", borderRadius: 6, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 10, outline: "none" }
            }),
            React.createElement("datalist", { id: dlId2 },
              React.createElement("option", { key: "_myself", value: "Myself" }),
              (_allCompanions || []).filter(function(n) { return n !== "Myself"; }).map(function(n) { return React.createElement("option", { key: n, value: n }); })),
            bk.booker && React.createElement("button", {
              onClick: function() { updateBk && updateBk(t.code, bi, { booker: null }); },
              style: { background: "none", border: "none", color: C.txt3, cursor: "pointer", fontSize: 8, padding: 0, lineHeight: 1 }
            }, "\u2715"));
        })()),
      (bkList.length <= 1 || expandedBkIdx === bi) && React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 } },
        React.createElement("label", {style: {display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 10, color: C.txt, fontWeight: 700}},
          React.createElement("input", {
            type: "checkbox",
            checked: !!bk.ltf,
            onChange: function(ev) { updateBk && updateBk(t.code, bi, { ltf: ev.target.checked, ltfTickets: bk.ltfTickets || 0 }); },
            style: {width: 14, height: 14, accentColor: C.accent, cursor: "pointer"}
          }), "LTF?"),
        bk.ltf && React.createElement("label", {style: {display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.txt2}},
          "Tickets:",
          React.createElement("input", {
            type: "number",
            min: 0,
            value: bk.ltfTickets ? bk.ltfTickets : "",
            onChange: function(ev) { var v = ev.target.value; updateBk && updateBk(t.code, bi, { ltf: true, ltfTickets: v === "" ? 0 : Math.max(0, parseInt(v, 10) || 0) }); },
            style: {width: 44, padding: "2px 4px", borderRadius: 4, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 10, outline: "none", textAlign: "center"}
          }))));
  }),
  bookedOpen && w && React.createElement("button", {
    onClick: function() { w(t); },
    title: "Add another date/time for this show",
    style: { marginTop: 8, padding: "6px 12px", borderRadius: 8, border: "1px dashed rgba(96,165,250,0.4)", background: "rgba(96,165,250,0.06)", color: "#60a5fa", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%" }
  }, "+ Add another date")),

  n && !o && h && React.createElement("div", {
    style: {display: "flex", alignItems: "center", gap: 8, marginTop: 8}
  }, React.createElement("span", {
    style: {fontSize: 12, color: C.txt2, fontWeight: 700}
  }, "\u{1F4C5} Preferred date:"), React.createElement("input", {
    type: "date",
    value: p || "",
    min: function() { var td = new Date(); return td.getFullYear() + "-" + ("0"+(td.getMonth()+1)).slice(-2) + "-" + ("0"+td.getDate()).slice(-2); }(),
    max: t.last || void 0,
    onChange: S => h(t.code, S.target.value),
    style: {
      padding: "6px 10px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 13,
      colorScheme: THEME === "light" ? "light" : "dark"
    }
  })),
  // Momentos (photos + notes)
  _onAddPhoto && React.createElement("div", {
    style: { marginTop: 12, background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", borderRadius: 12, padding: "12px 14px" }
  },
    React.createElement("div", {
      onClick: function() { setMomentosOpen(!momentosOpen); },
      style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none", marginBottom: momentosOpen ? 8 : 0 }
    },
      React.createElement("span", { style: { fontSize: 12, color: "#ec4899", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 } }, "🎞️ Momentos"),
      React.createElement("span", { style: { fontSize: 14, color: "#ec4899", transition: "transform 0.2s", transform: momentosOpen ? "rotate(180deg)" : "rotate(0deg)" } }, "▲")
    ),
    momentosOpen && React.createElement("div", { style: { marginTop: 4 } },
      // Photos
      React.createElement("div", { style: { marginBottom: 6 } },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } },
          React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.txt3 } }, "📸 Photos"),
          React.createElement("label", {
            style: { padding: "3px 10px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }
          },
            "+ Add",
            React.createElement("input", {
              type: "file",
              accept: "image/*",
              multiple: true,
              style: { display: "none" },
              onChange: function(ev) {
                var files = Array.from(ev.target.files || []);
                files.forEach(function(f) {
                  resizePhoto(f, 800, function(dataUrl) {
                    _onAddPhoto(t.code, dataUrl);
                  });
                });
                ev.target.value = "";
              }
            })
          )
        ),
        _photos && _photos.length > 0 && React.createElement("div", {
          style: { display: "flex", gap: 6, flexWrap: "wrap" }
        }, _photos.map(function(ph, pi) {
          return React.createElement("div", {
            key: pi,
            style: { position: "relative", width: 64, height: 64, borderRadius: 8, overflow: "hidden", cursor: "pointer", border: "1px solid " + C.border }
          },
            React.createElement("img", {
              src: ph,
              onClick: function() { _onOpenGallery({ code: t.code, index: pi }); },
              style: { width: "100%", height: "100%", objectFit: "cover" }
            }),
            React.createElement("button", {
              onClick: function(ev) { ev.stopPropagation(); _onRemovePhoto(t.code, pi); },
              style: { position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: 9, border: "none", background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }
            }, "✕")
          );
        }))
      ),
      // Notes
      React.createElement("div", { style: { marginTop: 4 } },
        React.createElement("textarea", {
          value: a || "",
          onChange: S => s(t.code, S.target.value),
          "aria-label": "Private note for this show",
          placeholder: "Notes (private, this device only)…",
          rows: 1,
          style: {
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 12px",
            borderRadius: 10,
            border: "1px solid " + C.border,
            background: "rgba(255,255,255,0.06)",
            color: C.txt,
            fontSize: 13,
            outline: "none",
            resize: "vertical",
            fontFamily: "inherit"
          }
        })
      )
    )
  ))) : null
}

function BookModal({
  s: t,
  onConfirm: n,
  onClose: o
}) {
  const a = /^\d{1,2}:\d{2}$/.test(t.startStr || ""),
    [s, d] = React.useState(""),
    [w, p] = React.useState(a ? t.startStr : ""),
    [h, b] = React.useState(a ? (t.endStr || "") : ""),
    y = {
      boxSizing: "border-box",
      padding: "9px 11px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 14,
      outline: "none",
      colorScheme: THEME === "light" ? "light" : "dark"
    };
  return React.createElement("div", {
    onClick: o,
    onKeyDown: function(g) {
      g.key === "Escape" && o()
    },
    tabIndex: -1,
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.65)",
      zIndex: 1200,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "40px 12px"
    }
  }, React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": "Confirm booking",
    onClick: g => g.stopPropagation(),
    style: {
      background: C.card,
      border: "1px solid " + C.border,
      borderRadius: 16,
      maxWidth: 420,
      width: "100%",
      padding: "20px"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 17,
      fontWeight: 900
    }
  }, "Confirm booking \u{1F39F}"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt2,
      margin: "3px 0 14px"
    }
  }, t.title), React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      fontWeight: 700,
      marginBottom: 4
    }
  }, "When are you going?"), React.createElement("input", {
    type: "date",
    value: s,
    max: t.last || void 0,
    onChange: function(g) {
      var newDate = g.target.value;
      d(newDate);
      // Auto-select first available time for this date
      if (!a && t.performances) {
        var dayPerfs = t.performances.filter(function(pf) { return pf.date === newDate && pf.start; });
        if (dayPerfs.length > 0) { p(dayPerfs[0].start); b(dayPerfs[0].end || ""); }
        else { p(""); b(""); }
      }
    },
    style: {
      ...y,
      width: "100%",
      boxSizing: "border-box",
      maxWidth: "100%",
      marginBottom: 12
    }
  }), !a && React.createElement(React.Fragment, null, function() {
    var perfs = (t.performances || []).filter(function(pf) { return pf.date === s; });
    if (perfs.length > 0) {
      // Show available time slots as clickable chips
      // Deduplicate by start time
      var seen = {};
      var unique = perfs.filter(function(pf) {
        if (!pf.start || seen[pf.start]) return false;
        seen[pf.start] = true;
        return true;
      });
      return React.createElement("div", {style: {marginBottom: 12}},
        React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, marginBottom: 6}}, "Pick a time:"),
        React.createElement("div", {style: {display: "flex", gap: 6, flexWrap: "wrap"}},
          unique.map(function(pf) {
            var selected = w === pf.start;
            return React.createElement("button", {
              key: pf.start,
              type: "button",
              onClick: function() { p(pf.start); b(pf.end || ""); },
              style: {
                padding: "8px 14px",
                borderRadius: 10,
                border: "1px solid " + (selected ? C.accent : C.border),
                background: selected ? "rgba(168,85,247,0.18)" : "transparent",
                color: selected ? C.accent : C.txt,
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2
              }
            },
              React.createElement("span", null, pf.start + (pf.end ? " \u2013 " + pf.end : "")),
              pf.duration ? React.createElement("span", {style: {fontSize: 10, color: C.txt3}}, pf.duration + " min") : null,
              pf.exhausted ? React.createElement("span", {style: {fontSize: 10, color: "#F87171", fontWeight: 800}}, "Sold out") :
                pf.pct != null && pf.pct < 30 ? React.createElement("span", {style: {fontSize: 10, color: "#FBBF24", fontWeight: 800}}, "Low availability") : null
            );
          })
        ),
        w && React.createElement("div", {style: {fontSize: 12, color: C.txt2, marginTop: 6}}, "\u2705 " + w + (h ? " \u2013 " + h : ""))
      );
    }
    // No performances for selected date or no performances data - show freeform
    return React.createElement("div", {style: {marginBottom: 12}},
      React.createElement("div", {style: {fontSize: 12, color: C.txt3, marginBottom: 6}}, s ? "Enter your time slot:" : "Pick a date first, then choose a time."),
      s && React.createElement("div", {style: {display: "flex", gap: 8}},
        React.createElement("input", {type: "time", value: w, onChange: function(ev) { p(ev.target.value); }, placeholder: "Start", style: {...y, flex: 1, minWidth: 0, boxSizing: "border-box"}}),
        React.createElement("input", {type: "time", value: h, onChange: function(ev) { b(ev.target.value); }, placeholder: "End", style: {...y, flex: 1, minWidth: 0, boxSizing: "border-box"}}))
    );
  }()), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "flex-end"
    }
  }, React.createElement("button", {
    onClick: o,
    style: {
      padding: "9px 14px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontWeight: 700,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, "\u2715 Cancel"), React.createElement("button", {
    disabled: !s,
    onClick: () => {
      s && n(t.code, {
        date: s,
        start: a ? t.startStr : w,
        end: a ? t.endStr || "" : h
      })
    },
    style: {
      padding: "9px 16px",
      borderRadius: 10,
      border: "none",
      background: s ? C.accent : "rgba(128,128,128,0.4)",
      color: s ? "#fff" : "rgba(255,255,255,0.4)",
      fontWeight: 800,
      cursor: s ? "pointer" : "not-allowed",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, "\u{1F3AB} Confirm"))))
}

function icsStamp_(t, n) {
  var o = String(t || "").replace(/-/g, ""),
    a = String(n || "00:00").replace(":", "") + "00";
  return o + "T" + a
}

function perfPrice_(s, rec) {
  if (rec && rec.price != null && rec.price !== "") return Number(rec.price) || 0;
  if (!s) return 0;
  if (!s.performances) return typeof s.priceFullMax == "number" ? s.priceFullMax : typeof s.priceFull == "number" ? s.priceFull : 0;
  if (!rec) return typeof s.priceFullMax == "number" ? s.priceFullMax : typeof s.priceFull == "number" ? s.priceFull : 0;
  var match = s.performances.filter(function(pf) {
    return pf.date === rec.date && (!rec.start || pf.start === rec.start);
  });
  if (match.length && match[0].price != null) return Number(match[0].price);
  return typeof s.priceFullMax == "number" ? s.priceFullMax : typeof s.priceFull == "number" ? s.priceFull : 0;
}
function totalBookingCost_(s, rec) {
  var base = perfPrice_(s, rec) || 0;
  if (!rec || !rec.paidFor) return base;
  var paidCount = rec.paidFor.split(",").map(function(x) { return x.trim(); }).filter(Boolean).length;
  return base * (1 + paidCount);
}
function bookEnd_(t, n) {
  var o = t.start || n.startStr || "00:00",
    a = t.end || n.endStr || "",
    s = t.date;
  if (a) {
    var h = timeToMin_(o),
      b = timeToMin_(a);
    if (h != null && b != null && b < h) {
      var y = new Date(s + "T12:00:00");
      y.setDate(y.getDate() + 1), s = y.toISOString().slice(0, 10)
    }
  } else {
    var d = timeToMin_(o) || 0,
      w = d + (n.duration || 60);
    if (w >= 1440) {
      var p = new Date(s + "T12:00:00");
      p.setDate(p.getDate() + 1), s = p.toISOString().slice(0, 10), w -= 1440
    }
    a = ("0" + Math.floor(w / 60)).slice(-2) + ":" + ("0" + w % 60).slice(-2)
  }
  return {
    date: s,
    time: a
  }
}

function icsForBooking_(t, n) {
  var o = n.start || t.startStr || "00:00",
    a = bookEnd_(n, t),
    s = function(h) {
      return String(h || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
    },
    d = (t.code + n.date + o).replace(/[^a-z0-9]+/gi, "-") + "@fringe-public",
    w = [t.space, t.venue, t.venueAddr, t.venuePostcode].filter(Boolean).join(", "),
    p = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//fringe-public//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT", "UID:" + d, "DTSTAMP:" + icsStamp_(n.date, o), "DTSTART:" + icsStamp_(n.date, o), "DTEND:" + icsStamp_(a.date, a.time), "SUMMARY:" + s(t.title + (t.venue ? " | " + venueLabel_(t) : "")), w ? "LOCATION:" + s(w) : "", t.website ? "URL:" + s(t.website) : "", "DESCRIPTION:" + s(priceLabel(showPrice_(t)) || ""), "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Reminder", "TRIGGER:-PT1H", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].filter(Boolean);
  return p.join(`\r
`)
}

function downloadICS_(t, n) {
  try {
    var o = new Blob([icsForBooking_(t, n)], {
        type: "text/calendar;charset=utf-8"
      }),
      a = URL.createObjectURL(o),
      s = document.createElement("a");
    s.href = a, s.download = (t.title || "show").replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "") + ".ics", document.body.appendChild(s), s.click(), document.body.removeChild(s), setTimeout(function() {
      URL.revokeObjectURL(a)
    }, 1500)
  } catch {}
}

function veventFor_(t, n, o) {
  var a = n.start || t.startStr || "00:00",
    s = bookEnd_(n, t),
    d = function(b) {
      return String(b || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
    },
    w = (t.code + n.date + a + o).replace(/[^a-z0-9]+/gi, "-") + "@fringe-public",
    p = [t.space, t.venue, t.venueAddr, t.venuePostcode].filter(Boolean).join(", "),
    h = o === "TENTATIVE";
  return ["BEGIN:VEVENT", "UID:" + w, "DTSTAMP:" + icsStamp_(n.date, a), "DTSTART:" + icsStamp_(n.date, a), "DTEND:" + icsStamp_(s.date, s.time), "SUMMARY:" + d((h ? "[Maybe] " : "") + t.title + (t.venue ? " | " + venueLabel_(t) : "")), p ? "LOCATION:" + d(p) : "", t.website ? "URL:" + d(t.website) : "", "STATUS:" + o, "DESCRIPTION:" + d((h ? "Wishlist \u2014 not yet booked. " : "") + (priceLabel(t.priceFull) || "")), "END:VEVENT"].filter(Boolean)
}

function exportAllICS_(t, n, o) {
  var a = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//fringe-public//EN", "CALSCALE:GREGORIAN"];
  return Object.keys(n || {}).forEach(function(s) {
    var d = t[s];
    (n[s] || []).forEach(function(w) {
      d && w && w.date && (a = a.concat(veventFor_(d, w, "CONFIRMED")))
    })
  }), Object.keys(o || {}).forEach(function(s) {
    if (!(n && n[s] && n[s].length)) {
      var d = t[s],
        w = o && o[s];
      d && w && (a = a.concat(veventFor_(d, {
        date: w,
        start: d.startStr,
        end: d.endStr
      }, "TENTATIVE")))
    }
  }), a.push("END:VCALENDAR"), a.join(`\r
`)
}

function downloadAllICS_(t, n, o) {
  try {
    var a = new Blob([exportAllICS_(t, n, o)], {
        type: "text/calendar;charset=utf-8"
      }),
      s = URL.createObjectURL(a),
      d = document.createElement("a");
    d.href = s, d.download = "my-fringe-plan.ics", document.body.appendChild(d), d.click(), document.body.removeChild(d), setTimeout(function() {
      URL.revokeObjectURL(s)
    }, 1500)
  } catch {}
}

function gcalUrl_(t, n) {
  var o = n.start || t.startStr || "00:00",
    a = bookEnd_(n, t),
    s = [t.space, t.venue, t.venueAddr, t.venuePostcode].filter(Boolean).join(", "),
    d = new URLSearchParams({
      action: "TEMPLATE",
      text: t.title + (t.venue ? " | " + venueLabel_(t) : ""),
      dates: icsStamp_(n.date, o) + "/" + icsStamp_(a.date, a.time),
      location: s,
      details: t.website || "",
      ctz: "Europe/London"
    });
  return "https://calendar.google.com/calendar/render?" + d.toString()
}

function Info({
  label: t,
  value: n
}) {
  return React.createElement("div", null, React.createElement("div", {
    style: {
      fontSize: 11,
      color: C.txt3,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: .5
    }
  }, t), React.createElement("div", {
    style: {
      fontSize: 14,
      color: C.txt,
      marginTop: 2
    }
  }, n))
}

function MapView({
  shows: t,
  isMobile: n,
  favVenues: o_fav
}) {
  const o = useRef(null),
    a = useRef(null),
    s = useRef(null);
  return useEffect(() => {
    let d = !1;
    return loadLeaflet().then(w => {
      if (d || !o.current) return;
      if (a.current && a.current.getContainer() !== o.current) {
        try {
          a.current.remove()
        } catch {}
        a.current = null
      }
      a.current || (a.current = w.map(o.current, {
        scrollWheelZoom: !0
      }).setView([55.9505, -3.19], 15), w.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap"
      }).addTo(a.current), s.current = w.layerGroup().addTo(a.current)), s.current.clearLayers();
      const p = {},
        h = y => String(y || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      t.forEach(y => {
        if (isNaN(y.lat) || isNaN(y.lng)) return;
        const g = y.venueCode || y.venue;
        (p[g] = p[g] || {
          lat: y.lat,
          lng: y.lng,
          name: y.venue,
          shows: []
        }).shows.push(y)
      });
      const b = [];
      Object.keys(p).forEach(y => {
        const g = p[y],
          S = w.circleMarker([g.lat, g.lng], {
            radius: 9,
            color: (o_fav && o_fav.has && o_fav.has(g.name)) ? "#fbbf24" : "#fff",
            weight: (o_fav && o_fav.has && o_fav.has(g.name)) ? 3 : 1.5,
            fillColor: (o_fav && o_fav.has && o_fav.has(g.name)) ? "#fbbf24" : (orgColor(g.name) || C.accent),
            fillOpacity: .9
          }).addTo(s.current),
          I = g.shows.slice(0, 12).map(f => "\u2022 " + h(f.title)).join("<br>");
        S.bindPopup("<b>" + h(g.name) + "</b><br>" + I), b.push([g.lat, g.lng])
      }), b.length && a.current.fitBounds(b, {
        padding: [25, 25],
        maxZoom: 16
      }), setTimeout(() => {
        try {
          a.current && a.current.invalidateSize()
        } catch {}
      }, 150)
    }).catch(() => {}), () => {
      d = !0
    }
  }, [t]), React.createElement(React.Fragment, null, React.createElement("div", {
    ref: o,
    style: {
      height: n ? "calc(100vh - 320px)" : "calc(100vh - 250px)",
      minHeight: 300,
      margin: n ? "8px 0 18px" : "0",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid " + C.border,
      background: "#0e0e1c",
      position: "relative",
      zIndex: 0,
      isolation: "isolate"
    }
  }), React.createElement("div", {style:{display:"flex",flexWrap:"wrap",gap:6,padding:"8px 4px",justifyContent:"center"}},
    Object.keys(ORG_COLORS).map(function(k) {
      return React.createElement("span", {key:k, style:{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,color:C.txt2}},
        React.createElement("span", {style:{width:10,height:10,borderRadius:"50%",background:ORG_COLORS[k],border:"1px solid rgba(255,255,255,0.3)",flexShrink:0}}), k === "PBH" ? "PBH’s Free Fringe" : k);
    })))
}

function MultiPick({
  label: t,
  options: n,
  selected: o,
  onToggle: a,
  onClear: s,
  box: d,
  fmt: w,
  column: p
}) {
  const [h, b] = useState(!1), [y, g] = useState(""), S = useRef(null), [I, f] = useState({
    up: !1,
    max: 300
  });
  useEffect(function() {
    if (!h) return;
    function handler(ev) {
      if (S.current && !S.current.contains(ev.target)) b(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return function() { document.removeEventListener("mousedown", handler); document.removeEventListener("touchstart", handler); };
  }, [h]);
  var R = function() {
    b(function(O) {
      return O ? !1 : (requestAnimationFrame(function() {
        var M = S.current;
        if (M) {
          var K = M.getBoundingClientRect(),
            x = M.closest("[data-sheetscroll]"),
            D = x ? x.getBoundingClientRect().top : 0,
            J = x ? x.getBoundingClientRect().bottom : typeof window < "u" ? window.innerHeight : 800,
            v = J - K.bottom - 12,
            A = K.top - D - 12,
            _ = v < 200 && A > v;
          var scrollRight = x ? x.getBoundingClientRect().right : typeof window < "u" ? window.innerWidth : 800;
          var scrollLeft = x ? x.getBoundingClientRect().left : 0;
          var shiftLeft = Math.max(0, K.left + 210 - scrollRight + 12);
          var ddWidth = Math.min(210, scrollRight - scrollLeft - 24);
          f({
            up: _,
            max: Math.max(140, Math.min(320, _ ? A : v)),
            shiftLeft: shiftLeft,
            ddWidth: ddWidth
          })
        }
      }), !0)
    })
  }, E = o || new Set, U = (n || []).filter(function(O) {
    return y ? String(w ? w(O) : O).toLowerCase().indexOf(y.toLowerCase()) >= 0 : !0
  }).slice(0, 300);
  return React.createElement("div", {
    ref: S,
    style: {
      position: "relative",
      width: d && d.width ? d.width : void 0,
      minWidth: 0
    }
  }, React.createElement("button", {
    onClick: R,
    style: Object.assign({}, d, {
      cursor: "pointer",
      textAlign: "left",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 6
    })
  }, React.createElement("span", {
    style: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, t, E.size ? " (" + E.size + ")" : ""), React.createElement("span", {
    style: {
      fontSize: 10,
      opacity: .6,
      flexShrink: 0
    }
  }, "\u25BE")), h && React.createElement("div", {
    style: {
      position: "absolute",
      zIndex: 90,
      top: I.up ? void 0 : "100%",
      bottom: I.up ? "100%" : void 0,
      left: I.shiftLeft ? -I.shiftLeft : 0,
      width: I.ddWidth || 210,
      marginTop: I.up ? 0 : 4,
      marginBottom: I.up ? 4 : 0,
      background: C.card,
      border: "1px solid " + C.border,
      borderRadius: 10,
      boxShadow: "0 10px 28px rgba(0,0,0,0.55)",
      maxHeight: I.max,
      overflowY: "auto",
      padding: 8
    }
  }, React.createElement("input", {
    value: y,
    onChange: function(O) {
      g(O.target.value)
    },
    "aria-label": "Filter these options",
    placeholder: "Filter\u2026",
    style: Object.assign({}, d, {
      width: "100%",
      boxSizing: "border-box",
      marginBottom: 6,
      fontSize: 13,
      padding: "6px 9px"
    })
  }), E.size > 0 && React.createElement("button", {
    onClick: s,
    style: {
      width: "100%",
      marginBottom: 6,
      padding: "5px",
      borderRadius: 8,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontSize: 12,
      cursor: "pointer"
    }
  }, "Clear selection (", E.size, ")"), U.map(function(O) {
    return React.createElement("label", {
      key: O,
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 8,
        padding: "5px 2px",
        fontSize: 13,
        color: C.txt,
        cursor: "pointer"
      }
    }, React.createElement("input", {
      type: "checkbox",
      checked: E.has(O),
      onChange: function() {
        a(O)
      },
      style: {
        marginTop: 2,
        flexShrink: 0
      }
    }), React.createElement("span", {
      style: {
        whiteSpace: "normal",
        wordBreak: "break-word",
        lineHeight: 1.3
      }
    }, w ? w(O) : O))
  }), U.length === 0 && React.createElement("div", {
    style: {
      fontSize: 12,
      color: C.txt3,
      padding: 6
    }
  }, "No matches")))
}

function FilterControls({
  q: t,
  setQ: n,
  genre: o,
  setGenre: a,
  age: s,
  setAge: d,
  access: w,
  setAccess: p,
  accessOpts: h,
  onDate: b,
  setOnDate: y,
  pickedDates: g,
  addPickedDate: S,
  removePickedDate: I,
  pmin: f,
  setPmin: R,
  pmax: E,
  setPmax: U,
  priceCeil: O,
  genres: M,
  ages: K,
  venueSel: x,
  toggleVenue: D,
  clearVenues: J,
  venueNoSel: v,
  toggleVenueNo: A,
  clearVenueNos: _,
  atype: fe,
  setAtype: ue,
  country: Re,
  setCountry: ee,
  durMax: ct,
  setDurMax: Qe,
  startTod: it,
  setStartTod: $e,
  dFrom: at,
  setDFrom: se,
  dTo: et,
  setDTo: X,
  venues: xe,
  venueFmt: lt,
  venueNos: Le,
  atypes: ye,
  countries: tt,
  smart: W,
  setSmart: te,
  onClear: q,
  active: ae,
  column: Y,
  simple: ut,
  companions: companions,
  compFilter: compFilter,
  setCompFilter: setCompFilter,
  sortKey: sortKey,
  setSortKey: setSortKey,
  sortDir: sortDir,
  setSortDir: setSortDir,
  tagFilter: tagFilter,
  setTagFilter: setTagFilter,
  allUserTags: allUserTags
}) {
  const ne = {
      padding: "9px 12px",
      borderRadius: 12,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 14,
      colorScheme: THEME === "light" ? "light" : "dark",
      width: Y ? "100%" : void 0,
      minWidth: 0,
      boxSizing: "border-box"
    },
    pt = Y ? {
      gridColumn: "1 / -1"
    } : {},
    Te = f ?? 0,
    Oe = E ?? O;
  return React.createElement("div", {
    style: Y ? {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      alignItems: "end"
    } : {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "center"
    }
  },
  // Row 1: Search bar (full width)
  React.createElement("input", {
    value: t,
    onChange: k => n(k.target.value),
    "aria-label": "Search shows, artists and venues",
    placeholder: "\u{1F50D} Search shows, artists, venues\u2026",
    style: {
      ...ne,
      outline: "none",
      width: Y ? "100%" : 260,
      ...pt
    }
  }), !ut && React.createElement(React.Fragment, null,
  // Row 2: Smart picks (full width)
  React.createElement("select", {
    "aria-label": "Smart picks",
    value: W,
    onChange: k => te(k.target.value),
    title: "Smart picks",
    style: {
      ...ne,
      fontWeight: 700,
      ...pt
    }
  }, React.createElement("option", {
    value: ""
  }, "\u2728 Smart picks\u2026"), React.createElement("option", {
    value: "short"
  }, "\u{1F4C6} Short runs (\u22644 days)"), React.createElement("option", {
    value: "quiet"
  }, "\u{1F92B} Quietest venues"), React.createElement("option", {
    value: "expensive"
  }, "\u{1F4B0} Priciest"), React.createElement("option", {
    value: "free"
  }, "\u{1F193} Free"), React.createElement("option", {
    value: "cheap"
  }, "\u{1FA99} Cheapest"), React.createElement("option", {
    value: "big"
  }, "\u{1F465} Big casts"), React.createElement("option", {
    value: "longest"
  }, "\u23F3 Longest"), React.createElement("option", {
    value: "shortest"
  }, "\u26A1 Shortest"), React.createElement("option", {
    value: "rare"
  }, "\u{1F48E} Rarest genre"), React.createElement("option", {
    value: "pop"
  }, "\u{1F525} Most popular genre")),
  // Row 3: Sort by (full width) \u2014 dropdown + direction toggle
  sortKey !== undefined && React.createElement("div", {
    style: { ...pt, display: "flex", gap: 6 }
  }, React.createElement("select", {
    "aria-label": "Sort by",
    value: sortKey || "",
    onChange: function(k) { setSortKey(k.target.value); if (!k.target.value) { setSortDir("asc"); } },
    style: {
      ...ne,
      fontWeight: 700,
      flex: 1
    }
  }, React.createElement("option", { value: "" }, "\u{1F504} Sort by\u2026"),
    React.createElement("option", { value: "title" }, "Title"),
    React.createElement("option", { value: "start" }, "Start time"),
    React.createElement("option", { value: "venue" }, "Venue name"),
    React.createElement("option", { value: "duration" }, "Duration"),
    React.createElement("option", { value: "price" }, "Price"),
    React.createElement("option", { value: "dates" }, "Dates"),
    React.createElement("option", { value: "genre" }, "Genre")),
  sortKey && React.createElement("button", {
    "aria-label": sortDir === "asc" ? "Sort ascending" : "Sort descending",
    title: sortDir === "asc" ? "Ascending \u2014 click to reverse" : "Descending \u2014 click to reverse",
    onClick: function() { setSortDir(sortDir === "asc" ? "desc" : "asc"); },
    style: {
      ...ne,
      width: 44,
      flexShrink: 0,
      fontWeight: 900,
      fontSize: 14,
      cursor: "pointer",
      textAlign: "center",
      padding: "8px 0"
    }
  }, sortDir === "asc" ? "\u2191" : "\u2193")),
  // Row 4: Start time + Duration (side by side)
  React.createElement("select", {
    "aria-label": "Start time of day",
    value: it,
    onChange: k => $e(k.target.value),
    style: ne
  }, React.createElement("option", {
    value: ""
  }, "\u{1F550} Any start"), React.createElement("option", {
    value: "morning"
  }, "\u{1F305} Morning (6am\u201312)"), React.createElement("option", {
    value: "afternoon"
  }, "\u2600\uFE0F Afternoon (12\u20135pm)"), React.createElement("option", {
    value: "evening"
  }, "\u{1F306} Evening (5\u201310pm)"), React.createElement("option", {
    value: "late"
  }, "\u{1F319} Late (10pm\u20136am)")),
  React.createElement("select", {
    "aria-label": "Duration",
    value: ct,
    onChange: k => Qe(k.target.value),
    style: ne
  }, React.createElement("option", {
    value: ""
  }, "\u23F1 Duration\u2026"), React.createElement("option", {
    value: "30"
  }, "\u2264 30 min"), React.createElement("option", {
    value: "60"
  }, "\u2264 60 min"), React.createElement("option", {
    value: "90"
  }, "\u2264 90 min"), React.createElement("option", {
    value: "120"
  }, "\u2264 120 min")),
  // Row 5: Date + Venue (date is special with chip display)
  React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      minWidth: 0
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.txt2,
      fontWeight: 700
    }
  }, "\u{1F4C5} On date(s)"), React.createElement("input", {
    type: "date",
    value: "",
    onClick: function(k) {
      try {
        k.currentTarget.showPicker()
      } catch {}
    },
    onFocus: function(k) {
      try {
        k.currentTarget.showPicker()
      } catch {}
    },
    onChange: function(k) {
      k.target.value && S(k.target.value)
    },
    "aria-label": "Add a date to filter by (pick several)",
    title: "Open the date picker (add several dates)",
    style: Object.assign({}, ne, {
      cursor: "pointer"
    })
  }), g.size > 0 && React.createElement("div", {
    style: {
      display: "flex",
      gap: 5,
      flexWrap: "wrap",
      marginTop: 2
    }
  }, [...g].sort().map(function(k) {
    var G = new Date(k + "T12:00:00"),
      yt = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      ft = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return React.createElement("span", {
      key: k,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 700,
        background: "rgba(168,85,247,0.18)",
        color: "#c084fc",
        borderRadius: 20,
        padding: "3px 5px 3px 10px"
      }
    }, yt[G.getDay()] + " " + G.getDate() + " " + ft[G.getMonth()], React.createElement("button", {
      onClick: function() {
        I(k)
      },
      "aria-label": "Remove " + k,
      title: "Remove",
      style: {
        background: "none",
        border: "none",
        color: "#c084fc",
        cursor: "pointer",
        fontSize: 13,
        padding: "0 2px",
        lineHeight: 1
      }
    }, "\u2715"))
  }))),
  React.createElement(MultiPick, {
    label: "\u{1F4CD} Venue (name, # or postcode)",
    options: xe,
    selected: x,
    onToggle: D,
    onClear: J,
    box: ne,
    fmt: lt,
    column: Y
  }),
  // Row 6: Genre + Country
  React.createElement("select", {
    "aria-label": "Genre",
    value: o,
    onChange: k => a(k.target.value),
    style: ne
  }, React.createElement("option", {
    value: ""
  }, "\u{1F3AB} All genres"), M.map(k => React.createElement("option", {
    key: k,
    value: k
  }, k))),
  React.createElement("select", {
    "aria-label": "Country",
    value: Re,
    onChange: k => ee(k.target.value),
    style: ne
  }, React.createElement("option", {
    value: ""
  }, "\u{1F30D} All countries"), tt.map(k => React.createElement("option", {
    key: k,
    value: k
  }, k))),
  // Row 7: Age + Going with
  React.createElement("select", {
    "aria-label": "Age rating",
    value: s,
    onChange: k => d(k.target.value),
    style: ne
  }, React.createElement("option", {
    value: ""
  }, "\u{1F51E} Any age"), K.map(k => React.createElement("option", {
    key: k,
    value: k
  }, "Suitable ", k))),
  function() {
    var compVals = Object.values(companions).filter(function(v) { return v && v.trim(); });
    var allNames = [];
    compVals.forEach(function(v) { v.split(",").forEach(function(n) { var nm = n.trim(); if (nm) allNames.push(nm); }); });
    var uniqueComps = Array.from(new Set(allNames)).sort();
    if (uniqueComps.length === 0) return null;
    return React.createElement("select", {
      "aria-label": "Going with",
      value: compFilter || "",
      onChange: function(k) { setCompFilter(k.target.value); },
      style: ne
    }, React.createElement("option", {value: ""}, "\u{1F465} Going with\u2026"),
    uniqueComps.map(function(c) { return React.createElement("option", {key: c, value: c}, c); }));
  }(),
  allUserTags && allUserTags.length > 0 ? React.createElement("select", {
    "aria-label": "My tags",
    value: tagFilter || "",
    onChange: function(k) { setTagFilter(k.target.value); },
    style: ne
  }, React.createElement("option", {value: ""}, "🏷️ My tags…"),
  allUserTags.map(function(t) { return React.createElement("option", {key: t, value: t}, t); })) : null,
  // Row 8: Price filter (full width)
  React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      flexWrap: "wrap",
      alignItems: "flex-end",
      ...pt
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      flex: "1 1 235px",
      minWidth: 0
    }
  }, React.createElement("span", {
    style: {
      fontSize: 12,
      color: C.txt2,
      fontWeight: 700
    }
  }, "\u{1F4B7} Price: \xA3", Te, "\u2013\xA3", Oe >= O ? O + "+" : Oe), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, React.createElement("input", {
    "aria-label": "Minimum price in pounds",
    type: "number",
    min: 0,
    max: O,
    value: Te,
    onChange: k => {
      var G = Number(k.target.value);
      isNaN(G) || (G = Math.max(0, Math.min(G, Oe)), R(G <= 0 ? null : G))
    },
    style: {
      width: 48,
      padding: "6px 4px",
      borderRadius: 8,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 12,
      textAlign: "center",
      boxSizing: "border-box",
      colorScheme: THEME === "light" ? "light" : "dark"
    }
  }), React.createElement("div", {
    style: {
      position: "relative",
      flex: 1,
      height: 22,
      display: "flex",
      alignItems: "center",
      minWidth: 56
    }
  }, React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      height: 4,
      borderRadius: 2,
      background: "rgba(255,255,255,0.18)"
    }
  }), React.createElement("div", {
    style: {
      position: "absolute",
      height: 4,
      borderRadius: 2,
      background: C.accent,
      left: Te / O * 100 + "%",
      right: 100 - Oe / O * 100 + "%"
    }
  }), React.createElement("input", {
    "aria-label": "Minimum price slider",
    type: "range",
    className: "dr",
    min: 0,
    max: O,
    value: Te,
    onChange: k => {
      var G = Number(k.target.value);
      R(G <= 0 ? null : Math.min(G, Oe))
    }
  }), React.createElement("input", {
    "aria-label": "Maximum price slider",
    type: "range",
    className: "dr",
    min: 0,
    max: O,
    value: Oe,
    onChange: k => {
      var G = Number(k.target.value);
      U(G >= O ? null : Math.max(G, Te))
    }
  })), React.createElement("input", {
    "aria-label": "Maximum price in pounds",
    type: "number",
    min: 0,
    max: O,
    value: Oe,
    onChange: k => {
      var G = Number(k.target.value);
      isNaN(G) || (G = Math.max(Te, Math.min(G, O)), U(G >= O ? null : G))
    },
    style: {
      width: 48,
      padding: "6px 4px",
      borderRadius: 8,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 12,
      textAlign: "center",
      boxSizing: "border-box",
      colorScheme: THEME === "light" ? "light" : "dark"
    }
  }))))))
}


function Tiles({
  list: t,
  plan: n,
  booked: o,
  proposals: a,
  fields: s,
  onWish: d,
  onBook: w,
  onProp: p,
  onOpen: h,
  isMobile: mob,
  showTags: _showTags
}) {
  var b = s || {},
    y = function(g) {
      return Object.assign({
        width: 36,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        fontSize: 13,
        cursor: "pointer",
        flexShrink: 0
      }, g || {})
    };
  return React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, (t || []).map(function(g) {
    var S = [g.venueAddr, g.venuePostcode].filter(Boolean).join(", "),
      I = n.has(g.code),
      f = !!o[g.code];
    return React.createElement("div", {
      key: g.code,
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 13px",
        borderRadius: 10,
        background: C.card,
        border: "1px solid " + C.border,
        borderLeft: "4px solid " + orgColor(g.venue)
      }
    }, React.createElement("div", {
      onClick: function() {
        h(g)
      },
      style: {
        flex: 1,
        minWidth: 0,
        cursor: "pointer"
      }
    }, React.createElement("div", {
      style: {
        fontWeight: 800,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, g.title), b.artist !== !1 && g.artist && React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.txt2,
        marginTop: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, g.artist), function() {
      var R = [];
      return b.time !== !1 && R.push("\u{1F550} " + (g.startStr || "?") + (g.endStr ? "\u2013" + g.endStr : "") + (g.duration ? " (" + g.duration + "m)" : "")), b.price !== !1 && priceLabel(showPrice_(g)) && R.push(priceLabel(showPrice_(g))), b.genre !== !1 && g.genre && R.push(g.genre), R.length ? React.createElement("div", {
        style: {
          fontSize: 12,
          color: C.txt2,
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, R.join(" \xB7 ")) : null
    }(), b.venue !== !1 && g.venue && React.createElement("a", {
      href: mapsUrl(g),
      target: "_blank",
      rel: "noopener noreferrer",
      onClick: function(R) {
        R.stopPropagation()
      },
      "aria-label": venueLabel_(g) + " on Google Maps (opens in a new tab)",
      style: {
        display: "block",
        fontSize: 11,
        color: C.accent,
        marginTop: 2,
        textDecoration: "none",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, "\u{1F4CD} ", venueLabel_(g), g.venueCode ? " (#" + g.venueCode + ")" : "", S ? ", " + S : "", " \u2197"),
    _showTags && _showTags[g.code] && _showTags[g.code].length > 0 && React.createElement("div", {
      style: { display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }
    }, _showTags[g.code].slice(0, 3).map(function(tg, ti) {
      return React.createElement("span", {
        key: "ut-" + ti,
        style: { display: "inline-block", padding: "1px 6px", borderRadius: 99, fontSize: 9, fontWeight: 700, background: "rgba(99,102,241,0.18)", color: "#818cf8" }
      }, tg);
    }))), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 36px)",
        gap: 5,
        flexShrink: 0,
        alignSelf: "center"
      }
    }, React.createElement("button", {
      onClick: function() {
        d(g.code)
      },
      "aria-label": I ? "Remove " + (g.title || "this show") + " from your wishlist" : "Add " + (g.title || "this show") + " to your wishlist",
      title: I ? "On your wishlist" : "Add to wishlist",
      style: y({
        border: "1px solid " + (I ? "#34d399" : C.border),
        background: I ? "rgba(52,211,153,0.16)" : "transparent",
        color: I ? "#34d399" : C.txt2
      })
    }, I ? "\u2665" : "\u2661"), React.createElement("button", {
      onClick: function() {
        w(g)
      },
      "aria-label": f ? "Edit booking for " + (g.title || "this show") : "Mark " + (g.title || "this show") + " as booked",
      title: f ? "Booked \u2014 tap to edit" : "Mark as booked",
      style: y({
        border: "1px solid " + (f ? "#93c5fd" : C.border),
        background: f ? "rgba(96,165,250,0.18)" : "transparent",
        color: f ? "#93c5fd" : C.txt2,
        fontSize: 13
      })
    }, "\u{1F39F}"), React.createElement("select", {
      value: "",
      onChange: function(R) {
        R.target.value && p(R.target.value, g.code)
      },
      "aria-label": "Add to a proposal",
      title: "Add to a proposal",
      style: y({
        border: "1px solid " + C.border,
        background: "transparent",
        color: C.txt2,
        fontSize: 15,
        colorScheme: THEME === "light" ? "light" : "dark",
        padding: 0,
        textAlign: "center",
        textAlignLast: "center",
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none"
      })
    }, React.createElement("option", {
      value: ""
    }, "\u{1F4CB}"), (a || []).map(function(R) {
      return React.createElement("option", {
        key: R.id,
        value: R.id
      }, R.title || "Untitled")
    }), React.createElement("option", {
      value: "__new"
    }, "\uFF0B New")), g.website && React.createElement("a", {
      href: g.website,
      target: "_blank",
      rel: "noopener noreferrer",
      title: "View listing (opens in a new tab)",
      "aria-label": "View " + (g.title || "this show") + " listing (opens in a new tab)",
      style: y({
        border: "1px solid " + C.border,
        color: C.txt2,
        textDecoration: "none"
      })
    }, React.createElement(LinkIcon, null))))
  }))
}

function App() {
  var __DS = window.__FRINGE_DEMO_STATE__;
  const t = useMemo(() => parseHash(), []),
    [n, o] = useState(null),
    [a, s] = useState(""),
    [d, w] = useState(() => {
      try {
        return new Set(JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"))
      } catch {
        if (__DS && __DS.plan) return new Set(__DS.plan);
        return new Set
      }
    }),
    [p, h] = useState(() => {
      try {
        var raw = JSON.parse(localStorage.getItem("fringe-public-booked-v1") || "{}");
        if (!Object.keys(raw).length && __DS && __DS.bookings) raw = __DS.bookings;
        Object.keys(raw).forEach(function(k) { if (raw[k] && !Array.isArray(raw[k])) raw[k] = [raw[k]]; });
        return raw
      } catch {
        if (__DS && __DS.bookings) return __DS.bookings;
        return {}
      }
    }),
    b = function(e) {
      h(function(r) {
        var l = Object.assign({}, r);
        return (e || []).forEach(function(i) {
          l[i.code] = (l[i.code] || []).concat([{
            date: i.date,
            start: fmtMin_(i.sm),
            end: fmtMin_(i.em)
          }])
        }), l
      })
    },
    [y, g] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("fringe-public-wishdate-v1") || "{}")
      } catch {
        return {}
      }
    }),
    [S, I] = useState(null),
    [f, R] = useState(() => { var _d = new Date(); return _d.getFullYear() + "-" + ("0" + (_d.getMonth() + 1)).slice(-2) + "-" + ("0" + _d.getDate()).slice(-2); }),
    [E, U] = useState("all"),
    [O, M] = useState("week"),
    [calOrient, setCalOrient] = useState(function(){ try { return localStorage.getItem("fringe-public-cal-orient") || "h"; } catch(e) { return "h"; } }),
    [shareMode, setShareMode] = useState(false),
    [toastMsg, setToastMsg] = useState(null),
    [shareSel, setShareSel] = useState(new Set()),
    [shareCopied, setShareCopied] = useState(false),
    [K, x] = useState("booked"),
    [D, J] = useState(() => {
      try {
        return localStorage.getItem("fringe-public-browseview") || "cards"
      } catch {
        return "cards"
      }
    }),
    [v, A] = useState(() => {
      try {
        return Number(localStorage.getItem("fringe-public-cardsize")) || 60
      } catch {
        return 60
      }
    }),
    [_, fe] = useState(() => {
      try {
        return Number(localStorage.getItem("fringe-public-tablesize")) || 120
      } catch {
        return 120
      }
    }),
    [ue, Re] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("fringe-public-cardfields") || "{}")
      } catch {
        return {}
      }
    }),
    [ee, ct] = useState(!1),
    [Qe, it] = useState("title"),
    [$e, at] = useState("asc"),
    [se, et] = useState(() => {
      try {
        var v = JSON.parse(localStorage.getItem(NOTES_KEY) || "{}");
        if (!Object.keys(v).length && __DS && __DS.notes) return __DS.notes;
        return v;
      } catch {
        return (__DS && __DS.notes) || {}
      }
    }),
    [ratings, setRatings] = useState(function() {
      try {
        var v = JSON.parse(localStorage.getItem(RATINGS_KEY) || "{}");
        if (!Object.keys(v).length && __DS && __DS.ratings) return __DS.ratings;
        return v;
      } catch { return (__DS && __DS.ratings) || {} }
    }),
    [companions, setCompanions] = useState(function() {
      try {
        var v = JSON.parse(localStorage.getItem(COMPANIONS_KEY) || "{}");
        if (!Object.keys(v).length && __DS && __DS.companions) return __DS.companions;
        return v;
      } catch { return (__DS && __DS.companions) || {} }
    }),
    [ltfData, setLtfData] = useState(function() {
      try {
        return JSON.parse(localStorage.getItem(LTF_KEY) || "{}")
      } catch { return {} }
    }),
    [bookerData, setBookerData] = useState(function() {
      try {
        return JSON.parse(localStorage.getItem(BOOKER_KEY) || "{}")
      } catch { return {} }
    }),
    [compFilter, setCompFilter] = useState(""),
    [bkDateFilter, setBkDateFilter] = useState(""),
    [isOffline, setIsOffline] = useState(!navigator.onLine),
    [updateAvail, setUpdateAvail] = useState(false),
    [bkShowPast, setBkShowPast] = useState(false),
    [addShowOpen, setAddShowOpen] = useState(false),
    [exportMenuOpen, setExportMenuOpen] = useState(false),
    [shareMenuOpen, setShareMenuOpen] = useState(false),
    [bkMenuOpen, setBkMenuOpen] = useState(null),
    [ratingPopup, setRatingPopup] = useState(null),
    [burgerOpen, setBurgerOpen] = useState(false),
    [addShowQ, setAddShowQ] = useState(""),
    [compactCards, setCompactCards] = useState(function() { try { return localStorage.getItem("fringe-public-compact") === "1"; } catch { return false; } }),
    [wishSort, setWishSort] = useState("added"),
    [compareMode, setCompareMode] = useState(false),
    [compareLink, setCompareLink] = useState(""),
    [compareCodes, setCompareCodes] = useState(null),
    [fringeFriends, setFringeFriends] = useState(function() { try { return JSON.parse(localStorage.getItem(FRIENDS_KEY) || "[]"); } catch(e) { return []; } }),
    [friendLinkInput, setFriendLinkInput] = useState(""),
    [showLeaderboard, setShowLeaderboard] = useState(false),
    [venueNotes, setVenueNotes] = useState(function() { try { return JSON.parse(localStorage.getItem(VENUE_NOTES_KEY) || "{}"); } catch(e) { return {}; } }),
    [fringeHistory, setFringeHistory] = useState(function() { try { return JSON.parse(localStorage.getItem("fringe-public-history-v1") || "[]"); } catch(e) { return []; } }),
    [showTags, setShowTags] = useState(function() { try { var v = JSON.parse(localStorage.getItem(SHOW_TAGS_KEY) || "{}"); if (!Object.keys(v).length && __DS && __DS.tags) return __DS.tags; return v; } catch(e) { return (__DS && __DS.tags) || {}; } }),
    [tagFilter, setTagFilter] = useState(""),
    [bkDayOrder, setBkDayOrder] = useState(function() { try { return JSON.parse(localStorage.getItem("fringe-public-bkorder-v1") || "{}"); } catch(e) { return {}; } }),
    [bkDragIdx, setBkDragIdx] = useState(null),
    [bkDragOverIdx, setBkDragOverIdx] = useState(null),
    [bkDragDate, setBkDragDate] = useState(null),
    [showPhotos, setShowPhotos] = useState(function() { try { var v = JSON.parse(localStorage.getItem("fringe-public-photos-v1") || "{}"); if (!Object.keys(v).length && __DS && __DS.photos && Object.keys(__DS.photos).length) return __DS.photos; return v; } catch(e) { return (__DS && __DS.photos) || {}; } }),
    [photoGallery, setPhotoGallery] = useState(null),
    [weatherData, setWeatherData] = useState(null),
    [spendChartMode, setSpendChartMode] = useState("genre"),
    [spendChartOpen, setSpendChartOpen] = useState(false),
    [glanceOpen, setGlanceOpen] = useState(true),
    [venueHeatOpen, setVenueHeatOpen] = useState(true),
    [bkOverviewOpen, setBkOverviewOpen] = useState(function() { try { var v = localStorage.getItem("fringe-public-bkoverview-v1"); return v === null ? true : v === "1"; } catch(e) { return true; } }),
    [clockTick, setClockTick] = useState(0),
    [companionView, setCompanionView] = useState(false),
    [timelineOpen, setTimelineOpen] = useState({}),
    [expSplitOpen, setExpSplitOpen] = useState(false),
    [bkSubView, setBkSubView] = useState("bookings"),
    [favVenues, setFavVenues] = useState(function() { try { var v = JSON.parse(localStorage.getItem("fringe-public-favvenues-v1") || "[]"); if (!v.length && __DS && __DS.favVenues) return new Set(__DS.favVenues); return new Set(v); } catch(e) { return (__DS && __DS.favVenues) ? new Set(__DS.favVenues) : new Set(); } }),
    [groupPolls, setGroupPolls] = useState(function() { try { var v = JSON.parse(localStorage.getItem("fringe-public-polls-v1") || "[]"); if (!v.length && __DS && __DS.polls) return __DS.polls; return v; } catch(e) { return (__DS && __DS.polls) || []; } }),
    [pollCreating, setPollCreating] = useState(false),
    [showTickets, setShowTickets] = useState(function() { try { return JSON.parse(localStorage.getItem("fringe-public-tickets-v1") || "{}"); } catch(e) { return {}; } }),
    [customLists, setCustomLists] = useState(function() { try { var v = JSON.parse(localStorage.getItem("fringe-public-clists-v1") || "[]"); if (!v.length && __DS && __DS.customLists) return __DS.customLists; return v; } catch(e) { return (__DS && __DS.customLists) || []; } }),
    [clistAdding, setClistAdding] = useState(null),
    [clistNewName, setClistNewName] = useState(""),
    [reviewStarFilter, setReviewStarFilter] = useState(null),
    [nextYearList, setNextYearList] = useState(function() { try { return JSON.parse(localStorage.getItem("fringe-public-nextyear-v1") || "[]"); } catch(e) { return []; } }),
    [nySearch, setNySearch] = useState(""),
    [budgetCap, setBudgetCap] = useState(function() { try { var v = localStorage.getItem("fringe-public-budget-v1"); if (v !== null) return JSON.parse(v); if (__DS && __DS.budget != null) return __DS.budget; return null; } catch(e) { return (__DS && __DS.budget != null) ? __DS.budget : null; } }),
    [budgetEditing, setBudgetEditing] = useState(false),
    [reviewView, setReviewView] = useState("tiles"),
    [reviewOrder, setReviewOrder] = useState(function() { try { return JSON.parse(localStorage.getItem("fringe-public-review-order-v1") || "[]"); } catch { return []; } }),
    [dragIdx, setDragIdx] = useState(null),
    [dragOverIdx, setDragOverIdx] = useState(null),
    [touchDragIdx, setTouchDragIdx] = useState(null),
    [touchDragY, setTouchDragY] = useState(null),
    reviewTouchStartRef = useRef(null),
    reviewTileRefsRef = useRef([]),
    [X, xe] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("fringe-public-proposals-v1") || "[]")
      } catch {
        return []
      }
    }),
    [lt, Le] = useState(null),
    [ye, tt] = useState(""),
    [W, te] = useState(() => {
      try {
        return localStorage.getItem("fringe-proposal-layout") || "vertical"
      } catch {
        return "vertical"
      }
    }),
    [q, ae] = useState({}),
    [Y, ut] = useState({
      id: null,
      q: ""
    }),
    [ne, pt] = useState(!1),
    [Te, Oe] = useState(""),
    [k, G] = useState(!1),
    [yt, ft] = useState(null),
    [guideOpen, setGuideOpen] = useState(false),
    [helpDropOpen, setHelpDropOpen] = useState(false);
  useEffect(() => {
    k && (Array.isArray(yt) || (ft("loading"), fetch(HELP_URL).then(e => e.text()).then(e => {
      let r = Papa.parse(e, {
        skipEmptyLines: !0
      }).data || [];
      r.length && r[0].some(l => /^(title|section|question|heading|topic|content|answer|body|text|help)$/i.test((l || "").trim())) && (r = r.slice(1)), ft(r)
    }).catch(() => ft("error"))))
  }, [k]);
  const [Q, mt] = useState(t.view || "browse"), [Pe, At] = useState(t.q || ""), [_e, Nt] = useState(t.genre || ""), [Ve, Et] = useState(t.age || ""), [He, Dt] = useState(t.access || ""), [Ae, Bt] = useState(t.pmin ? Number(t.pmin) : null), [Ne, Mt] = useState(t.pmax ? Number(t.pmax) : null), [Ee, Ft] = useState(t.on || ""), [nt, jt] = useState(() => new Set(t.dates ? t.dates.split("|") : [])), [Pn, _n] = useState(""), [We, Lt] = useState(() => new Set(t.venue ? t.venue.split("|") : [])), [De, Pt] = useState(() => new Set(t.venueNo ? t.venueNo.split("|") : [])), [Ue, _t] = useState(t.atype || ""), [Ge, Vt] = useState(t.country || ""), [Je, Ht] = useState(t.dur || ""), [we, Ut] = useState(t.tod || ""), [qe, Gt] = useState(t.df || ""), [Ye, Jt] = useState(t.dt || ""), [$, qt] = useState(t.smart || ""), [Ze, dn] = useState(!1), [st, kt] = useState(60), [oe, de] = useState(null), [V, cn] = useState(typeof window < "u" && window.innerWidth <= 640), [un, Ie] = useState(!1), [dt, Ct] = useState(null), [gt, pn] = useState(() => {
    try {
      return localStorage.getItem("fringe-public-theme") || "dark"
    } catch {
      return "dark"
    }
  }), [zt, fn] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fringe-public-avail-v1") || "[]")
    } catch {
      return []
    }
  }), [gn, ht] = useState(!1), [hn, vt] = useState(!1), [vn, Yt] = useState(!1), [bn, Zt] = useState(!1);
  const clearFilters = () => { At(""); Nt(""); Et(""); Dt(""); Bt(null); Mt(null); Ft(""); jt(new Set()); _n(""); Lt(new Set()); Pt(new Set()); _t(""); Vt(""); Ht(""); Ut(""); Gt(""); Jt(""); qt(""); setTagFilter(""); };
  useEffect(() => {
    try {
      var e = "fringe-public-data-version",
        r = parseInt(localStorage.getItem(e) || "0", 10);
      r ? r < APP_DATA_VERSION && (localStorage.setItem(e, String(APP_DATA_VERSION)), Zt(!0)) : localStorage.setItem(e, String(APP_DATA_VERSION))
    } catch {}
  }, []);
  const [Ke, Tt] = useState("cards");
  const [cyo_Q, cyo_QS] = useState(""), [cyo_R, cyo_RS] = useState(null), [cyo_L, cyo_LS] = useState(!1);
  const [statsAcc, setStatsAcc] = useState({overview: true, spending: false, friends: false, personal: false, festival: false});
  useEffect(() => { THEME = gt; }, [gt]);
  useEffect(() => {
    const e = () => cn(window.innerWidth <= 640);
    return window.addEventListener("resize", e), () => window.removeEventListener("resize", e)
  }, []);
  const xt = useMemo(() => {
      try {
        const e = (window.location.hash || "").match(/[#&]p=([^&]+)/);
        if (!e) return null;
        const r = LZString.decompressFromEncodedURIComponent(e[1]);
        if (!r) return null;
        if (r.length > 500000) return null;
        var codes = r.split(",");
        if (!Array.isArray(codes)) return null;
        codes = codes.filter(function(c) { return typeof c === "string" && c.length > 0; });
        return codes.length ? codes : null
      } catch {
        return null
      }
    }, []),
    ot = useMemo(() => {
      try {
        const e = (window.location.hash || "").match(/[#&]props=([^&]+)/);
        if (!e) return null;
        var raw = LZString.decompressFromEncodedURIComponent(e[1]);
        if (!raw || raw.length > 500000) return null;
        var parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return parsed.filter(function(l) {
          return l && typeof l === "object";
        }).map(function(l) {
          return {
            title: typeof l.t === "string" ? l.t : "",
            comment: typeof l.c === "string" ? l.c : "",
            date: typeof l.d === "string" ? l.d : "",
            codes: Array.isArray(l.k) ? l.k : []
          };
        })
      } catch {
        return null
      }
    }, []);
  useEffect(() => {
    try {
      const e = (window.location.hash || "").match(/[#&]import=([^&]+)/);
      if (!e) return;
      const r = LZString.decompressFromEncodedURIComponent(e[1]);
      if (!r || r.length > 500000) return;
      const l = JSON.parse(r);
      if (!l || typeof l !== "object") return;
      var importCodes = Array.isArray(l.p) ? l.p.filter(function(c) { return typeof c === "string"; }) : [];
      var importNotes = (l.n && typeof l.n === "object" && !Array.isArray(l.n)) ? l.n : {};
      var cleanNotes = {};
      Object.keys(importNotes).forEach(function(k) {
        if (typeof importNotes[k] === "string") cleanNotes[k] = importNotes[k];
      });
      Ct({
        codes: importCodes,
        notes: cleanNotes
      })
    } catch {}
  }, []);
  var [sharedBookings, setSharedBookings] = useState(null);
  useEffect(function() {
    function goOff() { setIsOffline(true); }
    function goOn() { setIsOffline(false); }
    window.addEventListener("offline", goOff);
    window.addEventListener("online", goOn);
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", function(e) {
        if (e.data && e.data.type === "update-available") {
          try {
            if (sessionStorage.getItem("fringe-just-refreshed")) {
              sessionStorage.removeItem("fringe-just-refreshed");
              return;
            }
          } catch(err) {}
          setUpdateAvail(true);
        }
      });
    }
    return function() { window.removeEventListener("offline", goOff); window.removeEventListener("online", goOn); };
  }, []);
    useEffect(function() {
    try {
      var e = (window.location.hash || "").match(/[#&]share=([^&]+)/);
      if (!e) return;
      var r = LZString.decompressFromEncodedURIComponent(e[1]);
      if (!r || r.length > 500000) return;
      var l = JSON.parse(r);
      if (!Array.isArray(l)) return;
      var SHARE_KEYS = ["code", "c", "date", "d", "start", "s", "end", "e"];
      l = l.filter(function(item) {
        if (!item || typeof item !== "object") return false;
        var code = item.code || item.c;
        return typeof code === "string" && code.length > 0;
      }).map(function(item) {
        var clean = {};
        SHARE_KEYS.forEach(function(k) { if (item[k] !== undefined) clean[k] = item[k]; });
        return clean;
      });
      if (!l.length) return;
      setSharedBookings(l);
      mt("booked");
    } catch(err) {}
  }, []);
  // Handle #stats= link for Fringe Friends
  useEffect(function() {
    try {
      var e = (window.location.hash || "").match(/[#&]stats=([^&]+)/);
      if (!e) return;
      var r = LZString.decompressFromEncodedURIComponent(e[1]);
      if (!r || r.length > 100000) return;
      var data = JSON.parse(r);
      if (!data || !data.n) return;
      var friend = { id: Date.now(), name: data.n, shows: data.s || 0, avg: data.a || 0, fave: data.f || "—" };
      setFringeFriends(function(prev) {
        if (prev.some(function(f) { return f.name === friend.name; })) return prev;
        return prev.concat([friend]);
      });
      mt("reviews");
      setShowLeaderboard(true);
      try { history.replaceState(null, "", window.location.pathname); } catch(err) {}
    } catch(err) {}
  }, []);
  var acceptSharedBookings = function() {
    if (!sharedBookings || !sharedBookings.length) return;
    h(function(prev) {
      var next = {};
      Object.keys(prev).forEach(function(k) { next[k] = prev[k].slice(); });
      sharedBookings.forEach(function(item) {
        var code = item.code || item.c;
        var date = item.date || item.d;
        var start = item.start || item.s;
        var end = item.end || item.e;
        if (!code) return;
        if (!next[code]) next[code] = [];
        var isDup = next[code].some(function(existing) {
          return existing.date === date && existing.start === start;
        });
        if (!isDup) next[code].push({ date: date, start: start, end: end });
      });
      return next;
    });
    setSharedBookings(null);
    try { history.replaceState(null, "", window.location.pathname); } catch(err) {}
  };
  const yn = () => {
    if (dt) {
      w(e => {
        const r = new Set(e);
        return dt.codes.forEach(l => r.add(l)), r
      }), et(e => ({
        ...dt.notes,
        ...e
      })), Ct(null);
      try {
        history.replaceState(null, "", window.location.pathname)
      } catch {}
    }
  };
  useEffect(() => {
    if (typeof window < "u" && window.__FRINGE_PREVIEW__) {
      try {
        o(window.__FRINGE_PREVIEW__), Le(new Date)
      } catch {
        s("Preview data error.")
      }
      return
    }
    DATA_SOURCE === "api" ? loadAllFromApi().then(function(e) {
      o(e.map(parseApiEvent).filter(Boolean)), Le(new Date)
    }).catch(function() {
      return fetch(CSV_URL).then(function(e) {
        if (!e.ok) throw new Error("HTTP " + e.status);
        return e.text()
      }).then(function(e) {
        var r = Papa.parse(e, { header: !0, skipEmptyLines: !0 });
        o(parseRows(r.data))
      }).catch(function(e) { s("Couldn't load show data. The API proxy isn't available and the CSV fallback also failed. (" + (e && e.message || "error") + ")") })
    }) : fetch(CSV_URL).then(e => {
      if (!e.ok) throw new Error("HTTP " + e.status);
      return e.text()
    }).then(e => {
      const r = Papa.parse(e, {
        header: !0,
        skipEmptyLines: !0
      });
      o(parseRows(r.data))
    }).catch(e => s("Couldn't reach the show list. This normally means the page can't fetch from Google Sheets in this preview \u2014 it works once the site is live on its own web address. If it also fails live, check the \u2018All\u2019 tab is still Published to the web as CSV. (" + (e && e.message || "network error") + ")"))
  }, []), useEffect(() => {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify([...d]))
    } catch {}
  }, [d]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-booked-v1", JSON.stringify(p))
    } catch {}
  }, [p]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-wishdate-v1", JSON.stringify(y))
    } catch {}
  }, [y]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-browseview", D)
    } catch {}
  }, [D]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-cardsize", String(v))
    } catch {}
  }, [v]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-tablesize", String(_))
    } catch {}
  }, [_]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-cardfields", JSON.stringify(ue))
    } catch {}
  }, [ue]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-theme", gt)
    } catch {}
    try {
      document.documentElement.setAttribute("data-theme", gt)
    } catch {}
  }, [gt]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-avail-v1", JSON.stringify(zt))
    } catch {}
  }, [zt]), useEffect(() => {
    fetchAdminEmail(function(e) {
      e && tt(String(e))
    })
  }, []), useEffect(() => {
    try {
      document.title = "Fringe " + SITE_YEAR + " \xB7 Plan your shows"
    } catch {}
  }, []), useEffect(() => {
    try {
      var e = (window.location.hash || "").match(/[#&]sync=([^&]+)/);
      if (e) {
        if (window.confirm("Import saved Fringe data (wishlist, bookings, options, availability, settings) from this link? It replaces what is currently on this device.") && importAllData(e[1])) {
          window.location.replace(window.location.pathname);
          return
        }
        try {
          window.history.replaceState(null, "", window.location.pathname)
        } catch {}
      }
    } catch {}
  }, []), useEffect(() => {
    try {
      if (/[#&](props|p|j|jolive|import|sync|share|stats)=/.test(window.location.hash || "")) return
    } catch {}
    var e = ["view=" + Q],
      r = function(l, i) {
        i && e.push(l + "=" + encodeURIComponent(i))
      };
    r("q", Pe), r("genre", _e), r("age", Ve), r("access", He), r("atype", Ue), r("country", Ge), r("dur", Je), r("tod", we), r("df", qe), r("dt", Ye), r("smart", $), r("on", Ee), Ae != null && e.push("pmin=" + Ae), Ne != null && e.push("pmax=" + Ne), We.size && e.push("venue=" + encodeURIComponent([...We].join("|"))), De.size && e.push("venueNo=" + encodeURIComponent([...De].join("|")));
    try {
      history.replaceState(null, "", "#" + e.join("&"))
    } catch {}
  }, [Q, Pe, _e, Ve, He, Ue, Ge, Je, we, qe, Ye, $, Ee, Ae, Ne, We, De]), useEffect(() => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(se))
    } catch {}
  }, [se]), useEffect(function() {
    try {
      localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings))
    } catch {}
  }, [ratings]), useEffect(function() {
    try {
      localStorage.setItem("fringe-public-review-order-v1", JSON.stringify(reviewOrder))
    } catch {}
  }, [reviewOrder]), useEffect(function() {
    try {
      localStorage.setItem("fringe-public-nextyear-v1", JSON.stringify(nextYearList))
    } catch {}
  }, [nextYearList]), useEffect(function() {
    try {
      if (budgetCap != null) localStorage.setItem("fringe-public-budget-v1", JSON.stringify(budgetCap));
      else localStorage.removeItem("fringe-public-budget-v1");
    } catch {}
  }, [budgetCap]), useEffect(function() {
    try {
      localStorage.setItem(COMPANIONS_KEY, JSON.stringify(companions))
    } catch {}
  }, [companions]), useEffect(function() {
    try {
      localStorage.setItem(LTF_KEY, JSON.stringify(ltfData))
    } catch {}
  }, [ltfData]), useEffect(function() {
    try {
      localStorage.setItem(BOOKER_KEY, JSON.stringify(bookerData))
    } catch {}
  }, [bookerData]), useEffect(function() {
    try { localStorage.setItem("fringe-public-compact", compactCards ? "1" : "0"); } catch {}
  }, [compactCards]), useEffect(() => {
    try {
      localStorage.setItem("fringe-public-proposals-v1", JSON.stringify(X))
    } catch {}
  }, [X]);
  useEffect(function() {
    try { localStorage.setItem(FRIENDS_KEY, JSON.stringify(fringeFriends)); } catch {}
  }, [fringeFriends]);
  useEffect(function() {
    try { localStorage.setItem(VENUE_NOTES_KEY, JSON.stringify(venueNotes)); } catch {}
  }, [venueNotes]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-favvenues-v1", JSON.stringify([...favVenues])); } catch {}
  }, [favVenues]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-tickets-v1", JSON.stringify(showTickets)); } catch {}
  }, [showTickets]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-polls-v1", JSON.stringify(groupPolls)); } catch {}
  }, [groupPolls]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-clists-v1", JSON.stringify(customLists)); } catch {}
  }, [customLists]);
  var toggleFavVenue = function(vname) { setFavVenues(function(prev) { var next = new Set(prev); if (next.has(vname)) next.delete(vname); else next.add(vname); return next; }); };
  useEffect(function() {
    try { localStorage.setItem("fringe-public-history-v1", JSON.stringify(fringeHistory)); } catch {}
  }, [fringeHistory]);
  useEffect(function() {
    try { localStorage.setItem(SHOW_TAGS_KEY, JSON.stringify(showTags)); } catch {}
  }, [showTags]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-bkorder-v1", JSON.stringify(bkDayOrder)); } catch {}
  }, [bkDayOrder]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-bkoverview-v1", bkOverviewOpen ? "1" : "0"); } catch(e) {}
  }, [bkOverviewOpen]);
  useEffect(function() {
    try { localStorage.setItem("fringe-public-photos-v1", JSON.stringify(showPhotos)); } catch(e) {
      // If storage is full, don't crash — just skip saving
    }
  }, [showPhotos]);
  // Weather forecast — fetch Edinburgh 7-day from Open-Meteo (free, no key)
  useEffect(function() {
    var WMO = {0:"☀️",1:"🌤",2:"⛅",3:"☁️",45:"🌫",48:"🌫",51:"🌦",53:"🌧",55:"🌧",56:"🌨",57:"🌨",61:"🌧",63:"🌧",65:"🌧️",66:"🌨",67:"🌨",71:"🌨",73:"🌨",75:"❄️",77:"❄️",80:"🌦",81:"🌧",82:"🌧",85:"🌨",86:"❄️",95:"⛈",96:"⛈",99:"⛈"};
    var WMO_LABEL = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",56:"Freezing drizzle",57:"Freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Light showers",81:"Showers",82:"Heavy showers",85:"Snow showers",86:"Heavy snow",95:"Thunderstorm",96:"Hail storm",99:"Hail storm"};
    fetch("https://api.open-meteo.com/v1/forecast?latitude=55.9533&longitude=-3.1883&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon&forecast_days=16")
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data && data.daily && data.daily.time) {
          var map = {};
          data.daily.time.forEach(function(d, i) {
            var code = data.daily.weathercode[i];
            map[d] = {
              icon: WMO[code] || "🌡",
              label: WMO_LABEL[code] || "Unknown",
              high: Math.round(data.daily.temperature_2m_max[i]),
              low: Math.round(data.daily.temperature_2m_min[i]),
              rain: data.daily.precipitation_probability_max[i] || 0
            };
          });
          setWeatherData(map);
        }
      })
      .catch(function() {});
  }, []);
  // Clock tick for countdown timers — updates every 30 seconds
  useEffect(function() {
    var iv = setInterval(function() { setClockTick(function(c) { return c + 1; }); }, 30000);
    return function() { clearInterval(iv); };
  }, []);
  var allUserTags = useMemo(function() {
    var set = {};
    Object.values(showTags).forEach(function(arr) {
      if (Array.isArray(arr)) arr.forEach(function(t) { if (t) set[t] = 1; });
    });
    return Object.keys(set).sort();
  }, [showTags]);
  // Reviews: compute past show codes
  var reviewPastCodes = useMemo(function() {
    var showMap = {};
    (n || []).forEach(function(s) { showMap[s.code] = s; });
    var now = new Date();
    var nowStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var codes = [];
    Object.keys(p).forEach(function(code) {
      var recs = p[code];
      if (!recs || !recs.length) return;
      var s = showMap[code];
      if (!s) return;
      var allPast = recs.every(function(rec) {
        if (!rec.date) return false;
        if (rec.date < nowStr) return true;
        if (rec.date === nowStr) {
          var endMin = timeToMin_(rec.end || s.endStr);
          if (endMin != null) return nowMin > endMin;
          var startMin = timeToMin_(rec.start || s.startStr);
          if (startMin != null) return nowMin > startMin + (s.duration || 60);
          return false;
        }
        return false;
      });
      if (allPast) codes.push(code);
    });
    return codes;
  }, [n, p]);
  // Reviews: sync order with past codes
  useEffect(function() {
    var pastSet = new Set(reviewPastCodes);
    var filtered = reviewOrder.filter(function(c) { return pastSet.has(c); });
    var filteredSet = new Set(filtered);
    reviewPastCodes.forEach(function(c) { if (!filteredSet.has(c)) filtered.push(c); });
    if (filtered.length !== reviewOrder.length || filtered.some(function(c, i) { return reviewOrder[i] !== c; })) {
      setReviewOrder(filtered);
    }
  }, [reviewPastCodes]);
  const Se = e => { w(r => {
      const l = new Set(r);
      return l.has(e) ? l.delete(e) : l.add(e), l
    }); clearFilters(); },
    mn = e => {
      e && jt(r => {
        var l = new Set(r);
        return l.add(e), l
      })
    },
    xn = e => jt(r => {
      var l = new Set(r);
      return l.delete(e), l
    }),
    wn = e => Lt(r => {
      const l = new Set(r);
      return l.has(e) ? l.delete(e) : l.add(e), l
    }),
    Kt = () => Lt(new Set),
    Sn = e => Pt(r => {
      const l = new Set(r);
      return l.has(e) ? l.delete(e) : l.add(e), l
    }),
    Xt = () => Pt(new Set),
    Qt = (e, r) => et(l => {
      const i = {
        ...l
      };
      return r && r.trim() ? i[e] = r : delete i[e], i
    }),
    kn = (e, r) => {
      h(l => ({
        ...l,
        [e]: (l[e] || []).concat([r])
      })), I(null)
    },
    $t = (e, idx) => h(r => {
      const l = {
        ...r
      };
      if (idx != null && Array.isArray(l[e])) {
        l[e] = l[e].filter(function(_, i) { return i !== idx; });
        if (l[e].length === 0) delete l[e];
      } else {
        delete l[e];
      }
      return l
    }),
    updateBk_ = (code, idx, updates) => h(r => {
      const l = { ...r };
      if (Array.isArray(l[code]) && l[code][idx]) {
        l[code] = l[code].map(function(rec, i) { return i === idx ? Object.assign({}, rec, updates) : rec; });
      }
      return l;
    }),
    Be = e => { I(e) },
    Cn = (e, r) => g(l => {
      const i = {
        ...l
      };
      return r ? i[e] = r : delete i[e], i
    }),
    en = e => {
      te(e);
      try {
        localStorage.setItem("fringe-proposal-layout", e)
      } catch {}
    },
    zn = () => xe(e => [...e, {
      id: "pp" + Date.now(),
      title: "New option",
      comment: "",
      date: "",
      codes: []
    }]);
  useEffect(() => {
    try {
      !localStorage.getItem("fringe-proposals-seeded") && X.length === 0 && (xe([{
        id: "pp" + Date.now(),
        title: "New option",
        comment: "",
        date: "",
        codes: []
      }]), localStorage.setItem("fringe-proposals-seeded", "1"))
    } catch {}
  }, []);
  const Wt = (e, r) => xe(l => l.map(i => i.id === e ? {
      ...i,
      ...r
    } : i)),
    Tn = e => xe(r => r.filter(l => l.id !== e)),
    tn = (e, r) => xe(l => l.map(i => i.id === e ? i.codes.includes(r) ? i : {
      ...i,
      codes: [...i.codes, r]
    } : i)),
    wt = (e, r) => {
      if (e === "__new") {
        const l = "pp" + Date.now();
        xe(i => [...i, {
          id: l,
          title: "New option",
          comment: "",
          date: "",
          codes: [r]
        }])
      } else tn(e, r)
    },
    nn = (e, r) => xe(l => l.map(i => i.id === e ? {
      ...i,
      codes: i.codes.filter(u => u !== r)
    } : i)),
    Wn = e => ae(r => ({
      ...r,
      [e]: !r[e]
    })),
    on = e => LZString.compressToEncodedURIComponent(JSON.stringify(e.map(r => ({
      t: r.title,
      c: r.comment,
      d: r.date || "",
      k: r.codes
    })))),
    In = () => {
      if (!X.length) {
        window.alert("Make a proposal first.");
        return
      }
      const e = window.location.origin + window.location.pathname + "#props=" + on(X);
      try {
        navigator.clipboard.writeText(e)
      } catch {}
      window.prompt("Share this read-only link (" + X.length + " option" + (X.length !== 1 ? "s" : "") + "):", e)
    },
    Rn = e => {
      const r = window.location.origin + window.location.pathname + "#props=" + on([e]);
      try {
        navigator.clipboard.writeText(r)
      } catch {}
      window.prompt("Share just this option:", r)
    },
    On = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => r.genre && e.add(r.genre)), [...e].sort()
    }, [n]),
    An = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => r.age && e.add(r.age)), [...e].sort((r, l) => ageNum(r) - ageNum(l))
    }, [n]),
    Vn = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => r.venue && e.add(r.venue)), [...e].sort()
    }, [n]),
    Nn = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => r.venueCode && e.add(r.venueCode)), [...e].sort((r, l) => (Number(r) || 0) - (Number(l) || 0))
    }, [n]),
    rn = useMemo(() => {
      if (!n) return {
        list: [],
        meta: {}
      };
      var e = {};
      n.forEach(function(l) {
        var i = l.venueCode || l.venue;
        i && (e[i] ? (!e[i].pc && l.venuePostcode && (e[i].pc = l.venuePostcode), l.space && e[i].spaces.indexOf(l.space) < 0 && e[i].spaces.push(l.space)) : e[i] = {
          code: l.venueCode || "",
          name: l.venue || "",
          pc: l.venuePostcode || "",
          spaces: l.space ? [l.space] : []
        })
      });
      var r = Object.keys(e).sort(function(l, i) {
        var u = Number(e[l].code) || 99999,
          c = Number(e[i].code) || 99999;
        return u !== c ? u - c : (e[l].name || "").localeCompare(e[i].name || "")
      });
      return {
        list: r,
        meta: e
      }
    }, [n]),
    En = function(e) {
      var r = rn.meta[e];
      if (!r) return e;
      var parts = [];
      if (r.code) parts.push("#" + r.code + " \u2014 ");
      if (r.spaces && r.spaces.length) parts.push(r.spaces.join(", ") + ", ");
      parts.push(r.name || "Venue");
      if (r.pc) parts.push(", " + r.pc);
      return parts.join("");
    },
    Dn = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => r.artistType && e.add(r.artistType)), [...e].sort()
    }, [n]),
    Bn = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => r.country && e.add(r.country)), [...e].sort()
    }, [n]),
    Mn = useMemo(() => {
      if (!n) return [];
      const e = new Set;
      return n.forEach(r => (r.access || "").split(",").forEach(l => {
        const i = l.trim();
        i && e.add(i)
      })), [...e].sort()
    }, [n]),
    Fn = useMemo(() => {
      if (!n) return 50;
      let e = 0;
      return n.forEach(r => {
        const l = poundsOf(r.priceFull);
        !isNaN(l) && l > e && (e = l)
      }), Math.max(10, Math.ceil(e))
    }, [n]),
    It = useMemo(() => {
      if (!n || !$) return null;
      const e = new Set,
        r = (i, u) => {
          if (!i.length) return null;
          const c = i.slice().sort((T, B) => T - B);
          return c[Math.min(c.length - 1, Math.floor(c.length * u))]
        },
        l = (i, u) => {
          if (!i || !u) return null;
          const c = new Date(i + "T12:00:00"),
            T = new Date(u + "T12:00:00");
          return isNaN(c.getTime()) || isNaN(T.getTime()) ? null : Math.round((T - c) / 864e5)
        };
      if ($ === "short") n.forEach(i => {
        const u = l(i.first, i.last);
        u != null && u <= 3 && e.add(i.code)
      });
      else if ($ === "free") n.forEach(i => {
        poundsOf(i.priceFull) === 0 && e.add(i.code)
      });
      else if ($ === "expensive") {
        const i = n.map(c => poundsOf(c.priceFull)).filter(c => !isNaN(c) && c > 0),
          u = r(i, .75);
        n.forEach(c => {
          const T = poundsOf(c.priceFull);
          !isNaN(T) && T > 0 && u != null && T >= u && e.add(c.code)
        })
      } else if ($ === "cheap") {
        const i = n.map(c => poundsOf(c.priceFull)).filter(c => !isNaN(c) && c > 0),
          u = r(i, .25);
        n.forEach(c => {
          const T = poundsOf(c.priceFull);
          !isNaN(T) && T > 0 && u != null && T <= u && e.add(c.code)
        })
      } else if ($ === "big") {
        const i = n.map(c => parseInt(c.performers) || 0).filter(c => c > 0),
          u = r(i, .75);
        n.forEach(c => {
          const T = parseInt(c.performers) || 0;
          T > 0 && u != null && T >= u && e.add(c.code)
        })
      } else if ($ === "longest") {
        const i = n.map(c => c.duration || 0).filter(c => c > 0),
          u = r(i, .75);
        n.forEach(c => {
          c.duration && u != null && c.duration >= u && e.add(c.code)
        })
      } else if ($ === "shortest") {
        const i = n.map(c => c.duration || 0).filter(c => c > 0),
          u = r(i, .25);
        n.forEach(c => {
          c.duration && u != null && c.duration <= u && e.add(c.code)
        })
      } else if ($ === "quiet") {
        const i = {};
        n.forEach(c => {
          const T = c.venue || "?";
          i[T] = (i[T] || 0) + 1
        });
        const u = r(Object.keys(i).map(c => i[c]), .25);
        n.forEach(c => {
          u != null && (i[c.venue || "?"] || 0) <= u && e.add(c.code)
        })
      } else if ($ === "rare" || $ === "pop") {
        const i = {};
        n.forEach(c => {
          c.genre && (i[c.genre] = (i[c.genre] || 0) + 1)
        });
        const u = Object.keys(i).map(c => [c, i[c]]);
        if (u.length) {
          u.sort((T, B) => T[1] - B[1]);
          const c = $ === "rare" ? u[0][0] : u[u.length - 1][0];
          n.forEach(T => {
            T.genre === c && e.add(T.code)
          })
        }
      }
      return e
    }, [n, $]),
    an = e => {
      if ($ && It && !It.has(e.code) || _e && e.genre !== _e || Ve && e.age !== Ve || He && !(e.access || "").toLowerCase().includes(He.toLowerCase()) || We.size && !(We.has(e.venueCode) || We.has(e.venue)) || De.size && !De.has(e.venueCode) || Ue && e.artistType !== Ue || Ge && e.country !== Ge || Je && (!e.duration || e.duration > Number(Je))) return !1;
      if (we) {
        var r = timeToMin_(e.startStr);
        if (r == null || we === "morning" && !(r >= 360 && r < 720) || we === "afternoon" && !(r >= 720 && r < 1020) || we === "evening" && !(r >= 1020 && r < 1320) || we === "late" && !(r >= 1320 || r < 360)) return !1
      }
      if (qe && e.last && e.last < qe || Ye && e.first && e.first > Ye) return !1;
      if (Ae != null) {
        const i = poundsOf(e.priceFull);
        if (!isNaN(i) && i < Ae) return !1
      }
      if (Ne != null) {
        const i = poundsOf(e.priceFull);
        if (!isNaN(i) && i > Ne) return !1
      }
      if (Ee && (e.first && Ee < e.first || e.last && Ee > e.last)) return !1;
      if (nt && nt.size) {
        var l;
        if (e.performances && e.performances.length ? l = e.performances.some(function(i) {
            return nt.has(i.date)
          }) : (l = !1, nt.forEach(function(i) {
            (!e.first || i >= e.first) && (!e.last || i <= e.last) && (l = !0)
          })), !l) return !1
      }
      if (Pe.trim()) {
        const i = Pe.toLowerCase();
        if (!(e.title + " " + e.artist + " " + (e.space || "") + " " + e.venue + " " + e.genre + " " + e.tags.join(" ") + " " + (showTags[e.code] || []).join(" ") + " " + e.teaser).toLowerCase().includes(i)) return !1
      }
      if (compFilter) { var _hasComp = (companions[e.code] && companions[e.code].split(",").some(function(n) { return n.trim() === compFilter; })) || (p[e.code] && p[e.code].some(function(rec) { return rec.companions && rec.companions.split(",").some(function(n) { return n.trim() === compFilter; }); })); if (!_hasComp) return !1; }
      if (tagFilter && !(showTags[e.code] && showTags[e.code].indexOf(tagFilter) >= 0)) return !1;
      return !0
    },
    Xe = useMemo(function() {
      var filtered = n ? n.filter(an) : [];
      if (!Qe) return filtered;
      var dir = $e === "desc" ? -1 : 1;
      function sortVal(x) {
        switch (Qe) {
          case "title": return (x.title || "").toLowerCase();
          case "artist": return (x.artist || "").toLowerCase();
          case "venue": return (x.venue || "").toLowerCase();
          case "genre": return (x.genre || "").toLowerCase();
          case "dates": return x.first || "9999-99-99";
          case "start": { var v = timeToMin_(x.startStr); return v != null ? v : 99999; }
          case "duration": { var v = Number(x.duration); return isNaN(v) ? 99999 : v; }
          case "price": { var v = poundsOf(x.priceFull); return isNaN(v) ? -1 : v; }
          default: return "";
        }
      }
      return filtered.slice().sort(function(a, b) {
        var va = sortVal(a), vb = sortVal(b);
        return va < vb ? -1 * dir : va > vb ? 1 * dir : 0;
      });
    }, [n, Pe, _e, Ve, He, Ae, Ne, Ee, nt, We, De, Ue, Ge, Je, we, qe, Ye, $, It, compFilter, companions, tagFilter, showTags, Qe, $e]),
    Me_ = useMemo(() => n ? n.filter(e => d.has(e.code)) : [], [n, d]),
    Me = useMemo(function() {
      var arr = Me_.slice();
      if (wishSort === "alpha") arr.sort(function(a, b) { return (a.title || "").localeCompare(b.title || ""); });
      else if (wishSort === "time") arr.sort(function(a, b) { return (a.startStr || "99:99").localeCompare(b.startStr || "99:99"); });
      else if (wishSort === "venue") arr.sort(function(a, b) { return (a.venue || "").localeCompare(b.venue || ""); });
      return arr;
    }, [Me_, wishSort]),
    ln = useMemo(() => {
      if (!n || !xt) return [];
      const e = new Set(xt);
      return n.filter(r => e.has(r.code))
    }, [n, xt]);
  useEffect(() => {
    kt(D === "table" ? _ : v)
  }, [D, v, _, Pe, _e, Ve, He, Ae, Ne, Ee, We, De, Ue, Ge, Je, we, qe, Ye, $]);
  const me = Pe || _e || Ve || He || Ae != null || Ne != null || Ee || nt.size || We.size || De.size || Ue || Ge || Je || we || qe || Ye || $ || tagFilter,
    Rt = () => {
      At(""), Nt(""), Et(""), Dt(""), Bt(null), Mt(null), Ft(""), Kt(), Xt(), _t(""), Vt(""), Ht(""), Ut(""), Gt(""), Jt(""), qt("")
    },
    Hn = () => {
      const e = LZString.compressToEncodedURIComponent([...d].join(",")),
        r = window.location.origin + window.location.pathname + "#p=" + e;
      try {
        navigator.clipboard.writeText(r)
      } catch {}
      window.prompt("Share this read-only link (" + d.size + " shows):", r)
    },
    Un = () => {
      const e = {};
      [...d].forEach(i => {
        se[i] && (e[i] = se[i])
      });
      const r = LZString.compressToEncodedURIComponent(JSON.stringify({
          p: [...d],
          n: e
        })),
        l = window.location.origin + window.location.pathname + "#import=" + r;
      try {
        navigator.clipboard.writeText(l)
      } catch {}
      window.prompt("Open this link on your other device to copy your plan + notes across (no login needed):", l)
    };
  if (!n && !a) return React.createElement("div", {
    role: "status",
    "aria-live": "polite"
  }, React.createElement("div", {
    className: "spin",
    "aria-hidden": "true"
  }), React.createElement("div", {
    style: {
      textAlign: "center",
      color: C.txt2
    }
  }, "Loading all Fringe ", SITE_YEAR, " shows\u2026"));
  if (a) return React.createElement("div", {
    style: {
      textAlign: "center",
      padding: 40,
      color: "#fca5a5"
    }
  }, a);
  if (xt) return React.createElement("div", {
    style: {
      maxWidth: 1e3,
      margin: "0 auto",
      padding: "0 12px 40px"
    }
  }, React.createElement("div", {
    style: {
      textAlign: "center",
      padding: "26px 12px 16px",
      borderBottom: "1px solid " + C.border,
      marginBottom: 16
    }
  }, React.createElement("div", {
    style: {
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: C.txt2
    }
  }, "Edinburgh Fringe ", SITE_YEAR), React.createElement("h1", {
    style: {
      fontSize: 26,
      fontWeight: 900,
      margin: "6px 0 0",
      background: "linear-gradient(90deg,var(--pink),var(--accent))",
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent"
    }
  }, "A shared shortlist"), React.createElement("div", {
    style: {
      fontSize: 13,
      color: C.txt3,
      marginTop: 4
    }
  }, ln.length, " shows \xB7 read-only"), React.createElement("a", {
    href: window.location.pathname,
    style: {
      display: "inline-block",
      marginTop: 12,
      padding: "9px 18px",
      borderRadius: 11,
      background: C.accent,
      color: "#fff",
      textDecoration: "none",
      fontSize: 14,
      fontWeight: 800
    }
  }, "Build your own plan \u2192")), React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
      gridAutoRows: "1fr",
      gap: 12
    }
  }, ln.map(e => React.createElement(ShowCard, {
    key: e.code,
    s: e,
    inPlan: d.has(e.code),
    isBk: !!(p[e.code] && p[e.code].length),
    hasNote: !!se[e.code],
    rating: ratings[e.code] || 0,
    onWish: () => Se(e.code),
    onBook: () => Be(e),
    onOpen: () => de(e)
  }))), React.createElement(Detail, {
    s: oe,
    inPlan: oe && d.has(oe.code),
    note: oe && se[oe.code],
    onNote: Qt,
    onToggle: () => oe && Se(oe.code),
    onClose: () => de(null)
  }));
  if (ot) {
    const e = {};
    (n || []).forEach(l => e[l.code] = l);
    const r = ot.length > 1;
    return React.createElement("div", {
      style: {
        maxWidth: r && W === "horizontal" ? 1200 : 760,
        margin: "0 auto",
        padding: "0 12px 40px"
      }
    }, React.createElement("div", {
      style: {
        textAlign: "center",
        padding: "26px 12px 16px",
        borderBottom: "1px solid " + C.border,
        marginBottom: 16
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: C.txt2
      }
    }, "Edinburgh Fringe ", SITE_YEAR), React.createElement("h1", {
      style: {
        fontSize: 26,
        fontWeight: 900,
        margin: "6px 0 0",
        background: "linear-gradient(90deg,var(--pink),var(--accent))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }
    }, r ? ot.length + " options for you" : ot[0].title || "A suggestion"), React.createElement("div", {
      style: {
        fontSize: 13,
        color: C.txt3,
        marginTop: 4
      }
    }, "Shared \xB7 read-only", r ? " \xB7 pick your favourite" : "")), React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
        margin: "0 2px 14px",
        flexWrap: "wrap"
      }
    }, r ? React.createElement(LayoutToggle, {
      layout: W,
      set: en
    }) : React.createElement("span", null), React.createElement("a", {
      href: window.location.pathname,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "7px 14px",
        borderRadius: 20,
        background: C.accent,
        color: "#fff",
        textDecoration: "none",
        fontSize: 12,
        fontWeight: 800
      }
    }, React.createElement(ScheduleIcon, null), " Build your own")), React.createElement("div", {
      style: r && W === "horizontal" ? {
        display: "grid",
        gridTemplateColumns: ot.length >= 3 ? "repeat(auto-fill,minmax(300px,1fr))" : "repeat(" + ot.length + ",minmax(0,1fr))",
        gap: 16,
        alignItems: "start",
        padding: "0 8px"
      } : {}
    }, ot.map((l, i) => {
      const u = l.codes.map(c => e[c]).filter(Boolean).sort(function(c, T) {
        var B = timeToMin_(c.startStr),
          j = timeToMin_(T.startStr);
        return (B ?? 99999) - (j ?? 99999)
      });
      return React.createElement("div", {
        key: i,
        style: {
          marginBottom: r && W !== "horizontal" ? 26 : 0
        }
      }, r && React.createElement("h2", {
        style: {
          fontSize: 18,
          fontWeight: 800,
          margin: "8px 2px 6px"
        }
      }, l.title || "Option " + (i + 1)), l.comment && React.createElement("div", {
        style: {
          fontSize: 14,
          color: C.txt2,
          lineHeight: 1.5,
          background: "rgba(168,85,247,0.1)",
          border: "1px solid rgba(168,85,247,0.25)",
          borderRadius: 12,
          padding: "10px 14px",
          margin: "4px 2px 12px"
        }
      }, "\u{1F4AC} ", l.comment), l.date && React.createElement("div", {
        style: {
          fontSize: 13,
          color: C.txt2,
          fontWeight: 700,
          margin: "0 2px 8px"
        }
      }, "\u{1F5D3} ", dateRange(l.date, l.date)), u.length > 0 && function() {
        var c = u.map(function(j) {
            var H = timeToMin_(j.startStr);
            if (H == null) return null;
            var m = timeToMin_(j.endStr);
            return H < 360 && (H += 1440), m == null || m <= H ? m = H + (j.duration || 60) : m < 360 && (m += 1440), {
              st: H,
              en: m
            }
          }).filter(Boolean).sort(function(j, H) {
            return j.st - H.st
          }),
          T = u.reduce(function(j, H) {
            return j + (H.duration || 0)
          }, 0),
          B = u.reduce(function(j, H) {
            return j + (typeof H.priceFull == "number" ? H.priceFull : 0)
          }, 0);
        return React.createElement("div", {
          style: {
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 700,
            color: C.txt2,
            marginBottom: 10,
            padding: "8px 11px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10
          }
        }, c.length ? React.createElement("span", null, "\u23F1 ", fmtMin_(c[0].st), "\u2013", fmtMin_(c[c.length - 1].en)) : React.createElement("span", null, "No timed shows"), T ? React.createElement("span", null, "\xB7 ", Math.floor(T / 60), "h ", T % 60, "m of shows") : null, React.createElement("span", {
          style: {
            color: C.txt,
            fontWeight: 800
          }
        }, "\xB7 \u{1F4B7} \xA3", (Math.round(B * 100) / 100).toString(), " total"))
      }(), u.length > 0 && React.createElement("div", {
        style: {
          marginBottom: 12
        }
      }, React.createElement(TimedDay, {
        items: u,
        onOpen: de
      })))
    })))
  }
  const bt = Q !== "browse",
    pe = (e, r, l) => React.createElement("button", {
      onClick: () => {
        if (e === "help") {
          G(!0);
          return
        }
        mt(e), Ie(!1), clearFilters()
      },
      title: r,
      "aria-label": r,
      style: V ? {
        flex: "1 1 0",
        minWidth: 0,
        height: 44,
        padding: "0 2px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: Q === e ? "rgba(168,85,247,0.22)" : "transparent",
        color: Q === e ? "#c084fc" : C.txt2
      } : {
        padding: "8px 16px",
        borderRadius: 20,
        border: "1px solid " + C.border,
        cursor: "pointer",
        fontWeight: 800,
        flex: "none",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        background: Q === e ? C.txt : "transparent",
        color: Q === e ? C.bg : C.txt2
      }
    }, React.createElement("span", {
      style: {
        fontSize: V ? 20 : 15,
        lineHeight: 1
      }
    }, l), !V && React.createElement("span", {
      style: {
        fontSize: 14
      }
    }, r));
  return React.createElement("div", {
    style: {
      maxWidth: 1100,
      margin: "0 auto",
      padding: V ? "0 14px calc(112px + env(safe-area-inset-bottom))" : "0 16px 50px"
    }
  }, React.createElement("a", {
    href: "#main",
    className: "skip"
  }, "Skip to main content"), isOffline && React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      background: "rgba(251,191,36,0.15)",
      border: "1px solid #f59e0b",
      borderRadius: 10,
      padding: "8px 14px",
      margin: "10px 0 0",
      display: "flex",
      gap: 8,
      alignItems: "center",
      fontSize: 13,
      color: "#fbbf24"
    }
  }, "\u26A0\uFE0F You're offline \u2014 showing cached data"), updateAvail && React.createElement("div", {
    id: "fringe-update-toast",
    role: "status",
    style: {
      background: "rgba(168,85,247,0.15)",
      border: "1px solid " + C.accent,
      borderRadius: 10,
      padding: "8px 14px",
      margin: "10px 0 0",
      display: "flex",
      gap: 8,
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: 13,
      color: C.txt
    }
  }, "\u2728 A new version is available", React.createElement("button", {
    onClick: function() {
      setUpdateAvail(false);
      try { sessionStorage.setItem("fringe-just-refreshed", "1"); } catch(err) {}
      window.location.reload();
    },
    style: {
      padding: "5px 12px",
      borderRadius: 8,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontSize: 12,
      fontWeight: 800,
      cursor: "pointer"
    }
  }, "Refresh")), bn && React.createElement("div", {
    role: "status",
    style: {
      background: "rgba(168,85,247,0.14)",
      border: "1px solid " + C.accent,
      borderRadius: 12,
      padding: "10px 14px",
      margin: "10px 0 0",
      display: "flex",
      gap: 10,
      alignItems: "center",
      flexWrap: "wrap",
      fontSize: 13
    }
  }, React.createElement("span", {
    style: {
      color: C.txt,
      flex: "1 1 220px"
    }
  }, "\u2728 The planner's been updated \u2014 your wishlist, bookings and options are safe. Grab a backup just in case."), React.createElement("button", {
    onClick: downloadBackup,
    style: {
      padding: "7px 13px",
      borderRadius: 9,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer",
      fontSize: 12
    }
  }, "\u2B07 Download backup"), React.createElement("button", {
    onClick: () => Zt(!1),
    style: {
      padding: "7px 11px",
      borderRadius: 9,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontWeight: 700,
      cursor: "pointer",
      fontSize: 12
    }
  }, "Dismiss")), function() {
    var e = {
        browse: "Browse all",
        plan: "Wishlist",
        booked: "Bookings",
        calendar: "Calendar",
        planner: "Planner",
        proposals: "Pitch a Day!",
        map: "Map",
        stats: "Stats"
      } [Q] || "",
      r = {
        width: 40,
        height: 36,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 9,
        border: "1px solid " + C.border,
        background: "transparent",
        color: C.txt2,
        cursor: "pointer",
        flexShrink: 0
      };
    return React.createElement(React.Fragment, null, React.createElement("div", {
      role: "banner",
      style: bt ? {
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: C.bg,
        borderBottom: "1px solid " + C.border
      } : {}
    }, React.createElement("div", {
      style: {
        position: "relative",
        textAlign: "center",
        padding: bt ? "9px 12px 12px" : (V ? "58px 12px 12px" : "22px 12px 12px")
      }
    }, React.createElement("div", {
      style: {
        position: "absolute",
        left: 12,
        top: bt ? 7 : 14,
        display: "flex",
        gap: 6,
        alignItems: "center"
      }
    }, V ? React.createElement("button", {
      onClick: function() { setBurgerOpen(!burgerOpen); },
      "aria-label": "Menu",
      title: "Menu",
      style: {width: 40, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 18, cursor: "pointer", padding: 0}
    }, burgerOpen ? "✕" : "☰") : React.createElement(React.Fragment, null, React.createElement(ThemeToggleCollapsible, {
      theme: gt,
      set: pn
    }), React.createElement("button", {
      onClick: () => Yt(!0),
      "aria-label": "Copy my data to another device",
      title: "Copy my data to another device",
      style: r
    }, React.createElement(SyncIcon, null)))), !V && React.createElement("div", { style: { position: "absolute", right: 12, top: bt ? 7 : 14 } },
      React.createElement("button", {
        onClick: function() { setHelpDropOpen(!helpDropOpen); },
        "aria-label": "Help menu",
        title: "Help",
        style: Object.assign({}, r)
      }, React.createElement(HelpIcon, null)),
      helpDropOpen && React.createElement(React.Fragment, null,
        React.createElement("div", { onClick: function() { setHelpDropOpen(false); }, style: { position: "fixed", inset: 0, zIndex: 99 } }),
        React.createElement("div", {
          style: { position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 100, background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: 4, minWidth: 180, boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }
        },
          React.createElement("button", {
            onClick: function() { G(true); setHelpDropOpen(false); },
            style: { display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: C.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 6 },
            onMouseEnter: function(ev) { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; },
            onMouseLeave: function(ev) { ev.currentTarget.style.background = "transparent"; }
          }, "\u2753 Help & About"),
          React.createElement("button", {
            onClick: function() { setGuideOpen(true); setHelpDropOpen(false); },
            style: { display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: C.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 6 },
            onMouseEnter: function(ev) { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; },
            onMouseLeave: function(ev) { ev.currentTarget.style.background = "transparent"; }
          }, "\u{1F4D6} How to Guide")
        )
      )), bt ? React.createElement("div", {
      style: {
        padding: V ? "0 62px" : "0 96px"
      }
    }, React.createElement("div", {
      onClick: () => { mt("browse"); clearFilters(); },
      title: "Back to Edinburgh Fringe home",
      style: {
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: C.txt2,
        cursor: "pointer",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
      }
    }, V ? "Fringe " : "Edinburgh Fringe ", SITE_YEAR), React.createElement("div", {
      style: {
        fontSize: V ? 21 : 26,
        fontWeight: 900,
        margin: "1px auto 0",
        maxWidth: "100%",
        background: "linear-gradient(90deg,var(--pink),var(--accent))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis"
      }
    }, e)) : React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: C.txt2
      }
    }, "Edinburgh"), React.createElement("h1", {
      style: {
        fontSize: V ? 30 : 34,
        fontWeight: 900,
        margin: "2px 0 0",
        background: "linear-gradient(90deg,var(--pink),var(--accent))",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent"
      }
    }, "FRINGE ", SITE_YEAR)))), !V && React.createElement("div", {
      role: "navigation",
      "aria-label": "Sections",
      style: {
        display: "flex",
        gap: 6,
        justifyContent: "center",
        flexWrap: "wrap",
        marginBottom: 12,
        marginTop: 8
      }
    }, pe("booked", "Bookings", "\u{1F3AB}"), pe("browse", "Browse all", "\u{1F3AD}"), pe("calendar", "Calendar", "\u{1F4C5}"), pe("map", "Map", "\u{1F5FA}\uFE0F"), pe("nextyear", "Next Yr", "\u{1F52E}"), pe("proposals", "Pitch a Day!", "\u{1F4CB}"), pe("planner", "Planner", "\u{1F9ED}"), pe("reviews", "Reviews", "\u2B50"), pe("stats", "Stats", "\u{1F4CA}"), pe("plan", "Wishlist", "\u{1FA84}")))
  }(), V && burgerOpen && React.createElement("div", {
    onClick: function(ev) { if (ev.target === ev.currentTarget) setBurgerOpen(false); },
    style: { position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }
  }, React.createElement("div", {
    style: { position: "absolute", top: 0, left: 0, bottom: 0, width: 260, background: C.card, boxShadow: "4px 0 24px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", padding: "0", overflowY: "auto" }
  },
    React.createElement("div", { style: { padding: "18px 16px 10px", borderBottom: "1px solid " + C.border } },
      React.createElement("div", { style: { fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: C.txt2 } }, "Edinburgh Fringe"),
      React.createElement("div", { style: { fontSize: 22, fontWeight: 900, background: "linear-gradient(90deg,var(--pink),var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } }, "PLANNER ", SITE_YEAR)),
    React.createElement("div", { style: { padding: "12px 10px", flex: 1 } },
      [["booked", "Bookings", "\u{1F3AB}"], ["browse", "Browse All", "\u{1F3AD}"], ["calendar", "Calendar", "\u{1F4C5}"], ["map", "Map", "\u{1F5FA}\uFE0F"], ["nextyear", "Next Year", "\u{1F52E}"], ["proposals", "Pitch a Day!", "\u{1F4CB}"], ["planner", "Planner", "\u{1F9ED}"], ["reviews", "Reviews", "\u2B50"], ["stats", "Stats", "\u{1F4CA}"], ["plan", "Wishlist", "\u{1FA84}"]].map(function(item) {
        var isActive = Q === item[0];
        return React.createElement("button", {
          key: item[0],
          onClick: function() { mt(item[0]); clearFilters(); setBurgerOpen(false); },
          style: { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 12px", marginBottom: 2, borderRadius: 10, border: "none", background: isActive ? "rgba(168,85,247,0.15)" : "transparent", color: isActive ? C.accent : C.txt, fontSize: 14, fontWeight: isActive ? 700 : 500, cursor: "pointer", textAlign: "left" }
        }, React.createElement("span", { style: { fontSize: 18 } }, item[2]), item[1]);
      })),
    React.createElement("div", { style: { padding: "12px 14px", borderTop: "1px solid " + C.border } },
      React.createElement("div", { style: { fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: C.txt3, letterSpacing: 0.5, marginBottom: 8 } }, "Theme"),
      React.createElement("div", { style: { display: "flex", gap: 6 } },
        [["dark", "\u{1F31A}", "Dark"], ["light", "\u2600\uFE0F", "Light"], ["nocolor", "\u26AB", "B&W"]].map(function(th) {
          var isActive = gt === th[0];
          return React.createElement("button", {
            key: th[0],
            onClick: function() { pn(th[0]); },
            style: { flex: 1, padding: "7px 0", borderRadius: 8, border: isActive ? "2px solid " + C.accent : "1px solid " + C.border, background: isActive ? "rgba(168,85,247,0.12)" : "transparent", color: isActive ? C.accent : C.txt2, fontSize: 11, fontWeight: isActive ? 700 : 500, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }
          }, React.createElement("span", { style: { fontSize: 16 } }, th[1]), th[2]);
        })),
      React.createElement("button", {
        onClick: function() { Yt(true); setBurgerOpen(false); },
        style: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginTop: 10, borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, fontWeight: 500, cursor: "pointer" }
      }, React.createElement(SyncIcon, null), "Sync Data"),
      React.createElement("button", {
        onClick: function() { G(true); setBurgerOpen(false); },
        style: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginTop: 4, borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, fontWeight: 500, cursor: "pointer" }
      }, React.createElement(HelpIcon, null), "Help & About"),
      React.createElement("button", {
        onClick: function() { setGuideOpen(true); setBurgerOpen(false); },
        style: { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 12px", marginTop: 4, borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, fontWeight: 500, cursor: "pointer" }
      }, "\u{1F4D6} How to Guide")))),
  dt && React.createElement("div", {
    style: {
      maxWidth: 560,
      margin: "14px auto",
      background: "rgba(168,85,247,0.14)",
      border: "1px solid " + C.accent,
      borderRadius: 12,
      padding: "12px 16px",
      textAlign: "center"
    }
  }, React.createElement("div", {
    style: {
      fontSize: 14,
      color: C.txt
    }
  }, "Import ", React.createElement("b", null, dt.codes.length), " shows", Object.keys(dt.notes).length ? " + notes" : "", " from another device to this browser?"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      marginTop: 10
    }
  }, React.createElement("button", {
    onClick: yn,
    style: {
      padding: "8px 16px",
      borderRadius: 10,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontWeight: 800,
      cursor: "pointer"
    }
  }, "Import to this device"), React.createElement("button", {
    onClick: () => {
      Ct(null);
      try {
        history.replaceState(null, "", window.location.pathname)
      } catch {}
    },
    style: {
      padding: "8px 16px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontWeight: 700,
      cursor: "pointer"
    }
  }, "Not now"))), Q === "browse" && React.createElement("div", {
    style: {
      maxWidth: 520,
      margin: "0 auto",
      padding: "10px 12px 0"
    }
  }, React.createElement("div", {
    style: {
      position: "relative"
    }
  }, React.createElement("input", {
    value: Pe,
    onChange: function(ev) { At(ev.target.value); if (Q !== "browse") mt("browse"); },
    "aria-label": "Search shows, artists and venues",
    placeholder: "\u{1F50D} Search shows, artists, venues\u2026",
    style: {
      width: "100%",
      padding: "11px 40px 11px 16px",
      borderRadius: 12,
      border: "1px solid " + C.border,
      background: C.card,
      color: C.txt,
      fontSize: 15,
      outline: "none",
      boxSizing: "border-box"
    }
  }), Pe && React.createElement("button", {
    onClick: function() { At(""); },
    "aria-label": "Clear search",
    style: {
      position: "absolute",
      right: 10,
      top: "50%",
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      color: C.txt3,
      fontSize: 18,
      cursor: "pointer",
      padding: "2px 6px",
      lineHeight: 1
    }
  }, "\u2715"))), React.createElement("div", {
    id: "main",
    tabIndex: -1,
    style: {
      outline: "none",
      height: V ? 14 : 8
    }
  }), Q === "stats" && function() {
    var e = {};
    (n || []).forEach(function(z) {
      e[z.code] = z
    });
    var r = Object.keys(p).flatMap(function(z) {
        return (p[z] || []).map(function(rec, ri) {
          return { code: z, rec: rec, s: e[z], bIdx: ri }
        })
      }).filter(function(z) {
        return z.s
      }),
      l = r.length,
      i = r.reduce(function(z, L) {
        return z + perfPrice_(L.s, L.rec)
      }, 0),
      u = r.reduce(function(z, L) {
        var ce = timeToMin_(L.rec.start || L.s.startStr),
          be = timeToMin_(L.rec.end || L.s.endStr),
          Ot = ce != null && be != null && be > ce ? be - ce : L.s.duration || 0;
        return z + Ot
      }, 0),
      c = {};
    r.forEach(function(z) {
      z.rec.date && (c[z.rec.date] = (c[z.rec.date] || 0) + 1)
    });
    var T = Object.keys(c),
      _bMax = T.length ? Math.max.apply(null, T.map(function(z) { return c[z]; })) : 0,
      B = T.filter(function(z) { return c[z] === _bMax; }),
      j = r.filter(function(z) {
        return perfPrice_(z.s, z.rec) > 0
      }).sort(function(z, L) {
        return perfPrice_(L.s, L.rec) - perfPrice_(z.s, z.rec)
      }),
      _topPrice = j.length ? perfPrice_(j[0].s, j[0].rec) : 0,
      H = j.filter(function(z) { return perfPrice_(z.s, z.rec) === _topPrice; }),
      _botPrice = j.length ? perfPrice_(j[j.length - 1].s, j[j.length - 1].rec) : 0,
      m = j.filter(function(z) { return perfPrice_(z.s, z.rec) === _botPrice; }),
      re = r.filter(function(z) {
        return !perfPrice_(z.s, z.rec)
      }).length,
      ge = Me.filter(function(z) {
        return !(p[z.code] && p[z.code].length)
      }),
      ke = ge.reduce(function(z, L) {
        return z + (typeof L.priceFull == "number" ? L.priceFull : 0)
      }, 0),
      he = ge.reduce(function(z, L) {
        return z + (L.duration || 0)
      }, 0),
      ve = {},
      Ce = {};
    r.forEach(function(z) {
      z.s.genre && (ve[z.s.genre] = (ve[z.s.genre] || 0) + 1), z.s.venue && (Ce[venueLabel_(z.s)] = (Ce[venueLabel_(z.s)] || 0) + 1)
    });
    var Fe = function(z, L) {
        return Object.keys(z).map(function(ce) {
          return {
            key: ce,
            v: z[ce]
          }
        }).sort(function(ce, be) {
          return be.v - ce.v
        }).slice(0, L || 6)
      },
      ze = function(z) {
        var L = new Date(z + "T12:00:00");
        return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][L.getDay()] + " " + dateRange(z, z)
      },
      le = function(z, L, ce) {
        return React.createElement("div", {
          style: {
            background: C.card,
            border: "1px solid " + C.border,
            borderRadius: 14,
            padding: "16px 18px",
            flex: "1 1 130px",
            minWidth: 0
          }
        }, React.createElement("div", {
          style: {
            fontSize: 26,
            fontWeight: 900,
            color: ce || C.accent,
            lineHeight: 1.1
          }
        }, z), React.createElement("div", {
          style: {
            fontSize: 12,
            color: C.txt2,
            fontWeight: 700,
            marginTop: 3
          }
        }, L))
      },
      je = function(z, L, ce) {
        return React.createElement("div", {
          style: {
            marginBottom: 18
          }
        }, React.createElement("div", {
          style: {
            fontSize: 12,
            color: C.txt3,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: .5,
            marginBottom: 8
          }
        }, L), z.map(function(be) {
          return React.createElement("div", {
            key: be.key,
            style: {
              marginBottom: 6
            }
          }, React.createElement("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 2
            }
          }, React.createElement("span", {
            style: {
              color: C.txt,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              paddingRight: 8
            }
          }, be.key), React.createElement("span", {
            style: {
              color: C.txt2,
              fontWeight: 800,
              flexShrink: 0
            }
          }, be.v)), React.createElement("div", {
            style: {
              height: 7,
              borderRadius: 4,
              background: "rgba(255,255,255,0.08)"
            }
          }, React.createElement("div", {
            style: {
              height: 7,
              borderRadius: 4,
              width: Math.round(be.v / (ce || 1) * 100) + "%",
              background: "linear-gradient(90deg,var(--pink),var(--accent))"
            }
          })))
        }))
      };
    var accHead = function(key, icon, label) {
      return React.createElement("div", {
        onClick: function() { setStatsAcc(function(prev) { var next = {}; for (var k in prev) next[k] = prev[k]; next[key] = !prev[key]; return next; }); },
        style: {
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 0", cursor: "pointer", borderBottom: "1px solid " + C.border,
          marginTop: 16, userSelect: "none"
        }
      },
        React.createElement("div", {style: {fontSize: 17, fontWeight: 900}}, icon + " " + label),
        React.createElement("span", {style: {fontSize: 18, color: C.txt3, transition: "transform 0.2s", transform: statsAcc[key] ? "rotate(180deg)" : "rotate(0deg)"}}, "\u25BE")
      );
    };
    return React.createElement(React.Fragment, null, l === 0 && Me.length === 0 ? React.createElement("div", {
      style: {
        textAlign: "center",
        color: C.txt3,
        fontSize: 15,
        padding: "50px 12px"
      }
    }, "No stats yet \u2014 mark some shows as ", React.createElement("b", {
      style: {
        color: C.txt2
      }
    }, "booked"), " and they will add up here.") : React.createElement("div", null, React.createElement("p", {
      style: {
        fontSize: 13,
        color: C.txt2,
        margin: "0 0 14px"
      }
    }, "Your Fringe by the numbers, from your booked shows."),
    accHead("overview", "\u{1F4CA}", "Overview"),
    statsAcc.overview && React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 18,
        marginTop: 14
      }
    }, le(l, "Shows booked"), le(T.length, "Days out"), le(Math.floor(u / 60) + "h " + u % 60 + "m", "Hours of shows"), le(T.length > 0 ? (Math.round(l / T.length * 10) / 10) : 0, "Shows per day")), React.createElement("div", {
      style: {
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginBottom: 18
      }
    }, B.length > 0 && React.createElement("div", {
      style: {
        background: C.card,
        border: "1px solid " + C.border,
        borderRadius: 14,
        padding: "14px 16px",
        flex: "1 1 200px",
        minWidth: 0,
        overflow: "hidden"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.txt3,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: .5
      }
    }, B.length > 1 ? "Busiest days (tied)" : "Busiest day"),
      B.map(function(day) {
        return React.createElement("div", {key: day, style: {marginTop: 3}},
          React.createElement("div", {style: {fontSize: 16, fontWeight: 800}}, ze(day)),
          React.createElement("div", {style: {fontSize: 12, color: C.txt2}}, c[day] + " shows"));
      }))), ge.length > 0 && React.createElement("div", {
      style: {
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.28)",
        borderRadius: 14,
        padding: "14px 16px",
        marginBottom: 18
      }
    }, React.createElement("div", {
      style: {
        fontSize: 12,
        color: "#c084fc",
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: .5,
        marginBottom: 10
      }
    }, "If you book your wishlist"), React.createElement("div", {
      style: {
        display: "flex",
        gap: 22,
        flexWrap: "wrap"
      }
    }, React.createElement("div", null, React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900
      }
    }, "+\xA3", Math.round(ke * 100) / 100), React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.txt2
      }
    }, ge.length, " more show", ge.length === 1 ? "" : "s")), React.createElement("div", null, React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900
      }
    }, "+", Math.floor(he / 60), "h ", he % 60, "m"), React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.txt2
      }
    }, "more show time")), React.createElement("div", null, React.createElement("div", {
      style: {
        fontSize: 22,
        fontWeight: 900,
        color: "#34d399"
      }
    }, "\xA3", Math.round((i + ke) * 100) / 100), React.createElement("div", {
      style: {
        fontSize: 12,
        color: C.txt2
      }
    }, "grand total")))), Object.keys(ve).length > 0 && function() {
      var gKeys = Object.keys(ve).sort(function(a, b) { return ve[b] - ve[a]; });
      var maxG = ve[gKeys[0]] || 1;
      var minG = ve[gKeys[gKeys.length - 1]] || 1;
      var gcols = ["#F472B6","#34D399","#60A5FA","#FBBF24","#A78BFA","#FB923C","#2DD4BF","#F87171","#818CF8","#4ADE80"];
      return React.createElement("div", {style: {marginBottom: 14, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
        React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "By genre"),
        React.createElement("div", {style: {display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center", justifyContent: "center", padding: "10px 0"}},
          gKeys.map(function(g, idx) {
            var ratio = maxG === minG ? 1 : (ve[g] - minG) / (maxG - minG);
            var sz = Math.round(13 + ratio * (V ? 14 : 19));
            var op = 0.55 + ratio * 0.45;
            return React.createElement("span", {
              key: g,
              title: g + ": " + ve[g] + " show" + (ve[g] === 1 ? "" : "s"),
              style: {
                fontSize: sz,
                fontWeight: ratio > 0.5 ? 900 : 700,
                color: gcols[idx % gcols.length],
                opacity: op,
                cursor: "default",
                lineHeight: 1.3,
                wordBreak: "break-word"
              }
            }, g + " (" + ve[g] + ")");
          })
        )
      );
    }(), Object.keys(Ce).length > 0 && function() {
      var vKeys = Object.keys(Ce).sort(function(a, b) { return Ce[b] - Ce[a]; });
      var maxV = Ce[vKeys[0]] || 1;
      var minV = Ce[vKeys[vKeys.length - 1]] || 1;
      var vcols = ["#FB923C","#60A5FA","#F472B6","#34D399","#FBBF24","#A78BFA","#2DD4BF","#F87171","#818CF8","#4ADE80"];
      return React.createElement("div", {style: {marginBottom: 14, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
        React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "Top venues"),
        React.createElement("div", {style: {display: "flex", flexWrap: "wrap", gap: "6px 10px", alignItems: "center", justifyContent: "center", padding: "10px 0"}},
          vKeys.map(function(v, idx) {
            var ratio = maxV === minV ? 1 : (Ce[v] - minV) / (maxV - minV);
            var sz = Math.round(12 + ratio * (V ? 12 : 16));
            var op = 0.55 + ratio * 0.45;
            return React.createElement("span", {
              key: v,
              title: v + ": " + Ce[v] + " show" + (Ce[v] === 1 ? "" : "s"),
              style: {
                fontSize: sz,
                fontWeight: ratio > 0.5 ? 900 : 700,
                color: vcols[idx % vcols.length],
                opacity: op,
                cursor: "default",
                lineHeight: 1.3,
                wordBreak: "break-word",
                textAlign: "center"
              }
            }, v + " (" + Ce[v] + ")");
          })
        )
      );
    }()),

    // --- Personal insights ---
    accHead("personal", "\u{1F4A1}", "Personal Insights"),
    statsAcc.personal &&
    l > 0 && React.createElement("div", {
      style: { marginTop: 14 }
    },

      // Average rating
      function() {
        var ratedCodes = Object.keys(ratings).filter(function(k) { return ratings[k] > 0 && p[k]; });
        if (!ratedCodes.length) return null;
        var avgRat = Math.round(ratedCodes.reduce(function(a, k) { return a + ratings[k]; }, 0) / ratedCodes.length * 10) / 10;
        var stars = "";
        for (var si = 0; si < 5; si++) stars += si < Math.round(avgRat) ? "\u2605" : "\u2606";
        return React.createElement("div", {
          style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }
        },
          le(stars, "Avg rating (" + avgRat.toFixed(1) + "/5)", "#FBBF24"),
          le(ratedCodes.length + "/" + l, "Shows rated", "#60A5FA"),
          function() {
            var best = ratedCodes.filter(function(k) { return ratings[k] === 5; });
            return best.length ? le(best.length, "5-star shows", "#34D399") : null;
          }()
        );
      }(),

      // Top Rated Shows (5-star list)
      function() {
        var fiveStarCodes = Object.keys(ratings).filter(function(k) { return ratings[k] === 5 && p[k]; });
        if (!fiveStarCodes.length) return null;
        var fiveStarShows = fiveStarCodes.map(function(k) { return e[k]; }).filter(Boolean).sort(function(a, b) { return (a.title || "").localeCompare(b.title || ""); });
        if (!fiveStarShows.length) return null;
        return React.createElement("div", {style: {marginBottom: 10, marginTop: 20}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "⭐ Top Rated Shows"),
          React.createElement("div", {style: {display: "flex", flexDirection: "column", gap: 6}},
            fiveStarShows.map(function(show) {
              return React.createElement("div", {
                key: show.code,
                onClick: function() { de(show); },
                style: {
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: "rgba(251,191,36,0.08)",
                  border: "1px solid rgba(251,191,36,0.2)",
                  cursor: "pointer", transition: "background 0.15s"
                }
              },
                React.createElement("span", {style: {fontSize: 14, color: "#FBBF24", flexShrink: 0}}, "★★★★★"),
                React.createElement("div", {style: {flex: 1, minWidth: 0}},
                  React.createElement("div", {style: {fontSize: 13, fontWeight: 800, color: C.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}, show.title),
                  React.createElement("div", {style: {fontSize: 11, color: C.txt3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}}, show.venue || "")
                )
              );
            })
          )
        );
      }(),

      // Companions breakdown
      function() {
        var compCounts = {};
        Object.keys(companions).filter(function(k) { return companions[k] && p[k]; }).forEach(function(k) { var c = companions[k]; c.split(/\s*,\s*/).forEach(function(name) { name = name.trim(); if (name) compCounts[name] = (compCounts[name] || 0) + 1; }); });
        Object.keys(p).forEach(function(k) { (p[k] || []).forEach(function(rec) { if (rec.companions) rec.companions.split(/\s*,\s*/).forEach(function(name) { name = name.trim(); if (name) compCounts[name] = (compCounts[name] || 0) + 1; }); }); });
        if (!Object.keys(compCounts).length) return null;
        var sorted = Object.keys(compCounts).sort(function(a, b) { return compCounts[b] - compCounts[a]; });
        var topCount = compCounts[sorted[0]];
        return React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "\u{1F465} Companions"),
          React.createElement("div", {style: {display: "flex", gap: 8, flexWrap: "wrap"}},
            sorted.slice(0, 6).map(function(name) {
              var isTop = compCounts[name] === topCount;
              return React.createElement("div", {
                key: name,
                style: {
                  padding: "8px 14px",
                  borderRadius: 10,
                  background: isTop ? "rgba(168,85,247,0.15)" : C.card,
                  border: "1px solid " + (isTop ? "rgba(168,85,247,0.4)" : C.border),
                  fontSize: 13, fontWeight: 700
                }
              }, name, React.createElement("span", {style: {marginLeft: 6, fontSize: 11, color: C.txt2}}, compCounts[name] + " show" + (compCounts[name] === 1 ? "" : "s")));
            })
          )
        );
      }(),

      // Day of week breakdown for bookings
      function() {
        var days = {"Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0, "Sunday": 0};
        var dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        var orderedDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
        r.forEach(function(z) {
          if (z.rec.date) {
            var d = new Date(z.rec.date + "T12:00:00");
            var dn = dayNames[d.getDay()];
            days[dn] = (days[dn] || 0) + 1;
          }
        });
        var maxDay = Math.max.apply(null, orderedDays.map(function(d) { return days[d]; }));
        if (maxDay === 0) return null;
        var _maxDayCount = Math.max.apply(null, orderedDays.map(function(d) { return days[d]; }));
        var favDays = orderedDays.filter(function(d) { return days[d] === _maxDayCount; });
        var favDay = favDays[0];
        var dayColors = {"Monday": "#60A5FA", "Tuesday": "#34D399", "Wednesday": "#FBBF24", "Thursday": "#F472B6", "Friday": "#A78BFA", "Saturday": "#FB923C", "Sunday": "#F87171"};
        return React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2}},
            "\u{1F4C5} Shows by day of week \u2014 you love " + (favDays.length > 1 ? favDays.join(" & ") + "s (tied)!" : favDay + "s!")),
          React.createElement("div", {style: {display: "flex", gap: 6, alignItems: "flex-end", height: 80}},
            orderedDays.map(function(d) {
              var abbr = V ? ({"Monday":"M","Tuesday":"T","Wednesday":"W","Thursday":"T","Friday":"F","Saturday":"S","Sunday":"S"})[d] : ({"Monday":"MON","Tuesday":"TUES","Wednesday":"WED","Thursday":"THURS","Friday":"FRI","Saturday":"SAT","Sunday":"SUN"})[d];
              var pct = maxDay > 0 ? Math.max(days[d] / maxDay * 100, days[d] > 0 ? 10 : 2) : 2;
              return React.createElement("div", {
                key: d,
                style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }
              },
                days[d] > 0 && React.createElement("span", {style: {fontSize: 11, fontWeight: 800, color: C.txt2}}, days[d]),
                React.createElement("div", {
                  style: {
                    width: "100%",
                    height: pct + "%",
                    minHeight: 4,
                    borderRadius: "4px 4px 0 0",
                    background: favDays.indexOf(d) >= 0 ? "linear-gradient(180deg," + dayColors[d] + ",rgba(168,85,247,0.6))" : dayColors[d],
                    opacity: days[d] > 0 ? 1 : 0.15
                  }
                }),
                React.createElement("span", {style: {fontSize: 9, color: favDays.indexOf(d) >= 0 ? dayColors[d] : C.txt3, fontWeight: 700, textAlign: "center"}}, abbr)
              );
            })
          )
        );
      }(),

      // Time of day preference
      function() {
        var slots = {"\u{1F305} Morning": 0, "\u2600\uFE0F Afternoon": 0, "\u{1F306} Evening": 0, "\u{1F319} Late night": 0};
        var slotKeys = Object.keys(slots);
        r.forEach(function(z) {
          var t = timeToMin_(z.rec.start || z.s.startStr);
          if (t == null) return;
          if (t < 720) slots["\u{1F305} Morning"]++;
          else if (t < 1020) slots["\u2600\uFE0F Afternoon"]++;
          else if (t < 1320) slots["\u{1F306} Evening"]++;
          else slots["\u{1F319} Late night"]++;
        });
        var total = slotKeys.reduce(function(a, k) { return a + slots[k]; }, 0);
        if (total === 0) return null;
        var slotColors = ["#FBBF24", "#FB923C", "#A78BFA", "#818CF8"];
        return React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "\u23F0 When you go"),
          React.createElement("div", {style: {display: "flex", borderRadius: 10, overflow: "hidden", height: 28}},
            slotKeys.map(function(k, idx) {
              var pct = total > 0 ? slots[k] / total * 100 : 0;
              if (pct === 0) return null;
              return React.createElement("div", {
                key: k,
                title: k + ": " + slots[k] + " shows (" + Math.round(pct) + "%)",
                style: {
                  width: pct + "%",
                  background: slotColors[idx],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#000",
                  minWidth: pct > 12 ? 0 : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap"
                }
              }, pct > 15 ? Math.round(pct) + "%" : "");
            })
          ),
          React.createElement("div", {style: {display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6}},
            slotKeys.map(function(k, idx) {
              if (slots[k] === 0) return null;
              return React.createElement("span", {
                key: k,
                style: { fontSize: 11, color: C.txt2 }
              }, React.createElement("span", {style: {display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: slotColors[idx], marginRight: 4}}), k + " " + slots[k]);
            })
          )
        );
      }(),

      // Streak & fun facts
      function() {
        var dates = r.map(function(z) { return z.rec.date; }).filter(Boolean).sort();
        if (dates.length < 2) return null;
        var uniqueDates = [];
        dates.forEach(function(d) { if (uniqueDates[uniqueDates.length - 1] !== d) uniqueDates.push(d); });
        // Calculate longest streak
        var streak = 1, maxStreak = 1;
        for (var si = 1; si < uniqueDates.length; si++) {
          var prev = new Date(uniqueDates[si-1] + "T12:00:00");
          var curr = new Date(uniqueDates[si] + "T12:00:00");
          if ((curr - prev) === 86400000) { streak++; if (streak > maxStreak) maxStreak = streak; }
          else streak = 1;
        }
        // Average shows per day
        var avgPerDay = Math.round(r.length / uniqueDates.length * 10) / 10;
        // Earliest and latest show
        var _earliestT = null, _latestT = null;
        r.forEach(function(z) {
          var t = timeToMin_(z.rec.start || z.s.startStr);
          if (t == null) return;
          if (_earliestT == null || t < _earliestT) _earliestT = t;
          if (_latestT == null || t > _latestT) _latestT = t;
        });
        var earliestCount = _earliestT != null ? r.filter(function(z) { return timeToMin_(z.rec.start || z.s.startStr) === _earliestT; }).length : 0;
        var latestCount = _latestT != null ? r.filter(function(z) { return timeToMin_(z.rec.start || z.s.startStr) === _latestT; }).length : 0;
        var earliest = _earliestT != null ? {t: _earliestT} : null;
        var latest = _latestT != null ? {t: _latestT} : null;
        var fmtT = function(m) { return Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2); };
        return React.createElement("div", {
          style: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }
        },
          maxStreak > 1 && le(maxStreak + " days", "\u{1F525} Longest streak", "#FB923C"),
          le(avgPerDay, "Shows per day (avg)", "#60A5FA"),
          earliest && le(fmtT(earliest.t), earliestCount > 1 ? "Earliest shows (" + earliestCount + " tied)" : "Earliest show", "#FBBF24"),
          latest && le(fmtT(latest.t), latestCount > 1 ? "Latest shows (" + latestCount + " tied)" : "Latest show", "#818CF8")
        );
      }(),

      // Genre diversity
      function() {
        var myGenres = {};
        r.forEach(function(z) { if (z.s.genre) myGenres[z.s.genre] = (myGenres[z.s.genre] || 0) + 1; });
        var genreKeys = Object.keys(myGenres);
        if (genreKeys.length < 2) return null;
        var allGenreCount = 0;
        (n || []).forEach(function(s) { if (s.genre) { var seen = {}; if (!seen[s.genre]) { seen[s.genre] = 1; allGenreCount++; } } });
        var allG = {}; (n || []).forEach(function(s) { if (s.genre) allG[s.genre] = 1; });
        allGenreCount = Object.keys(allG).length;
        var diversityPct = allGenreCount > 0 ? Math.round(genreKeys.length / allGenreCount * 100) : 0;
        var genreColors = ["#F472B6", "#34D399", "#60A5FA", "#FBBF24", "#A78BFA", "#FB923C", "#2DD4BF", "#F87171", "#818CF8", "#4ADE80"];
        var total = r.length;
        return React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}},
            "\u{1F3AD} Genre diversity \u2014 " + genreKeys.length + " of " + allGenreCount + " genres (" + diversityPct + "%)"),
          React.createElement("div", {style: {display: "flex", borderRadius: 10, overflow: "hidden", height: 24}},
            genreKeys.sort(function(a, b) { return myGenres[b] - myGenres[a]; }).map(function(g, idx) {
              var pct = total > 0 ? myGenres[g] / total * 100 : 0;
              return React.createElement("div", {
                key: g,
                title: g + ": " + myGenres[g] + " (" + Math.round(pct) + "%)",
                style: {
                  width: pct + "%",
                  background: genreColors[idx % genreColors.length],
                  minWidth: 3
                }
              });
            })
          ),
          React.createElement("div", {style: {display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6}},
            genreKeys.sort(function(a, b) { return myGenres[b] - myGenres[a]; }).slice(0, 8).map(function(g, idx) {
              return React.createElement("span", {
                key: g, style: {fontSize: 11, color: C.txt2}
              }, React.createElement("span", {style: {display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: genreColors[idx % genreColors.length], marginRight: 3}}), g + " " + myGenres[g]);
            })
          )
        );
      }(),

      // Venue variety
      function() {
        var venueKeys = Object.keys(Ce);
        if (venueKeys.length < 2) return null;
        var repeat = venueKeys.filter(function(v) { return Ce[v] > 1; });
        return React.createElement("div", {
          style: { display: "flex", gap: 10, flexWrap: "wrap" }
        },
          le(venueKeys.length, "\u{1F3E0} Unique venues", "#F472B6"),
          repeat.length > 0 && le(repeat.length, "Venues visited 2+", "#2DD4BF")
        );
      }()

    ),

    // --- Spending breakdown ---
    accHead("spending", "\u{1F4B0}", "Spending Breakdown"),
    statsAcc.spending && l > 0 && React.createElement("div", {
      style: { marginTop: 14 }
    },
      React.createElement("div", {style: {display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14}},
        le("\xA3" + Math.round(i * 100) / 100, "Total spend", "#34d399"),
        H.length > 0 && le(priceLabel(_topPrice), "Most expensive", "#F87171"),
        m.length > 0 && _botPrice !== _topPrice && le(priceLabel(_botPrice), "Cheapest", "#34D399"),
        re > 0 && le(re, "Free shows", "#4ADE80")
      ),
      React.createElement("div", {style: {display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14}},
        H.length > 0 && React.createElement("div", {
          style: {background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", flex: "1 1 200px", minWidth: 0, overflow: "hidden"}
        },
          React.createElement("div", {style: {fontSize: 11, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5}}, H.length > 1 ? "Most expensive (tied)" : "Most expensive"),
          H.map(function(item) {
            return React.createElement("div", {key: item.code + "-" + item.bIdx, style: {marginTop: 3}},
              React.createElement("div", {style: {fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: V ? "normal" : "nowrap", wordBreak: "break-word"}}, item.s.title),
              React.createElement("div", {style: {fontSize: 12, color: C.txt2}}, priceLabel(perfPrice_(item.s, item.rec))));
          })
        ),
        m.length > 0 && _botPrice !== _topPrice && React.createElement("div", {
          style: {background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", flex: "1 1 200px", minWidth: 0, overflow: "hidden"}
        },
          React.createElement("div", {style: {fontSize: 11, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5}}, m.length > 1 ? "Cheapest tickets (tied)" : "Cheapest ticket"),
          m.map(function(item) {
            return React.createElement("div", {key: item.code + "-" + item.bIdx, style: {marginTop: 3}},
              React.createElement("div", {style: {fontSize: 15, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: V ? "normal" : "nowrap", wordBreak: "break-word"}}, item.s.title),
              React.createElement("div", {style: {fontSize: 12, color: C.txt2}}, priceLabel(perfPrice_(item.s, item.rec))));
          })
        )
      ),
      function() {
        var genreSpend = {};
        r.forEach(function(z) {
          var pp = perfPrice_(z.s, z.rec);
          if (pp && z.s.genre) {
            genreSpend[z.s.genre] = (genreSpend[z.s.genre] || 0) + pp;
          }
        });
        var sorted = Object.keys(genreSpend).sort(function(a, b) { return genreSpend[b] - genreSpend[a]; });
        var maxSpend = sorted.length ? genreSpend[sorted[0]] : 0;
        if (!sorted.length) return null;
        var spendColors = ["#F472B6", "#34D399", "#60A5FA", "#FBBF24", "#A78BFA", "#FB923C"];
        return React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "Spend by genre"),
          sorted.slice(0, 6).map(function(g, idx) {
            return React.createElement("div", {key: g, style: {marginBottom: 6}},
              React.createElement("div", {style: {display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 2}},
                React.createElement("span", {style: {color: C.txt}}, g),
                React.createElement("span", {style: {color: spendColors[idx % spendColors.length], fontWeight: 800}}, "\u00A3" + Math.round(genreSpend[g] * 100) / 100)),
              React.createElement("div", {style: {height: 7, borderRadius: 4, background: "rgba(255,255,255,0.08)"}},
                React.createElement("div", {style: {height: 7, borderRadius: 4, width: Math.round(genreSpend[g] / maxSpend * 100) + "%", background: spendColors[idx % spendColors.length]}}))
            );
          })
        );
      }(),
      // Price per day
      function() {
        var daySpend = {};
        r.forEach(function(z) {
          if (z.rec.date) {
            var pp = perfPrice_(z.s, z.rec);
            if (pp) daySpend[z.rec.date] = (daySpend[z.rec.date] || 0) + pp;
          }
        });
        var dates = Object.keys(daySpend).sort();
        if (dates.length < 2) return null;
        var maxD = Math.max.apply(null, dates.map(function(d) { return daySpend[d]; }));
        return React.createElement("div", {style: {marginTop: 14, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "Spend by day"),
          React.createElement("div", {style: {display: "flex", gap: 3, alignItems: "flex-end", height: 70}},
            dates.map(function(d) {
              var pct = maxD > 0 ? Math.max(daySpend[d] / maxD * 100, 5) : 5;
              var dt = new Date(d + "T12:00:00");
              var lbl = dt.getDate() + "/" + (dt.getMonth() + 1);
              return React.createElement("div", {
                key: d,
                title: d + ": \u00A3" + Math.round(daySpend[d] * 100) / 100,
                style: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }
              },
                React.createElement("span", {style: {fontSize: 9, color: C.txt3, fontWeight: 700}}, "\u00A3" + Math.round(daySpend[d])),
                React.createElement("div", {style: {width: "100%", height: pct + "%", borderRadius: "3px 3px 0 0", background: "linear-gradient(180deg,#34D399,rgba(52,211,153,0.4))"}}),
                React.createElement("span", {style: {fontSize: 9, color: C.txt3}}, lbl)
              );
            })
          )
        );
      }()
    ),

    // --- Fringe Friends ---
    accHead("friends", "\u{1F46B}", "Fringe Friends"),
    statsAcc.friends && l > 0 && function() {
      // Gather all companions and bookers per booking
      var friendCounts = {}, bookerCounts = {}, soloCount = 0, biggestGroup = 0, biggestShow = null;
      var pairCounts = {};
      r.forEach(function(item) {
        var ppl = [];
        if (item.rec.companions) {
          item.rec.companions.split(",").forEach(function(n) { var nm = n.trim(); if (nm) ppl.push(nm); });
        } else if (companions[item.code]) {
          companions[item.code].split(",").forEach(function(n) { var nm = n.trim(); if (nm) ppl.push(nm); });
        }
        if (ppl.length === 0) { soloCount++; }
        else {
          ppl.forEach(function(nm) { friendCounts[nm] = (friendCounts[nm] || 0) + 1; });
          if (ppl.length > biggestGroup) { biggestGroup = ppl.length; biggestShow = item; }
          // Count pairs
          for (var pi = 0; pi < ppl.length; pi++) {
            for (var pj = pi + 1; pj < ppl.length; pj++) {
              var pk = [ppl[pi], ppl[pj]].sort().join(" & ");
              pairCounts[pk] = (pairCounts[pk] || 0) + 1;
            }
          }
        }
        var bkr = item.rec.booker || bookerData[item.code] || "";
        if (bkr.trim() && bkr.trim() !== "Myself") bookerCounts[bkr.trim()] = (bookerCounts[bkr.trim()] || 0) + 1;
      });
      var friendNames = Object.keys(friendCounts).sort(function(a, b) { return friendCounts[b] - friendCounts[a]; });
      var bookerNames = Object.keys(bookerCounts).sort(function(a, b) { return bookerCounts[b] - bookerCounts[a]; });
      var _maxFriendCount = friendNames.length ? friendCounts[friendNames[0]] : 0;
      var topFriends = friendNames.filter(function(nm) { return friendCounts[nm] === _maxFriendCount; });
      var topFriend = topFriends[0] || null;
      var _maxBookerCount = bookerNames.length ? bookerCounts[bookerNames[0]] : 0;
      var topBookers = bookerNames.filter(function(nm) { return bookerCounts[nm] === _maxBookerCount; });
      var topBooker = topBookers[0] || null;
      var maxFriend = topFriend ? friendCounts[topFriend] : 0;
      var topPairCount = 0;
      Object.keys(pairCounts).forEach(function(pk) { if (pairCounts[pk] > topPairCount) { topPairCount = pairCounts[pk]; } });
      var topPairs = Object.keys(pairCounts).filter(function(pk) { return pairCounts[pk] === topPairCount; });

      if (friendNames.length === 0 && bookerNames.length === 0) {
        return React.createElement("div", {style: {padding: "16px 0", color: C.txt3, fontSize: 13, textAlign: "center"}},
          "No companion or booker data yet — add friends to your bookings to see stats here.");
      }

      var friendColors = ["#60A5FA", "#34D399", "#FBBF24", "#F472B6", "#A78BFA", "#FB923C", "#F87171", "#2DD4BF", "#818CF8", "#E879F9"];

      return React.createElement("div", {style: {marginTop: 14}},
        // Stat tiles row
        React.createElement("div", {style: {display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14}},
          topFriend && le(topFriends.length > 1 ? topFriends.join(", ") : topFriend, (topFriends.length > 1 ? "Top friends (tied, " : "Top friend (") + maxFriend + " show" + (maxFriend === 1 ? "" : "s") + ")", "#A78BFA"),
          le(soloCount, "Solo show" + (soloCount === 1 ? "" : "s"), "#60A5FA"),
          le(l - soloCount, "With friend" + (l - soloCount === 1 ? "" : "s"), "#34D399"),
          topBooker && le(topBookers.length > 1 ? topBookers.join(", ") : topBooker, (topBookers.length > 1 ? "Top bookers (tied, " : "Top booker (") + _maxBookerCount + ")", "#FB923C")),

        // Shows per friend bar chart
        friendNames.length > 0 && React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2}},
            "\u{1F465} Shows per friend"),
          React.createElement("div", {style: {display: "flex", flexDirection: "column", gap: 6, marginTop: 8}},
            friendNames.slice(0, 12).map(function(nm, idx) {
              var pct = maxFriend > 0 ? Math.max(friendCounts[nm] / maxFriend * 100, 8) : 8;
              var clr = friendColors[idx % friendColors.length];
              return React.createElement("div", {key: nm, style: {display: "flex", alignItems: "center", gap: 8}},
                React.createElement("div", {style: {width: 70, fontSize: 11, fontWeight: 700, color: C.txt, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0}}, nm),
                React.createElement("div", {style: {flex: 1, height: 18, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden", position: "relative"}},
                  React.createElement("div", {style: {width: pct + "%", height: "100%", background: clr, borderRadius: 6, transition: "width 0.3s"}})),
                React.createElement("span", {style: {fontSize: 11, fontWeight: 800, color: C.txt2, minWidth: 18, textAlign: "right"}}, friendCounts[nm]));
            }))),

        // Booker breakdown
        bookerNames.length > 0 && React.createElement("div", {style: {marginBottom: 10, marginTop: 20, background: C.card, border: "1px solid " + C.border, borderRadius: 14, padding: "14px 16px", boxSizing: "border-box", overflow: "hidden"}},
          React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2}},
            "\u{1F3AB} Who booked shows?"),
          React.createElement("div", {style: {display: "flex", flexDirection: "column", gap: 6, marginTop: 8}},
            bookerNames.slice(0, 8).map(function(nm, idx) {
              var bMax = bookerCounts[bookerNames[0]];
              var pct = bMax > 0 ? Math.max(bookerCounts[nm] / bMax * 100, 8) : 8;
              var clr = friendColors[(idx + 3) % friendColors.length];
              return React.createElement("div", {key: nm, style: {display: "flex", alignItems: "center", gap: 8}},
                React.createElement("div", {style: {width: 70, fontSize: 11, fontWeight: 700, color: C.txt, textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0}}, nm),
                React.createElement("div", {style: {flex: 1, height: 18, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden", position: "relative"}},
                  React.createElement("div", {style: {width: pct + "%", height: "100%", background: clr, borderRadius: 6, transition: "width 0.3s"}})),
                React.createElement("span", {style: {fontSize: 11, fontWeight: 800, color: C.txt2, minWidth: 18, textAlign: "right"}}, bookerCounts[nm]));
            }))),

        // Best duo and biggest group
        React.createElement("div", {style: {display: "flex", gap: 10, flexWrap: "wrap"}},
          topPairs.length > 0 && topPairCount > 1 && le(topPairs.join(", "), (topPairs.length > 1 ? "Best duos (tied, " : "Best duo (") + topPairCount + " show" + (topPairCount === 1 ? "" : "s") + " together)", "#E879F9"),
          biggestShow && biggestGroup > 1 && le(biggestGroup + " people", "Biggest group — " + (biggestShow.s.title || "").slice(0, 30), "#2DD4BF"))
      );
    }(),

    // --- General Festival Analytics ---
    accHead("festival", "\u{1F3AA}", "General Festival Analytics"),
    statsAcc.festival && function() {
    var all = n || [];
    if (all.length === 0) return null;
    var totalShows = all.length;
    var allGenres = {}; all.forEach(function(s) { if (s.genre) allGenres[s.genre] = (allGenres[s.genre] || 0) + 1; });
    var genreCount = Object.keys(allGenres).length;
    var allVenues = {}; all.forEach(function(s) { if (s.venue) { var vl = venueLabel_(s); allVenues[vl] = (allVenues[vl] || 0) + 1; } });
    var venueCount = Object.keys(allVenues).length;
    var allCountries = {}; all.forEach(function(s) { if (s.country) allCountries[s.country] = (allCountries[s.country] || 0) + 1; });
    var countryCount = Object.keys(allCountries).length;
    var priced = all.filter(function(s) { return typeof s.priceFull === "number" && s.priceFull > 0; });
    var freeShows = all.filter(function(s) { return !s.priceFull || s.priceFull === 0; }).length;
    var avgPrice = priced.length ? Math.round(priced.reduce(function(a, s) { return a + s.priceFull; }, 0) / priced.length * 100) / 100 : 0;
    var maxPrice = priced.length ? Math.max.apply(null, priced.map(function(s) { return s.priceFull; })) : 0;
    var minPrice = priced.length ? Math.min.apply(null, priced.map(function(s) { return s.priceFull; })) : 0;
    var durations = all.filter(function(s) { return s.duration; });
    var avgDur = durations.length ? Math.round(durations.reduce(function(a, s) { return a + s.duration; }, 0) / durations.length) : 0;
    var shortShow = durations.length ? Math.min.apply(null, durations.map(function(s) { return s.duration; })) : 0;
    var longShow = durations.length ? Math.max.apply(null, durations.map(function(s) { return s.duration; })) : 0;
    var totalHrs = durations.length ? Math.round(durations.reduce(function(a, s) { return a + s.duration; }, 0) / 60) : 0;
    var _topGenreMax = Object.keys(allGenres).length ? Math.max.apply(null, Object.keys(allGenres).map(function(k) { return allGenres[k]; })) : 0;
    var topGenres = Object.keys(allGenres).filter(function(k) { return allGenres[k] === _topGenreMax; });
    var topGenre = topGenres[0] || "—";
    var _topVenueMax = Object.keys(allVenues).length ? Math.max.apply(null, Object.keys(allVenues).map(function(k) { return allVenues[k]; })) : 0;
    var topVenues = Object.keys(allVenues).filter(function(k) { return allVenues[k] === _topVenueMax; });
    var topVenue = topVenues[0] || "—";
    var _topCountryMax = Object.keys(allCountries).length ? Math.max.apply(null, Object.keys(allCountries).map(function(k) { return allCountries[k]; })) : 0;
    var topCountries = Object.keys(allCountries).filter(function(k) { return allCountries[k] === _topCountryMax; });
    var topCountry = topCountries[0] || "—";
    var ages = {}; all.forEach(function(s) { if (s.age) ages[s.age] = (ages[s.age] || 0) + 1; });
    var _topAgeMax = Object.keys(ages).length ? Math.max.apply(null, Object.keys(ages).map(function(k) { return ages[k]; })) : 0;
    var topAges = Object.keys(ages).filter(function(k) { return ages[k] === _topAgeMax; });
    var topAge = topAges[0] || "—";
    var solos = all.filter(function(s) { return s.performers === "1" || s.performers === 1; }).length;
    var accessible = all.filter(function(s) { return s.access && s.access.trim(); }).length;
    var accessPct = totalShows ? Math.round(accessible / totalShows * 100) : 0;
    var morningShows = all.filter(function(s) { var t = timeToMin_(s.startStr); return t != null && t < 720; }).length;
    var eveningShows = all.filter(function(s) { var t = timeToMin_(s.startStr); return t != null && t >= 1080; }).length;
    var withWarnings = all.filter(function(s) { return s.warnings && s.warnings.trim(); }).length;
    var medianPrice = function() { if (!priced.length) return 0; var sorted = priced.map(function(s) { return s.priceFull; }).sort(function(a,b){return a-b;}); var mid = Math.floor(sorted.length/2); return sorted.length%2?sorted[mid]:Math.round((sorted[mid-1]+sorted[mid])*50)/100; }();

    var metrics = [
      {label: "Total shows", value: totalShows.toLocaleString(), color: "#A78BFA"},
      {label: "Genres", value: genreCount, color: "#60A5FA"},
      {label: "Venues", value: venueCount, color: "#F472B6"},
      {label: "Countries", value: countryCount, color: "#FBBF24"},
      {label: topGenres.length > 1 ? "Top genres (tied)" : "Most popular genre", value: topGenres.map(function(g) { return g + " (" + allGenres[g] + ")"; }).join(", "), color: "#34D399"},
      {label: topVenues.length > 1 ? "Busiest venues (tied)" : "Busiest venue", value: topVenues.join(", "), color: "#FB923C"},
      {label: topCountries.length > 1 ? "Top countries (tied)" : "Top country", value: topCountries.join(", "), color: "#2DD4BF"},
      {label: "Free shows", value: freeShows, color: "#4ADE80"},
      {label: "Average ticket", value: "£" + avgPrice.toFixed(2), color: "#F472B6"},
      {label: "Median ticket", value: "£" + medianPrice.toFixed(2), color: "#818CF8"},
      {label: "Cheapest ticket", value: "£" + minPrice.toFixed(2), color: "#34D399"},
      {label: "Priciest ticket", value: "£" + maxPrice.toFixed(2), color: "#F87171"},
      {label: "Average duration", value: avgDur + " min", color: "#60A5FA"},
      {label: "Shortest show", value: shortShow + " min", color: "#FBBF24"},
      {label: "Longest show", value: longShow + " min", color: "#A78BFA"},
      {label: "Total show hours", value: totalHrs.toLocaleString() + " hrs", color: "#FB923C"},
      {label: "Solo performers", value: solos, color: "#2DD4BF"},
      {label: "Morning shows (before noon)", value: morningShows, color: "#FBBF24"},
      {label: "Evening shows (6pm+)", value: eveningShows, color: "#818CF8"},
      {label: topAges.length > 1 ? "Top age ratings (tied)" : "Most common age rating", value: topAges.map(function(a) { return a + " (" + ages[a] + ")"; }).join(", "), color: "#F87171"}
    ];

    return React.createElement("div", {style: {marginTop: 14}},
      React.createElement("p", {style: {fontSize: 13, color: C.txt2, margin: "0 0 14px", lineHeight: 1.5}}, "Stats across all " + totalShows.toLocaleString() + " shows in the programme."),
      React.createElement("div", {style: {display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10}},
        metrics.map(function(m, idx) {
          return React.createElement("div", {key: idx, style: {padding: "14px 12px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", textAlign: "center"}},
            React.createElement("div", {style: {fontSize: String(m.value).length > 12 ? 15 : String(m.value).length > 8 ? 18 : 22, fontWeight: 900, color: m.color, marginBottom: 3, lineHeight: 1.2, wordBreak: "break-word", overflowWrap: "break-word"}}, String(m.value)),
            React.createElement("div", {style: {fontSize: 11, color: C.txt2, fontWeight: 600}}, m.label));
        })),
      React.createElement("div", {style: {marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap"}},
        React.createElement("div", {style: {flex: "1 1 280px", padding: "14px 12px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", textAlign: "center"}},
          React.createElement("div", {style: {fontSize: 13, fontWeight: 800, color: C.txt, marginBottom: 2}}, accessPct + "% accessible"),
          React.createElement("div", {style: {fontSize: 11, color: C.txt2}}, accessible + " of " + totalShows + " shows list accessibility info")),
        React.createElement("div", {style: {flex: "1 1 280px", padding: "14px 12px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", textAlign: "center"}},
          React.createElement("div", {style: {fontSize: 13, fontWeight: 800, color: C.txt, marginBottom: 2}}, withWarnings + " content warnings"),
          React.createElement("div", {style: {fontSize: 11, color: C.txt2}}, "Shows listing strobe, language, or other advisories"))
      ),

      // Price distribution histogram
      priced.length > 5 && React.createElement("div", {style: {marginTop: 24}},
        React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "\u{1F4B7} Price distribution"),
        function() {
          var buckets = [
            {label: "Free", min: 0, max: 0, count: freeShows, color: "#4ADE80"},
            {label: "\u00A31\u2013\u00A35", min: 0.01, max: 5, count: 0, color: "#34D399"},
            {label: "\u00A36\u2013\u00A310", min: 5.01, max: 10, count: 0, color: "#60A5FA"},
            {label: "\u00A311\u2013\u00A315", min: 10.01, max: 15, count: 0, color: "#818CF8"},
            {label: "\u00A316\u2013\u00A320", min: 15.01, max: 20, count: 0, color: "#A78BFA"},
            {label: "\u00A320+", min: 20.01, max: 9999, count: 0, color: "#F472B6"}
          ];
          priced.forEach(function(s) {
            for (var bi = 1; bi < buckets.length; bi++) {
              if (s.priceFull >= buckets[bi].min && s.priceFull <= buckets[bi].max) { buckets[bi].count++; break; }
            }
          });
          var maxBucket = Math.max.apply(null, buckets.map(function(b) { return b.count; }));
          return React.createElement("div", {style: {display: "flex", gap: 4, alignItems: "flex-end", height: 80}},
            buckets.map(function(b) {
              var pct = maxBucket > 0 ? Math.max(b.count / maxBucket * 100, b.count > 0 ? 6 : 2) : 2;
              return React.createElement("div", {
                key: b.label,
                style: {flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3}
              },
                b.count > 0 && React.createElement("span", {style: {fontSize: 10, fontWeight: 800, color: C.txt2}}, b.count),
                React.createElement("div", {style: {width: "100%", height: pct + "%", minHeight: 2, borderRadius: "4px 4px 0 0", background: b.color, opacity: b.count > 0 ? 1 : 0.15}}),
                React.createElement("span", {style: {fontSize: 9, color: C.txt3, fontWeight: 600, textAlign: "center"}}, b.label)
              );
            })
          );
        }()
      ),

      // Duration distribution
      durations.length > 5 && React.createElement("div", {style: {marginTop: 24}},
        React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "\u23F1 Duration spread"),
        function() {
          var durBuckets = [
            {label: "<30m", min: 0, max: 29, count: 0, color: "#FBBF24"},
            {label: "30\u201345m", min: 30, max: 45, count: 0, color: "#FB923C"},
            {label: "46\u201360m", min: 46, max: 60, count: 0, color: "#F472B6"},
            {label: "61\u201390m", min: 61, max: 90, count: 0, color: "#A78BFA"},
            {label: "90m+", min: 91, max: 9999, count: 0, color: "#818CF8"}
          ];
          durations.forEach(function(s) {
            for (var bi = 0; bi < durBuckets.length; bi++) {
              if (s.duration >= durBuckets[bi].min && s.duration <= durBuckets[bi].max) { durBuckets[bi].count++; break; }
            }
          });
          var maxB = Math.max.apply(null, durBuckets.map(function(b) { return b.count; }));
          return React.createElement("div", {style: {display: "flex", gap: 4, alignItems: "flex-end", height: 70}},
            durBuckets.map(function(b) {
              var pct = maxB > 0 ? Math.max(b.count / maxB * 100, b.count > 0 ? 6 : 2) : 2;
              return React.createElement("div", {
                key: b.label,
                style: {flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3}
              },
                b.count > 0 && React.createElement("span", {style: {fontSize: 10, fontWeight: 800, color: C.txt2}}, b.count),
                React.createElement("div", {style: {width: "100%", height: pct + "%", minHeight: 2, borderRadius: "4px 4px 0 0", background: b.color, opacity: b.count > 0 ? 1 : 0.15}}),
                React.createElement("span", {style: {fontSize: 9, color: C.txt3, fontWeight: 600}}, b.label)
              );
            })
          );
        }()
      ),

      // Start time heatmap
      React.createElement("div", {style: {marginTop: 24}},
        React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "\u{1F570} Shows by start time"),
        function() {
          var hours = {};
          all.forEach(function(s) {
            var t = timeToMin_(s.startStr);
            if (t != null) { var h = Math.floor(t / 60); hours[h] = (hours[h] || 0) + 1; }
          });
          var hourKeys = [];
          for (var hi = 8; hi <= 23; hi++) hourKeys.push(hi);
          var maxH = Math.max.apply(null, hourKeys.map(function(h) { return hours[h] || 0; }));
          var _peakMax = Math.max.apply(null, hourKeys.map(function(h) { return hours[h] || 0; }));
          var peakHours = hourKeys.filter(function(h) { return (hours[h] || 0) === _peakMax; });
          var peakHour = peakHours[0];
          return React.createElement(React.Fragment, null,
            React.createElement("div", {style: {display: "flex", gap: 2, alignItems: "flex-end", height: 60}},
              hourKeys.map(function(h) {
                var count = hours[h] || 0;
                var pct = maxH > 0 ? Math.max(count / maxH * 100, count > 0 ? 5 : 1) : 1;
                var isPeak = h === peakHour;
                return React.createElement("div", {
                  key: h,
                  title: h + ":00 \u2014 " + count + " shows",
                  style: {flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1}
                },
                  React.createElement("div", {style: {width: "100%", height: pct + "%", minHeight: 1, borderRadius: "3px 3px 0 0", background: isPeak ? "#F472B6" : "rgba(168,85,247,0.5)", opacity: count > 0 ? 1 : 0.1}}),
                  h % 2 === 0 && React.createElement("span", {style: {fontSize: 8, color: C.txt3}}, h + "h")
                );
              })
            ),
            React.createElement("div", {style: {fontSize: 11, color: C.txt2, marginTop: 4}}, peakHours.length > 1 ? "Peak hours (tied): " : "Peak hour: ", React.createElement("b", null, peakHours.map(function(h) { return h + ":00"; }).join(", ")), " with " + _peakMax + " shows")
          );
        }()
      ),

      // Unique artists
      function() {
        var artists = {};
        all.forEach(function(s) { if (s.artist) artists[s.artist] = (artists[s.artist] || 0) + 1; });
        var artistCount = Object.keys(artists).length;
        var multiShow = Object.keys(artists).filter(function(a) { return artists[a] > 1; });
        multiShow.sort(function(a, b) { return artists[b] - artists[a]; });
        if (artistCount < 2) return null;
        return React.createElement("div", {style: {marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap"}},
          React.createElement("div", {style: {padding: "14px 12px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", textAlign: "center", flex: "1 1 130px"}},
            React.createElement("div", {style: {fontSize: 22, fontWeight: 900, color: "#2DD4BF"}}, artistCount.toLocaleString()),
            React.createElement("div", {style: {fontSize: 11, color: C.txt2, fontWeight: 600}}, "Unique artists")),
          multiShow.length > 0 && React.createElement("div", {style: {padding: "14px 12px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", textAlign: "center", flex: "1 1 130px"}},
            React.createElement("div", {style: {fontSize: 22, fontWeight: 900, color: "#FB923C"}}, multiShow.length),
            React.createElement("div", {style: {fontSize: 11, color: C.txt2, fontWeight: 600}}, "Artists with 2+ shows")),
          multiShow.length > 0 && React.createElement("div", {style: {padding: "14px 12px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", flex: "2 1 200px"}},
            React.createElement("div", {style: {fontSize: 11, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4}}, "Busiest artists"),
            multiShow.slice(0, 5).map(function(a, idx) {
              return React.createElement("div", {key: a, style: {fontSize: 12, color: C.txt2, padding: "2px 0"}}, (idx + 1) + ". " + a + " (" + artists[a] + " shows)");
            })
          )
        );
      }()

    );
  }()
  ),
  AI_ENABLED && function() {
    var METRIC_COLORS = ["#F472B6","#34D399","#60A5FA","#FBBF24","#A78BFA","#FB923C","#2DD4BF","#F87171","#818CF8","#4ADE80"];
    var _cq = cyo_Q, setCq = cyo_QS, _cr = cyo_R, setCr = cyo_RS, _cl = cyo_L, setCl = cyo_LS;
    var doAsk = function() {
      if (!_cq.trim()) return;
      setCl(true); setCr(null);
      var showData = (n || []).filter(function(s){return s;}).map(function(s) { return {title: s.title, venue: s.venue, genre: s.genre, price: s.priceFull, duration: s.duration, date: s.date || s.first, start: s.startStr}; });
      askAI([{role: "user", content: "You are a stats calculator for Edinburgh Fringe shows. Given this show data:\n" + JSON.stringify(showData) + "\nThe user asks: " + sanitizeAIInput(_cq) + "\nCalculate the requested metrics. Respond ONLY with a JSON array of objects like [{label:\"Metric name\",value:\"42\"},...]. Keep labels short (2-5 words). Values should be numbers, prices with pound sign, times, or short text. No markdown, no explanation, just the JSON array."}], 1000).then(function(d) {
        try {
          var txt = (d.content || []).map(function(b) { return b.text || ""; }).join("");
          txt = txt.replace(/```json|```/g, "").trim();
          setCr(JSON.parse(txt));
        } catch(e) { setCr([{label: "Error", value: "Couldn\u2019t parse the response"}]); }
      }).catch(function() { setCr([{label: "Error", value: "Request failed"}]); }).finally(function() { setCl(false); });
    };
    return React.createElement("div", {style: {marginTop: 32, borderTop: "1px solid " + C.border, paddingTop: 20}},
      React.createElement("div", {style: {fontSize: 18, fontWeight: 900, marginBottom: 6}}, "\u2728 Create your own"),
      React.createElement("p", {style: {fontSize: 13, color: C.txt2, margin: "0 0 12px", lineHeight: 1.5}}, "Tell me what you want to measure and I\u2019ll work it out from your shows."),
      React.createElement("textarea", {value: _cq, onChange: function(e) { setCq(e.target.value); }, placeholder: "e.g. What\u2019s my average show price? How many comedy shows? Which day has the most shows?", rows: 3, style: {width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 12, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 13, lineHeight: 1.5, outline: "none", resize: "vertical", fontFamily: "inherit"}}),
      React.createElement("button", {onClick: doAsk, disabled: _cl || !_cq.trim(), style: {marginTop: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: _cq.trim() ? C.accent : "rgba(168,85,247,0.3)", color: "#fff", fontSize: 14, fontWeight: 800, cursor: _cq.trim() ? "pointer" : "not-allowed"}}, _cl ? "Thinking\u2026" : "\u{1F4CA} Calculate"),
      _cr && React.createElement("div", {style: {display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, justifyContent: "center"}},
        _cr.map(function(m, idx) {
          var col = METRIC_COLORS[idx % METRIC_COLORS.length];
          return React.createElement("div", {key: idx, style: {flex: "1 1 160px", maxWidth: 240, padding: "16px 14px", borderRadius: 14, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", textAlign: "center"}},
            React.createElement("div", {style: {fontSize: 28, fontWeight: 900, color: col, marginBottom: 4, lineHeight: 1.2}}, String(m.value)),
            React.createElement("div", {style: {fontSize: 13, color: C.txt2, fontWeight: 600}}, m.label));
        }))
    );
  }()
  )
  }(), Q === "reviews" && function() {
    var showMap = {};
    (n || []).forEach(function(s) { showMap[s.code] = s; });
    var ordered = reviewOrder.slice().sort(function(a, b) {
      var ra = ratings[a] || 0, rb = ratings[b] || 0;
      var sa = (ra >= 1 && ra <= 5) ? ra : 0;
      var sb = (rb >= 1 && rb <= 5) ? rb : 0;
      if (sa === 0 && sb === 0) {
        var na = (showMap[a] && showMap[a].title || "").toLowerCase();
        var nb = (showMap[b] && showMap[b].title || "").toLowerCase();
        return na < nb ? -1 : na > nb ? 1 : 0;
      }
      if (sa === 0) return 1;
      if (sb === 0) return -1;
      if (sb !== sa) return sb - sa;
      var ta = (showMap[a] && showMap[a].title || "").toLowerCase();
      var tb = (showMap[b] && showMap[b].title || "").toLowerCase();
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });
    var filteredOrdered = reviewStarFilter != null ? ordered.filter(function(code) {
      var r = ratings[code] || 0;
      return reviewStarFilter === 0 ? (r < 1 || r > 5) : r === reviewStarFilter;
    }) : ordered;
    var moveItem = function(fromIdx, toIdx) {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= ordered.length || toIdx >= ordered.length) return;
      var arr = ordered.slice();
      var item = arr.splice(fromIdx, 1)[0];
      arr.splice(toIdx, 0, item);
      setReviewOrder(arr);
    };
    var setRank = function(code, newRank) {
      var fromIdx = ordered.indexOf(code);
      var toIdx = Math.max(0, Math.min(ordered.length - 1, newRank - 1));
      if (fromIdx !== toIdx) moveItem(fromIdx, toIdx);
    };
    var starsStr = function(r) { var s = ""; for (var i = 0; i < 5; i++) s += i < r ? "★" : "☆"; return s; };
    // Touch drag handlers
    var handleTouchStart = function(idx, ev) {
      var touch = ev.touches[0];
      reviewTouchStartRef.current = { idx: idx, startY: touch.clientY, moved: false };
      setTouchDragIdx(idx);
    };
    var handleTouchMove = function(ev) {
      if (reviewTouchStartRef.current == null) return;
      ev.preventDefault();
      var touch = ev.touches[0];
      reviewTouchStartRef.current.moved = true;
      setTouchDragY(touch.clientY);
      // Determine which tile we're over
      var refs = reviewTileRefsRef.current;
      for (var i = 0; i < refs.length; i++) {
        if (!refs[i]) continue;
        var rect = refs[i].getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
          setDragOverIdx(i);
          break;
        }
      }
    };
    var handleTouchEnd = function() {
      if (reviewTouchStartRef.current != null && reviewTouchStartRef.current.moved && dragOverIdx != null) {
        moveItem(reviewTouchStartRef.current.idx, dragOverIdx);
      }
      reviewTouchStartRef.current = null;
      setTouchDragIdx(null);
      setTouchDragY(null);
      setDragOverIdx(null);
    };
    return React.createElement(React.Fragment, null,
      React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 } },
        React.createElement("div", { style: { fontSize: V ? 18 : 22, fontWeight: 900, background: "linear-gradient(90deg,var(--pink),var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } }, "⭐ Reviews"),
        React.createElement("div", { style: { display: "flex", gap: 0, borderRadius: 10, overflow: "hidden", border: "1px solid " + C.border } },
          React.createElement("button", {
            onClick: function() { setReviewView("tiles"); },
            style: { padding: "7px 14px", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: reviewView === "tiles" ? C.accent : "transparent", color: reviewView === "tiles" ? "#fff" : C.txt2 }
          }, "Tiles"),
          React.createElement("button", {
            onClick: function() { setReviewView("table"); },
            style: { padding: "7px 14px", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", background: reviewView === "table" ? C.accent : "transparent", color: reviewView === "table" ? "#fff" : C.txt2 }
          }, "Table")
        )
      ),
      ordered.length > 0 && function() {
        var starCounts = [0, 0, 0, 0, 0];
        var unrated = 0;
        ordered.forEach(function(code) { var r = ratings[code]; if (r >= 1 && r <= 5) starCounts[r - 1]++; else unrated++; });
        return React.createElement("div", {style: {display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16, alignItems: "center", justifyContent: "center"}},
          [5, 4, 3, 2, 1].map(function(star) {
            var count = starCounts[star - 1];
            var isActive = reviewStarFilter === star;
            return React.createElement("button", {key: star, onClick: function() { setReviewStarFilter(isActive ? null : star); }, style: {
              padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
              background: isActive ? "rgba(168,85,247,0.22)" : "transparent",
              border: "1px solid " + (isActive ? "rgba(168,85,247,0.5)" : C.border),
              color: isActive ? C.accent : C.txt2, display: "flex", alignItems: "center", gap: 4
            }}, "★".repeat(star), React.createElement("span", {style: {color: isActive ? C.accent : C.txt3, fontWeight: 600}}, count));
          }),
          unrated > 0 && React.createElement("button", {onClick: function() { setReviewStarFilter(reviewStarFilter === 0 ? null : 0); }, style: {
            padding: "5px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: reviewStarFilter === 0 ? "rgba(168,85,247,0.22)" : "transparent",
            border: "1px solid " + (reviewStarFilter === 0 ? "rgba(168,85,247,0.5)" : C.border),
            color: reviewStarFilter === 0 ? C.accent : C.txt3
          }}, "Unrated ", React.createElement("span", {style: {color: reviewStarFilter === 0 ? C.accent : C.txt3, fontWeight: 600}}, unrated))
        );
      }(),
      ordered.length === 0 ? React.createElement("div", {
        style: { textAlign: "center", color: C.txt3, fontSize: 15, padding: "46px 12px" }
      }, "No past shows yet. Shows will appear here once their end time has passed.") :
      reviewView === "tiles" ?
        // TILE VIEW with drag-and-drop
        React.createElement("div", {
          style: { display: "grid", gridTemplateColumns: V ? "1fr" : "repeat(auto-fill, minmax(360px, 1fr))", gap: 10 },
          onTouchMove: handleTouchMove,
          onTouchEnd: handleTouchEnd
        }, filteredOrdered.map(function(code, idx) {
          var s = showMap[code];
          if (!s) return null;
          var r = ratings[code] || 0;
          var isDragging = dragIdx === idx || touchDragIdx === idx;
          var isOver = dragOverIdx === idx;
          // Star rating builder for tiles
          var tileStars = React.createElement("div", { style: { display: "flex", gap: 2 } },
            [1,2,3,4,5].map(function(star) {
              return React.createElement("span", {
                key: star,
                onClick: function(ev) { ev.stopPropagation(); var nr = {}; Object.keys(ratings).forEach(function(k){nr[k]=ratings[k];}); if (r === star) { delete nr[code]; } else { nr[code] = star; } setRatings(nr); },
                style: { cursor: "pointer", fontSize: V ? 16 : 14, color: star <= r ? "#FBBF24" : C.txt3, opacity: star <= r ? 1 : 0.4, transition: "color 0.15s" }
              }, "★");
            })
          );
          return React.createElement("div", {
            key: code,
            ref: function(el) { reviewTileRefsRef.current[idx] = el; },
            draggable: !V,
            onDragStart: V ? undefined : function(ev) { ev.dataTransfer.effectAllowed = "move"; setDragIdx(idx); },
            onDragEnd: V ? undefined : function() { setDragIdx(null); setDragOverIdx(null); },
            onDragOver: V ? undefined : function(ev) { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; setDragOverIdx(idx); },
            onDrop: V ? undefined : function(ev) { ev.preventDefault(); if (dragIdx != null) moveItem(dragIdx, idx); setDragIdx(null); setDragOverIdx(null); },
            style: {
              display: "flex", alignItems: "center", gap: V ? 8 : 12,
              padding: "12px 14px", borderRadius: 12,
              background: isOver ? "rgba(168,85,247,0.15)" : C.card,
              border: "1px solid " + (isOver ? "rgba(168,85,247,0.5)" : isDragging ? "rgba(168,85,247,0.3)" : C.border),
              opacity: isDragging ? 0.5 : 1,
              cursor: V ? "default" : "grab", userSelect: "none",
              transition: "border-color 0.15s, background 0.15s"
            }
          },
            V ? React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 } },
              React.createElement("button", {
                onClick: function() { if (idx > 0) moveItem(idx, idx - 1); },
                disabled: idx === 0,
                style: { border: "none", background: "transparent", color: idx === 0 ? C.txt3 + "44" : C.accent, fontSize: 14, cursor: idx === 0 ? "default" : "pointer", padding: "2px 6px", lineHeight: 1 }
              }, "▲"),
              React.createElement("span", { style: { fontSize: 10, fontWeight: 900, color: C.txt3, textAlign: "center" } }, "#" + (idx + 1)),
              React.createElement("button", {
                onClick: function() { if (idx < ordered.length - 1) moveItem(idx, idx + 1); },
                disabled: idx === ordered.length - 1,
                style: { border: "none", background: "transparent", color: idx === ordered.length - 1 ? C.txt3 + "44" : C.accent, fontSize: 14, cursor: idx === ordered.length - 1 ? "default" : "pointer", padding: "2px 6px", lineHeight: 1 }
              }, "▼")
            ) : React.createElement(React.Fragment, null,
              React.createElement("span", { style: { fontSize: 11, fontWeight: 900, color: C.txt3, minWidth: 20, textAlign: "center", flexShrink: 0 } }, "#" + (idx + 1)),
              React.createElement("div", { style: { display: "flex", alignItems: "center", fontSize: 16, color: C.txt3, cursor: "grab", flexShrink: 0 } }, "⠿")
            ),
            React.createElement("div", {
              onClick: function() { de(s); },
              style: { flex: 1, minWidth: 0, cursor: "pointer" }
            },
              React.createElement("div", { style: { fontSize: V ? 13 : 14, fontWeight: 800, color: C.txt, wordBreak: "break-word" } }, s.title),
              React.createElement("div", { style: { fontSize: V ? 11 : 12, color: C.txt3, wordBreak: "break-word" } }, s.artist || "")
            ),
            React.createElement("div", { style: { flexShrink: 0, textAlign: "right" } },
              tileStars
            )
          );
        })) :
        // TABLE VIEW
        React.createElement("div", { style: { overflowX: "auto" } },
          React.createElement("table", {
            style: { width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: V ? 12 : 14 }
          },
            React.createElement("thead", null,
              React.createElement("tr", null,
                React.createElement("th", { style: { padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.txt3, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid " + C.border, width: 60 } }, "Rank"),
                React.createElement("th", { style: { padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.txt3, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid " + C.border } }, "Show"),
                React.createElement("th", { style: { padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 800, color: C.txt3, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid " + C.border } }, "Artist"),
                React.createElement("th", { style: { padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 800, color: C.txt3, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid " + C.border, width: 100 } }, "Rating")
              )
            ),
            React.createElement("tbody", null,
              filteredOrdered.map(function(code, idx) {
                var s = showMap[code];
                if (!s) return null;
                var r = ratings[code] || 0;
                return React.createElement("tr", {
                  key: code,
                  style: { borderBottom: "1px solid " + C.border }
                },
                  React.createElement("td", { style: { padding: "8px", borderBottom: "1px solid " + C.border, verticalAlign: "middle" } },
                    React.createElement("input", {
                      type: "number",
                      min: 1,
                      max: ordered.length,
                      defaultValue: idx + 1,
                      key: code + "-rank-" + idx,
                      onBlur: function(ev) {
                        var val = parseInt(ev.target.value, 10);
                        if (!isNaN(val) && val >= 1 && val <= ordered.length) setRank(code, val);
                      },
                      onKeyDown: function(ev) {
                        if (ev.key === "Enter") { ev.target.blur(); }
                      },
                      style: { width: 48, padding: "4px 6px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.txt, fontSize: 13, fontWeight: 700, textAlign: "center" }
                    })
                  ),
                  React.createElement("td", {
                    onClick: function() { de(s); },
                    style: { padding: "8px", borderBottom: "1px solid " + C.border, fontWeight: 700, cursor: "pointer", color: C.txt, maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
                  }, s.title),
                  React.createElement("td", {
                    style: { padding: "8px", borderBottom: "1px solid " + C.border, color: C.txt2, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
                  }, s.artist || "—"),
                  React.createElement("td", {
                    style: { padding: "8px", borderBottom: "1px solid " + C.border, textAlign: "center" }
                  }, React.createElement("div", { style: { display: "flex", justifyContent: "center", gap: 2 } },
                    [1,2,3,4,5].map(function(star) {
                      return React.createElement("span", {
                        key: star,
                        onClick: function() { var nr = {}; Object.keys(ratings).forEach(function(k){nr[k]=ratings[k];}); if (r === star) { delete nr[code]; } else { nr[code] = star; } setRatings(nr); },
                        style: { cursor: "pointer", fontSize: 16, color: star <= r ? "#FBBF24" : C.txt3, opacity: star <= r ? 1 : 0.35, transition: "color 0.15s" }
                      }, "★");
                    })
                  ))
                );
              })
            )
          )
        ),
      // Fringe Friends Leaderboard
      React.createElement("div", { style: { marginTop: 24, borderTop: "1px solid " + C.border, paddingTop: 18 } },
        React.createElement("div", {
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, cursor: "pointer" },
          onClick: function() { setShowLeaderboard(function(v) { return !v; }); }
        },
          React.createElement("div", { style: { fontSize: V ? 16 : 18, fontWeight: 900, background: "linear-gradient(90deg,#FBBF24,#F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } }, "🏆 Fringe Friends"),
          React.createElement("span", { style: { fontSize: 12, color: C.txt3 } }, showLeaderboard ? "▲ Hide" : "▼ Show")
        ),
        showLeaderboard && function() {
          // Compute my stats
          var myShows = Object.keys(ratings).filter(function(c) { return ratings[c] >= 1 && ratings[c] <= 5; }).length;
          var myTotal = 0, myCount = 0;
          Object.keys(ratings).forEach(function(c) { var r = ratings[c]; if (r >= 1 && r <= 5) { myTotal += r; myCount++; } });
          var myAvg = myCount > 0 ? (myTotal / myCount).toFixed(1) : "—";
          var myFave = "—";
          if (myCount > 0) {
            var best = Object.keys(ratings).filter(function(c) { return ratings[c] === 5; });
            if (best.length > 0) {
              var s = showMap[best[0]];
              myFave = s ? s.title : best[0];
            }
          }
          var myStats = { name: "You", shows: myShows, avg: myAvg, fave: myFave };
          // Build share link
          var shareMyStats = function() {
            var data = { n: "Me", s: myShows, a: parseFloat(myAvg) || 0, f: myFave };
            var enc = LZString.compressToEncodedURIComponent(JSON.stringify(data));
            var url = window.location.origin + window.location.pathname + "#stats=" + enc;
            try { navigator.clipboard.writeText(url); } catch(e) {}
            window.prompt("Share your Fringe stats with friends:", url);
          };
          // Parse friend link
          var addFriend = function() {
            try {
              var url = friendLinkInput.trim();
              if (url.indexOf("#stats=") === -1) return;
              var hash = url.split("#stats=")[1].split("&")[0].split("#")[0];
              var data = JSON.parse(LZString.decompressFromEncodedURIComponent(hash));
              if (!data || !data.n) return;
              var friend = { id: Date.now(), name: data.n, shows: data.s || 0, avg: data.a || 0, fave: data.f || "—" };
              setFringeFriends(function(prev) { return prev.concat([friend]); });
              setFriendLinkInput("");
            } catch(e) {}
          };
          // All participants sorted by shows seen
          var all = [myStats].concat(fringeFriends.map(function(f) { return { name: f.name, shows: f.shows || 0, avg: typeof f.avg === "number" ? f.avg.toFixed(1) : f.avg || "—", fave: f.fave || "—", id: f.id }; }));
          all.sort(function(a, b) { return (b.shows || 0) - (a.shows || 0); });
          return React.createElement(React.Fragment, null,
            React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 } },
              React.createElement("button", {
                onClick: shareMyStats,
                style: { padding: "8px 14px", borderRadius: 10, border: "1px solid " + C.border, background: "rgba(251,191,36,0.1)", color: "#FBBF24", fontSize: 12, fontWeight: 800, cursor: "pointer" }
              }, "📤 Share my stats")
            ),
            React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center", marginBottom: 14 } },
              React.createElement("input", {
                value: friendLinkInput,
                onChange: function(ev) { setFriendLinkInput(ev.target.value); },
                placeholder: "Paste a friend's stats link…",
                style: { flex: 1, padding: "8px 11px", borderRadius: 10, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 12, outline: "none", minWidth: 0 }
              }),
              React.createElement("button", {
                onClick: addFriend,
                disabled: !friendLinkInput.trim(),
                style: { padding: "8px 14px", borderRadius: 10, border: "none", background: friendLinkInput.trim() ? "#F97316" : "rgba(249,115,22,0.3)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: friendLinkInput.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }
              }, "+ Add friend")
            ),
            React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
              all.map(function(person, idx) {
                var medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : (idx + 1) + ".";
                var isMe = person.name === "You";
                return React.createElement("div", {
                  key: person.id || "me",
                  style: { display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: isMe ? "rgba(251,191,36,0.08)" : C.card, border: "1px solid " + (isMe ? "rgba(251,191,36,0.3)" : C.border) }
                },
                  React.createElement("span", { style: { fontSize: 18, minWidth: 28, textAlign: "center" } }, medal),
                  React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                    React.createElement("div", { style: { fontWeight: 800, fontSize: 14, color: isMe ? "#FBBF24" : C.txt } }, person.name),
                    React.createElement("div", { style: { fontSize: 11, color: C.txt3, marginTop: 2 } },
                      person.shows + " shows seen · avg " + person.avg + "★",
                      person.fave !== "—" ? " · fave: " + person.fave : ""
                    )
                  ),
                  !isMe && React.createElement("button", {
                    onClick: function() { setFringeFriends(function(prev) { return prev.filter(function(f) { return f.id !== person.id; }); }); },
                    style: { width: 24, height: 24, borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }
                  }, "✕")
                );
              })
            ),
            all.length > 1 && React.createElement("div", { style: { marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)", fontSize: 12, color: C.txt2 } },
              "🎯 ", all[0].name === "You" ? "You're in the lead! Keep seeing shows!" : all[0].name + " is leading with " + all[0].shows + " shows seen!"
            )
          );
        }()
      )
    );
  }(), Q === "planner" && React.createElement(PlannerView, {
    avail: zt,
    setAvail: fn,
    planShows: Me,
    shows: n,
    isMobile: V,
    onAddToBookings: b,
    existingBookings: p
  }), Q === "browse" && React.createElement(React.Fragment, null,
  // Show discovery feed — "For you" suggestions
  function() {
    if (!n || n.length === 0 || Object.keys(p).length === 0) return null;
    // Build preference profile from booked shows
    var genreScore = {}, bookedSet = {};
    Object.keys(p).forEach(function(code) { bookedSet[code] = true; });
    (n || []).forEach(function(s) {
      if (bookedSet[s.code]) {
        var g = s.genre || "Other";
        var r = ratings[s.code] || 3;
        genreScore[g] = (genreScore[g] || 0) + r;
      }
    });
    // Score unbooked shows
    var scored = (n || []).filter(function(s) {
      return !bookedSet[s.code] && !d.has(s.code);
    }).map(function(s) {
      var g = s.genre || "Other";
      var score = genreScore[g] || 0;
      if (s.priceFull === 0 || s.priceFull == null) score += 2;
      if (s.age && s.age.indexOf("+") >= 0) score += 1;
      return { s: s, score: score };
    }).filter(function(x) { return x.score > 0; })
      .sort(function(a, b) { return b.score - a.score; })
      .slice(0, 8);
    if (scored.length === 0) return null;
    return React.createElement("div", {
      style: { marginBottom: 14, padding: "10px 0" }
    },
      React.createElement("div", { style: { fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3, marginBottom: 8, paddingLeft: 4 } }, "✨ For you"),
      React.createElement("div", {
        style: { display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }
      }, scored.map(function(x) {
        var s = x.s;
        return React.createElement("div", {
          key: s.code,
          onClick: function() { de(s); },
          style: { minWidth: 160, maxWidth: 180, padding: "10px 12px", borderRadius: 12, background: C.card, border: "1px solid " + C.border, cursor: "pointer", flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }
        },
          React.createElement("div", { style: { fontSize: 13, fontWeight: 800, lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" } }, s.title),
          React.createElement("div", { style: { fontSize: 11, color: C.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.artist || ""),
          React.createElement("div", { style: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: "auto" } },
            s.genre && React.createElement("span", { style: { fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "transparent", color: gcolor(s.genre), fontWeight: 700, border: "1px solid " + gcolor(s.genre) + "66" } }, s.genre),
            React.createElement("span", { style: { fontSize: 10, padding: "1px 6px", borderRadius: 6, background: "rgba(52,211,153,0.15)", color: "#34d399", fontWeight: 700 } }, s.priceFull ? "£" + s.priceFull : "Free")
          ),
          React.createElement("div", { style: { display: "flex", gap: 6, marginTop: 4 } },
            React.createElement("button", {
              onClick: function(ev) { ev.stopPropagation(); Se(s.code); },
              style: { flex: 1, padding: "4px 0", borderRadius: 6, border: "1px solid " + C.border, background: d.has(s.code) ? "rgba(168,85,247,0.15)" : "transparent", color: d.has(s.code) ? C.accent : C.txt3, fontSize: 10, fontWeight: 700, cursor: "pointer" }
            }, d.has(s.code) ? "🪄 Saved" : "🪄 Wishlist")
          )
        );
      }))
    );
  }(),
  function() {
    var e = function(i) {
        return {
          padding: "7px 12px",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 800,
          background: i ? C.accent : "transparent",
          color: i ? "#fff" : C.txt2
        }
      },
      r = D === "table" ? _ : v,
      l = [
        ["artist", "Artist"],
        ["venue", "Venue"],
        ["dates", "Dates"],
        ["time", "Start / end / duration"],
        ["price", "Price"],
        ["genre", "Genre & tags"]
      ];
    return React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: V ? "center" : "space-between",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
        marginBottom: 10
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap"
      }
    }, !V && React.createElement("span", {
      style: {
        fontSize: 13,
        color: C.txt3
      }
    }, Xe.length.toLocaleString() + " shows", Xe.length > st ? " \xB7 showing " + Math.min(st, Xe.length) : "")), React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: V ? "center" : "flex-start"
      }
    }, null, React.createElement("div", {
      style: {
        display: "inline-flex",
        borderRadius: 8,
        border: "1px solid " + C.border,
        overflow: "hidden"
      }
    }, React.createElement("button", {
      onClick: function() {
        J("cards")
      },
      style: e(D === "cards")
    }, V ? "\u25A6" : "\u25A6 Cards"), React.createElement("button", {
      onClick: function() {
        J("table")
      },
      style: e(D === "table")
    }, V ? "\u25A4" : "\u25A4 Table"), React.createElement("button", {
      onClick: function() {
        J("tiles")
      },
      style: e(D === "tiles")
    }, V ? "\u229E" : "\u229E Tiles")), D === "cards" && React.createElement("button", {
      onClick: function() { setCompactCards(function(prev) { return !prev; }); },
      title: compactCards ? "Normal cards" : "Compact cards",
      style: {
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid " + (compactCards ? C.accent : C.border),
        background: compactCards ? "rgba(168,85,247,0.15)" : "transparent",
        color: compactCards ? C.accent : C.txt2,
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer"
      }
    }, V ? "\u25A3" : "\u25A3 Compact"), React.createElement("div", {
      style: {
        position: "relative"
      }
    }, React.createElement("button", {
      onClick: function() {
        ct(function(i) {
          return !i
        })
      },
      style: {
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid " + C.border,
        background: ee ? "rgba(168,85,247,0.15)" : "transparent",
        color: C.txt2,
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer"
      }
    }, V ? "\u2699" : "\u2699 Info"), ee && React.createElement("div", {
      style: {
        position: "absolute",
        right: 0,
        top: "100%",
        marginTop: 4,
        zIndex: 60,
        background: C.card,
        border: "1px solid " + C.border,
        borderRadius: 10,
        padding: "8px 12px",
        minWidth: 180,
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
      }
    }, React.createElement("div", {
      style: {
        fontSize: 10,
        color: C.txt3,
        fontWeight: 700,
        textTransform: "uppercase",
        marginBottom: 4
      }
    }, "Show on each card"), compactCards && React.createElement("div", {
      style: {fontSize: 11, color: C.txt3, fontStyle: "italic", marginBottom: 4}
    }, "Tags hidden in compact mode"), l.map(function(i) {
      return React.createElement("label", {
        key: i[0],
        style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 0",
          fontSize: 13,
          color: C.txt,
          cursor: "pointer"
        }
      }, React.createElement("input", {
        type: "checkbox",
        checked: ue[i[0]] !== !1,
        onChange: function(u) {
          var c = u.target.checked;
          Re(function(T) {
            var B = Object.assign({}, T);
            return B[i[0]] = c, B
          })
        }
      }), i[1])
    }))), React.createElement("select", {
      "aria-label": "Number of shows to display",
      value: r,
      onChange: function(i) {
        var u = Number(i.target.value);
        D === "table" ? fe(u) : A(u), kt(u)
      },
      style: {
        padding: "7px 10px",
        borderRadius: 8,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 12,
        fontWeight: 700,
        colorScheme: THEME === "light" ? "light" : "dark"
      }
    }, [20, 60, 120, 200].map(function(i) {
      return React.createElement("option", {
        key: i,
        value: i
      }, V ? "\u{1F3AD} " + i : i + " shows")
    }))))
  }(), D === "tiles" ? React.createElement(Tiles, {
    isMobile: V,
    list: Xe.slice(0, st),
    plan: d,
    booked: p,
    proposals: X,
    fields: ue,
    onWish: Se,
    onBook: Be,
    onProp: wt,
    onOpen: de,
    showTags: showTags
  }) : D === "table" ? React.createElement(ShowTable, {
    rows: Xe,
    limit: st,
    cardFields: ue,
    sortKey: Qe,
    sortDir: $e,
    setSortKey: it,
    setSortDir: at,
    plan: d,
    booked: p,
    toggle: Se,
    onBookClick: Be,
    onOpen: de
  }) : React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: V ? "1fr" : compactCards ? "repeat(auto-fill,minmax(200px,1fr))" : "repeat(auto-fill,minmax(260px,1fr))",
      gridAutoRows: "1fr",
      gap: compactCards ? 8 : 12
    }
  }, Xe.slice(0, st).map(e => React.createElement(ShowCard, {
    key: e.code,
    s: e,
    inPlan: d.has(e.code),
    isBk: !!(p[e.code] && p[e.code].length),
    hasNote: !!se[e.code],
    fields: ue,
    compact: compactCards,
    rating: ratings[e.code] || 0,
    userTags: showTags[e.code] || null,
    onWish: () => Se(e.code),
    onBook: () => Be(e),
    onOpen: () => de(e)
  }))), Xe.length > st && React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 18
    }
  }, React.createElement("button", {
    onClick: () => kt(e => e + (D === "table" ? _ : v)),
    style: {
      padding: "10px 22px",
      borderRadius: 12,
      border: "1px solid " + C.border,
      background: C.card,
      color: C.txt,
      fontSize: 14,
      fontWeight: 800,
      cursor: "pointer"
    }
  }, "Show more"))), Q === "plan" && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      flexWrap: "wrap"
    }
  }, React.createElement("p", {
    style: {
      fontSize: 15,
      color: C.txt2,
      margin: 0
    }
  }, "You have ", React.createElement("b", {
    style: {
      color: C.txt,
      fontWeight: 800
    }
  }, Me.length), " show", Me.length === 1 ? "" : "s", " in your wishlist."), Me.length > 0 && React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, React.createElement("div", {
    style: {
      display: "inline-flex",
      borderRadius: 8,
      border: "1px solid " + C.border,
      overflow: "hidden"
    }
  }, React.createElement("button", {
    onClick: function() {
      Tt("cards")
    },
    style: {
      padding: "7px 12px",
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
      background: Ke === "cards" ? C.accent : "transparent",
      color: Ke === "cards" ? "#fff" : C.txt2
    }
  }, V ? "\u25A6" : "\u25A6 Cards"), React.createElement("button", {
    onClick: function() {
      Tt("table")
    },
    style: {
      padding: "7px 12px",
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
      background: Ke === "table" ? C.accent : "transparent",
      color: Ke === "table" ? "#fff" : C.txt2
    }
  }, V ? "\u25A4" : "\u25A4 Table"), React.createElement("button", {
    onClick: function() {
      Tt("tiles")
    },
    style: {
      padding: "7px 12px",
      border: "none",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
      background: Ke === "tiles" ? C.accent : "transparent",
      color: Ke === "tiles" ? "#fff" : C.txt2
    }
  }, V ? "\u229E" : "\u229E Tiles")), Ke === "cards" && React.createElement("button", {
      onClick: function() { setCompactCards(function(prev) { return !prev; }); },
      title: compactCards ? "Normal cards" : "Compact cards",
      style: {
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid " + (compactCards ? C.accent : C.border),
        background: compactCards ? "rgba(168,85,247,0.15)" : "transparent",
        color: compactCards ? C.accent : C.txt2,
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer"
      }
    }, compactCards ? "\u25A3 Compact" : "\u25A3 Compact"),
    Me.length > 1 && React.createElement("select", {
      value: wishSort,
      onChange: function(ev) { setWishSort(ev.target.value); },
      "aria-label": "Sort wishlist",
      style: { padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 12, fontWeight: 700, cursor: "pointer", outline: "none" }
    }, React.createElement("option", { value: "added" }, "Sort: Date added"),
      React.createElement("option", { value: "alpha" }, "Sort: Name A\u2013Z"),
      React.createElement("option", { value: "time" }, "Sort: Show time"),
      React.createElement("option", { value: "venue" }, "Sort: Venue")))), React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("button", {
    onClick: () => pt(e => !e),
    style: {
      padding: "9px 16px",
      borderRadius: 10,
      border: "1px dashed " + C.border,
      background: ne ? "rgba(168,85,247,0.12)" : "transparent",
      color: ne ? "#c084fc" : C.txt2,
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, ne ? "\u2713 Done" : "\u2795 Add a show"), " ", React.createElement("button", {
    onClick: function() { setCompareMode(function(prev) { return !prev; }); setCompareLink(""); setCompareCodes(null); },
    style: {
      padding: "9px 16px",
      borderRadius: 10,
      border: "1px dashed " + (compareMode ? "#3b82f6" : C.border),
      background: compareMode ? "rgba(59,130,246,0.12)" : "transparent",
      color: compareMode ? "#60a5fa" : C.txt2,
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, compareMode ? "\u2713 Done" : "\ud83d\udd0d Compare wishlists"), compareMode && React.createElement("div", {
    style: { marginBottom: 14, padding: "14px 16px", borderRadius: 12, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.06)" }
  },
    React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 8 } }, "\ud83d\udd0d Compare with a friend\u2019s wishlist"),
    React.createElement("div", { style: { fontSize: 12, color: C.txt2, marginBottom: 10 } }, "Ask your friend to share their wishlist link from this app, then paste it below."),
    React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } },
      React.createElement("input", {
        value: compareLink,
        onChange: function(ev) { setCompareLink(ev.target.value); },
        placeholder: "Paste friend\u2019s wishlist link\u2026",
        style: { flex: 1, padding: "9px 11px", borderRadius: 10, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 13, outline: "none", minWidth: 0 }
      }),
      React.createElement("button", {
        onClick: function() {
          try {
            var url = compareLink.trim();
            var hash = "";
            if (url.indexOf("#p=") !== -1) hash = url.split("#p=")[1].split("&")[0].split("#")[0];
            else if (url.indexOf("#import=") !== -1) {
              var imp = url.split("#import=")[1].split("&")[0].split("#")[0];
              var decoded = JSON.parse(LZString.decompressFromEncodedURIComponent(imp));
              if (decoded && decoded.p) { setCompareCodes(new Set(decoded.p)); return; }
            }
            if (!hash) { setCompareCodes(new Set()); return; }
            var codes = LZString.decompressFromEncodedURIComponent(hash);
            if (!codes) { setCompareCodes(new Set()); return; }
            setCompareCodes(new Set(codes.split(",")));
          } catch(err) { setCompareCodes(new Set()); }
        },
        disabled: !compareLink.trim(),
        style: { padding: "9px 16px", borderRadius: 10, border: "none", background: compareLink.trim() ? "#3b82f6" : "rgba(59,130,246,0.3)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: compareLink.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap" }
      }, "Compare")),
    compareCodes !== null && function() {
      var both = [], onlyMe = [], onlyThem = [];
      d.forEach(function(code) { if (compareCodes.has(code)) both.push(code); else onlyMe.push(code); });
      compareCodes.forEach(function(code) { if (!d.has(code)) onlyThem.push(code); });
      var showLookup = {};
      (n || []).forEach(function(s) { showLookup[s.code] = s; });
      var renderList = function(list, emptyMsg) {
        if (list.length === 0) return React.createElement("div", { style: { fontSize: 12, color: C.txt3, fontStyle: "italic", padding: "4px 0" } }, emptyMsg);
        return React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 4 } },
          list.map(function(code) {
            var s = showLookup[code];
            if (!s) return React.createElement("div", { key: code, style: { fontSize: 12, color: C.txt3 } }, code);
            var inMyWish = d.has(code);
            return React.createElement("div", {
              key: code,
              style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, background: C.card, border: "1px solid " + C.border, cursor: "pointer" },
              onClick: function() { de(s); }
            },
              React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                React.createElement("div", { style: { fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s.title),
                React.createElement("div", { style: { fontSize: 11, color: C.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, venueLabel_(s), s.startStr ? " \xB7 " + s.startStr : "")
              ),
              !inMyWish && React.createElement("button", {
                onClick: function(ev) { ev.stopPropagation(); Se(code); },
                style: { padding: "4px 10px", borderRadius: 8, border: "1px solid " + C.accent, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }
              }, "+ Wishlist")
            );
          })
        );
      };
      return React.createElement("div", { style: { marginTop: 14 } },
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: V ? "1fr" : "1fr 1fr 1fr", gap: 12 } },
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: "#34d399", marginBottom: 6 } }, "\u2764\ufe0f You both want (" + both.length + ")"),
            renderList(both, "No shows in common")),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: C.accent, marginBottom: 6 } }, "\ud83d\ude4b Only you (" + onlyMe.length + ")"),
            renderList(onlyMe, "None")),
          React.createElement("div", null,
            React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: "#60a5fa", marginBottom: 6 } }, "\ud83d\udc6b Only them (" + onlyThem.length + ")"),
            renderList(onlyThem, "None"))
        ),
        React.createElement("div", { style: { marginTop: 10, fontSize: 12, color: C.txt3 } },
          "Total: " + (both.length + onlyMe.length + onlyThem.length) + " unique shows across both wishlists"
        )
      );
    }()
  ), ne && React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, React.createElement("input", {
    autoFocus: !0,
    value: Te,
    onChange: e => Oe(e.target.value),
    "aria-label": "Search all shows by name",
    placeholder: "Search all shows by name\u2026",
    style: {
      width: "100%",
      maxWidth: 420,
      boxSizing: "border-box",
      padding: "9px 11px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: "rgba(255,255,255,0.06)",
      color: C.txt,
      fontSize: 13,
      outline: "none"
    }
  }), Te.trim().length >= 2 && React.createElement("div", {
    style: {
      marginTop: 6,
      maxWidth: 420,
      border: "1px solid " + C.border,
      borderRadius: 10,
      overflow: "hidden",
      maxHeight: 320,
      overflowY: "auto"
    }
  }, (n || []).filter(function(e) {
    return e.title.toLowerCase().includes(Te.trim().toLowerCase())
  }).slice(0, 20).map(function(e) {
    var r = d.has(e.code);
    return React.createElement("div", {
      key: e.code,
      onClick: function() {
        Se(e.code)
      },
      style: {
        padding: "9px 11px",
        cursor: "pointer",
        fontSize: 13,
        borderTop: "1px solid " + C.border,
        display: "flex",
        alignItems: "center",
        gap: 9,
        background: r ? "rgba(52,211,153,0.12)" : "transparent"
      }
    }, React.createElement("span", {
      style: {
        fontWeight: 800,
        fontSize: 15,
        color: r ? "#34d399" : C.accent,
        width: 14,
        textAlign: "center",
        flexShrink: 0
      }
    }, r ? "\u2713" : "+"), React.createElement("span", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, React.createElement("div", {
      style: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        fontWeight: 600
      }
    }, e.title), React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.txt3,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, venueLabel_(e), e.startStr ? " \xB7 " + e.startStr : "", priceLabel(showPrice_(e)) ? " \xB7 " + priceLabel(showPrice_(e)) : "")))
  })))), Me.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      color: C.txt3,
      fontSize: 15,
      padding: "50px 12px"
    }
  }, "Nothing wishlisted yet \u2014 head to ", React.createElement("b", {
    style: {
      color: C.txt2
    }
  }, "Browse all"), " and tap ", React.createElement("b", {
    style: {
      color: C.txt2
    }
  }, "+ Wishlist"), ".") : Ke === "tiles" ? React.createElement(Tiles, {
    isMobile: V,
    list: Me,
    plan: d,
    booked: p,
    proposals: X,
    fields: ue,
    onWish: Se,
    onBook: Be,
    onProp: wt,
    onOpen: de,
    showTags: showTags
  }) : Ke === "table" ? React.createElement(ShowTable, {
    rows: Me,
    cardFields: {},
    sortKey: Qe,
    sortDir: $e,
    setSortKey: it,
    setSortDir: at,
    plan: d,
    booked: p,
    toggle: Se,
    onBookClick: Be,
    onOpen: de
  }) : React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: V ? "1fr" : compactCards ? "repeat(auto-fill,minmax(200px,1fr))" : "repeat(auto-fill,minmax(260px,1fr))",
      gridAutoRows: "1fr",
      gap: compactCards ? 8 : 12
    }
  }, Me.map(e => React.createElement(ShowCard, {
    key: e.code,
    s: e,
    inPlan: !0,
    isBk: !!(p[e.code] && p[e.code].length),
    hasNote: !!se[e.code],
    compact: compactCards,
    rating: ratings[e.code] || 0,
    userTags: showTags[e.code] || null,
    onWish: () => Se(e.code),
    onBook: () => Be(e),
    onOpen: () => de(e)
  })))), Q === "map" && function() {
    var e = {};
    (n || []).forEach(function(i) {
      e[i.code] = i
    });
    var _today = (function() { var _d = new Date(); return _d.getFullYear() + "-" + ("0" + (_d.getMonth() + 1)).slice(-2) + "-" + ("0" + _d.getDate()).slice(-2); })();
    var r;
    if (K === "wishlist") { r = Me; }
    else if (K === "booked") { r = Object.keys(p).map(function(i) { return e[i]; }).filter(Boolean); }
    else if (K === "today") {
      r = (n || []).filter(function(i) {
        var recs = p[i.code];
        return Array.isArray(recs) && recs.some(function(rec) { return rec.date === _today; });
      });
    }
    else { r = Array.from(new Set([...d, ...Object.keys(p)])).map(function(i) { return e[i]; }).filter(Boolean); }
    var l = function(i, u) {
      return React.createElement("button", {
        key: i,
        onClick: function() {
          x(i)
        },
        style: {
          padding: "6px 14px",
          border: "none",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 800,
          background: K === i ? C.accent : "transparent",
          color: K === i ? "#fff" : C.txt2
        }
      }, u)
    };
    return React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: "flex",
        justifyContent: "center",
        marginBottom: 10
      }
    }, React.createElement("div", {
      style: {
        display: "inline-flex",
        borderRadius: 8,
        border: "1px solid " + C.border,
        overflow: "hidden",
        flexWrap: "wrap",
        justifyContent: "center"
      }
    }, l("booked", "\u{1F39F} Booked"), l("wishlist", "🪄 Wishlist"), l("today", "\u{1F4C5} Today"), l("all", "All"))), React.createElement(MapView, {
      shows: r,
      isMobile: V,
      favVenues: favVenues
    }))
  }(), Q === "booked" && function() {
    var e = {};
    (n || []).forEach(function(u) {
      e[u.code] = u
    });
    var r = Object.keys(p).flatMap(function(u) {
        return (p[u] || []).map(function(rec, ri) {
          return { code: u, rec: rec, s: e[u], bIdx: ri }
        })
      }).filter(function(u) {
        return u.s
      }),
      l = {};
    r.forEach(function(u) {
      var c = u.rec.date || "No date";
      (l[c] = l[c] || []).push(u)
    });
    var multiVenueShows = {};
    (n || []).forEach(function(u) {
      var t = (u.title || "").toLowerCase().trim();
      if (!t) return;
      if (!multiVenueShows[t]) multiVenueShows[t] = {};
      multiVenueShows[t][u.venue || ""] = venueLabel_(u);
    });
    var multiVenueWarnings = {};
    Object.keys(multiVenueShows).forEach(function(t) {
      var venues = Object.keys(multiVenueShows[t]);
      if (venues.length > 1) multiVenueWarnings[t] = Object.values(multiVenueShows[t]);
    });
    var i = Object.keys(l).sort();
    var nowDate = new Date();
    var nowStr = nowDate.getFullYear() + "-" + String(nowDate.getMonth()+1).padStart(2,"0") + "-" + String(nowDate.getDate()).padStart(2,"0");
    var nowMin = nowDate.getHours() * 60 + nowDate.getMinutes();
    var upcomingCount = r.filter(function(u) {
      if (!u.rec.date) return true;
      if (u.rec.date > nowStr) return true;
      if (u.rec.date < nowStr) return false;
      var endM = timeToMin_(u.rec.end || u.s.endStr);
      return endM == null || (endM + 1) > nowMin;
    }).length;
    var filteredDates = i;
    if (bkDateFilter) {
      filteredDates = i.filter(function(d) { return d === bkDateFilter; });
    }
    if (!bkShowPast) {
      filteredDates = filteredDates.filter(function(d) {
        if (d === "No date") return true;
        if (d > nowStr) return true;
        if (d < nowStr) return false;
        var dayItems = l[d] || [];
        return dayItems.some(function(u) {
          var endM = timeToMin_(u.rec.end || u.s.endStr);
          return endM == null || (endM + 1) > nowMin;
        });
      });
    }
    return React.createElement("div", null,
    // Sub-view toggle
    React.createElement("div", {
      style: { display: "flex", gap: 0, marginBottom: 14, background: C.card, borderRadius: 10, border: "1px solid " + C.border, overflow: "hidden" }
    },
      ["overview", "bookings"].map(function(key) {
        var labels = { overview: "📋 Overview", bookings: "🎫️ My Bookings" };
        var active = bkSubView === key;
        return React.createElement("button", {
          key: key,
          onClick: function() { setBkSubView(key); },
          style: {
            flex: 1, padding: "10px 12px", border: "none", cursor: "pointer",
            background: active ? "rgba(168,85,247,0.15)" : "transparent",
            color: active ? C.accent : C.txt3,
            fontSize: 13, fontWeight: active ? 800 : 600,
            borderBottom: active ? "2px solid " + C.accent : "2px solid transparent",
            transition: "all 0.15s"
          }
        }, labels[key]);
      })
    ),
    // Overview sub-view
    bkSubView === "overview" && React.createElement("div", {
      style: { marginBottom: 12 }
    }, React.createElement("div", {
      style: { margin: 0, textAlign: V ? "center" : "left" }
    }, React.createElement("p", {
      style: {
        fontSize: 15,
        color: C.txt2,
        margin: 0
      }
    }, "You have booked a total of ", React.createElement("b", {
      style: {
        color: C.txt,
        fontWeight: 800
      }
    }, r.length), " show", r.length === 1 ? "" : "s", "."), React.createElement("p", {
      style: {
        fontSize: 14,
        color: C.txt2,
        margin: "4px 0 0"
      }
    }, "You have ", React.createElement("b", {
      style: {
        color: "#34d399",
        fontWeight: 800
      }
    }, upcomingCount), " show", upcomingCount === 1 ? "" : "s", " upcoming."), (function() {
      var ltfTotal = 0;
      Object.keys(p).forEach(function(code) { (p[code] || []).forEach(function(bk) { if (bk.ltf && bk.ltfTickets > 0) ltfTotal += bk.ltfTickets; }); });
      return ltfTotal > 0 ? React.createElement("p", {style: {fontSize: 14, color: C.txt2, margin: "4px 0 0"}}, "You have used ", React.createElement("b", {style: {color: C.accent, fontWeight: 800}}, ltfTotal), " LTF ticket", ltfTotal === 1 ? "" : "s", ".") : null;
    }()),
    // Budget tracker
    function() {
      var totalSpend = 0;
      r.forEach(function(u) { totalSpend += totalBookingCost_(u.s, u.rec) || 0; });
      totalSpend = Math.round(totalSpend * 100) / 100;
      var pct = budgetCap > 0 ? Math.min(totalSpend / budgetCap * 100, 100) : 0;
      var overBudget = budgetCap > 0 && totalSpend > budgetCap;
      return React.createElement("div", {style: {marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border}},
        React.createElement("div", {style: {display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap"}},
          React.createElement("div", {style: {fontSize: 14, color: C.txt2}},
            "\u{1F4B0} Spent: ", React.createElement("b", {style: {color: overBudget ? "#F87171" : "#34d399", fontWeight: 800, fontSize: 16}}, "\xA3" + totalSpend.toFixed(2)),
            budgetCap > 0 && !budgetEditing ? React.createElement("span", {style: {color: C.txt3}}, " of \xA3" + budgetCap) : null
          ),
          !budgetEditing ? React.createElement("button", {
            onClick: function() { setBudgetEditing(true); },
            style: {padding: "4px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 11, fontWeight: 700, cursor: "pointer"}
          }, budgetCap > 0 ? "Edit budget" : "Set budget") :
          React.createElement("div", {style: {display: "flex", gap: 6, alignItems: "center"}},
            React.createElement("span", {style: {fontSize: 13, color: C.txt2}}, "\xA3"),
            React.createElement("input", {
              type: "number",
              defaultValue: budgetCap || "",
              placeholder: "e.g. 300",
              autoFocus: true,
              onKeyDown: function(ev) {
                if (ev.key === "Enter") {
                  var val = parseFloat(ev.target.value);
                  setBudgetCap(val > 0 ? val : null);
                  setBudgetEditing(false);
                }
              },
              style: {width: 80, padding: "4px 8px", borderRadius: 8, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 13, outline: "none", fontFamily: "inherit"}
            }),
            React.createElement("button", {
              onClick: function() {
                var inp = document.querySelector("input[type=number][placeholder]");
                var val = inp ? parseFloat(inp.value) : 0;
                setBudgetCap(val > 0 ? val : null);
                setBudgetEditing(false);
              },
              style: {padding: "4px 10px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer"}
            }, "Save"),
            budgetCap > 0 && React.createElement("button", {
              onClick: function() { setBudgetCap(null); setBudgetEditing(false); },
              style: {padding: "4px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 11, fontWeight: 700, cursor: "pointer"}
            }, "Clear")
          )
        ),
        budgetCap > 0 && !budgetEditing && React.createElement("div", {style: {marginTop: 8, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "hidden"}},
          React.createElement("div", {style: {height: "100%", width: pct + "%", borderRadius: 4, background: overBudget ? "linear-gradient(90deg,#F87171,#ef4444)" : "linear-gradient(90deg,#34d399,var(--accent))", transition: "width 0.3s"}})),
        budgetCap > 0 && !budgetEditing && React.createElement("div", {style: {fontSize: 11, color: overBudget ? "#F87171" : C.txt3, marginTop: 4, textAlign: "right"}},
          overBudget ? "\xA3" + (totalSpend - budgetCap).toFixed(2) + " over budget" : "\xA3" + (budgetCap - totalSpend).toFixed(2) + " remaining")
      );
    }(),
    // Quick stats widget
    r.length > 0 && function() {
      var totalSpend = 0;
      r.forEach(function(u) { totalSpend += totalBookingCost_(u.s, u.rec) || 0; });
      var genreCounts = {};
      r.forEach(function(u) { var g = u.s.genre || "Other"; genreCounts[g] = (genreCounts[g] || 0) + 1; });
      var topGenres = Object.keys(genreCounts).sort(function(a, b) { return genreCounts[b] - genreCounts[a]; });
      var uniqueVenues = {};
      r.forEach(function(u) { if (u.s.venue) uniqueVenues[u.s.venue] = 1; });
      var totalMins = 0;
      r.forEach(function(u) {
        var dur = u.s.duration || 60;
        totalMins += dur;
      });
      var ratedCodes = {};
      r.forEach(function(u) { if (ratings[u.code] && ratings[u.code] >= 1) ratedCodes[u.code] = ratings[u.code]; });
      var ratedKeys = Object.keys(ratedCodes);
      var avgRating = ratedKeys.length > 0 ? (ratedKeys.reduce(function(s, k) { return s + ratedCodes[k]; }, 0) / ratedKeys.length) : 0;
      var statBox = function(icon, label, value, color) {
        return React.createElement("div", {
          style: { flex: "1 1 80px", minWidth: 80, textAlign: "center", padding: "8px 4px" }
        },
          React.createElement("div", { style: { fontSize: 22 } }, icon),
          React.createElement("div", { style: { fontSize: 18, fontWeight: 800, color: color || C.txt, marginTop: 2 } }, value),
          React.createElement("div", { style: { fontSize: 10, color: C.txt3, marginTop: 1 } }, label)
        );
      };
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 8px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", {
          onClick: function() { setGlanceOpen(!glanceOpen); },
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: glanceOpen ? 4 : 0, paddingLeft: 6, paddingRight: 6 }
        },
          React.createElement("span", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "📊 At a glance"),
          React.createElement("span", { style: { fontSize: 12, color: C.txt3, transition: "transform 0.2s", transform: glanceOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
        ),
        glanceOpen && React.createElement(React.Fragment, null,
        React.createElement("div", {
          style: { display: "flex", flexWrap: "wrap", gap: 0, justifyContent: "space-around" }
        },
          statBox("🎭", "Shows", r.length, C.accent),
          statBox("💰", "Spent", "£" + totalSpend.toFixed(0), "#34d399"),
          statBox("📍", "Venues", Object.keys(uniqueVenues).length, "#f59e0b"),
          statBox("⏱️", "Hours", (totalMins / 60).toFixed(1), "#3b82f6"),
          avgRating > 0 ? statBox("⭐", "Avg rating", avgRating.toFixed(1), "#FBBF24") : statBox("⭐", "Avg rating", "—", C.txt3)
        ),
        topGenres.length > 0 && React.createElement("div", {
          style: { display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center", padding: "4px 6px 2px" }
        }, topGenres.slice(0, 5).map(function(g) {
          return React.createElement("span", {
            key: g,
            style: { display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: "transparent", color: gcolor(g), border: "1px solid " + gcolor(g) + "66" }
          }, g + " " + genreCounts[g]);
        })))
      );
    }(),
    // Spending breakdown chart
    r.length > 1 && function() {
      var data = {};
      if (spendChartMode === "genre") {
        r.forEach(function(u) { var g = u.s.genre || "Other"; var pr = perfPrice_(u.s, u.rec) || 0; data[g] = (data[g] || 0) + pr; });
      } else if (spendChartMode === "venue") {
        r.forEach(function(u) { var v = venueLabel_(u.s) || "Unknown"; var pr = perfPrice_(u.s, u.rec) || 0; data[v] = (data[v] || 0) + pr; });
      } else {
        r.forEach(function(u) { var d = u.rec.date || "No date"; var pr = perfPrice_(u.s, u.rec) || 0; data[d] = (data[d] || 0) + pr; });
      }
      var entries = Object.keys(data).map(function(k) { return { label: k, val: Math.round(data[k] * 100) / 100 }; })
        .filter(function(e) { return e.val > 0; })
        .sort(function(a, b) { return b.val - a.val; });
      if (entries.length === 0) return null;
      var maxVal = entries.reduce(function(m, e) { return e.val > m ? e.val : m; }, 0);
      var modeBtn = function(key, label) {
        return React.createElement("button", {
          key: key,
          onClick: function() { setSpendChartMode(key); },
          style: { padding: "3px 10px", fontSize: 10, fontWeight: 700, border: "none", borderRadius: 6, cursor: "pointer", background: spendChartMode === key ? C.accent : "rgba(255,255,255,0.06)", color: spendChartMode === key ? "#fff" : C.txt3 }
        }, label);
      };
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", {
          onClick: function() { setSpendChartOpen(!spendChartOpen); },
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }
        },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "📊 Spending breakdown"),
          React.createElement("span", { style: { fontSize: 12, color: C.txt3, transition: "transform 0.2s", transform: spendChartOpen ? "rotate(180deg)" : "rotate(0)" } }, "▼")
        ),
        spendChartOpen && React.createElement("div", null,
          React.createElement("div", { style: { display: "flex", gap: 4, margin: "8px 0 10px", justifyContent: "center" } },
            modeBtn("genre", "By genre"), modeBtn("venue", "By venue"), modeBtn("day", "By day")
          ),
          React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 6 } },
            entries.slice(0, 10).map(function(e, idx) {
              var pct = maxVal > 0 ? (e.val / maxVal * 100) : 0;
              var barColor = spendChartMode === "genre" ? (gcolor(e.label) || C.accent) : (idx % 2 === 0 ? C.accent : "var(--pink)");
              return React.createElement("div", { key: e.label },
                React.createElement("div", { style: { display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 } },
                  React.createElement("span", { style: { color: C.txt2, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "65%" } }, spendChartMode === "day" ? function() { var d = new Date(e.label + "T12:00:00"); var days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]; return isNaN(d.getTime()) ? e.label : days[d.getDay()] + " " + d.getDate() + "/" + (d.getMonth()+1); }() : e.label),
                  React.createElement("span", { style: { color: "#34d399", fontWeight: 800, flexShrink: 0 } }, "£" + e.val.toFixed(2))
                ),
                React.createElement("div", { style: { height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" } },
                  React.createElement("div", { style: { height: "100%", width: pct + "%", borderRadius: 3, background: "linear-gradient(90deg," + barColor + "," + barColor + "cc)", transition: "width 0.3s ease" } })
                )
              );
            }),
            entries.length > 10 && React.createElement("div", { style: { fontSize: 11, color: C.txt3, textAlign: "center" } }, "+" + (entries.length - 10) + " more")
          )
        )
      );
    }(),
    // Venue heatmap
    r.length > 0 && function() {
      var vCounts = {};
      r.forEach(function(u) { var v = venueLabel_(u.s) || "Unknown"; vCounts[v] = (vCounts[v] || 0) + 1; });
      var vKeys = Object.keys(vCounts).sort(function(a, b) { return vCounts[b] - vCounts[a]; });
      if (vKeys.length === 0) return null;
      var maxC = vCounts[vKeys[0]];
      function heatColor(count) {
        var ratio = maxC > 1 ? (count - 1) / (maxC - 1) : 0;
        if (ratio < 0.33) return { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)", text: "#60a5fa" };
        if (ratio < 0.66) return { bg: "rgba(251,191,36,0.15)", border: "rgba(251,191,36,0.3)", text: "#fbbf24" };
        return { bg: "rgba(248,113,113,0.15)", border: "rgba(248,113,113,0.3)", text: "#f87171" };
      }
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", {
          onClick: function() { setVenueHeatOpen(!venueHeatOpen); },
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: venueHeatOpen ? 8 : 0 }
        },
          React.createElement("span", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "📍 Venue heatmap"),
          React.createElement("span", { style: { fontSize: 12, color: C.txt3, transition: "transform 0.2s", transform: venueHeatOpen ? "rotate(180deg)" : "rotate(0)" } }, "\u25BC")
        ),
        venueHeatOpen && React.createElement(React.Fragment, null,
        React.createElement("div", {
          style: { display: "flex", flexWrap: "wrap", gap: 6 }
        }, vKeys.map(function(v) {
          var c = vCounts[v];
          var h = heatColor(c);
          return React.createElement("div", {
            key: v,
            title: v + ": " + c + " show" + (c > 1 ? "s" : ""),
            style: { padding: "6px 10px", borderRadius: 8, background: h.bg, border: "1px solid " + h.border, fontSize: 11, fontWeight: 700, color: h.text, display: "flex", alignItems: "center", gap: 4 }
          }, React.createElement("span", { style: { fontSize: 14 } }, c > 2 ? "🔥" : c > 1 ? "📌" : "📍"),
            React.createElement("span", { style: { maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, v),
            React.createElement("span", { style: { background: h.text, color: "#fff", borderRadius: 10, padding: "0 5px", fontSize: 10, fontWeight: 800, marginLeft: 2 } }, c)
          );
        })),
        React.createElement("div", { style: { display: "flex", gap: 10, marginTop: 8, justifyContent: "center", fontSize: 10, color: C.txt3 } },
          React.createElement("span", null, "📍 1 visit"),
          React.createElement("span", null, "📌 2+ visits"),
          React.createElement("span", null, "🔥 3+ visits")
        ))
      );
    }(),
    // Expense splitter
    function() {
      if (r.length === 0) return null;
      // Gather all companion names across bookings
      var allPpl = {};
      r.forEach(function(u) {
        var comps = (u.rec.companions || companions[u.code] || "").split(",").map(function(c) { return c.trim(); }).filter(Boolean);
        var price = perfPrice_(u.s, u.rec) || 0;
        // Always add "Myself"
        if (!allPpl["Myself"]) allPpl["Myself"] = { total: 0, shows: [] };
        allPpl["Myself"].total += price;
        allPpl["Myself"].shows.push({ title: u.s.title, price: price, date: u.rec.date });
        comps.forEach(function(c) {
          if (!allPpl[c]) allPpl[c] = { total: 0, shows: [] };
          allPpl[c].total += price;
          allPpl[c].shows.push({ title: u.s.title, price: price, date: u.rec.date });
        });
      });
      var names = Object.keys(allPpl).sort(function(a, b) { return a === "Myself" ? -1 : b === "Myself" ? 1 : a.localeCompare(b); });
      if (names.length <= 1) return null; // Only "Myself", no companions to split with
      // Calculate per-person fair share (split each show evenly among attendees)
      var fairShare = {};
      names.forEach(function(n) { fairShare[n] = 0; });
      r.forEach(function(u) {
        var price = perfPrice_(u.s, u.rec) || 0;
        if (price === 0) return;
        var comps = (u.rec.companions || companions[u.code] || "").split(",").map(function(c) { return c.trim(); }).filter(Boolean);
        var attendees = ["Myself"].concat(comps);
        var share = price / attendees.length;
        attendees.forEach(function(a) {
          if (fairShare[a] !== undefined) fairShare[a] += share;
        });
      });
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", {
          onClick: function() { setExpSplitOpen(!expSplitOpen); },
          style: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }
        },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "💸 Expense splitter"),
          React.createElement("span", { style: { fontSize: 12, color: C.txt3, transition: "transform 0.2s", transform: expSplitOpen ? "rotate(180deg)" : "rotate(0)" } }, "▼")
        ),
        expSplitOpen && React.createElement("div", { style: { marginTop: 10 } },
          React.createElement("div", { style: { fontSize: 11, color: C.txt3, marginBottom: 8 } }, "Fair share — each show’s cost split evenly among attendees:"),
          names.map(function(nm) {
            var share = fairShare[nm] || 0;
            var maxShare = Math.max.apply(null, names.map(function(n) { return fairShare[n] || 0; }));
            var pct = maxShare > 0 ? share / maxShare * 100 : 0;
            var isMe = nm === "Myself";
            return React.createElement("div", {
              key: nm,
              style: { marginBottom: 8 }
            },
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 } },
                React.createElement("span", { style: { fontSize: 13, fontWeight: isMe ? 800 : 600, color: isMe ? C.txt : C.txt2 } }, (isMe ? "🙋 " : "👤 ") + nm),
                React.createElement("span", { style: { fontSize: 13, fontWeight: 800, color: C.accent } }, "£" + share.toFixed(2))
              ),
              React.createElement("div", { style: { height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" } },
                React.createElement("div", { style: { height: "100%", width: pct + "%", borderRadius: 3, background: isMe ? "linear-gradient(90deg,var(--pink),var(--accent))" : "linear-gradient(90deg,#60a5fa,#a78bfa)", transition: "width 0.3s" } })
              ),
              React.createElement("div", { style: { fontSize: 10, color: C.txt3, marginTop: 2 } }, allPpl[nm].shows.length + " show" + (allPpl[nm].shows.length !== 1 ? "s" : ""))
            );
          }),
          // Summary
          React.createElement("div", { style: { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(168,85,247,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
            React.createElement("span", { style: { fontSize: 12, color: C.txt2 } }, "Total across all attendees:"),
            React.createElement("span", { style: { fontSize: 14, fontWeight: 800, color: C.accent } }, "£" + names.reduce(function(s, n) { return s + (fairShare[n] || 0); }, 0).toFixed(2))
          )
        )
      );
    }(),
    // Interval reminders — countdown to next show
    function() {
      var todayItems = (l[nowStr] || []).slice().sort(function(a, b) {
        return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0);
      });
      // Find next upcoming show (starts after now)
      var upcoming = null;
      for (var ui = 0; ui < todayItems.length; ui++) {
        var st = timeToMin_(todayItems[ui].rec.start || todayItems[ui].s.startStr);
        if (st != null && st > nowMin) { upcoming = { item: todayItems[ui], startMin: st, idx: ui }; break; }
      }
      if (!upcoming) return null;
      var minsUntil = upcoming.startMin - nowMin;
      var hrs = Math.floor(minsUntil / 60);
      var mins = minsUntil % 60;
      var timeStr = hrs > 0 ? hrs + "h " + mins + "m" : mins + " min";
      // Check walk time from previous show
      var walkWarning = null;
      if (upcoming.idx > 0) {
        var prev = todayItems[upcoming.idx - 1];
        var prevEnd = timeToMin_(prev.rec.end || prev.s.endStr);
        if (prevEnd == null) { var pst = timeToMin_(prev.rec.start || prev.s.startStr); if (pst != null) prevEnd = pst + (prev.s.duration || 60); }
        if (prevEnd != null && prev.s.venue && upcoming.item.s.venue && venueLabel_(prev.s) !== venueLabel_(upcoming.item.s)) {
          var wm = walkMin_(prev.s, upcoming.item.s);
          if (wm != null && wm > 0) {
            var gapMin = upcoming.startMin - prevEnd;
            walkWarning = { walkTime: wm, gap: gapMin, tight: gapMin < wm + 5 };
          }
        }
      }
      var urgencyColor = minsUntil <= 15 ? "#ef4444" : minsUntil <= 30 ? "#f97316" : minsUntil <= 60 ? "#fbbf24" : "#4ade80";
      var urgencyBg = minsUntil <= 15 ? "rgba(239,68,68,0.12)" : minsUntil <= 30 ? "rgba(249,115,22,0.12)" : minsUntil <= 60 ? "rgba(251,191,36,0.08)" : "rgba(74,222,128,0.08)";
      return React.createElement("div", {
        style: { marginTop: 10, padding: "12px 14px", borderRadius: 12, background: urgencyBg, border: "1px solid " + urgencyColor + "44" }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } },
          React.createElement("div", { style: { fontSize: 32, lineHeight: 1 } }, minsUntil <= 15 ? "🚨" : minsUntil <= 30 ? "⏰" : "⏳"),
          React.createElement("div", { style: { flex: 1, minWidth: 0 } },
            React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: urgencyColor } }, "Next show in " + timeStr),
            React.createElement("div", {
              onClick: function() { de(upcoming.item.s); },
              style: { fontSize: 14, fontWeight: 800, color: C.txt, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }
            }, upcoming.item.s.title),
            React.createElement("div", { style: { fontSize: 11, color: C.txt2, marginTop: 1 } },
              (upcoming.item.rec.start || upcoming.item.s.startStr) + " · " + venueLabel_(upcoming.item.s)
            ),
            walkWarning && React.createElement("div", { style: { fontSize: 11, marginTop: 3, color: walkWarning.tight ? "#ef4444" : "#fbbf24", fontWeight: 700 } },
              walkWarning.tight ? "⚠️ " + walkWarning.walkTime + " min walk, only " + walkWarning.gap + " min gap!" : "🚶 " + walkWarning.walkTime + " min walk — " + walkWarning.gap + " min gap"
            )
          )
        )
      );
    }(),
    // What's on now / Up next
    function() {
      var todayItems = (l[nowStr] || []).slice().sort(function(a, b) {
        return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0);
      });
      if (todayItems.length === 0) return null;
      var happeningNow = [], upNext = [];
      todayItems.forEach(function(u) {
        var st = timeToMin_(u.rec.start || u.s.startStr);
        var en = timeToMin_(u.rec.end || u.s.endStr);
        if (en == null && st != null) en = st + (u.s.duration || 60);
        if (st != null && st <= nowMin && en != null && en > nowMin) happeningNow.push(u);
        else if (st != null && st > nowMin) upNext.push(u);
      });
      if (happeningNow.length === 0 && upNext.length === 0) return null;
      var upNextSlice = upNext.slice(0, 3);
      var renderItem = function(u, label) {
        var st = u.rec.start || u.s.startStr || "";
        var en = u.rec.end || u.s.endStr || "";
        return React.createElement("div", {
          key: u.code + u.rec.date + u.bIdx,
          onClick: function() { de(u.s); },
          style: {padding: "8px 12px", borderRadius: 10, background: label === "now" ? "rgba(52,211,153,0.1)" : "rgba(168,85,247,0.06)", border: "1px solid " + (label === "now" ? "rgba(52,211,153,0.3)" : C.border), cursor: "pointer", display: "flex", gap: 10, alignItems: "center"}
        },
          React.createElement("div", {style: {fontSize: 20, flexShrink: 0}}, label === "now" ? "\u{1F7E2}" : "⏳"),
          React.createElement("div", {style: {flex: 1, minWidth: 0}},
            React.createElement("div", {style: {fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}, u.s.title || u.s.artist),
            React.createElement("div", {style: {fontSize: 11, color: C.txt2}}, st + (en ? "–" + en : "") + " · " + venueLabel_(u.s))
          )
        );
      };
      return React.createElement("div", {style: {marginTop: 10, padding: "12px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border}},
        React.createElement("div", {style: {fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3, marginBottom: 8}}, "\u{1F3AC} Today’s schedule"),
        happeningNow.length > 0 && React.createElement("div", {style: {marginBottom: upNextSlice.length > 0 ? 8 : 0, display: "flex", flexDirection: "column", gap: 6}},
          happeningNow.map(function(u) { return renderItem(u, "now"); })
        ),
        upNextSlice.length > 0 && React.createElement("div", {style: {display: "flex", flexDirection: "column", gap: 6}},
          React.createElement("div", {style: {fontSize: 11, fontWeight: 700, color: C.txt3, marginTop: happeningNow.length > 0 ? 4 : 0}}, "UP NEXT"),
          upNextSlice.map(function(u) { return renderItem(u, "next"); })
        ),
        upNext.length > 3 && React.createElement("div", {style: {fontSize: 11, color: C.txt3, marginTop: 6, textAlign: "center"}}, "+" + (upNext.length - 3) + " more today")
      );
    }(),
    // Quick-rate: shows that just ended and haven't been rated
    function() {
      var todayItems = (l[nowStr] || []);
      var justEnded = todayItems.filter(function(u) {
        if (ratings[u.code] && ratings[u.code] >= 1) return false;
        var en = timeToMin_(u.rec.end || u.s.endStr);
        if (en == null) {
          var st = timeToMin_(u.rec.start || u.s.startStr);
          if (st != null) en = st + (u.s.duration || 60);
        }
        return en != null && en <= nowMin && en >= nowMin - 180;
      });
      if (justEnded.length === 0) return null;
      return React.createElement("div", {style: {marginTop: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)"}},
        React.createElement("div", {style: {fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#FBBF24", marginBottom: 8}}, "⭐ Rate your recent shows"),
        justEnded.map(function(u) {
          var currentRating = ratings[u.code] || 0;
          return React.createElement("div", {
            key: "qr-" + u.code,
            style: {display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid rgba(251,191,36,0.1)"}
          },
            React.createElement("div", {style: {flex: 1, minWidth: 0}},
              React.createElement("div", {style: {fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}, u.s.title || u.s.artist),
              React.createElement("div", {style: {fontSize: 11, color: C.txt3}}, "Ended " + (u.rec.end || u.s.endStr || ""))
            ),
            React.createElement("div", {style: {display: "flex", gap: 2, flexShrink: 0}},
              [1,2,3,4,5].map(function(star) {
                return React.createElement("button", {
                  key: star,
                  onClick: function() { setRatings(function(prev) { var next = Object.assign({}, prev); next[u.code] = star; return next; }); },
                  style: {background: "none", border: "none", cursor: "pointer", fontSize: 20, padding: "0 1px", color: star <= currentRating ? "#FBBF24" : C.txt3, opacity: star <= currentRating ? 1 : 0.4}
                }, "★");
              })
            )
          );
        })
      );
    }(),
    // Daily Brief — exportable summary
    function() {
      var todayItems = (l[nowStr] || []).slice().sort(function(a, b) {
        return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0);
      });
      if (todayItems.length === 0) return null;
      var todaySpend = 0;
      todayItems.forEach(function(u) { todaySpend += perfPrice_(u.s, u.rec) || 0; });
      var totalMins = 0;
      todayItems.forEach(function(u) {
        var st = timeToMin_(u.rec.start || u.s.startStr);
        var en = timeToMin_(u.rec.end || u.s.endStr);
        if (en == null && st != null) en = st + (u.s.duration || 60);
        if (st != null && en != null) totalMins += en - st;
      });
      var totalHrs = Math.floor(totalMins / 60);
      var totalRem = totalMins % 60;
      var uniqueVenues = {};
      todayItems.forEach(function(u) { if (u.s.venue) uniqueVenues[u.s.venue] = 1; });
      var briefText = function() {
        var dn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        var td = new Date(nowStr + "T12:00:00");
        var hdr = "🎭 Fringe Daily Brief — " + dn[td.getDay()] + " " + td.getDate() + "/" + (td.getMonth()+1) + "/" + td.getFullYear() + "\n\n";
        var lines = [];
        todayItems.forEach(function(u, idx) {
          var st = u.rec.start || u.s.startStr || "?";
          var en = u.rec.end || u.s.endStr || "";
          var line = st + (en ? "–" + en : "") + "  " + (u.s.title || "") + "\n    📍 " + venueLabel_(u.s);
          var pr = perfPrice_(u.s, u.rec);
          if (pr > 0) line += "  ·  £" + pr.toFixed(2);
          if (idx > 0) {
            var prevEnd = timeToMin_(todayItems[idx-1].rec.end || todayItems[idx-1].s.endStr);
            if (prevEnd == null) { var pst = timeToMin_(todayItems[idx-1].rec.start || todayItems[idx-1].s.startStr); if (pst != null) prevEnd = pst + (todayItems[idx-1].s.duration || 60); }
            var curSt = timeToMin_(u.rec.start || u.s.startStr);
            if (prevEnd != null && curSt != null && venueLabel_(todayItems[idx-1].s) !== venueLabel_(u.s)) {
              var wm = walkMin_(todayItems[idx-1].s, u.s);
              if (wm != null && wm > 0) {
                var gap = curSt - prevEnd;
                line += gap < wm ? "\n    ⚠️ " + wm + " min walk, only " + gap + " min gap!" : "";
              }
            }
          }
          if (u.s.venue && venueNotes[u.s.venue]) line += "\n    📝 " + venueNotes[u.s.venue].trim();
          lines.push(line);
        });
        var footer = "\n📊 " + todayItems.length + " shows · " + Object.keys(uniqueVenues).length + " venues · " + (totalHrs > 0 ? totalHrs + "h " : "") + totalRem + "m · £" + todaySpend.toFixed(2);
        return hdr + lines.join("\n\n") + footer;
      };
      return React.createElement("div", {style: {marginTop: 10, padding: "12px 14px", borderRadius: 12, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)"}},
        React.createElement("div", {style: {display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6}},
          React.createElement("div", {style: {fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "#818cf8"}}, "📋 Daily Brief"),
          React.createElement("button", {
            onClick: function() {
              var text = briefText();
              if (navigator.share) { navigator.share({text: text}).catch(function(){}); }
              else if (navigator.clipboard) { navigator.clipboard.writeText(text).then(function() { setToastMsg("Daily brief copied!"); setTimeout(function() { setToastMsg(null); }, 3000); }); }
            },
            style: {padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "transparent", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer"}
          }, V ? "📤" : "📤 Copy brief")
        ),
        React.createElement("div", {style: {fontSize: 12, color: C.txt2}},
          todayItems.length + " show" + (todayItems.length === 1 ? "" : "s") + " today",
          " · ", Object.keys(uniqueVenues).length, " venue" + (Object.keys(uniqueVenues).length === 1 ? "" : "s"),
          " · ", (totalHrs > 0 ? totalHrs + "h " : "") + totalRem + "m",
          todaySpend > 0 ? " · £" + todaySpend.toFixed(2) : ""
        )
      );
    }(),
    // Custom lists
    function() {
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "📋 Custom lists"),
          React.createElement("button", {
            onClick: function() { setClistAdding(clistAdding ? null : "new"); setClistNewName(""); },
            style: { padding: "3px 10px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }
          }, clistAdding === "new" ? "Cancel" : "+ New list")
        ),
        clistAdding === "new" && React.createElement("div", { style: { display: "flex", gap: 6, marginBottom: 8 } },
          React.createElement("input", {
            value: clistNewName,
            onChange: function(ev) { setClistNewName(ev.target.value); },
            placeholder: "List name…",
            style: { flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid " + C.border, background: C.bg, color: C.txt, fontSize: 12, outline: "none" }
          }),
          React.createElement("button", {
            onClick: function() {
              if (!clistNewName.trim()) return;
              setCustomLists([{ id: Date.now(), name: clistNewName.trim(), codes: [] }].concat(customLists));
              setClistNewName(""); setClistAdding(null);
            },
            style: { padding: "5px 12px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }
          }, "Create")
        ),
        customLists.length === 0 && !clistAdding && React.createElement("div", { style: { fontSize: 11, color: C.txt3 } }, "Create lists to organise shows — 'Rainy day picks', 'Must-sees', etc."),
        customLists.map(function(cl) {
          var isAdding = clistAdding === cl.id;
          var clShows = cl.codes.map(function(c) { return e[c]; }).filter(Boolean);
          return React.createElement("div", {
            key: "cl-" + cl.id,
            style: { marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }
          },
            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: clShows.length || isAdding ? 6 : 0 } },
              React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.txt } }, cl.name + " (" + cl.codes.length + ")"),
              React.createElement("div", { style: { display: "flex", gap: 4 } },
                React.createElement("button", {
                  onClick: function() { setClistAdding(isAdding ? null : cl.id); },
                  style: { padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, background: "transparent", color: C.accent, fontSize: 11, cursor: "pointer" }
                }, isAdding ? "Done" : "+ Add"),
                React.createElement("button", {
                  onClick: function() {
                    var text = "📋 " + cl.name + "\n" + clShows.map(function(s, i) { return (i+1) + ". " + s.title + (s.venue ? " @ " + venueLabel_(s) : ""); }).join("\n");
                    if (navigator.share) navigator.share({ text: text }).catch(function(){});
                    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function() { setToastMsg("List copied!"); setTimeout(function() { setToastMsg(null); }, 3000); });
                  },
                  style: { padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 11, cursor: "pointer" }
                }, "📤"),
                React.createElement("button", {
                  onClick: function() { setCustomLists(customLists.filter(function(x) { return x.id !== cl.id; })); },
                  style: { padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, background: "transparent", color: "#f87171", fontSize: 11, cursor: "pointer" }
                }, "✕")
              )
            ),
            isAdding && React.createElement("div", { style: { maxHeight: 150, overflowY: "auto", marginBottom: 6 } },
              (n || []).filter(function(s) { return cl.codes.indexOf(s.code) < 0; }).slice(0, 40).map(function(s) {
                return React.createElement("div", {
                  key: "cla-" + s.code,
                  onClick: function() {
                    setCustomLists(customLists.map(function(x) { return x.id === cl.id ? Object.assign({}, x, { codes: x.codes.concat([s.code]) }) : x; }));
                  },
                  style: { padding: "4px 8px", fontSize: 11, color: C.txt2, cursor: "pointer", borderBottom: "1px solid " + C.border, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                }, "+ " + s.title);
              })
            ),
            clShows.length > 0 && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 3 } },
              clShows.map(function(s) {
                return React.createElement("div", {
                  key: "cls-" + s.code,
                  style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11 }
                },
                  React.createElement("span", {
                    onClick: function() { de(s); },
                    style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.txt, cursor: "pointer" }
                  }, s.title),
                  React.createElement("span", { style: { fontSize: 10, color: C.txt3, flexShrink: 0 } }, venueLabel_(s)),
                  React.createElement("button", {
                    onClick: function() {
                      setCustomLists(customLists.map(function(x) { return x.id === cl.id ? Object.assign({}, x, { codes: x.codes.filter(function(c) { return c !== s.code; }) }) : x; }));
                    },
                    style: { background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11, padding: "0 4px" }
                  }, "×")
                );
              })
            )
          );
        })
      );
    }(),
    // Show streak tracker
    function() {
      if (r.length === 0) return null;
      // Get all unique booked dates sorted
      var allDates = {};
      r.forEach(function(u) { if (u.rec.date) allDates[u.rec.date] = true; });
      var sorted = Object.keys(allDates).sort();
      if (sorted.length === 0) return null;
      // Calculate streaks
      function dayDiff(d1, d2) {
        var a = new Date(d1 + "T12:00:00"), b = new Date(d2 + "T12:00:00");
        return Math.round((b - a) / 86400000);
      }
      var streaks = [], cur = [sorted[0]];
      for (var si = 1; si < sorted.length; si++) {
        if (dayDiff(sorted[si-1], sorted[si]) === 1) {
          cur.push(sorted[si]);
        } else {
          streaks.push(cur);
          cur = [sorted[si]];
        }
      }
      streaks.push(cur);
      var longest = streaks.reduce(function(a, b) { return b.length > a.length ? b : a; }, []);
      // Current streak — includes today or yesterday
      var currentStreak = 0;
      for (var ci = streaks.length - 1; ci >= 0; ci--) {
        var last = streaks[ci][streaks[ci].length - 1];
        if (last === nowStr || dayDiff(last, nowStr) === 1 || dayDiff(last, nowStr) === 0) {
          currentStreak = streaks[ci].length;
          break;
        }
      }
      var flameEmojis = currentStreak >= 7 ? "🔥🔥🔥" : currentStreak >= 4 ? "🔥🔥" : currentStreak >= 2 ? "🔥" : "💤";
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3, marginBottom: 8 } }, "🔥 Show streak"),
        React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center", justifyContent: "space-around" } },
          React.createElement("div", { style: { textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 28, lineHeight: 1 } }, flameEmojis),
            React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: currentStreak > 0 ? "#f97316" : C.txt3, marginTop: 2 } }, currentStreak),
            React.createElement("div", { style: { fontSize: 10, color: C.txt3, textTransform: "uppercase" } }, "Current")
          ),
          React.createElement("div", { style: { textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 28, lineHeight: 1 } }, "🏆"),
            React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: "#fbbf24", marginTop: 2 } }, longest.length),
            React.createElement("div", { style: { fontSize: 10, color: C.txt3, textTransform: "uppercase" } }, "Best")
          ),
          React.createElement("div", { style: { textAlign: "center" } },
            React.createElement("div", { style: { fontSize: 28, lineHeight: 1 } }, "📅"),
            React.createElement("div", { style: { fontSize: 20, fontWeight: 900, color: C.accent, marginTop: 2 } }, sorted.length),
            React.createElement("div", { style: { fontSize: 10, color: C.txt3, textTransform: "uppercase" } }, "Days out")
          )
        ),
        React.createElement("div", { style: { marginTop: 8, display: "flex", gap: 3, flexWrap: "wrap" } },
          sorted.map(function(dt) {
            var isToday = dt === nowStr;
            var cnt = (l[dt] || []).length;
            return React.createElement("div", {
              key: "sk-" + dt,
              title: dt + ": " + cnt + " show" + (cnt !== 1 ? "s" : ""),
              style: { width: 14, height: 14, borderRadius: 3, background: cnt >= 3 ? "#f97316" : cnt >= 2 ? "#fbbf24" : "#4ade80", border: isToday ? "2px solid #fff" : "1px solid rgba(255,255,255,0.1)", opacity: 0.9 }
            });
          })
        ),
        React.createElement("div", { style: { display: "flex", gap: 8, marginTop: 4, fontSize: 9, color: C.txt3 } },
          React.createElement("span", null, "🟩 1 show"),
          React.createElement("span", null, "🟨 2 shows"),
          React.createElement("span", null, "🟧 3+ shows")
        )
      );
    }(),
    // Festival stats card
    function() {
      if (r.length === 0) return null;
      var showCount = Object.keys(p).filter(function(c) { return p[c] && p[c].length > 0; }).length;
      var totalPerfs = r.length;
      var totalSpend = 0;
      var genreCounts = {}, venueCounts = {};
      var totalMins = 0;
      r.forEach(function(u) {
        var pr = totalBookingCost_(u.s, u.rec) || 0;
        totalSpend += pr;
        if (u.s.genre) genreCounts[u.s.genre] = (genreCounts[u.s.genre] || 0) + 1;
        if (u.s.venue) venueCounts[venueLabel_(u.s)] = (venueCounts[venueLabel_(u.s)] || 0) + 1;
        totalMins += u.s.duration || 60;
      });
      var topGenre = Object.keys(genreCounts).sort(function(a,b) { return genreCounts[b] - genreCounts[a]; })[0] || "—";
      var topVenue = Object.keys(venueCounts).sort(function(a,b) { return venueCounts[b] - venueCounts[a]; })[0] || "—";
      var totalHrs = Math.floor(totalMins / 60);
      var avgRating = 0; var ratedCount = 0;
      Object.keys(ratings).forEach(function(c) { if (ratings[c]) { avgRating += ratings[c]; ratedCount++; } });
      avgRating = ratedCount > 0 ? (avgRating / ratedCount).toFixed(1) : "—";
      var uniqueDays = Object.keys(l).length;
      var statItems = [
        { emoji: "🎭", label: "Shows", value: showCount },
        { emoji: "🎫", label: "Performances", value: totalPerfs },
        { emoji: "⏱️", label: "Hours", value: totalHrs },
        { emoji: "💷", label: "Spent", value: "£" + totalSpend.toFixed(0) },
        { emoji: "📅", label: "Days", value: uniqueDays },
        { emoji: "⭐", label: "Avg rating", value: avgRating },
        { emoji: "🎨", label: "Top genre", value: topGenre },
        { emoji: "🏛️", label: "Top venue", value: topVenue.length > 18 ? topVenue.substring(0, 16) + "…" : topVenue },
        { emoji: "🎪", label: "Venues", value: Object.keys(venueCounts).length },
        { emoji: "🎶", label: "Genres", value: Object.keys(genreCounts).length }
      ];
      var shareCard = function() {
        var text = "🎭 My Edinburgh Fringe " + SITE_YEAR + " Stats\n\n" + statItems.map(function(s) { return s.emoji + " " + s.label + ": " + s.value; }).join("\n") + "\n\n#EdFringe #EdinburghFringe";
        if (navigator.share) navigator.share({ text: text }).catch(function(){});
        else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function() { setToastMsg("Stats copied!"); setTimeout(function() { setToastMsg(null); }, 3000); });
      };
      return React.createElement("div", {
        style: { marginTop: 10, padding: "12px 14px", borderRadius: 14, background: "linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(168,85,247,0.12) 100%)", border: "1px solid rgba(99,102,241,0.25)" }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 } },
          React.createElement("div", { style: { fontSize: 13, fontWeight: 800, color: C.txt } }, "🎭 My Fringe " + SITE_YEAR),
          React.createElement("button", {
            onClick: shareCard,
            style: { padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "transparent", color: "#818cf8", fontSize: 11, fontWeight: 700, cursor: "pointer" }
          }, V ? "📤 Share" : "📤 Share stats")
        ),
        React.createElement("div", {
          style: { display: "grid", gridTemplateColumns: "repeat(" + (V ? "2" : "5") + ", 1fr)", gap: 8 }
        }, statItems.map(function(s) {
          return React.createElement("div", {
            key: "stat-" + s.label,
            style: { textAlign: "center", padding: "8px 4px", borderRadius: 8, background: "rgba(255,255,255,0.04)" }
          },
            React.createElement("div", { style: { fontSize: 20 } }, s.emoji),
            React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: C.txt, marginTop: 2 } }, s.value),
            React.createElement("div", { style: { fontSize: 9, color: C.txt3, textTransform: "uppercase", letterSpacing: 0.5 } }, s.label)
          );
        }))
      );
    }(),
    // Achievement badges
    function() {
      var bookedCount = Object.keys(p).filter(function(c) { return p[c] && p[c].length > 0; }).length;
      var uniqueVenuesAll = {};
      Object.keys(p).forEach(function(c) { var s = e[c]; if (s && s.venue) uniqueVenuesAll[s.venue] = 1; });
      var venueCount = Object.keys(uniqueVenuesAll).length;
      var genresAll = {};
      Object.keys(p).forEach(function(c) { var s = e[c]; if (s && s.genre) genresAll[s.genre] = 1; });
      var genreCount = Object.keys(genresAll).length;
      var ratedCount = Object.keys(ratings).filter(function(c) { return ratings[c] && ratings[c] >= 1; }).length;
      var hasFiveStar = Object.keys(ratings).some(function(c) { return ratings[c] === 5; });
      var totalSpent = 0;
      Object.keys(p).forEach(function(c) { (p[c] || []).forEach(function(rec) { totalSpent += perfPrice_(e[c], rec) || 0; }); });
      var badges = [
        { icon: "🎭", name: "First Show", desc: "Book your first show", earned: bookedCount >= 1 },
        { icon: "🎪", name: "Show Explorer", desc: "Book 5+ shows", earned: bookedCount >= 5 },
        { icon: "🌟", name: "Super Fan", desc: "Book 10+ shows", earned: bookedCount >= 10 },
        { icon: "🏛️", name: "Venue Hopper", desc: "Visit 5+ venues", earned: venueCount >= 5 },
        { icon: "🎨", name: "Genre Explorer", desc: "See 3+ genres", earned: genreCount >= 3 },
        { icon: "📝", name: "Critic", desc: "Rate 5+ shows", earned: ratedCount >= 5 },
        { icon: "⭐", name: "Five Star", desc: "Give a 5-star rating", earned: hasFiveStar },
        { icon: "🗺️", name: "Mapped Out", desc: "Visit 10+ venues", earned: venueCount >= 10 },
        { icon: "💰", name: "Budget Boss", desc: "Set budget & stay under", earned: budgetCap != null && totalSpent <= budgetCap && bookedCount > 0 },
        { icon: "🏆", name: "Fringe Legend", desc: "Book 20+ shows", earned: bookedCount >= 20 }
      ];
      var earnedCount = badges.filter(function(b) { return b.earned; }).length;
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "🏅 Achievements"),
          React.createElement("span", { style: { fontSize: 11, color: C.accent, fontWeight: 700 } }, earnedCount + "/" + badges.length)
        ),
        React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 } },
          badges.map(function(b) {
            return React.createElement("div", {
              key: "badge-" + b.name,
              title: b.desc,
              style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 8, background: b.earned ? "rgba(251,191,36,0.12)" : "rgba(128,128,128,0.06)", border: "1px solid " + (b.earned ? "rgba(251,191,36,0.3)" : C.border), opacity: b.earned ? 1 : 0.45 }
            },
              React.createElement("span", { style: { fontSize: 14 } }, b.icon),
              React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: b.earned ? C.txt : C.txt3 } }, b.name)
            );
          })
        )
      );
    }(),
    // Group voting
    function() {
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 } },
          React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3 } }, "🗳️ Group voting"),
          React.createElement("button", {
            onClick: function() { setPollCreating(!pollCreating); },
            style: { padding: "3px 10px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer" }
          }, pollCreating ? "Cancel" : "+ New poll")
        ),
        pollCreating && function() {
          var wishShows = (n || []).filter(function(s) { return d.has(s.code) && !p[s.code]; });
          if (wishShows.length === 0) return React.createElement("div", { style: { fontSize: 11, color: C.txt3 } }, "Add shows to your wishlist first to create a poll.");
          return React.createElement("div", { style: { marginBottom: 8 } },
            React.createElement("div", { style: { fontSize: 11, color: C.txt2, marginBottom: 6 } }, "Tap shows to add to poll:"),
            React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 4, maxHeight: 160, overflowY: "auto" } },
              wishShows.slice(0, 30).map(function(s) {
                return React.createElement("button", {
                  key: "pcs-" + s.code,
                  onClick: function() {
                    var existing = groupPolls.find(function(pp) { return pp.building; });
                    if (existing) {
                      if (existing.codes.indexOf(s.code) < 0) {
                        setGroupPolls(groupPolls.map(function(pp) { return pp.id === existing.id ? Object.assign({}, pp, { codes: pp.codes.concat([s.code]) }) : pp; }));
                      }
                    } else {
                      setGroupPolls([{ id: Date.now(), title: "Which show?", codes: [s.code], votes: {}, created: nowStr, building: true }].concat(groupPolls));
                    }
                  },
                  style: { padding: "4px 8px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.txt, fontSize: 11, cursor: "pointer", textAlign: "left", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
                }, s.title);
              })
            ),
            groupPolls.length > 0 && groupPolls[0].building && React.createElement("div", { style: { marginTop: 8 } },
              React.createElement("div", { style: { fontSize: 11, color: C.txt2, marginBottom: 4 } }, "Poll: " + groupPolls[0].codes.length + " shows selected"),
              React.createElement("button", {
                onClick: function() {
                  setGroupPolls(groupPolls.map(function(pp, i) { return i === 0 ? Object.assign({}, pp, { building: false }) : pp; }));
                  setPollCreating(false);
                },
                style: { padding: "5px 14px", borderRadius: 6, border: "none", background: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }
              }, "✓ Create poll")
            )
          );
        }(),
        groupPolls.filter(function(pp) { return !pp.building; }).length === 0 && !pollCreating && React.createElement("div", { style: { fontSize: 11, color: C.txt3 } }, "Create a poll to vote on shows with friends."),
        groupPolls.filter(function(pp) { return !pp.building; }).map(function(poll) {
          var maxVotes = 0;
          poll.codes.forEach(function(c) { if ((poll.votes[c] || 0) > maxVotes) maxVotes = poll.votes[c] || 0; });
          return React.createElement("div", {
            key: "poll-" + poll.id,
            style: { marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }
          },
            React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } },
              React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.txt } }, "🗳️ " + (poll.title || "Poll")),
              React.createElement("div", { style: { display: "flex", gap: 4 } },
                React.createElement("button", {
                  onClick: function() {
                    var text = "🗳️ Vote: " + (poll.title || "Which show?") + "\n" + poll.codes.map(function(c, i) {
                      var s = e[c]; return (i+1) + ". " + (s ? s.title : c) + " — " + (poll.votes[c] || 0) + " votes";
                    }).join("\n");
                    if (navigator.share) navigator.share({text: text}).catch(function(){});
                    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(function() { setToastMsg("Poll copied!"); setTimeout(function() { setToastMsg(null); }, 3000); });
                  },
                  style: { padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 11, cursor: "pointer" }
                }, "📤"),
                React.createElement("button", {
                  onClick: function() { setGroupPolls(groupPolls.filter(function(pp) { return pp.id !== poll.id; })); },
                  style: { padding: "2px 6px", borderRadius: 4, border: "1px solid " + C.border, background: "transparent", color: "#f87171", fontSize: 11, cursor: "pointer" }
                }, "✕")
              )
            ),
            poll.codes.map(function(c) {
              var s = e[c];
              var v = poll.votes[c] || 0;
              var pct = maxVotes > 0 ? (v / maxVotes * 100) : 0;
              return React.createElement("div", {
                key: "pv-" + c,
                style: { marginBottom: 4 }
              },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
                  React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                    React.createElement("div", { style: { fontSize: 11, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, s ? s.title : c),
                    React.createElement("div", { style: { height: 6, borderRadius: 3, background: C.border, marginTop: 2, overflow: "hidden" } },
                      React.createElement("div", { style: { height: "100%", width: pct + "%", background: "linear-gradient(90deg, #818cf8, #6366f1)", borderRadius: 3, transition: "width 0.3s" } })
                    )
                  ),
                  React.createElement("button", {
                    onClick: function() {
                      setGroupPolls(groupPolls.map(function(pp) {
                        if (pp.id !== poll.id) return pp;
                        var nv = Object.assign({}, pp.votes);
                        nv[c] = (nv[c] || 0) + 1;
                        return Object.assign({}, pp, { votes: nv });
                      }));
                    },
                    style: { padding: "3px 8px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.accent, fontSize: 11, fontWeight: 700, cursor: "pointer", flexShrink: 0 }
                  }, "👍 " + v)
                )
              );
            })
          );
        })
      );
    }(),
    // Show notes timeline
    function() {
      var notedCodes = Object.keys(se).filter(function(c) { return se[c] && se[c].trim(); });
      if (notedCodes.length === 0) return null;
      var items = notedCodes.map(function(c) {
        var s = e[c];
        return s ? { code: c, show: s, note: se[c], rating: ratings[c] || 0 } : null;
      }).filter(Boolean);
      if (items.length === 0) return null;
      items.sort(function(a, b) {
        var da = (p[a.code] && p[a.code][0] && p[a.code][0].date) || "";
        var db = (p[b.code] && p[b.code][0] && p[b.code][0].date) || "";
        if (da && db) return da.localeCompare(db);
        if (da) return -1;
        if (db) return 1;
        return a.show.title.localeCompare(b.show.title);
      });
      return React.createElement("div", {
        style: { marginTop: 10, padding: "10px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border }
      },
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: C.txt3, marginBottom: 8 } }, "📓 Notes timeline"),
        React.createElement("div", { style: { position: "relative", paddingLeft: 16 } },
          React.createElement("div", { style: { position: "absolute", left: 5, top: 0, bottom: 0, width: 2, background: C.border, borderRadius: 1 } }),
          items.map(function(it, idx) {
            var bk = p[it.code] && p[it.code][0];
            var dateStr = bk ? bk.date : "";
            return React.createElement("div", {
              key: it.code,
              style: { position: "relative", marginBottom: idx < items.length - 1 ? 12 : 0, paddingLeft: 12 }
            },
              React.createElement("div", { style: { position: "absolute", left: -12, top: 6, width: 10, height: 10, borderRadius: "50%", background: it.rating >= 4 ? "#fbbf24" : it.rating >= 2 ? C.accent : C.border, border: "2px solid " + C.card } }),
              React.createElement("div", {
                onClick: function() { de(it.show); },
                style: { cursor: "pointer", padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid " + C.border }
              },
                React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 } },
                  React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 } }, it.show.title),
                  it.rating > 0 && React.createElement("span", { style: { fontSize: 11, color: "#fbbf24", flexShrink: 0 } }, "★".repeat(it.rating))
                ),
                dateStr && React.createElement("div", { style: { fontSize: 10, color: C.txt3, marginBottom: 2 } }, dateStr),
                React.createElement("div", { style: { fontSize: 11, color: C.txt2, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 60, overflow: "hidden" } }, it.note)
              )
            );
          })
        )
      );
    }()
    )),
    // Bookings sub-view
    bkSubView === "bookings" && React.createElement(React.Fragment, null, React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        flexDirection: V ? "column" : "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12
      }
    }, (exportMenuOpen || shareMenuOpen) && React.createElement("div", {
      onClick: function() { setExportMenuOpen(false); setShareMenuOpen(false); },
      style: { position: "fixed", inset: 0, zIndex: 99, background: "transparent" }
    }), React.createElement("div", {
      style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }
    }, React.createElement("div", {
      style: { position: "relative", display: "inline-block" }
    },
      React.createElement("button", {
        onClick: function() { setExportMenuOpen(!exportMenuOpen); setShareMenuOpen(false); },
        title: "Export options",
        style: {
          padding: "7px 14px",
          borderRadius: 8,
          border: "1px solid " + (exportMenuOpen ? C.accent : C.border),
          background: exportMenuOpen ? "rgba(168,85,247,0.15)" : "transparent",
          color: exportMenuOpen ? C.accent : C.txt2,
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          lineHeight: 1.3
        }
      }, V ? "\u{1F4E4}" : "\u{1F4E4} Export \u25BE"),
      exportMenuOpen && React.createElement("div", {
        style: {
          position: V ? "fixed" : "absolute",
          top: V ? "auto" : "calc(100% + 4px)",
          bottom: V ? "calc(60px + env(safe-area-inset-bottom))" : "auto",
          left: V ? 12 : 0,
          right: V ? 12 : "auto",
          zIndex: 100,
          background: C.card,
          border: "1px solid " + C.border,
          borderRadius: 10,
          padding: 4,
          minWidth: V ? 0 : 220,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
        }
      },
        React.createElement("button", {
          onClick: function() { downloadAllICS_(e, p, y); setExportMenuOpen(false); },
          style: { display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: C.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 6 },
          onMouseEnter: function(ev) { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; },
          onMouseLeave: function(ev) { ev.currentTarget.style.background = "transparent"; }
        }, "\u{1F4C5} Download all to calendar"),
        React.createElement("button", {
          onClick: function() {
            var showMap = {};
            (n || []).forEach(function(s) { showMap[s.code] = s; });
            var rows = [["Show", "Artist", "Date", "Start", "End", "Ticket Price", "Paid For", "Total Cost", "Genre", "Tags", "Venue", "Venue Address", "Rating", "Notes", "Companions", "Who Booked", "LTF", "LTF Tickets"]];
            Object.keys(p).forEach(function(code) {
              (p[code] || []).forEach(function(rec) {
                var s = showMap[code];
                if (!s) return;
                var r = ratings[code] || "";
                var note = (se[code] || "").replace(/[\n\r]+/g, " ");
                var comp = rec.companions || companions[code] || "";
                var booker = rec.booker || bookerData[code] || "";
                var ltfYN = rec.ltf ? "Yes" : "";
                var ltfTix = rec.ltf && rec.ltfTickets > 0 ? rec.ltfTickets : "";
                rows.push([
                  '"' + (s.title || "").replace(/"/g, '""') + '"',
                  '"' + (s.artist || "").replace(/"/g, '""') + '"',
                  rec.date || "",
                  rec.start || s.startStr || "",
                  rec.end || s.endStr || "",
                  perfPrice_(s, rec) || "",
                  '"' + (rec.paidFor || "").replace(/"/g, '""') + '"',
                  totalBookingCost_(s, rec) || "",
                  '"' + (s.genre || "").replace(/"/g, '""') + '"',
                  '"' + (s.tags || []).join(", ").replace(/"/g, '""') + '"',
                  '"' + (venueLabel_(s)).replace(/"/g, '""') + '"',
                  '"' + ([s.venueAddr, s.venuePostcode].filter(Boolean).join(", ")).replace(/"/g, '""') + '"',
                  r ? r + "/5" : "",
                  '"' + note.replace(/"/g, '""') + '"',
                  '"' + comp.replace(/"/g, '""') + '"',
                  '"' + booker.replace(/"/g, '""') + '"',
                  ltfYN,
                  ltfTix
                ]);
              });
            });
            var csv = rows.map(function(r) { return r.join(","); }).join("\n");
            var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "fringe-bookings.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            setExportMenuOpen(false);
          },
          style: { display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: C.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 6 },
          onMouseEnter: function(ev) { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; },
          onMouseLeave: function(ev) { ev.currentTarget.style.background = "transparent"; }
        }, "\u{1F4E5} Export as CSV")
      )
    ),
    React.createElement("div", {
      style: { position: "relative", display: "inline-block" }
    },
      React.createElement("button", {
        onClick: function() { setShareMenuOpen(!shareMenuOpen); setExportMenuOpen(false); },
        title: "Share options",
        style: {
          padding: "7px 14px",
          borderRadius: 8,
          border: "1px solid " + (shareMenuOpen ? C.accent : C.border),
          background: shareMenuOpen ? "rgba(168,85,247,0.15)" : "transparent",
          color: shareMenuOpen ? C.accent : C.txt2,
          fontSize: 12,
          fontWeight: 800,
          cursor: "pointer",
          lineHeight: 1.3
        }
      }, V ? "\u{1F517}" : "\u{1F517} Share \u25BE"),
      shareMenuOpen && React.createElement("div", {
        style: {
          position: V ? "fixed" : "absolute",
          top: V ? "auto" : "calc(100% + 4px)",
          bottom: V ? "calc(60px + env(safe-area-inset-bottom))" : "auto",
          left: V ? 12 : "auto",
          right: V ? 12 : 0,
          zIndex: 100,
          background: C.card,
          border: "1px solid " + C.border,
          borderRadius: 10,
          padding: 4,
          minWidth: V ? 0 : 240,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)"
        }
      },
        React.createElement("button", {
          onClick: function() { setShareMode(!shareMode); setShareSel(new Set()); setShareCopied(false); setShareMenuOpen(false); },
          style: { display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: C.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 6 },
          onMouseEnter: function(ev) { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; },
          onMouseLeave: function(ev) { ev.currentTarget.style.background = "transparent"; }
        }, "\u{1F517} Share shows with a friend"),
        React.createElement("button", {
          onClick: function() {
            var todayItems = (l[nowStr] || []).slice().sort(function(a, b) {
              return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0);
            });
            if (todayItems.length === 0) { setToastMsg("No shows booked for today!"); setTimeout(function() { setToastMsg(null); }, 3000); setShareMenuOpen(false); return; }
            var dn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
            var td = new Date(nowStr + "T12:00:00");
            var lines = ["\u{1F3AD} My Fringe schedule \u2014 " + dn[td.getDay()] + " " + td.getDate() + "/" + (td.getMonth()+1) + "\n"];
            todayItems.forEach(function(u) {
              var st = u.rec.start || u.s.startStr || "?";
              var en = u.rec.end || u.s.endStr || "";
              lines.push(st + (en ? "\u2013" + en : "") + "  " + (u.s.title || u.s.artist) + "  @ " + venueLabel_(u.s));
            });
            lines.push("\n" + todayItems.length + " show" + (todayItems.length === 1 ? "" : "s") + " today \u{1F389}");
            var text = lines.join("\n");
            if (navigator.share) {
              navigator.share({text: text}).catch(function(){});
            } else if (navigator.clipboard) {
              navigator.clipboard.writeText(text).then(function() { setToastMsg("Today's schedule copied!"); setTimeout(function() { setToastMsg(null); }, 3000); });
            } else {
              setToastMsg("Sharing not available in this browser");
              setTimeout(function() { setToastMsg(null); }, 3000);
            }
            setShareMenuOpen(false);
          },
          style: { display: "block", width: "100%", padding: "10px 14px", border: "none", background: "transparent", color: C.txt, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", borderRadius: 6 },
          onMouseEnter: function(ev) { ev.currentTarget.style.background = "rgba(255,255,255,0.06)"; },
          onMouseLeave: function(ev) { ev.currentTarget.style.background = "transparent"; }
        }, "\u{1F4CB} Share today\u2019s schedule")
      )
    ),
    !V && React.createElement("input", {
      type: "date",
      value: bkDateFilter,
      onChange: function(ev) { setBkDateFilter(ev.target.value); },
      title: "Filter to a specific date",
      "aria-label": "Filter bookings by date",
      style: {padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, colorScheme: THEME === "light" ? "light" : "dark", cursor: "pointer"}
    }),
    !V && bkDateFilter && React.createElement("button", {
      onClick: function() { setBkDateFilter(""); },
      title: "Clear date filter",
      style: {padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: 12, fontWeight: 800, cursor: "pointer"}
    }, "\u2715 " + bkDateFilter),
    React.createElement("button", {
      onClick: function() {
        var wasHidden = !bkShowPast;
        setBkShowPast(!bkShowPast);
        if (wasHidden) {
          setTimeout(function() {
            var nowD = new Date();
            var todayId = "bk-date-" + nowD.getFullYear() + "-" + String(nowD.getMonth()+1).padStart(2,"0") + "-" + String(nowD.getDate()).padStart(2,"0");
            var el = document.getElementById(todayId);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }, 80);
        }
      },
      title: bkShowPast ? "Hide past shows" : "Show past shows",
      "aria-label": bkShowPast ? "Hide past shows" : "Show past shows",
      style: {padding: "7px 12px", borderRadius: 8, border: "1px solid " + (bkShowPast ? C.accent : C.border), background: bkShowPast ? "rgba(168,85,247,0.15)" : "transparent", color: bkShowPast ? C.accent : C.txt2, fontSize: 15, cursor: "pointer"}
    }, bkShowPast ? "\u{1F441}" : "\u{1F441}\u200D\u{1F5E8}"),
    React.createElement("button", {
      onClick: function() { setAddShowOpen(true); setAddShowQ(""); },
      title: "Add a show to your bookings",
      style: {
        padding: "7px 14px",
        borderRadius: 8,
        border: "1px solid " + C.border,
        background: "rgba(52,211,153,0.12)",
        color: "#34d399",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        lineHeight: 1.3
      }
    }, V ? "\u2795" : "\u2795 Add show"),
    React.createElement("button", {
      onClick: function() { setCompanionView(!companionView); },
      title: companionView ? "Hide companion schedule" : "Show companion schedule",
      style: { padding: "7px 14px", borderRadius: 8, border: "1px solid " + (companionView ? C.accent : C.border), background: companionView ? "rgba(168,85,247,0.15)" : "transparent", color: companionView ? C.accent : C.txt2, fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: 1.3 }
    }, V ? "\ud83d\udc65" : "\ud83d\udc65 Companions")),
    React.createElement("button", {
      onClick: function() { mt("browse"); window.scrollTo(0, 0); },
      title: "Discover shows for you",
      style: { padding: "7px 14px", borderRadius: 8, border: "1px solid #f59e0b", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontSize: 12, fontWeight: 800, cursor: "pointer", lineHeight: 1.3 }
    }, V ? "\u2728" : "\u2728 Discover"),
    V && React.createElement("div", {
      style: { display: "flex", gap: 8, alignItems: "center" }
    }, React.createElement("input", {
      type: "date",
      value: bkDateFilter,
      onChange: function(ev) { setBkDateFilter(ev.target.value); },
      title: "Filter to a specific date",
      "aria-label": "Filter bookings by date",
      style: {padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, colorScheme: THEME === "light" ? "light" : "dark", cursor: "pointer", flex: 1}
    }),
    bkDateFilter && React.createElement("button", {
      onClick: function() { setBkDateFilter(""); },
      title: "Clear date filter",
      style: {padding: "7px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "rgba(239,68,68,0.12)", color: "#f87171", fontSize: 12, fontWeight: 800, cursor: "pointer"}
    }, "\u2715")))),
    sharedBookings && sharedBookings.length > 0 && React.createElement("div", {
      style: {
        background: "rgba(52,211,153,0.12)",
        border: "1px solid rgba(52,211,153,0.3)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 14
      }
    }, React.createElement("div", {style: {fontSize: 16, fontWeight: 900, color: "#34d399", marginBottom: 10}}, "\u{1F381} A friend shared " + sharedBookings.length + " show" + (sharedBookings.length === 1 ? "" : "s") + " with you!"),
    React.createElement("div", {style: {display: "flex", flexDirection: "column", gap: 10, marginBottom: 14}}, sharedBookings.map(function(item, idx) {
      var code = item.code || item.c;
      var date = item.date || item.d;
      var start = item.start || item.s;
      var sh = e[code];
      if (!sh) return React.createElement("div", {key: idx, style: {padding: "8px 12px", borderRadius: 10, background: C.card, border: "1px solid " + C.border}}, (idx + 1) + ". " + code);
      var vn = sh.venue || "";
      var he = sh.address ? sh.address.replace(/<[^>]*>/g, "").trim() : "";
      return React.createElement("div", {key: idx, style: {padding: "12px 14px", borderRadius: 12, background: C.card, border: "1px solid " + C.border}},
        React.createElement("div", {style: {display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8}},
          React.createElement("div", {style: {flex: 1, minWidth: 0}},
            React.createElement("div", {style: {fontSize: 14, fontWeight: 800, marginBottom: 4, lineHeight: 1.3}}, sh.title),
            React.createElement("div", {style: {fontSize: 12, color: C.txt2, marginBottom: 4}},
              "\u{1F4CD} ", React.createElement("strong", null, vn), he ? " \xB7 " + he : ""),
            date && React.createElement("div", {style: {fontSize: 12, color: C.txt2, marginBottom: 2}},
              "\u{1F4C5} " + date + (start ? " \xB7 " + start : "") + (sh.duration ? " \xB7 " + sh.duration + " min" : "")),
            React.createElement("div", {style: {display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4}},
              sh.genre && React.createElement("span", {style: {fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(168,85,247,0.15)", color: "#c084fc", fontWeight: 700}}, sh.genre),
              React.createElement("span", {style: {fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "rgba(52,211,153,0.15)", color: "#34d399", fontWeight: 700}}, sh.priceFull ? "\xA3" + sh.priceFull : "Free")
            )
          ),
          React.createElement("div", {style: {fontSize: 20, fontWeight: 900, color: C.txt3, flexShrink: 0, width: 28, textAlign: "center", lineHeight: 1}}, idx + 1)
        )
      );
    })),
    React.createElement("div", {style: {display: "flex", gap: 8}},
      React.createElement("button", {onClick: acceptSharedBookings, style: {padding: "10px 22px", borderRadius: 10, border: "none", background: "#34d399", color: "#000", fontSize: 14, fontWeight: 800, cursor: "pointer"}}, "✅ Add all to my bookings"),
      React.createElement("button", {onClick: function() { setSharedBookings(null); try { history.replaceState(null, "", window.location.pathname); } catch(err) {} }, style: {padding: "10px 18px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, fontWeight: 700, cursor: "pointer"}}, "Dismiss"))),
    shareMode && React.createElement("div", {
      style: {
        background: "rgba(168,85,247,0.08)",
        border: "1px solid rgba(168,85,247,0.28)",
        borderRadius: 12,
        padding: "12px 16px",
        marginBottom: 14
      }
    }, React.createElement("div", {style: {fontSize: 13, color: "#c084fc", fontWeight: 800, marginBottom: 6}}, "Select shows to share"),
    React.createElement("div", {style: {fontSize: 12, color: C.txt2, marginBottom: 8}}, "Tick the shows below, then click the button to copy a shareable link."),
    React.createElement("div", {style: {display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"}},
      React.createElement("button", {
        disabled: shareSel.size === 0,
        onClick: function() {
          var items = r.filter(function(u) { return shareSel.has(u.code + "|" + u.rec.date + "|" + u.bIdx); }).map(function(u) {
            var o = { c: u.code };
            if (u.rec.date) o.d = u.rec.date;
            if (u.rec.start && u.rec.start !== u.s.startStr) o.s = u.rec.start;
            if (u.rec.end && u.rec.end !== u.s.endStr) o.e = u.rec.end;
            return o;
          });
          var compressed = LZString.compressToEncodedURIComponent(JSON.stringify(items));
          var url = window.location.origin + window.location.pathname + "#share=" + compressed;
          var _onCopied = function() { setToastMsg("Link copied to clipboard!"); setShareMode(false); setShareSel(new Set()); setShareCopied(false); setTimeout(function() { setToastMsg(null); }, 3000); };
          var _fallbackCopy = function() { try { var ta = document.createElement("textarea"); ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch(e) {} _onCopied(); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(_onCopied).catch(_fallbackCopy);
          } else {
            _fallbackCopy();
          }
        },
        style: {padding: "8px 18px", borderRadius: 10, border: "none", background: shareSel.size > 0 ? C.accent : "rgba(168,85,247,0.3)", color: "#fff", fontSize: 13, fontWeight: 800, cursor: shareSel.size > 0 ? "pointer" : "not-allowed"}
      }, shareCopied ? "Link copied!" : "Copy link (" + shareSel.size + " show" + (shareSel.size === 1 ? "" : "s") + ")"),
      React.createElement("button", {
        onClick: function() {
          var allKeys = new Set();
          r.forEach(function(u) { allKeys.add(u.code + "|" + u.rec.date + "|" + u.bIdx); });
          setShareSel(shareSel.size === r.length ? new Set() : allKeys);
        },
        style: {padding: "6px 12px", borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 12, fontWeight: 700, cursor: "pointer"}
      }, shareSel.size === r.length ? "Deselect all" : "Select all"))),
    // Companion schedule view
    companionView && function() {
      // Build companion → shows map from bookings
      var compMap = {};
      r.forEach(function(u) {
        var comps = (u.rec.companions || companions[u.code] || "").split(",").map(function(c) { return c.trim(); }).filter(Boolean);
        comps.forEach(function(c) {
          if (!compMap[c]) compMap[c] = [];
          compMap[c].push(u);
        });
      });
      var compNames = Object.keys(compMap).sort();
      if (compNames.length === 0) return React.createElement("div", {
        style: { textAlign: "center", color: C.txt3, fontSize: 14, padding: "20px 16px", marginBottom: 12, background: C.card, borderRadius: 12, border: "1px solid " + C.border }
      }, "No companions assigned yet. Add companions to your bookings in the show detail panel.");
      return React.createElement("div", { style: { marginBottom: 16 } },
        compNames.map(function(name) {
          var shows = compMap[name].slice().sort(function(a, b) {
            if (a.rec.date !== b.rec.date) return (a.rec.date || "") < (b.rec.date || "") ? -1 : 1;
            return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0);
          });
          // detect clashes for this companion
          var compClashes = [];
          for (var ci = 0; ci < shows.length; ci++) {
            for (var cj = ci + 1; cj < shows.length; cj++) {
              if (shows[ci].rec.date !== shows[cj].rec.date) continue;
              var si = timeToMin_(shows[ci].rec.start || shows[ci].s.startStr);
              var ei = timeToMin_(shows[ci].rec.end || shows[ci].s.endStr);
              if (ei == null && si != null) ei = si + (shows[ci].s.duration || 60);
              var sj = timeToMin_(shows[cj].rec.start || shows[cj].s.startStr);
              var ej = timeToMin_(shows[cj].rec.end || shows[cj].s.endStr);
              if (ej == null && sj != null) ej = sj + (shows[cj].s.duration || 60);
              if (si != null && sj != null && ei != null && ej != null && si < ej && sj < ei)
                compClashes.push(shows[ci].s.title + " ↔ " + shows[cj].s.title);
            }
          }
          // group by date
          var byDate = {};
          shows.forEach(function(u) { var d = u.rec.date || "No date"; if (!byDate[d]) byDate[d] = []; byDate[d].push(u); });
          var dates = Object.keys(byDate).sort();
          return React.createElement("div", {
            key: name,
            style: { marginBottom: 12, background: C.card, borderRadius: 12, border: "1px solid " + C.border, padding: "12px 14px", overflow: "hidden" }
          },
            React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } },
              React.createElement("span", { style: { fontSize: 18 } }, "👤"),
              React.createElement("span", { style: { fontSize: 15, fontWeight: 800, color: C.txt } }, name),
              React.createElement("span", { style: { fontSize: 11, color: C.txt3, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 } }, shows.length + " show" + (shows.length !== 1 ? "s" : "")),
              compClashes.length > 0 && React.createElement("span", {
                title: compClashes.join("\n"),
                style: { fontSize: 11, color: "#F87171", background: "rgba(248,113,113,0.1)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }
              }, "⚠️ " + compClashes.length + " clash" + (compClashes.length > 1 ? "es" : ""))
            ),
            dates.map(function(d) {
              var dayShows = byDate[d];
              var dayLabel = d;
              if (d !== "No date") {
                var dt = new Date(d + "T12:00:00");
                var dn = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
                dayLabel = dn[dt.getDay()] + " " + dt.getDate() + "/" + (dt.getMonth()+1);
              }
              return React.createElement("div", { key: d, style: { marginBottom: 6 } },
                React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: C.txt3, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 } }, dayLabel),
                dayShows.map(function(u, idx) {
                  return React.createElement("div", {
                    key: u.code + idx,
                    onClick: function() { de(u.s); },
                    style: { padding: "6px 10px", borderRadius: 8, marginBottom: 3, background: "rgba(255,255,255,0.03)", cursor: "pointer", display: "flex", gap: 8, alignItems: "center", fontSize: 12 }
                  },
                    React.createElement("span", { style: { color: C.txt2, fontWeight: 700, flexShrink: 0, minWidth: 70 } }, (u.rec.start || u.s.startStr || "?") + "–" + (u.rec.end || u.s.endStr || "?")),
                    React.createElement("span", { style: { fontWeight: 600, color: C.txt, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, u.s.title),
                    React.createElement("span", { style: { fontSize: 10, color: C.txt3, flexShrink: 0 } }, venueLabel_(u.s))
                  );
                })
              );
            })
          );
        })
      );
    }(),
    bkSubView === "bookings" && (filteredDates.length === 0 ? React.createElement("div", {
      style: {
        textAlign: "center",
        color: C.txt3,
        fontSize: 15,
        padding: "46px 12px"
      }
    }, "No bookings yet. On any show tap ", React.createElement("b", {
      style: {
        color: C.txt2
      }
    }, "\u{1F39F} Book"), " and confirm the date.") : filteredDates.map(function(u) {
      return React.createElement("div", {
        key: u,
        id: "bk-date-" + u,
        style: {
          marginBottom: 18,
          scrollMarginTop: 120
        }
      }, React.createElement("div", {
        style: {
          display: "flex",
          alignItems: "center",
          gap: 11,
          margin: "0 2px 10px"
        }
      }, u === "No date" ? React.createElement("span", {
        style: {
          fontSize: 16,
          fontWeight: 800,
          color: C.txt
        }
      }, "No date set") : function() {
        var c = new Date(u + "T12:00:00"),
          T = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
          B = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return React.createElement(React.Fragment, null, React.createElement("span", {
          style: {
            fontSize: 32,
            fontWeight: 900,
            lineHeight: 1,
            background: "linear-gradient(90deg,var(--pink),var(--accent))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }
        }, c.getDate()), React.createElement("span", {
          style: {
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: C.txt2,
            lineHeight: 1.25
          }
        }, T[c.getDay()], React.createElement("br", null), B[c.getMonth()]))
      }(), React.createElement("span", {
        style: {
          marginLeft: "auto",
          fontSize: 11,
          fontWeight: 800,
          color: C.txt3,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 20,
          padding: "3px 10px"
        }
      }, l[u].length, " show", l[u].length > 1 ? "s" : ""),
      u !== "No date" && weatherData && weatherData[u] && React.createElement("span", {
        title: weatherData[u].label + " — " + weatherData[u].low + "°/" + weatherData[u].high + "°C, " + weatherData[u].rain + "% rain",
        style: { fontSize: 12, fontWeight: 700, color: C.txt2, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }
      }, weatherData[u].icon, " ", weatherData[u].high + "°", weatherData[u].rain > 30 ? React.createElement("span", { style: { color: "#60a5fa", fontSize: 11 } }, "💧" + weatherData[u].rain + "%") : null),
      function() {
        // Day-level clash & tight schedule detection
        var items = l[u] || [];
        if (items.length < 2) return null;
        var clashCount = 0, tightCount = 0;
        var sorted = items.slice().sort(function(a, b) { return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0); });
        for (var ci = 0; ci < sorted.length; ci++) {
          var si = timeToMin_(sorted[ci].rec.start || sorted[ci].s.startStr);
          var ei = timeToMin_(sorted[ci].rec.end || sorted[ci].s.endStr);
          if (ei == null && si != null) ei = si + (sorted[ci].s.duration || 60);
          for (var cj = ci + 1; cj < sorted.length; cj++) {
            var sj = timeToMin_(sorted[cj].rec.start || sorted[cj].s.startStr);
            var ej = timeToMin_(sorted[cj].rec.end || sorted[cj].s.endStr);
            if (ej == null && sj != null) ej = sj + (sorted[cj].s.duration || 60);
            if (si != null && sj != null && ei != null && ej != null && si < ej && sj < ei) clashCount++;
          }
          if (ci > 0) {
            var prevEi = timeToMin_(sorted[ci-1].rec.end || sorted[ci-1].s.endStr);
            if (prevEi == null) { var psi = timeToMin_(sorted[ci-1].rec.start || sorted[ci-1].s.startStr); if (psi != null) prevEi = psi + (sorted[ci-1].s.duration || 60); }
            if (prevEi != null && si != null) {
              var gap = si - prevEi;
              var wm = (sorted[ci-1].s.venue && sorted[ci].s.venue && venueLabel_(sorted[ci-1].s) !== venueLabel_(sorted[ci].s)) ? (walkMin_(sorted[ci-1].s, sorted[ci].s) || 0) : 0;
              if (gap >= 0 && gap < wm) tightCount++;
            }
          }
        }
        if (clashCount === 0 && tightCount === 0) return null;
        var parts = [];
        if (clashCount > 0) parts.push(clashCount + " clash" + (clashCount > 1 ? "es" : ""));
        if (tightCount > 0) parts.push(tightCount + " tight");
        return React.createElement("span", {
          title: parts.join(", ") + " — check schedule",
          style: { fontSize: 11, fontWeight: 700, color: "#F87171", background: "rgba(248,113,113,0.1)", borderRadius: 20, padding: "3px 8px", display: "inline-flex", alignItems: "center", gap: 3, whiteSpace: "nowrap" }
        }, "⚠️ ", parts.join(", "));
      }(),
      bkDayOrder[u] && React.createElement("button", {
        onClick: function() { setBkDayOrder(function(prev) { var next = Object.assign({}, prev); delete next[u]; return next; }); },
        title: "Reset to time order",
        style: { marginLeft: 4, padding: "2px 8px", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 10, fontWeight: 700, cursor: "pointer" }
      }, "↕ Reset"),
      u !== "No date" && React.createElement("button", {
        onClick: function() { setTimelineOpen(function(prev) { var n = Object.assign({}, prev); n[u] = !prev[u]; return n; }); },
        title: timelineOpen[u] ? "Hide timeline" : "Show timeline",
        style: { padding: "2px 8px", borderRadius: 6, border: "1px solid " + (timelineOpen[u] ? C.accent : C.border), background: timelineOpen[u] ? "rgba(168,85,247,0.12)" : "transparent", color: timelineOpen[u] ? C.accent : C.txt3, fontSize: 10, fontWeight: 700, cursor: "pointer" }
      }, "📐 Timeline")),
      // Day planner timeline
      u !== "No date" && timelineOpen[u] && function() {
        var items = l[u] || [];
        if (items.length === 0) return null;
        var sorted = items.slice().sort(function(a, b) { return (timeToMin_(a.rec.start || a.s.startStr) || 0) - (timeToMin_(b.rec.start || b.s.startStr) || 0); });
        // Find time range
        var allStarts = [], allEnds = [];
        sorted.forEach(function(it) {
          var s = timeToMin_(it.rec.start || it.s.startStr);
          var en = timeToMin_(it.rec.end || it.s.endStr);
          if (en == null && s != null) en = s + (it.s.duration || 60);
          if (s != null) allStarts.push(s);
          if (en != null) allEnds.push(en);
        });
        if (allStarts.length === 0) return null;
        var minTime = Math.min.apply(null, allStarts);
        var maxTime = Math.max.apply(null, allEnds);
        // Snap to hour boundaries
        minTime = Math.floor(minTime / 60) * 60;
        maxTime = Math.ceil(maxTime / 60) * 60;
        if (maxTime <= minTime) maxTime = minTime + 60;
        var range = maxTime - minTime;
        // Build hour markers
        var hours = [];
        for (var hr = minTime; hr <= maxTime; hr += 60) {
          hours.push(hr);
        }
        // Detect overlapping rows (simple greedy lane assignment)
        var lanes = [];
        sorted.forEach(function(it) {
          var s = timeToMin_(it.rec.start || it.s.startStr);
          var en = timeToMin_(it.rec.end || it.s.endStr);
          if (en == null && s != null) en = s + (it.s.duration || 60);
          if (s == null) { it._lane = 0; return; }
          var placed = false;
          for (var li = 0; li < lanes.length; li++) {
            if (s >= lanes[li]) { lanes[li] = en; it._lane = li; placed = true; break; }
          }
          if (!placed) { it._lane = lanes.length; lanes.push(en); }
        });
        var laneCount = Math.max(lanes.length, 1);
        var laneH = 32;
        var chartH = laneCount * (laneH + 4) + 4;
        var gcols = ["#a78bfa","#f472b6","#34d399","#60a5fa","#fbbf24","#fb923c","#f87171","#38bdf8","#a3e635","#e879f9"];
        return React.createElement("div", {
          style: { margin: "6px 0 10px", background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "10px 10px 6px", overflow: "hidden" }
        },
          // Hour labels
          React.createElement("div", { style: { position: "relative", height: 16, marginBottom: 4, marginLeft: 0, marginRight: 0 } },
            hours.map(function(h) {
              var left = ((h - minTime) / range * 100);
              var hh = Math.floor((h % 1440) / 60);
              return React.createElement("span", {
                key: h,
                style: { position: "absolute", left: left + "%", transform: "translateX(-50%)", fontSize: 9, fontWeight: 700, color: C.txt3, whiteSpace: "nowrap" }
              }, (hh < 10 ? "0" : "") + hh + ":00");
            })
          ),
          // Timeline bars
          React.createElement("div", { style: { position: "relative", height: chartH, background: "rgba(255,255,255,0.02)", borderRadius: 6, overflow: "hidden" } },
            // Hour gridlines
            hours.map(function(h) {
              var left = ((h - minTime) / range * 100);
              return React.createElement("div", {
                key: "g" + h,
                style: { position: "absolute", left: left + "%", top: 0, bottom: 0, width: 1, background: "rgba(255,255,255,0.06)" }
              });
            }),
            // Now marker
            function() {
              var now = new Date();
              var nowM = now.getHours() * 60 + now.getMinutes();
              var todayStr = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
              if (u !== todayStr || nowM < minTime || nowM > maxTime) return null;
              var left = ((nowM - minTime) / range * 100);
              return React.createElement("div", {
                style: { position: "absolute", left: left + "%", top: 0, bottom: 0, width: 2, background: "#ef4444", zIndex: 2, borderRadius: 1 },
                title: "Now"
              }, React.createElement("div", { style: { position: "absolute", top: -3, left: -3, width: 8, height: 8, borderRadius: "50%", background: "#ef4444" } }));
            }(),
            // Show blocks
            sorted.map(function(it, idx) {
              var s = timeToMin_(it.rec.start || it.s.startStr);
              var en = timeToMin_(it.rec.end || it.s.endStr);
              if (en == null && s != null) en = s + (it.s.duration || 60);
              if (s == null) return null;
              var left = ((s - minTime) / range * 100);
              var w = ((en - s) / range * 100);
              if (w < 1) w = 1;
              var top = (it._lane || 0) * (laneH + 4) + 2;
              var col = gcols[idx % gcols.length];
              return React.createElement("div", {
                key: it.code + idx,
                onClick: function() { de(it.s); },
                title: it.s.title + " · " + (it.rec.start || it.s.startStr) + "–" + (it.rec.end || it.s.endStr) + " · " + venueLabel_(it.s),
                style: {
                  position: "absolute", left: left + "%", width: w + "%", top: top, height: laneH, borderRadius: 6,
                  background: col, opacity: 0.85, cursor: "pointer", overflow: "hidden", display: "flex", alignItems: "center", paddingLeft: 6, paddingRight: 4, boxSizing: "border-box",
                  border: "1px solid rgba(0,0,0,0.2)", transition: "opacity 0.15s"
                }
              },
                React.createElement("span", { style: { fontSize: 10, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 1px 2px rgba(0,0,0,0.4)" } }, it.s.title)
              );
            })
          ),
          // Gap indicators
          function() {
            var gaps = [];
            for (var gi = 1; gi < sorted.length; gi++) {
              var prevEnd = timeToMin_(sorted[gi-1].rec.end || sorted[gi-1].s.endStr);
              if (prevEnd == null) { var ps = timeToMin_(sorted[gi-1].rec.start || sorted[gi-1].s.startStr); if (ps != null) prevEnd = ps + (sorted[gi-1].s.duration || 60); }
              var nextStart = timeToMin_(sorted[gi].rec.start || sorted[gi].s.startStr);
              if (prevEnd != null && nextStart != null && nextStart > prevEnd && sorted[gi-1]._lane === sorted[gi]._lane) {
                var gapMin = nextStart - prevEnd;
                var wm = (sorted[gi-1].s.venue && sorted[gi].s.venue && venueLabel_(sorted[gi-1].s) !== venueLabel_(sorted[gi].s)) ? (walkMin_(sorted[gi-1].s, sorted[gi].s) || 0) : 0;
                var tight = gapMin < wm;
                gaps.push({ minutes: gapMin, tight: tight, walkMin: wm });
              }
            }
            if (gaps.length === 0) return null;
            return React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 } },
              gaps.map(function(g, i) {
                var hh = Math.floor(g.minutes / 60);
                var mm = g.minutes % 60;
                var label = hh > 0 ? hh + "h" + (mm > 0 ? mm + "m" : "") : mm + "m";
                return React.createElement("span", {
                  key: i,
                  style: { fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: g.tight ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)", color: g.tight ? "#F87171" : "#34d399" }
                }, g.tight ? "⚠️ " + label + " gap (need " + Math.ceil(g.walkMin) + "m walk)" : "✅ " + label + " gap");
              })
            );
          }()
        );
      }(),
      React.createElement("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 8
        }
      }, function() {
        var _customOrd = bkDayOrder[u];
        var c = l[u].slice().sort(function(m, re) {
            if (_customOrd) {
              var mKey = m.code + "|" + m.bIdx;
              var rKey = re.code + "|" + re.bIdx;
              var mi = _customOrd.indexOf(mKey);
              var ri = _customOrd.indexOf(rKey);
              if (mi >= 0 && ri >= 0) return mi - ri;
              if (mi >= 0) return -1;
              if (ri >= 0) return 1;
            }
            return (timeToMin_(m.rec.start || m.s.startStr) || 0) - (timeToMin_(re.rec.start || re.s.startStr) || 0)
          });
        if (!bkShowPast && u === nowStr) {
          c = c.filter(function(m) {
            var endM = timeToMin_(m.rec.end || m.s.endStr);
            if (endM == null) return true;
            return (endM + 1) > nowMin;
          });
        }
        var unused_ = 0,
          T = function(m) {
            return timeToMin_(m.rec.start || m.s.startStr)
          },
          B = function(m) {
            var re = timeToMin_(m.rec.end || m.s.endStr);
            if (re == null) {
              var ge = T(m);
              re = ge != null ? ge + (m.s.duration || 60) : null
            }
            return re
          },
          j = [],
          H = null,
          clashSet = new Set();
        // Detect clashes: any two shows on same day with overlapping times
        for (var ci = 0; ci < c.length; ci++) {
          for (var cj = ci + 1; cj < c.length; cj++) {
            var si = T(c[ci]), ei = B(c[ci]), sj = T(c[cj]), ej = B(c[cj]);
            if (si != null && sj != null && ei != null && ej != null && si < ej && sj < ei) {
              clashSet.add(ci); clashSet.add(cj);
            }
          }
        }
        return c.forEach(function(m, re) {
          var ge = T(m),
            ke = function(z) {
              if (z == null) return {
                k: "tbc",
                label: "Time TBC",
                ic: "\u{1F550}"
              };
              var L = Math.floor(z % 1440 / 60);
              return L < 12 ? {
                k: "morning",
                label: "Morning",
                ic: "\u{1F305}"
              } : L < 17 ? {
                k: "afternoon",
                label: "Afternoon",
                ic: "\u2600\uFE0F"
              } : L < 22 ? {
                k: "evening",
                label: "Evening",
                ic: "\u{1F306}"
              } : {
                k: "late",
                label: "Late",
                ic: "\u{1F319}"
              }
            }(ge);
          ke.k !== H && (H = ke.k, j.push(React.createElement("div", {
            key: "tod" + re,
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "8px 2px 2px"
            }
          }, React.createElement("span", {
            style: {
              fontSize: 14
            }
          }, ke.ic), React.createElement("span", {
            style: {
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: C.txt3
            }
          }, ke.label), React.createElement("span", {
            style: {
              flex: 1,
              height: 1,
              background: C.border
            }
          }))));
          var he = [m.s.venueAddr, m.s.venuePostcode].filter(Boolean).join(", ");
          var shareKey = m.code + "|" + m.rec.date + "|" + m.bIdx;
          var _menuKey = m.code + "|" + m.bIdx;
          var _menuOpen = bkMenuOpen === _menuKey;
          // Travel time warning between consecutive shows
          if (re > 0) {
            var prevM = c[re - 1];
            var prevEnd = B(prevM);
            var curStart = T(m);
            if (prevEnd != null && curStart != null && prevM.s.venue && m.s.venue && venueLabel_(prevM.s) !== venueLabel_(m.s)) {
              var _wm = walkMin_(prevM.s, m.s);
              if (_wm != null && _wm > 0) {
                var gapMin = curStart - prevEnd;
                var tight = gapMin < _wm;
                var ok = gapMin >= _wm + 10;
                j.push(React.createElement("div", {
                  key: "travel-" + re,
                  style: { display: "flex", alignItems: "center", gap: 8, margin: "2px 8px", padding: "4px 10px", borderRadius: 8, background: tight ? "rgba(248,113,113,0.08)" : ok ? "transparent" : "rgba(251,191,36,0.08)", fontSize: 11, color: tight ? "#F87171" : ok ? C.txt3 : "#fbbf24" }
                },
                  React.createElement("span", null, tight ? "⚠️" : ok ? "🚶" : "⏱️"),
                  React.createElement("span", null, _wm + " min walk to " + (m.s.venue || "next venue")),
                  tight ? React.createElement("span", { style: { fontWeight: 700 } }, " — only " + gapMin + " min gap!") : !ok ? React.createElement("span", null, " — " + gapMin + " min gap") : null
                ));
              }
            }
          }
          if (j.push(React.createElement("div", {
              key: m.code + "|" + m.bIdx,
              draggable: !shareMode && c.length > 1,
              onDragStart: function(ev) { setBkDragIdx(re); setBkDragDate(u); ev.dataTransfer.effectAllowed = "move"; },
              onDragOver: function(ev) { ev.preventDefault(); if (bkDragDate === u) setBkDragOverIdx(re); },
              onDragEnd: function() { setBkDragIdx(null); setBkDragOverIdx(null); setBkDragDate(null); },
              onDrop: function(ev) {
                ev.preventDefault();
                if (bkDragDate !== u || bkDragIdx == null || bkDragIdx === re) return;
                var keys = c.map(function(x) { return x.code + "|" + x.bIdx; });
                var moved = keys.splice(bkDragIdx, 1)[0];
                keys.splice(re, 0, moved);
                setBkDayOrder(function(prev) { var next = Object.assign({}, prev); next[u] = keys; return next; });
                setBkDragIdx(null); setBkDragOverIdx(null); setBkDragDate(null);
              },
              style: {
                display: "flex",
                flexDirection: _menuOpen ? "column" : "row",
                flexWrap: "nowrap",
                gap: _menuOpen ? 0 : 10,
                padding: "11px 13px",
                borderRadius: 10,
                background: shareMode && shareSel.has(shareKey) ? "rgba(168,85,247,0.12)" : C.card,
                border: "1px solid " + (clashSet.has(re) ? "rgba(248,113,113,0.5)" : shareMode && shareSel.has(shareKey) ? "rgba(168,85,247,0.4)" : bkDragDate === u && bkDragOverIdx === re ? "2px solid var(--accent)" : C.border),
                borderLeft: "4px solid " + (clashSet.has(re) ? "#F87171" : orgColor(m.s.venue)),
                overflow: "visible",
                position: "relative",
                opacity: bkDragDate === u && bkDragIdx === re ? 0.5 : 1,
                transition: "border 0.15s, opacity 0.15s",
                cursor: !shareMode && c.length > 1 ? "grab" : undefined
              }
            }, React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden", flex: 1 } }, shareMode && React.createElement("input", {
              type: "checkbox",
              checked: shareSel.has(shareKey),
              onChange: function() {
                setShareSel(function(prev) {
                  var next = new Set(prev);
                  next.has(shareKey) ? next.delete(shareKey) : next.add(shareKey);
                  return next;
                });
              },
              style: { width: 18, height: 18, accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }
            }), React.createElement("div", {
              onClick: function() {
                de(m.s)
              },
              style: {
                flex: 1,
                minWidth: 0,
                cursor: "pointer"
              }
            }, React.createElement("div", {
              style: {
                fontWeight: 800,
                fontSize: V ? undefined : 16,
                wordBreak: "break-word"
              }
            }, m.s.title), React.createElement("div", {
              style: {
                fontSize: V ? 12 : 14,
                color: C.txt2,
                wordBreak: "break-word"
              }
            }, "\u{1F550} ", m.rec.start || m.s.startStr || "?", m.rec.end || m.s.endStr ? "\u2013" + (m.rec.end || m.s.endStr) : ""), React.createElement("a", {
              href: mapsUrl(m.s),
              target: "_blank",
              rel: "noopener noreferrer",
              onClick: function(z) {
                z.stopPropagation()
              },
              "aria-label": venueLabel_(m.s) + " on Google Maps (opens in a new tab)",
              style: {
                display: "block",
                fontSize: 11,
                color: C.accent,
                marginTop: 2,
                textDecoration: "none",
                wordBreak: "break-word"
              }
            }, "\u{1F4CD} ", React.createElement("strong", null, m.rec.venue || venueLabel_(m.s), !m.rec.venue && m.s.venueCode ? " (#" + m.s.venueCode + ")" : ""), m.rec.venue ? "" : (he ? " \xB7 " + he + " \u2197" : ""), m.rec.venue ? React.createElement("span", {style: {color: "#fbbf24", fontSize: 10, marginLeft: 4}}, "(edited)") : ""),
            clashSet.has(re) && React.createElement("div", {
              style: { fontSize: 11, color: "#F87171", marginTop: 2, display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }
            }, "⚠️ Clash — overlaps with another booking"),
            function() {
              void clockTick; // depend on tick
              var st = T(m);
              if (st == null || !m.rec.date) return null;
              var showDate = new Date(m.rec.date + "T00:00:00");
              var now = new Date();
              var todayD = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
              var nowM = now.getHours() * 60 + now.getMinutes();
              if (m.rec.date < todayD) return null; // past
              var en = B(m);
              if (m.rec.date === todayD && en != null && en <= nowM) return null; // ended
              if (m.rec.date === todayD && st <= nowM) {
                return React.createElement("div", {
                  style: { fontSize: 11, color: "#34d399", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, animation: "pulse 2s infinite" }
                }, "🟢 Happening now!");
              }
              // Calculate minutes until start
              var diffMs;
              if (m.rec.date === todayD) {
                diffMs = (st - nowM) * 60000;
              } else {
                var target = new Date(m.rec.date + "T00:00:00");
                target.setMinutes(st);
                diffMs = target.getTime() - now.getTime();
              }
              if (diffMs <= 0) return null;
              var totalMin = Math.floor(diffMs / 60000);
              var days = Math.floor(totalMin / 1440);
              var hrs = Math.floor((totalMin % 1440) / 60);
              var mins = totalMin % 60;
              var label = days > 0 ? days + "d " + hrs + "h" : hrs > 0 ? hrs + "h " + mins + "m" : mins + "m";
              var urgent = totalMin <= 30;
              var soon = totalMin <= 120;
              return React.createElement("div", {
                style: { fontSize: 11, color: urgent ? "#F87171" : soon ? "#fbbf24" : "#60a5fa", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 700, animation: urgent ? "pulse 1.5s infinite" : "none" }
              }, urgent ? "🔴" : soon ? "🟡" : "🔵", " Starts in " + label);
            }(),
            !m.rec.venue && multiVenueWarnings[(m.s.title || "").toLowerCase().trim()] && React.createElement("div", {
              style: { fontSize: 10, color: "#fbbf24", marginTop: 2, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" },
              title: "This show performs at multiple venues: " + multiVenueWarnings[(m.s.title || "").toLowerCase().trim()].join(", ") + ". Tap the show to set the correct venue for this booking.",
              onClick: function(z) { z.stopPropagation(); de(m.s); }
            }, "\u26a0\ufe0f This show has ", multiVenueWarnings[(m.s.title || "").toLowerCase().trim()].length, " venues \u2014 check yours is correct"),
            m.s.venue && venueNotes[m.s.venue] && React.createElement("div", {
              style: { fontSize: 10, color: "#FBBF24", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }
            }, "\ud83d\udcdd ", venueNotes[m.s.venue].trim()),
            showTickets[m.code] && showTickets[m.code].length > 0 && React.createElement("div", {
              style: { display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap", alignItems: "center" }
            }, React.createElement("span", { style: { fontSize: 10, color: C.txt3, marginRight: 2 } }, "🎫"),
            showTickets[m.code].slice(0, 2).map(function(tk, ti) {
              return React.createElement("img", {
                key: ti,
                src: tk,
                onClick: function(ev) { ev.stopPropagation(); de(m.s); },
                style: { width: 48, height: 32, borderRadius: 4, objectFit: "cover", cursor: "pointer", border: "1px solid " + C.border }
              });
            }), showTickets[m.code].length > 2 && React.createElement("span", {
              style: { fontSize: 10, color: C.txt3, alignSelf: "center" }
            }, "+" + (showTickets[m.code].length - 2) + " more"))
            ), function() {
              var btnS = {width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, cursor: "pointer", padding: 0};
              var allBtns = [
                React.createElement("button", {
                  key: "edit-bk",
                  onClick: function() { Be(m.s); },
                  "aria-label": "Edit booking",
                  title: "Edit booking date/time",
                  style: Object.assign({}, btnS, {border: "1px solid #f472b6", background: "rgba(244,114,182,0.18)", color: "#f472b6"})
                }, "\u{1F3AB}"),
                React.createElement("div", {
                  key: "rate",
                  style: {position: "relative", display: "inline-flex", alignItems: "center"}
                }, React.createElement("button", {
                  onClick: function(ev) { ev.stopPropagation(); setRatingPopup(ratingPopup === m.code ? null : m.code); },
                  "aria-label": ratings[m.code] ? "Rating: " + ratings[m.code] + "/5" : "Rate this show",
                  title: ratings[m.code] ? ratings[m.code] + "/5 \u2014 click to change" : "Rate this show",
                  style: Object.assign({}, btnS, {fontSize: 15, color: ratings[m.code] ? "#FBBF24" : C.txt3, background: ratingPopup === m.code ? "rgba(251,191,36,0.15)" : "transparent", border: "1px solid " + (ratings[m.code] ? "rgba(251,191,36,0.4)" : C.border)})
                }, ratings[m.code] ? "\u2605" : "\u2606", ratings[m.code] ? React.createElement("span", {style: {fontSize: 9, marginLeft: 1, fontWeight: 800}}, ratings[m.code]) : null),
                ratingPopup === m.code && React.createElement("div", {
                  style: {position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "4px 6px", display: "flex", gap: 1, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.4)"}
                }, [1,2,3,4,5].map(function(star) {
                  return React.createElement("button", {
                    key: star,
                    onClick: function(ev) { ev.stopPropagation(); setRatings(function(prev) { var next = Object.assign({}, prev); if (ratings[m.code] === star) delete next[m.code]; else next[m.code] = star; return next; }); setRatingPopup(null); },
                    style: {width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: star <= (ratings[m.code] || 0) ? "#FBBF24" : C.txt3, padding: 0}
                  }, star <= (ratings[m.code] || 0) ? "\u2605" : "\u2606");
                }))),
                m.rec.date ? React.createElement("button", {
                  key: "ics",
                  onClick: function() { downloadICS_(m.s, m.rec); },
                  "aria-label": "Add to Apple Calendar",
                  title: "Apple Calendar (.ics)",
                  style: Object.assign({}, btnS, {border: "1px solid #FF3B30", background: "rgba(255,59,48,0.12)", color: "#FF3B30"})
                }, React.createElement("svg", {width:16,height:16,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg"}, React.createElement("rect", {x:2,y:4,width:20,height:18,rx:3,fill:"#FF3B30"}), React.createElement("rect", {x:4,y:10,width:16,height:10,rx:1,fill:"white"}), React.createElement("rect", {x:7,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("rect", {x:15,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("text", {x:12,y:18,textAnchor:"middle",fontSize:8,fontWeight:900,fill:"#FF3B30"}, "A"))) : null,
                m.rec.date ? React.createElement("a", {
                  key: "gcal",
                  href: gcalUrl_(m.s, m.rec), target: "_blank", rel: "noopener noreferrer",
                  "aria-label": "Add to Google Calendar",
                  title: "Google Calendar",
                  style: Object.assign({}, btnS, {textDecoration: "none", border: "1px solid #4285F4", background: "rgba(66,133,244,0.12)", color: "#4285F4"})
                }, React.createElement("svg", {width:16,height:16,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg"}, React.createElement("rect", {x:2,y:4,width:20,height:18,rx:3,fill:"#4285F4"}), React.createElement("rect", {x:4,y:10,width:16,height:10,rx:1,fill:"white"}), React.createElement("rect", {x:7,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("rect", {x:15,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("text", {x:12,y:18,textAnchor:"middle",fontSize:8,fontWeight:900,fill:"#4285F4"}, "G"))) : null,
                React.createElement("button", {
                  key: "wish",
                  onClick: function() { Se(m.code); },
                  "aria-label": d.has(m.code) ? "Remove from wishlist" : "Add to wishlist",
                  title: d.has(m.code) ? "On your wishlist" : "Add to wishlist",
                  style: Object.assign({}, btnS, {border: "1px solid " + (d.has(m.code) ? "#34d399" : C.border), background: d.has(m.code) ? "rgba(52,211,153,0.16)" : "transparent", color: d.has(m.code) ? "#34d399" : C.txt2})
                }, d.has(m.code) ? "🪄" : "🪄"),
                m.s.website ? React.createElement("a", {
                  key: "web",
                  href: m.s.website, target: "_blank", rel: "noopener noreferrer",
                  title: "View on edfringe.com",
                  style: Object.assign({}, btnS, {textDecoration: "none", border: "1px solid " + C.border, color: C.txt2})
                }, React.createElement("svg", {width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}, React.createElement("circle", {cx:12,cy:12,r:10}), React.createElement("path", {d:"M2 12h20"}), React.createElement("path", {d:"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"}))) : null,
                React.createElement("button", {
                  key: "review",
                  onClick: function() { de(m.s); },
                  "aria-label": (se[m.code] ? "Edit" : "Add") + " review or notes",
                  title: se[m.code] ? "Edit review / notes" : "Add review / notes",
                  style: Object.assign({}, btnS, {border: "1px solid " + (se[m.code] ? "#fbbf24" : C.border), background: se[m.code] ? "rgba(251,191,36,0.15)" : "transparent", color: se[m.code] ? "#fbbf24" : C.txt2, fontSize: 14})
                }, "\u270f\ufe0f"),
                V && X.length > 0 && React.createElement("select", {
                  key: "prop",
                  value: "",
                  onChange: function(z) { z.target.value && wt(z.target.value, m.code); },
                  "aria-label": "Add to a proposal",
                  title: "Add to a proposal",
                  style: Object.assign({}, btnS, {textAlign: "center", textAlignLast: "center", fontSize: 14, colorScheme: THEME === "light" ? "light" : "dark", appearance: "none", WebkitAppearance: "none", MozAppearance: "none"})
                }, React.createElement("option", {value: ""}, "\u{1F4CB}"), X.map(function(z) { return React.createElement("option", {key: z.id, value: z.id}, z.title || "Untitled"); }), React.createElement("option", {value: "__new"}, "\uFF0B New")),
                React.createElement("button", {
                  key: "del",
                  onClick: function() { de(m.s); setBkMenuOpen(null); },
                  "aria-label": "Delete booking",
                  title: "Delete booking",
                  style: Object.assign({}, btnS, {border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#f87171"})
                }, "\u2715")
              ].filter(Boolean);
              if (V) {
                return React.createElement("div", {
                  style: { display: "flex", gap: 4, alignItems: "center", flexShrink: 0, marginLeft: "auto" }
                }, React.createElement("button", {
                  onClick: function() { setBkMenuOpen(_menuOpen ? null : _menuKey); },
                  "aria-label": _menuOpen ? "Close actions" : "More actions",
                  title: _menuOpen ? "Close actions" : "More actions",
                  style: Object.assign({}, btnS, {fontSize: 16, fontWeight: 900, letterSpacing: 1})
                }, _menuOpen ? "\u2715" : "\u22EF"));
              }
              return React.createElement("div", {
                style: { display: "flex", gap: 3, alignItems: "center", flexShrink: 0, flexWrap: "wrap", marginLeft: "auto", justifyContent: "flex-end" }
              }, allBtns);
            }()),
            V && _menuOpen && React.createElement("div", {
              style: { display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap", paddingTop: 8, marginTop: 8, borderTop: "1px solid " + C.border }
            }, function() {
              var btnS = {width: 32, height: 32, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 13, cursor: "pointer", padding: 0};
              return [
                React.createElement("button", { key: "edit-bk", onClick: function() { Be(m.s); }, "aria-label": "Edit booking", title: "Edit booking date/time", style: Object.assign({}, btnS, {border: "1px solid #f472b6", background: "rgba(244,114,182,0.18)", color: "#f472b6"}) }, "\u{1F3AB}"),
                React.createElement("div", { key: "rate", style: {position: "relative", display: "inline-flex", alignItems: "center"} }, React.createElement("button", { onClick: function(ev) { ev.stopPropagation(); setRatingPopup(ratingPopup === m.code ? null : m.code); }, "aria-label": ratings[m.code] ? ratings[m.code] + "/5" : "Rate", title: ratings[m.code] ? ratings[m.code] + "/5 \u2014 tap to change" : "Rate this show", style: Object.assign({}, btnS, {fontSize: 15, color: ratings[m.code] ? "#FBBF24" : C.txt3, background: ratingPopup === m.code ? "rgba(251,191,36,0.15)" : "transparent", border: "1px solid " + (ratings[m.code] ? "rgba(251,191,36,0.4)" : C.border)}) }, ratings[m.code] ? "\u2605" : "\u2606", ratings[m.code] ? React.createElement("span", {style: {fontSize: 9, marginLeft: 1, fontWeight: 800}}, ratings[m.code]) : null), ratingPopup === m.code && React.createElement("div", { style: {position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: "4px 6px", display: "flex", gap: 1, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.4)"} }, [1,2,3,4,5].map(function(star) { return React.createElement("button", { key: star, onClick: function(ev) { ev.stopPropagation(); setRatings(function(prev) { var next = Object.assign({}, prev); if (ratings[m.code] === star) delete next[m.code]; else next[m.code] = star; return next; }); setRatingPopup(null); }, style: {width: 28, height: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", fontSize: 16, color: star <= (ratings[m.code] || 0) ? "#FBBF24" : C.txt3, padding: 0} }, star <= (ratings[m.code] || 0) ? "\u2605" : "\u2606"); }))),
                React.createElement("button", { key: "wish", onClick: function() { Se(m.code); }, "aria-label": d.has(m.code) ? "Remove from wishlist" : "Add to wishlist", title: d.has(m.code) ? "On your wishlist" : "Add to wishlist", style: Object.assign({}, btnS, {border: "1px solid " + (d.has(m.code) ? "#34d399" : C.border), background: d.has(m.code) ? "rgba(52,211,153,0.16)" : "transparent", color: d.has(m.code) ? "#34d399" : C.txt2}) }, d.has(m.code) ? "🪄" : "🪄"),
                V && X.length > 0 && React.createElement("select", { key: "prop", value: "", onChange: function(z) { z.target.value && wt(z.target.value, m.code); }, "aria-label": "Add to a proposal", title: "Add to a proposal", style: Object.assign({}, btnS, {textAlign: "center", textAlignLast: "center", fontSize: 14, colorScheme: THEME === "light" ? "light" : "dark", appearance: "none", WebkitAppearance: "none", MozAppearance: "none"}) }, React.createElement("option", {value: ""}, "\u{1F4CB}"), X.map(function(z) { return React.createElement("option", {key: z.id, value: z.id}, z.title || "Untitled"); }), React.createElement("option", {value: "__new"}, "\uFF0B New")),
                m.s.website ? React.createElement("a", { key: "web", href: m.s.website, target: "_blank", rel: "noopener noreferrer", title: "View on edfringe.com", style: Object.assign({}, btnS, {textDecoration: "none", border: "1px solid " + C.border, color: C.txt2}) }, React.createElement("svg", {width:15,height:15,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"}, React.createElement("circle", {cx:12,cy:12,r:10}), React.createElement("path", {d:"M2 12h20"}), React.createElement("path", {d:"M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"}))) : null,
                m.rec.date ? React.createElement("button", { key: "ics", onClick: function() { downloadICS_(m.s, m.rec); }, "aria-label": "Add to Apple Calendar", title: "Apple Calendar (.ics)", style: Object.assign({}, btnS, {border: "1px solid #FF3B30", background: "rgba(255,59,48,0.12)", color: "#FF3B30"}) }, React.createElement("svg", {width:16,height:16,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg"}, React.createElement("rect", {x:2,y:4,width:20,height:18,rx:3,fill:"#FF3B30"}), React.createElement("rect", {x:4,y:10,width:16,height:10,rx:1,fill:"white"}), React.createElement("rect", {x:7,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("rect", {x:15,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("text", {x:12,y:18,textAnchor:"middle",fontSize:8,fontWeight:900,fill:"#FF3B30"}, "A"))) : null,
                m.rec.date ? React.createElement("a", { key: "gcal", href: gcalUrl_(m.s, m.rec), target: "_blank", rel: "noopener noreferrer", "aria-label": "Add to Google Calendar", title: "Google Calendar", style: Object.assign({}, btnS, {textDecoration: "none", border: "1px solid #4285F4", background: "rgba(66,133,244,0.12)", color: "#4285F4"}) }, React.createElement("svg", {width:16,height:16,viewBox:"0 0 24 24",fill:"none",xmlns:"http://www.w3.org/2000/svg"}, React.createElement("rect", {x:2,y:4,width:20,height:18,rx:3,fill:"#4285F4"}), React.createElement("rect", {x:4,y:10,width:16,height:10,rx:1,fill:"white"}), React.createElement("rect", {x:7,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("rect", {x:15,y:1,width:2,height:5,rx:1,fill:C.txt2}), React.createElement("text", {x:12,y:18,textAnchor:"middle",fontSize:8,fontWeight:900,fill:"#4285F4"}, "G"))) : null,
                React.createElement("button", { key: "del", onClick: function() { de(m.s); setBkMenuOpen(null); }, "aria-label": "Edit booking details", title: "Edit booking details", style: Object.assign({}, btnS, {border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.1)", color: "#f87171"}) }, "\u2715")
              ].filter(Boolean);
            }()))), re < c.length - 1) {
            var ve = B(m),
              Ce = T(c[re + 1]),
              Fe = walkMin_(m.s, c[re + 1].s),
              ze = (Fe || 0) + 30;
            if (ve != null && Ce != null) {
              var le = Ce - ve,
                je = le >= ze;
              j.push(React.createElement("div", {
                key: "gap" + re,
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "1px 14px",
                  fontSize: 11,
                  fontWeight: 800,
                  color: je ? "#22c55e" : "#f87171"
                }
              }, React.createElement("span", {
                style: {
                  fontSize: 13,
                  lineHeight: 1
                }
              }, "\u2195"), React.createElement("span", null, le < 0 ? "Overlaps by " + -le + " min" : le + " min between shows", Fe != null ? " \xB7 \u{1F6B6} " + Fe + "m to next venue" : "", je ? " \xB7 \u2713 comfortable" : " \xB7 \u26A0 tight (needs " + ze + "m)")))
            }
          }
        }), j
      }()))
    })))
  }(), Q === "calendar" && function() {
    var e = {};
    (n || []).forEach(function(F) {
      e[F.code] = F
    });
    var r = function(F) {
        var P = [];
        return mapFilterCalOK("booked", E) && Object.keys(p).forEach(function(Z) {
          var ie = e[Z];
          ie && (p[Z] || []).forEach(function(N) {
            N.date === F && P.push(Object.assign({}, ie, {
              startStr: N.start || ie.startStr,
              endStr: N.end || ie.endStr,
              wish: !1
            }))
          })
        }), mapFilterCalOK("wishlist", E) && Object.keys(y).forEach(function(Z) {
          var N = e[Z];
          N && y[Z] === F && P.push(Object.assign({}, N, {
            wish: !0
          }))
        }), P.sort(function(Z, N) {
          return (timeToMin_(Z.startStr) || 0) - (timeToMin_(N.startStr) || 0)
        }), P
      },
      l = function(F) {
        var P = new Date(f + "T12:00:00");
        P.setDate(P.getDate() + F * (O === "week" ? 7 : 1)), R(P.toISOString().slice(0, 10))
      },
      i = {
        padding: "7px 11px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 16,
        cursor: "pointer",
        lineHeight: 1
      },
      u = function(F, P) {
        return React.createElement("button", {
          key: F,
          onClick: function() {
            U(F)
          },
          style: {
            padding: "6px 11px",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 800,
            background: E === F ? C.accent : "transparent",
            color: E === F ? "#fff" : C.txt2
          }
        }, P)
      },
      c = function(F, P) {
        return React.createElement("button", {
          key: F,
          onClick: function() {
            M(F)
          },
          style: {
            padding: "6px 12px",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 800,
            background: O === F ? C.accent : "transparent",
            color: O === F ? "#fff" : C.txt2
          }
        }, P)
      },
      T = new Date(f + "T12:00:00"),
      B = (T.getDay() + 6) % 7,
      j = new Date(T);
    j.setDate(T.getDate() - B);
    for (var H = [], m = 0; m < 7; m++) {
      var re = new Date(j);
      re.setDate(j.getDate() + m), H.push(re.getFullYear() + "-" + ("0" + (re.getMonth() + 1)).slice(-2) + "-" + ("0" + re.getDate()).slice(-2))
    }
    var _td = new Date(), ge = _td.getFullYear() + "-" + ("0" + (_td.getMonth() + 1)).slice(-2) + "-" + ("0" + _td.getDate()).slice(-2),
      ke = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      he = O === "day" ? [f] : H,
      ve = function(F) {
        var P = timeToMin_(F);
        return P == null ? null : (P < 300 && (P += 1440), P)
      },
      Ce = [],
      Fe = [];
    he.forEach(function(F) {
      r(F).forEach(function(P) {
        var Z = ve(P.startStr);
        if (Z != null) {
          Ce.push(Z);
          var N = ve(P.endStr);
          (N == null || N <= Z) && (N = Z + (P.duration || 60)), Fe.push(N)
        }
      })
    });
    var ze = V ? 120 : 100,
      le, je;
    // Always span the full day (6am to 4am next day) so calendar shows everything
    le = 360; je = 1680;
    // But expand if any shows fall outside that range
    if (Ce.length) {
      var showMin = Math.floor((Math.min.apply(null, Ce) - 30) / 60) * 60;
      var showMax = Math.ceil((Math.max.apply(null, Fe) + 30) / 60) * 60;
      if (showMin < le) le = showMin;
      if (showMax > je) je = showMax;
    }
    var z = je - le,
      L = z / 60 * ze,
      ce = Math.round(z / 30),
      be = V ? 86 : 0,
      Ot = he.length > 1 ? 48 + he.length * (V ? 86 : 96) : void 0,
      calScrollCb = function(el) {
        if (!el) return;
        var now = new Date();
        var _td2 = now.getFullYear() + "-" + ("0" + (now.getMonth() + 1)).slice(-2) + "-" + ("0" + now.getDate()).slice(-2);
        var nowMin = now.getHours() * 60 + now.getMinutes();
        if (nowMin < 300) nowMin += 1440;
        var targetMin = Math.max(le, Math.min(nowMin - 30, je));
        function doScroll() {
          if (calOrient === "v") {
            var pxPerMin = 60 / 30;
            el.scrollLeft = Math.max(0, (targetMin - le) * pxPerMin);
          } else {
            var pxPerMin2 = ze / 60;
            el.scrollTop = Math.max(0, (targetMin - le) * pxPerMin2);
          }
          if (O === "week" && calOrient !== "v") {
            var todayIdx = he.indexOf(_td2);
            if (todayIdx >= 0) {
              var colWidth = Math.max(be, (el.scrollWidth - 48) / he.length);
              var colCenter = 48 + todayIdx * colWidth + colWidth / 2;
              el.scrollLeft = Math.max(0, colCenter - el.clientWidth / 2);
            }
          }
        }
        requestAnimationFrame(function() { doScroll(); });
        setTimeout(doScroll, 150);
        setTimeout(doScroll, 400);
      };
    return React.createElement("div", null, React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: V ? "column" : "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 0,
        flexWrap: "wrap",
        position: "sticky",
        top: 52,
        zIndex: 25,
        background: C.bg,
        paddingBottom: 10,
        paddingTop: 6
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: V ? "100%" : void 0
      }
    }, React.createElement("button", {
      onClick: function() {
        l(-1)
      },
      style: i
    }, "\u2039"), V ? React.createElement("div", {
      style: {
        flex: 1,
        textAlign: "center",
        fontSize: 15,
        fontWeight: 800,
        color: C.txt
      }
    }, O === "day" ? ke[(new Date(f + "T12:00:00").getDay() + 6) % 7] + " " + dateRange(f, f) : dateRange(H[0], H[H.length - 1])) : React.createElement(React.Fragment, null, React.createElement("input", {
      "aria-label": "Jump to date",
      type: "date",
      value: f,
      onChange: function(F) {
        R(F.target.value)
      },
      style: {
        padding: "8px 10px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 14,
        colorScheme: THEME === "light" ? "light" : "dark"
      }
    }), React.createElement("span", {
      style: {
        fontSize: 15,
        fontWeight: 800,
        color: C.txt,
        marginLeft: 8
      }
    }, O === "day" ? ke[(new Date(f + "T12:00:00").getDay() + 6) % 7] + " " + dateRange(f, f) : dateRange(H[0], H[H.length - 1]))), React.createElement("button", {
      onClick: function() {
        l(1)
      },
      style: i
    }, "\u203A"), React.createElement("button", {
      onClick: function() {
        var _t = new Date(); R(_t.getFullYear() + "-" + ("0" + (_t.getMonth() + 1)).slice(-2) + "-" + ("0" + _t.getDate()).slice(-2));
      },
      style: {
        padding: "7px 11px",
        borderRadius: 10,
        border: f === ge ? "1px solid " + C.accent : "1px solid " + C.border,
        background: f === ge ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.06)",
        color: f === ge ? "#c084fc" : C.txt,
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        lineHeight: 1
      }
    }, "Today"), O === "day" && weatherData && weatherData[f] && React.createElement("span", {
      title: weatherData[f].label + " — " + weatherData[f].low + "°/" + weatherData[f].high + "°C, " + weatherData[f].rain + "% rain",
      style: { fontSize: 12, fontWeight: 700, color: C.txt2, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: 4 }
    }, weatherData[f].icon, " ", weatherData[f].high + "°", weatherData[f].rain > 30 ? React.createElement("span", { style: { color: "#60a5fa", fontSize: 11 } }, "💧" + weatherData[f].rain + "%") : null)), React.createElement("div", {
      style: {
        display: "flex",
        gap: V ? 4 : 8,
        flexWrap: "nowrap",
        alignItems: "center"
      }
    }, React.createElement("div", {
      style: {
        display: "inline-flex",
        borderRadius: 8,
        border: "1px solid " + C.border,
        overflow: "hidden"
      }
    }, c("week", "Week"), c("day", "Day")), React.createElement("div", {style: {display: "inline-flex", borderRadius: 8, border: "1px solid " + C.border, overflow: "hidden"}}, React.createElement("button", {onClick: function() { setCalOrient("h"); try { localStorage.setItem("fringe-public-cal-orient", "h"); } catch(e) {} }, style: {padding: "6px 12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: calOrient === "h" ? C.accent : "transparent", color: calOrient === "h" ? "#fff" : C.txt2}}, "\u2550"), React.createElement("button", {onClick: function() { setCalOrient("v"); try { localStorage.setItem("fringe-public-cal-orient", "v"); } catch(e) {} }, style: {padding: "6px 12px", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", background: calOrient === "v" ? C.accent : "transparent", color: calOrient === "v" ? "#fff" : C.txt2}}, "\u2551")), React.createElement("div", {
      style: {
        display: "inline-flex",
        borderRadius: 8,
        border: "1px solid " + C.border,
        overflow: "hidden"
      }
    }, u("all", "All"), u("booked", "\u{1F39F}"), u("wishlist", "🪄")))), calOrient === "v" ? React.createElement("div", null, React.createElement("div", {
      ref: calScrollCb,
      style: {
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        border: "1px solid " + C.border,
        borderRadius: 12,
        maxHeight: V ? "calc(100vh - 250px)" : "none"
      }
    }, React.createElement("div", {
      style: {
        minWidth: (ce + 1) * 60 + 60,
        position: "relative"
      }
    }, React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "60px repeat(" + (ce + 1) + ", 60px)",
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: C.bg,
        borderBottom: "1px solid " + C.border
      }
    }, React.createElement("div", {
      style: {
        position: "sticky",
        left: 0,
        zIndex: 21,
        background: C.bg
      }
    }), Array.from({length: ce + 1}).map(function(F, P) {
      var Z = le + P * 30,
        N = Z >= 1440 ? Z - 1440 : Z,
        ie = P % 2 === 1;
      return React.createElement("div", {
        key: P,
        style: {
          textAlign: "center",
          padding: "6px 2px",
          fontSize: ie ? 9 : 11,
          fontWeight: ie ? 600 : 800,
          color: ie ? C.txt3 : C.txt2,
          whiteSpace: "nowrap"
        }
      }, ie ? ":30" : fmtMin_(N))
    })), he.map(function(F) {
      var P = r(F),
        Z = F === ge,
        dt = new Date(F + "T12:00:00");
      return React.createElement("div", {
        key: F,
        style: {
          display: "grid",
          gridTemplateColumns: "60px repeat(" + (ce + 1) + ", 60px)",
          position: "relative",
          height: 70,
          borderBottom: "1px solid " + C.border,
          background: Z ? "rgba(168,85,247,0.05)" : "transparent"
        }
      }, React.createElement("div", {
        key: "label",
        onClick: function() { R(F); },
        style: {
          position: "sticky",
          left: 0,
          zIndex: 10,
          background: Z ? "rgba(168,85,247,0.1)" : C.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          padding: "4px 0",
          borderRight: "1px solid " + C.border
        }
      }, React.createElement("div", {
        style: { fontSize: 11, fontWeight: 700, color: Z ? "#c084fc" : C.txt3, textTransform: "uppercase", letterSpacing: .5 }
      }, ke[(dt.getDay() + 6) % 7]), React.createElement("div", {
        style: { fontSize: 18, fontWeight: 800, lineHeight: 1.3, color: Z ? "#c084fc" : C.txt }
      }, dt.getDate())), React.createElement("div", {
        style: {
          gridColumn: "2 / -1",
          position: "relative",
          height: 70
        }
      }, Array.from({length: ce}).map(function(N, ie) {
        return React.createElement("div", {
          key: ie,
          style: {
            position: "absolute",
            left: ie * 60,
            top: 0,
            bottom: 0,
            width: 1,
            background: C.border, opacity: ie % 2 === 0 ? 0.35 : 0.15
          }
        })
      }), P.map(function(N, ie) {
        var rt = ve(N.startStr);
        if (rt == null) return null;
        var St = ve(N.endStr);
        (St == null || St <= rt) && (St = rt + (N.duration || 60));
        var leftPos = (rt - le) / 30 * 60,
          widthPx = Math.max(40, (St - rt) / 30 * 60 - 2),
          sn = orgColor(N.venue);
        return React.createElement("div", {
          key: ie,
          onClick: function() { de(N); },
          title: N.title,
          style: {
            position: "absolute",
            left: leftPos,
            top: 2,
            bottom: 2,
            width: widthPx,
            background: N.wish ? "transparent" : sn,
            border: N.wish ? "2px dashed " + sn : "none",
            borderRadius: 8,
            padding: "3px 6px",
            cursor: "pointer",
            overflow: "hidden",
            zIndex: 3,
            color: N.wish ? C.txt : "#fff",
            opacity: N.wish ? .9 : 1,
            boxShadow: N.wish ? "none" : "0 2px 8px rgba(0,0,0,0.3)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center"
          }
        }, React.createElement("div", {
          style: { fontWeight: 700, fontSize: 11, lineHeight: 1.2, textShadow: N.wish ? "none" : "0 1px 2px rgba(0,0,0,0.35)", overflow: "hidden", wordBreak: "break-word" }
        }, N.title), N.artist && React.createElement("div", {
          style: { fontSize: 9, opacity: .8, overflow: "hidden", wordBreak: "break-word" }
        }, N.artist), N.venue && React.createElement("div", {
          style: { fontSize: 9, opacity: .92, marginTop: 1, overflow: "hidden", wordBreak: "break-word" }
        }, "\u{1F4CD} ", venueLabel_(N)))
      }),
      // Now time indicator line (vertical/horizontal-scroll calendar)
      F === ge && function() {
        var _now = new Date();
        var _nm = _now.getHours() * 60 + _now.getMinutes();
        if (_nm < 300) _nm += 1440;
        if (_nm < le || _nm > je) return null;
        var _left = (_nm - le) / 30 * 60;
        return React.createElement("div", {key: "now-line-v", style: {position: "absolute", left: _left, top: 0, bottom: 0, width: 2, background: "#F87171", zIndex: 15, borderRadius: 1, boxShadow: "0 0 6px rgba(248,113,113,0.5)"}},
          React.createElement("div", {style: {position: "absolute", top: -4, left: -3, width: 8, height: 8, borderRadius: 4, background: "#F87171"}}));
      }())
    )
    }))), React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.txt3,
        marginTop: 8,
        textAlign: "center"
      }
    }, "Solid = booked \xB7 dashed = wishlist \xB7 scroll to see all times \xB7 tap a show for details")) : React.createElement("div", null, React.createElement("div", {
      ref: calScrollCb,
      style: {
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        border: "1px solid " + C.border,
        borderRadius: 12,
        maxHeight: V ? "calc(100vh - 250px)" : "calc(100vh - 200px)"
      }
    }, React.createElement("div", {
      style: {
        minWidth: Ot,
        position: "relative"
      }
    }, React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "48px repeat(" + he.length + ",minmax(" + be + "px,1fr))",
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: C.bg,
        borderBottom: "1px solid " + C.border
      }
    }, React.createElement("div", {
      style: {
        position: "sticky",
        left: 0,
        zIndex: 21,
        background: C.bg
      }
    }), he.map(function(F) {
      var P = new Date(F + "T12:00:00"),
        Z = F === ge;
      return React.createElement("div", {
        key: F,
        onClick: function() {
          R(F)
        },
        style: {
          textAlign: "center",
          padding: "6px 2px",
          cursor: "pointer",
          background: Z ? "rgba(168,85,247,0.15)" : C.bg,
          borderRadius: Z ? "8px 8px 0 0" : 0
        }
      }, React.createElement("div", {
        style: {
          fontSize: 11,
          fontWeight: 700,
          color: Z ? "#c084fc" : C.txt3,
          textTransform: "uppercase",
          letterSpacing: .5
        }
      }, ke[(P.getDay() + 6) % 7]), React.createElement("div", {
        style: {
          fontSize: 18,
          fontWeight: 800,
          lineHeight: 1.3,
          color: Z ? "#c084fc" : C.txt
        }
      }, P.getDate()))
    })), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "48px repeat(" + he.length + ",minmax(" + be + "px,1fr))",
        position: "relative",
        height: L
      }
    }, React.createElement("div", {
      style: {
        position: "sticky",
        left: 0,
        zIndex: 10,
        background: C.bg
      }
    }, Array.from({
      length: ce + 1
    }).map(function(F, P) {
      var Z = le + P * 30,
        N = Z >= 1440 ? Z - 1440 : Z,
        ie = P % 2 === 1;
      return React.createElement("div", {
        key: P,
        style: {
          position: "absolute",
          top: P * (ze / 2) - 7,
          right: 6,
          fontSize: ie ? 9 : 12,
          fontWeight: ie ? 600 : 800,
          color: ie ? C.txt3 : C.txt2,
          lineHeight: 1,
          whiteSpace: "nowrap"
        }
      }, ie ? ":30" : fmtMin_(N))
    })), he.map(function(F) {
      var P = r(F),
        Z = F === ge;
      return React.createElement("div", {
        key: F,
        style: {
          position: "relative",
          borderLeft: "1px solid " + C.border,
          height: L,
          background: Z ? "rgba(168,85,247,0.05)" : "transparent"
        }
      }, Array.from({
        length: ce
      }).map(function(N, ie) {
        return React.createElement("div", {
          key: ie,
          style: {
            position: "absolute",
            top: ie * (ze / 2),
            left: 0,
            right: 0,
            height: 1,
            background: C.border, opacity: ie % 2 === 0 ? 0.35 : 0.15
          }
        })
      }), P.map(function(N, ie) {
        var rt = ve(N.startStr);
        if (rt == null) return null;
        var St = ve(N.endStr);
        (St == null || St <= rt) && (St = rt + (N.duration || 60));
        var jn = (rt - le) / 60 * ze,
          Ln = Math.max(ze * .4, (St - rt) / 60 * ze - 2),
          sn = orgColor(N.venue);
        return React.createElement("div", {
          key: ie,
          onClick: function() {
            de(N)
          },
          title: N.title,
          style: {
            position: "absolute",
            top: jn,
            left: 2,
            right: 2,
            height: Ln,
            background: N.wish ? "transparent" : sn,
            border: N.wish ? "2px dashed " + sn : "none",
            borderRadius: 8,
            padding: "4px 6px",
            cursor: "pointer",
            overflow: "hidden",
            zIndex: 3,
            color: N.wish ? C.txt : "#fff",
            opacity: N.wish ? .9 : 1,
            boxShadow: N.wish ? "none" : "0 2px 8px rgba(0,0,0,0.3)"
          }
        }, React.createElement("div", {
          style: {
            fontWeight: 700,
            fontSize: 12,
            lineHeight: 1.2,
            textShadow: N.wish ? "none" : "0 1px 2px rgba(0,0,0,0.35)"
          }
        }, N.title), N.artist && React.createElement("div", {
          style: {
            fontSize: 10,
            opacity: .8,
            lineHeight: 1.2,
            overflow: "hidden",
            wordBreak: "break-word"
          }
        }, N.artist), N.venue && React.createElement("div", {
          style: {
            fontSize: 10,
            opacity: .92,
            marginTop: 1,
            overflow: "hidden",
            wordBreak: "break-word"
          }
        }, "\u{1F4CD} ", venueLabel_(N)))
      }), P.filter(function(N) {
        return ve(N.startStr) == null
      }).map(function(N, ie) {
        var rt = orgColor(N.venue);
        return React.createElement("div", {
          key: "u" + ie,
          onClick: function() {
            de(N)
          },
          title: N.title + " (time TBC)",
          style: {
            position: "absolute",
            top: 2 + ie * 19,
            left: 2,
            right: 2,
            height: 17,
            background: C.card,
            borderLeft: "3px solid " + rt,
            borderRadius: 4,
            padding: "0 4px",
            fontSize: 9,
            fontWeight: 700,
            color: C.txt2,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            zIndex: 4,
            cursor: "pointer",
            lineHeight: "17px"
          }
        }, N.title)
      }),
      // Now time indicator line
      F === ge && function() {
        var _now = new Date();
        var _nm = _now.getHours() * 60 + _now.getMinutes();
        if (_nm < 300) _nm += 1440;
        if (_nm < le || _nm > je) return null;
        var _top = (_nm - le) / 60 * ze;
        return React.createElement("div", {key: "now-line", style: {position: "absolute", top: _top, left: 0, right: 0, height: 2, background: "#F87171", zIndex: 15, borderRadius: 1, boxShadow: "0 0 6px rgba(248,113,113,0.5)"}},
          React.createElement("div", {style: {position: "absolute", left: -4, top: -3, width: 8, height: 8, borderRadius: 4, background: "#F87171"}}));
      }())
    })))), React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.txt3,
        marginTop: 8,
        textAlign: "center"
      }
    }, "Solid = booked \xB7 dashed = wishlist \xB7 scroll to see all times \xB7 tap a show for details")))
  }(), Q === "proposals" && React.createElement(React.Fragment, null, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      flexWrap: "wrap"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, React.createElement("p", {
    style: {
      fontSize: 13,
      color: C.txt2,
      margin: 0
    }
  }, "Group shows into options to suggest to friends."), X.length > 1 && React.createElement(LayoutToggle, {
    layout: W,
    set: en
  })), React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, X.length > 0 && React.createElement("button", {
    onClick: In,
    style: {
      padding: "9px 14px",
      borderRadius: 12,
      border: "1px solid " + C.border,
      background: "rgba(96,165,250,0.2)",
      color: "#93c5fd",
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      gap: 6
    }
  }, React.createElement(ShareLinkIcon, null), " Share all"), React.createElement("button", {
    onClick: zn,
    style: {
      padding: "9px 14px",
      borderRadius: 12,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontSize: 13,
      fontWeight: 800,
      cursor: "pointer"
    }
  }, React.createElement("span", {style: {fontSize: 17, fontWeight: 900}}, "+"), " Option"))), X.length > 1 && React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 16
    }
  }, X.map(function(e) {
    return React.createElement("button", {
      key: e.id,
      onClick: function() {
        ae(function(l) {
          var i = Object.assign({}, l);
          return i[e.id] = !1, i
        });
        try {
          var r = document.getElementById("prop-" + e.id);
          r && r.scrollIntoView({
            behavior: "smooth",
            block: "start"
          })
        } catch {}
      },
      title: "Jump to " + (e.title || "Untitled"),
      style: {
        padding: "6px 12px",
        borderRadius: 20,
        border: "1px solid " + C.border,
        background: "rgba(168,85,247,0.1)",
        color: "#c084fc",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        maxWidth: 220,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      }
    }, e.title || "Untitled")
  })), X.length === 0 ? React.createElement("div", {
    style: {
      textAlign: "center",
      color: C.txt3,
      fontSize: 15,
      padding: "46px 12px"
    }
  }, "No options yet. Tap ", React.createElement("b", {
    style: {
      color: C.txt2
    }
  }, "+ Option"), ", then use ", React.createElement("b", {
    style: {
      color: C.txt2
    }
  }, "+ Add show"), " to build a day out.") : React.createElement("div", {
    style: W === "horizontal" ? {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
      gap: 16,
      alignItems: "start"
    } : {}
  }, X.map(e => {
    const r = {};
    (n || []).forEach(i => r[i.code] = i);
    const l = e.codes.map(i => r[i]).filter(Boolean).sort(function(i, u) {
      var c = timeToMin_(i.startStr),
        T = timeToMin_(u.startStr);
      return (c ?? 99999) - (T ?? 99999)
    });
    return React.createElement("div", {
      key: e.id,
      id: "prop-" + e.id,
      style: {
        background: C.card,
        border: "1px solid " + C.border,
        borderRadius: 16,
        padding: V ? 10 : 14,
        marginBottom: W === "horizontal" ? 0 : 16,
        scrollMarginTop: 70,
        overflow: "hidden",
        boxSizing: "border-box"
      }
    }, React.createElement("div", {
      style: {
        display: "flex",
        gap: V ? 6 : 8,
        alignItems: "center",
        marginBottom: q[e.id] ? 0 : 12,
        flexWrap: "wrap"
      }
    }, React.createElement("button", {
      onClick: () => Wn(e.id),
      style: {
        padding: "6px",
        border: "none",
        background: "transparent",
        color: C.txt2,
        cursor: "pointer",
        display: "flex",
        flexShrink: 0
      }
    }, React.createElement(ChevronIcon, {
      open: !q[e.id]
    })), React.createElement("input", {
      value: e.title,
      onChange: i => Wt(e.id, {
        title: i.target.value
      }),
      "aria-label": "Option title",
      placeholder: "Title",
      style: {
        flex: V ? "1 1 80px" : "0 1 190px",
        minWidth: 0,
        padding: "7px 10px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 14,
        fontWeight: 700,
        outline: "none"
      }
    }), React.createElement("input", {
      type: "date",
      value: e.date || "",
      title: "Day out",
      "aria-label": "Day out",
      onClick: i => {
        try {
          i.currentTarget.showPicker()
        } catch {}
      },
      onChange: i => {
        var u = i.target.value,
          c = {
            date: u
          };
        if (u && (!e.title || e.title === "New option")) {
          var T = new Date(u + "T12:00:00");
          isNaN(T.getTime()) || (c.title = "Proposed day " + String(T.getDate()).padStart(2, "0") + "/" + String(T.getMonth() + 1).padStart(2, "0") + "/" + T.getFullYear())
        }
        Wt(e.id, c)
      },
      style: {
        flexShrink: 0,
        padding: "6px 8px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 12,
        colorScheme: THEME === "light" ? "light" : "dark",
        cursor: "pointer"
      }
    }), React.createElement("button", {onClick: () => ut(Y.id === e.id ? {id: null, q: ""} : {id: e.id, q: ""}), title: "Add a show", style: {padding: "6px 10px", borderRadius: 10, border: "1px dashed " + C.border, background: Y.id === e.id ? "rgba(168,85,247,0.12)" : "transparent", color: Y.id === e.id ? "#c084fc" : C.txt2, fontSize: 12, fontWeight: 800, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap"}}, Y.id === e.id ? "Done" : "+ Add show"), React.createElement("div", {style: {flex: V ? 0 : 1}}), React.createElement("button", {
      onClick: () => Rn(e),
      title: "Share just this option",
      style: {
        padding: "7px 10px",
        borderRadius: 10,
        border: "none",
        background: "rgba(168,85,247,0.2)",
        color: "#c084fc",
        fontSize: 12,
        fontWeight: 800,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0
      }
    }, React.createElement(ShareThisIcon, null), V ? "" : " Share"), React.createElement("button", {
      onClick: () => Tn(e.id),
      style: {
        padding: "7px 9px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "transparent",
        color: C.txt3,
        fontSize: 13,
        fontWeight: 700,
        cursor: "pointer",
        flexShrink: 0
      }
    }, "\u2715")), !q[e.id] && React.createElement(React.Fragment, null, Y.id === e.id && React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, React.createElement("input", {
      autoFocus: !0,
      value: Y.q,
      onChange: i => ut({
        id: e.id,
        q: i.target.value
      }),
      "aria-label": "Search all shows by name",
      placeholder: "Search all shows by name\u2026",
      style: {
        width: "100%",
        boxSizing: "border-box",
        padding: "9px 11px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 13,
        outline: "none"
      }
    }), React.createElement("div", {
      style: {
        marginTop: 6,
        border: "1px solid " + C.border,
        borderRadius: 10,
        overflow: "hidden",
        maxHeight: 300,
        overflowY: "auto"
      }
    }, Y.q.trim().length < 2 ? React.createElement("div", {
      style: {
        padding: "14px",
        fontSize: 12,
        color: C.txt3,
        textAlign: "center"
      }
    }, "Type at least 2 letters to search all ", (n || []).length.toLocaleString(), " shows. Tap a result to add or remove it.") : function() {
      var i = (n || []).filter(function(u) {
        return u.title.toLowerCase().includes(Y.q.trim().toLowerCase())
      }).slice(0, 20);
      return i.length ? i.map(function(u) {
        var c = e.codes.includes(u.code);
        return React.createElement("div", {
          key: u.code,
          onClick: function() {
            c ? nn(e.id, u.code) : tn(e.id, u.code)
          },
          style: {
            padding: "9px 11px",
            cursor: "pointer",
            fontSize: 13,
            borderTop: "1px solid " + C.border,
            display: "flex",
            alignItems: "center",
            gap: 9,
            background: c ? "rgba(52,211,153,0.12)" : "transparent"
          }
        }, React.createElement("span", {
          style: {
            fontWeight: 800,
            fontSize: 15,
            color: c ? "#34d399" : C.accent,
            flexShrink: 0,
            width: 14,
            textAlign: "center"
          }
        }, c ? "\u2713" : "+"), React.createElement("span", {
          style: {
            flex: 1,
            minWidth: 0
          }
        }, React.createElement("div", {
          style: {
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600
          }
        }, u.startStr ? u.startStr + " \xB7 " : "", u.title), React.createElement("div", {
          style: {
            fontSize: 11,
            color: C.txt3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }
        }, "\u{1F4CD} ", u.venueCode ? "#" + u.venueCode + " " : "", venueLabel_(u), u.duration ? " \xB7 " + u.duration + "m" : "")), priceLabel(showPrice_(u)) ? React.createElement("span", {
          style: {
            flexShrink: 0,
            fontSize: 15,
            fontWeight: 800,
            color: C.txt
          }
        }, priceLabel(showPrice_(u))) : null)
      }) : React.createElement("div", {
        style: {
          padding: "14px",
          fontSize: 12,
          color: C.txt3,
          textAlign: "center"
        }
      }, "No shows match that.")
    }())), l.length > 0 && function() {
      var i = l.map(function(T) {
          var B = timeToMin_(T.startStr);
          if (B == null) return null;
          var j = timeToMin_(T.endStr);
          return B < 360 && (B += 1440), j == null || j <= B ? j = B + (T.duration || 60) : j < 360 && (j += 1440), {
            st: B,
            en: j
          }
        }).filter(Boolean).sort(function(T, B) {
          return T.st - B.st
        }),
        u = l.reduce(function(T, B) {
          return T + (B.duration || 0)
        }, 0),
        c = l.reduce(function(T, B) {
          return T + (typeof B.priceFull == "number" ? B.priceFull : 0)
        }, 0);
      return React.createElement("div", {
        style: {
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: C.txt2,
          marginBottom: 10,
          padding: "8px 11px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 10
        }
      }, i.length ? React.createElement("span", null, "\u23F1 ", fmtMin_(i[0].st), "\u2013", fmtMin_(i[i.length - 1].en)) : React.createElement("span", null, "No timed shows"), u ? React.createElement("span", null, "\xB7 ", Math.floor(u / 60), "h ", u % 60, "m of shows") : null, React.createElement("span", {
        style: {
          color: C.txt,
          fontWeight: 800
        }
      }, "\xB7 \u{1F4B7} \xA3", (Math.round(c * 100) / 100).toString(), " total"))
    }(), l.length > 0 && React.createElement("div", {
      style: {
        marginBottom: 12
      }
    }, React.createElement(TimedDay, {
      items: l,
      onOpen: de
    })), React.createElement("textarea", {
      value: e.comment || "",
      onChange: i => Wt(e.id, {
        comment: i.target.value
      }),
      "aria-label": "Note about this option (optional)",
      placeholder: "Why they'll like it (optional)\u2026",
      rows: 2,
      style: {
        width: "100%",
        boxSizing: "border-box",
        marginTop: 14,
        marginBottom: 12,
        padding: "9px 11px",
        borderRadius: 10,
        border: "1px solid " + C.border,
        background: "rgba(255,255,255,0.06)",
        color: C.txt,
        fontSize: 13,
        outline: "none",
        resize: "vertical",
        fontFamily: "inherit"
      }
    }), l.length > 0 && React.createElement("div", {
      style: {
        marginTop: 12
      }
    }, React.createElement("div", {
      style: {
        fontSize: 11,
        color: C.txt3,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: .5,
        marginBottom: 6
      }
    }, "In this option (", l.length, ")"), React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(138px,1fr))",
        gap: 6
      }
    }, l.map(function(i) {
      var u = orgColor(i.venue);
      return React.createElement("div", {
        key: i.code,
        style: {
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 8px",
          borderRadius: 8,
          background: C.card,
          border: "1px solid " + C.border,
          borderLeft: "3px solid " + u
        }
      }, React.createElement("div", {
        onClick: function() {
          de(i)
        },
        style: {
          flex: 1,
          minWidth: 0,
          cursor: "pointer"
        }
      }, React.createElement("div", {
        style: {
          fontSize: 12,
          fontWeight: 700,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }
      }, i.startStr ? i.startStr + " \xB7 " : "", i.title)), React.createElement("button", {
        onClick: function() {
          nn(e.id, i.code)
        },
        title: "Remove",
        style: {
          background: "none",
          border: "none",
          color: C.txt3,
          fontSize: 13,
          cursor: "pointer",
          flexShrink: 0,
          lineHeight: 1
        }
      }, "\u2715"))
    })))))
  }))), un && React.createElement("div", {
    onClick: () => Ie(!1),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 80,
      display: "flex",
      alignItems: V ? "flex-end" : "flex-start",
      justifyContent: "center"
    }
  }, React.createElement("div", {
    "data-sheetscroll": !0,
    onClick: e => e.stopPropagation(),
    style: {
      background: C.card,
      border: "1px solid " + C.border,
      borderRadius: V ? "18px 18px 0 0" : 16,
      padding: V ? "16px 16px calc(24px + 62px + env(safe-area-inset-bottom))" : "16px 16px 24px",
      width: "100%",
      maxWidth: V ? "100%" : 760,
      margin: V ? 0 : "40px 12px",
      maxHeight: V ? "92vh" : "85vh",
      overflowY: "auto"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }
  }, React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 800
    }
  }, Ze ? "Simple search" : "Filters"), React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, React.createElement("button", {
    onClick: () => {
      dn(e => (e || Rt(), !e))
    },
    "aria-label": Ze ? "Show all filters" : "Simple search: use only the search box (clears the other filters)",
    title: Ze ? "All filters" : "Simple search",
    style: {
      width: 34,
      height: 34,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      border: "1px solid " + (Ze ? C.accent : C.border),
      background: Ze ? "rgba(168,85,247,0.18)" : "transparent",
      color: Ze ? "#c084fc" : C.txt2,
      fontSize: 16,
      cursor: "pointer"
    }
  }, Ze ? "\u{1F39B}" : "\u{1F50D}"), React.createElement("button", {
    onClick: Rt,
    "aria-label": "Reset all filters",
    title: "Reset all filters",
    style: {
      width: 34,
      height: 34,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontSize: 17,
      cursor: "pointer"
    }
  }, "\u21BA"), React.createElement("button", {
    onClick: () => Ie(!1),
    "aria-label": "Close filters",
    title: "Close",
    style: {
      width: 34,
      height: 34,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 9,
      border: "1px solid " + C.border,
      background: "transparent",
      color: C.txt2,
      fontSize: 18,
      cursor: "pointer"
    }
  }, "\u2715"))), React.createElement(FilterControls, {
    q: Pe,
    setQ: At,
    genre: _e,
    setGenre: Nt,
    age: Ve,
    setAge: Et,
    access: He,
    setAccess: Dt,
    accessOpts: Mn,
    onDate: Ee,
    setOnDate: Ft,
    pickedDates: nt,
    addPickedDate: mn,
    removePickedDate: xn,
    pmin: Ae,
    setPmin: Bt,
    pmax: Ne,
    setPmax: Mt,
    priceCeil: Fn,
    genres: On,
    ages: An,
    venueSel: We,
    toggleVenue: wn,
    clearVenues: Kt,
    venueNoSel: De,
    toggleVenueNo: Sn,
    clearVenueNos: Xt,
    atype: Ue,
    setAtype: _t,
    country: Ge,
    setCountry: Vt,
    durMax: Je,
    setDurMax: Ht,
    startTod: we,
    setStartTod: Ut,
    dFrom: qe,
    setDFrom: Gt,
    dTo: Ye,
    setDTo: Jt,
    venues: rn.list,
    venueFmt: En,
    venueNos: Nn,
    atypes: Dn,
    countries: Bn,
    smart: $,
    setSmart: qt,
    simple: Ze,
    onClear: Rt,
    active: me,
    column: !0,
    companions: companions,
    compFilter: compFilter,
    setCompFilter: setCompFilter,
    sortKey: Qe,
    setSortKey: it,
    sortDir: $e,
    setSortDir: at,
    tagFilter: tagFilter,
    setTagFilter: setTagFilter,
    allUserTags: allUserTags
  }), React.createElement("button", {
    onClick: () => Ie(!1),
    style: {
      marginTop: 14,
      width: "100%",
      padding: "11px",
      borderRadius: 11,
      border: "none",
      background: C.accent,
      color: "#fff",
      fontWeight: 800,
      fontSize: 14
    }
  }, "Show ", Xe.length.toLocaleString(), " shows"))),

  Q === "nextyear" && function() {
    var nySearchLower = nySearch.toLowerCase().trim();
    var nySet = {};
    nextYearList.forEach(function(item) { nySet[item.code] = true; });
    var matchedShows = nySearchLower.length >= 2 ? (n || []).filter(function(s) {
      return !nySet[s.code] && ((s.artist || "").toLowerCase().indexOf(nySearchLower) >= 0 ||
             (s.title || "").toLowerCase().indexOf(nySearchLower) >= 0);
    }).slice(0, 20) : [];

    var removeItem = function(code) {
      setNextYearList(function(prev) { return prev.filter(function(x) { return x.code !== code; }); });
    };
    var addItem = function(s) {
      if (nySet[s.code]) return;
      setNextYearList(function(prev) { return prev.concat([{code: s.code, artist: s.artist || s.title, showTitle: s.title, note: ""}]); });
    };
    var updateNote = function(code, note) {
      setNextYearList(function(prev) { return prev.map(function(x) { return x.code === code ? Object.assign({}, x, {note: note}) : x; }); });
    };

    var doExport = function() {
      var data = JSON.stringify(nextYearList, null, 2);
      var blob = new Blob([data], {type: "application/json"});
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = "fringe-next-year.json"; a.click();
      URL.revokeObjectURL(url);
    };

    var doImport = function() {
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = ".json";
      inp.onchange = function(ev) {
        var file = ev.target.files[0]; if (!file) return;
        var reader = new FileReader();
        reader.onload = function(e) {
          try {
            var imported = JSON.parse(e.target.result);
            if (!Array.isArray(imported)) { alert("Invalid file format"); return; }
            var merged = nextYearList.slice();
            var existing = {};
            merged.forEach(function(x) { existing[x.code || x.artist] = true; });
            imported.forEach(function(x) {
              var key = x.code || x.artist;
              if (!existing[key]) { merged.push(x); existing[key] = true; }
            });
            setNextYearList(merged);
          } catch(err) { alert("Could not read file: " + err.message); }
        };
        reader.readAsText(file);
      };
      inp.click();
    };

    return React.createElement(React.Fragment, null,
      React.createElement("div", {style: {display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10}},
        React.createElement("div", {style: {fontSize: V ? 18 : 22, fontWeight: 900, background: "linear-gradient(90deg,var(--pink),var(--accent))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"}}, "\u{1F52E} Next Year"),
        React.createElement("div", {style: {display: "flex", gap: 6}},
          React.createElement("button", {onClick: doImport, style: {padding: "7px 14px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 12, fontWeight: 700, cursor: "pointer"}}, "\u{1F4E5} Import"),
          nextYearList.length > 0 && React.createElement("button", {onClick: doExport, style: {padding: "7px 14px", borderRadius: 10, border: "1px solid " + C.border, background: "transparent", color: C.txt2, fontSize: 12, fontWeight: 700, cursor: "pointer"}}, "\u{1F4E4} Export")
        )
      ),
      React.createElement("div", {style: {fontSize: 14, color: C.txt2, marginBottom: 16}}, "Add your favourites into a list, ready for next year!"),
      React.createElement("div", {style: {marginBottom: 16}},
        React.createElement("input", {
          type: "text",
          value: nySearch,
          onChange: function(e) { setNySearch(e.target.value); },
          placeholder: "Search by artist or show name…",
          style: {width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 12, border: "1px solid " + C.border, background: "rgba(255,255,255,0.06)", color: C.txt, fontSize: 14, outline: "none", fontFamily: "inherit"}
        })
      ),
      nySearchLower.length >= 2 && React.createElement("div", {style: {marginBottom: 20, maxHeight: 300, overflowY: "auto", borderRadius: 12, border: "1px solid " + C.border}},
        matchedShows.length === 0 ? React.createElement("div", {style: {padding: "16px", textAlign: "center", color: C.txt3, fontSize: 13}}, "No matches found") :
        matchedShows.map(function(s) {
          return React.createElement("div", {
            key: s.code,
            onClick: function() { addItem(s); },
            style: {display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid " + C.border, cursor: "pointer"}
          },
            React.createElement("div", {style: {flex: 1, minWidth: 0}},
              React.createElement("div", {style: {fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}, s.artist || "Unknown artist"),
              React.createElement("div", {style: {fontSize: 12, color: C.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}, s.title)
            ),
            React.createElement("span", {style: {fontSize: 18, marginLeft: 8, flexShrink: 0, color: "var(--accent)"}}, "+")
          );
        })
      ),
      React.createElement("div", {style: {fontSize: 12, color: C.txt3, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8}}, "\u{1F4CB} Your list (" + nextYearList.length + ")"),
      nextYearList.length === 0 ? React.createElement("div", {style: {textAlign: "center", color: C.txt3, fontSize: 14, padding: "36px 12px"}}, "No artists added yet. Search above to start building your list for next year!") :
      React.createElement("div", {style: {display: "flex", flexDirection: "column", gap: 6}},
        nextYearList.map(function(item, idx) {
          return React.createElement("div", {
            key: item.code || idx,
            style: {padding: "10px 14px", borderRadius: 12, border: "1px solid " + C.border, background: C.card}
          },
            React.createElement("div", {style: {display: "flex", alignItems: "center", gap: 10}},
              React.createElement("div", {style: {flex: 1, minWidth: 0}},
                React.createElement("div", {style: {fontSize: 14, fontWeight: 800}}, item.artist),
                React.createElement("div", {style: {fontSize: 12, color: C.txt2}}, SITE_YEAR + " show: ", React.createElement("span", {style: {fontStyle: "italic"}}, item.showTitle))
              ),
              React.createElement("button", {
                onClick: function() { removeItem(item.code); },
                "aria-label": "Remove " + item.artist,
                style: {width: 30, height: 30, borderRadius: 8, border: "1px solid " + C.border, background: "transparent", color: C.txt3, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0}
              }, "✕")
            ),
            React.createElement("textarea", {
              placeholder: "Add a note…",
              value: item.note || "",
              onChange: function(e) { updateNote(item.code, e.target.value); },
              rows: 1,
              style: {width: "100%", boxSizing: "border-box", marginTop: 8, padding: "6px 10px", borderRadius: 8, border: "1px solid " + C.border, background: "rgba(255,255,255,0.04)", color: C.txt2, fontSize: 12, fontFamily: "inherit", resize: "vertical", outline: "none", minHeight: 28}
            })
          );
        })
      ),
      // Fringe History — multi-year archive
      React.createElement("div", { style: { marginTop: 28, borderTop: "1px solid " + C.border, paddingTop: 18 } },
        React.createElement("div", { style: { fontSize: V ? 16 : 18, fontWeight: 900, background: "linear-gradient(90deg,#F59E0B,#EF4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 12 } }, "📚 Fringe History"),
        React.createElement("div", { style: { fontSize: 12, color: C.txt2, marginBottom: 12 } }, "Archive your Fringe stats at the end of each year to build your history."),
        React.createElement("button", {
          onClick: function() {
            var showMap = {};
            (n || []).forEach(function(s) { showMap[s.code] = s; });
            var bookedCodes = Object.keys(p).filter(function(code) { return p[code] && p[code].length > 0; });
            var showsSeen = bookedCodes.length;
            var totalSpend = 0;
            bookedCodes.forEach(function(code) {
              (p[code] || []).forEach(function(rec) { totalSpend += perfPrice_(showMap[code] || {}, rec) || 0; });
            });
            var ratedCodes = Object.keys(ratings).filter(function(c) { return ratings[c] >= 1 && ratings[c] <= 5; });
            var avgRating = 0;
            if (ratedCodes.length > 0) {
              var sum = ratedCodes.reduce(function(a, c) { return a + ratings[c]; }, 0);
              avgRating = Math.round(sum / ratedCodes.length * 10) / 10;
            }
            var fiveStars = ratedCodes.filter(function(c) { return ratings[c] === 5; }).map(function(c) { var s = showMap[c]; return s ? s.title : c; });
            var topGenres = {};
            bookedCodes.forEach(function(c) { var s = showMap[c]; if (s && s.genre) topGenres[s.genre] = (topGenres[s.genre] || 0) + 1; });
            var topG = Object.keys(topGenres).sort(function(a, b) { return topGenres[b] - topGenres[a]; }).slice(0, 3);
            var entry = { year: SITE_YEAR, shows: showsSeen, spend: Math.round(totalSpend * 100) / 100, rated: ratedCodes.length, avgRating: avgRating, fiveStars: fiveStars.slice(0, 5), topGenres: topG, nextYearList: nextYearList.length, archivedAt: new Date().toISOString() };
            setFringeHistory(function(prev) {
              var filtered = prev.filter(function(h) { return h.year !== SITE_YEAR; });
              return filtered.concat([entry]).sort(function(a, b) { return b.year - a.year; });
            });
            setToastMsg("✅ " + SITE_YEAR + " Fringe archived!");
            setTimeout(function() { setToastMsg(null); }, 3000);
          },
          style: { padding: "10px 18px", borderRadius: 10, border: "1px solid " + C.border, background: "rgba(245,158,11,0.1)", color: "#F59E0B", fontSize: 13, fontWeight: 800, cursor: "pointer", marginBottom: 14 }
        }, fringeHistory.some(function(h) { return h.year === SITE_YEAR; }) ? "🔄 Update " + SITE_YEAR + " archive" : "📦 Archive " + SITE_YEAR + " Fringe"),
        fringeHistory.length > 0 && React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } },
          fringeHistory.map(function(h) {
            return React.createElement("div", {
              key: h.year,
              style: { padding: "14px 16px", borderRadius: 12, border: "1px solid " + C.border, background: C.card }
            },
              React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 } },
                React.createElement("div", { style: { fontSize: 16, fontWeight: 900, color: C.txt } }, "🎭 " + h.year),
                React.createElement("button", {
                  onClick: function() { setFringeHistory(function(prev) { return prev.filter(function(x) { return x.year !== h.year; }); }); },
                  style: { background: "transparent", border: "none", color: C.txt3, cursor: "pointer", fontSize: 12 }
                }, "✕")
              ),
              React.createElement("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: C.txt2 } },
                React.createElement("span", null, "🎪 ", React.createElement("b", null, h.shows), " shows"),
                React.createElement("span", null, "💰 £", React.createElement("b", null, (h.spend || 0).toFixed(2))),
                h.rated > 0 && React.createElement("span", null, "⭐ ", React.createElement("b", null, h.avgRating), " avg (", h.rated, " rated)"),
                h.nextYearList > 0 && React.createElement("span", null, "🔮 ", React.createElement("b", null, h.nextYearList), " saved for next year")
              ),
              h.fiveStars && h.fiveStars.length > 0 && React.createElement("div", { style: { marginTop: 6, fontSize: 11, color: C.txt3 } },
                "★★★★★ ", h.fiveStars.join(", ")
              ),
              h.topGenres && h.topGenres.length > 0 && React.createElement("div", { style: { marginTop: 4, fontSize: 11, color: C.txt3 } },
                "Top genres: ", h.topGenres.join(", ")
              )
            );
          })
        ),
        fringeHistory.length === 0 && React.createElement("div", { style: { textAlign: "center", color: C.txt3, fontSize: 13, padding: "20px 12px" } }, "No history yet — archive your first year above!")
      )
    );
  }(),

  React.createElement("div", {
    role: "contentinfo",
    style: {
      textAlign: "center",
      fontSize: 13,
      color: C.txt3,
      padding: "26px 12px 6px",
      marginTop: 24,
      borderTop: "1px solid " + C.border,
      lineHeight: 1.7
    }
  }, React.createElement("div", null, "Data accurate as at ", lt ? lt.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }) : "loading\u2026", " (last Fringe API refresh)."), React.createElement("div", null, "Questions? ", ye ? React.createElement("a", {
    href: "mailto:" + ye,
    "aria-label": "Email the site admin at " + ye,
    style: {
      color: C.accent,
      textDecoration: "underline",
      fontWeight: 700
    }
  }, "Email the site admin") : React.createElement("span", {
    style: {
      color: C.txt3
    }
  }, "admin contact loading\u2026"))), V && Q === "browse" && null, V && ReactDOM.createPortal(React.createElement(React.Fragment, null, React.createElement("div", {
    role: "navigation",
    "aria-label": "Sections",
    style: {
      position: "fixed",
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 70,
      background: C.card,
      borderTop: "1px solid " + C.border,
      display: "flex",
      gap: 0,
      padding: "9px 6px calc(9px + env(safe-area-inset-bottom))",
      overflowX: "hidden",
      overflowY: "hidden"
    }
  }, pe("booked", "Booked", "\u{1F3AB}"), pe("browse", "Browse", "\u{1F3AD}"), pe("calendar", "Cal", "\u{1F4C5}"), pe("map", "Map", "\u{1F5FA}\uFE0F"), pe("nextyear", "Next Yr", "\u{1F52E}"), pe("proposals", "Pitch", "\u{1F4CB}"), pe("planner", "Planner", "\u{1F9ED}"), pe("reviews", "Reviews", "\u2B50"), pe("stats", "Stats", "\u{1F4CA}"), pe("plan", "Wishlist", "\u{1FA84}"), Q === "browse" && null), ["browse", "plan", "booked", "map"].includes(Q) && !un && React.createElement("button", {onClick: () => Ie(!0), "aria-label": "Filters", title: "Filters", style: {position: "fixed", right: 16, bottom: V ? "calc(92px + env(safe-area-inset-bottom))" : 26, zIndex: 500, width: 52, height: 52, borderRadius: 26, border: "none", cursor: "pointer", background: "linear-gradient(135deg,var(--pink),var(--accent))", color: "#fff", boxShadow: "0 6px 20px rgba(168,85,247,0.5)", display: "flex", alignItems: "center", justifyContent: "center"}}, React.createElement("svg", {width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"}, React.createElement("path", {d: "M3 4h18l-7 8v6l-4 2v-8z"})), me && React.createElement("span", {style: {position: "absolute", top: 9, right: 9, width: 9, height: 9, borderRadius: 5, background: "#fff", border: "1px solid var(--accent)"}}))
  ), document.getElementById("nav-portal")), !V && ["browse", "plan", "booked", "map"].includes(Q) && !un && ReactDOM.createPortal(React.createElement("button", {onClick: () => Ie(!0), "aria-label": "Filters", title: "Filters", style: {position: "fixed", right: 16, bottom: 26, zIndex: 500, width: 52, height: 52, borderRadius: 26, border: "none", cursor: "pointer", background: "linear-gradient(135deg,var(--pink),var(--accent))", color: "#fff", boxShadow: "0 6px 20px rgba(168,85,247,0.5)", display: "flex", alignItems: "center", justifyContent: "center"}}, React.createElement("svg", {width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "#fff", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round"}, React.createElement("path", {d: "M3 4h18l-7 8v6l-4 2v-8z"})), me && React.createElement("span", {style: {position: "absolute", top: 9, right: 9, width: 9, height: 9, borderRadius: 5, background: "#fff", border: "1px solid var(--accent)"}})), document.getElementById("nav-portal")), toastMsg && React.createElement("div", {
    style: { position: "fixed", bottom: V ? "calc(70px + env(safe-area-inset-bottom))" : 30, left: "50%", transform: "translateX(-50%)", zIndex: 10000, background: "linear-gradient(135deg, var(--pink), var(--accent))", color: "#fff", padding: "10px 22px", borderRadius: 12, fontSize: 14, fontWeight: 700, boxShadow: "0 6px 24px rgba(168,85,247,0.4)", pointerEvents: "none", animation: "fadeInUp 0.3s ease" }
  }, toastMsg), React.createElement("footer", {
    style: {
      textAlign: "center",
      padding: "24px 16px " + (V ? "calc(80px + env(safe-area-inset-bottom))" : "24px"),
      fontSize: 12,
      color: C.txt3,
      lineHeight: 1.6
    }
  }, "This is not an official Fringe site, and data has been provided courtesy of the ", React.createElement("a", {
    href: "https://api.edinburghfestivalcity.com/",
    target: "_blank",
    rel: "noopener noreferrer",
    style: { color: C.txt2, textDecoration: "underline" }
  }, "Edinburgh Festivals Listings API"), ". ", React.createElement("a", {
    href: "https://www.edfringe.com",
    target: "_blank",
    rel: "noopener noreferrer",
    style: { color: C.txt2, textDecoration: "underline" }
  }, "Visit the official Fringe site"), "."), React.createElement(Detail, {
    s: oe,
    inPlan: oe && d.has(oe.code),
    isBk: oe && !!(p[oe.code] && p[oe.code].length),
    note: oe && se[oe.code],
    onNote: Qt,
    onToggle: () => oe && Se(oe.code),
    onBook: e => Be(e),
    onRemoveBooking: $t,
    bookings: oe ? (p[oe.code] || []) : [],
    wdate: oe && y[oe.code],
    onWDate: Cn,
    onClose: () => de(null),
    proposals: X,
    onAddToProp: wt,
    rating: oe ? (ratings[oe.code] || 0) : 0,
    onRate: function(code, val) { setRatings(function(prev) { var next = Object.assign({}, prev); if (val) next[code] = val; else delete next[code]; return next; }); },
    companion: oe ? (companions[oe.code] || "") : "",
    onCompanion: function(code, val) { setCompanions(function(prev) { var next = Object.assign({}, prev); if (val) next[code] = val; else delete next[code]; return next; }); },
    onUpdateBooking: updateBk_,
    ltf: oe ? (ltfData[oe.code] || null) : null,
    onLtf: function(code, val) { setLtfData(function(prev) { var next = Object.assign({}, prev); if (val && val.checked) next[code] = val; else delete next[code]; return next; }); },
    booker: oe ? (bookerData[oe.code] || "") : "",
    onBooker: function(code, val) { setBookerData(function(prev) { var next = Object.assign({}, prev); if (val) next[code] = val; else delete next[code]; return next; }); },
    allCompanions: (function() { var all = []; Object.values(companions).forEach(function(v) { if (v) v.split(",").forEach(function(n) { var nm = n.trim(); if (nm && all.indexOf(nm) < 0) all.push(nm); }); }); Object.values(p).forEach(function(recs) { if (Array.isArray(recs)) recs.forEach(function(rec) { if (rec.companions) rec.companions.split(",").forEach(function(n) { var nm = n.trim(); if (nm && all.indexOf(nm) < 0) all.push(nm); }); if (rec.booker) { var nm = rec.booker.trim(); if (nm && all.indexOf(nm) < 0) all.push(nm); } }); }); Object.values(bookerData).forEach(function(v) { if (v) { var nm = v.trim(); if (nm && all.indexOf(nm) < 0) all.push(nm); } }); return all.sort(); })(),
    venueNote: oe && oe.venue ? (venueNotes[oe.venue] || "") : "",
    onVenueNote: function(venue, val) { setVenueNotes(function(prev) { var next = Object.assign({}, prev); if (val) next[venue] = val; else delete next[venue]; return next; }); },
    showTags: oe ? (showTags[oe.code] || []) : [],
    onShowTags: function(code, tags) { setShowTags(function(prev) { var next = Object.assign({}, prev); if (tags && tags.length) next[code] = tags; else delete next[code]; return next; }); },
    allUserTags: allUserTags,
    photos: oe ? (showPhotos[oe.code] || []) : [],
    onAddPhoto: function(code, dataUrl) { setShowPhotos(function(prev) { var next = Object.assign({}, prev); next[code] = (next[code] || []).concat([dataUrl]); return next; }); },
    onRemovePhoto: function(code, idx) { setShowPhotos(function(prev) { var next = Object.assign({}, prev); var arr = (next[code] || []).slice(); arr.splice(idx, 1); if (arr.length) next[code] = arr; else delete next[code]; return next; }); },
    onOpenGallery: function(g) { setPhotoGallery(g); },
    tickets: oe ? (showTickets[oe.code] || []) : [],
    onAddTicket: function(code, dataUrl) { setShowTickets(function(prev) { var next = Object.assign({}, prev); next[code] = (next[code] || []).concat([dataUrl]); return next; }); },
    onRemoveTicket: function(code, idx) { setShowTickets(function(prev) { var next = Object.assign({}, prev); var arr = (next[code] || []).slice(); arr.splice(idx, 1); if (arr.length) next[code] = arr; else delete next[code]; return next; }); },
    favVenues: favVenues,
    onToggleFavVenue: toggleFavVenue
  }), photoGallery && showPhotos[photoGallery.code] && showPhotos[photoGallery.code].length > 0 && React.createElement("div", {
    onClick: function(ev) { if (ev.target === ev.currentTarget) setPhotoGallery(null); },
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 10001,
      background: "rgba(0,0,0,0.92)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center"
    }
  }, React.createElement("button", {
    onClick: function() { setPhotoGallery(null); },
    "aria-label": "Close gallery",
    style: { position: "absolute", top: 16, right: 16, zIndex: 10, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 40, height: 40, cursor: "pointer", color: "#fff", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }
  }, "✕"), React.createElement("div", {
    style: { position: "absolute", top: 18, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 14, opacity: 0.7 }
  }, (photoGallery.index + 1) + " / " + showPhotos[photoGallery.code].length), React.createElement("img", {
    src: showPhotos[photoGallery.code][photoGallery.index],
    alt: "Photo " + (photoGallery.index + 1),
    style: { maxWidth: "92vw", maxHeight: "78vh", borderRadius: 8, objectFit: "contain" }
  }), React.createElement("div", {
    style: { display: "flex", gap: 24, marginTop: 18 }
  }, React.createElement("button", {
    onClick: function() { var photos = showPhotos[photoGallery.code]; var prev = (photoGallery.index - 1 + photos.length) % photos.length; setPhotoGallery({ code: photoGallery.code, index: prev }); },
    disabled: showPhotos[photoGallery.code].length <= 1,
    style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", opacity: showPhotos[photoGallery.code].length <= 1 ? 0.3 : 1 }
  }, "◀"), React.createElement("button", {
    onClick: function() { var photos = showPhotos[photoGallery.code]; var nxt = (photoGallery.index + 1) % photos.length; setPhotoGallery({ code: photoGallery.code, index: nxt }); },
    disabled: showPhotos[photoGallery.code].length <= 1,
    style: { background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer", color: "#fff", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", opacity: showPhotos[photoGallery.code].length <= 1 ? 0.3 : 1 }
  }, "▶")), React.createElement("div", {
    style: { display: "flex", gap: 6, marginTop: 12, overflowX: "auto", maxWidth: "90vw", padding: "4px 0" }
  }, showPhotos[photoGallery.code].map(function(src, i) {
    return React.createElement("img", {
      key: i,
      src: src,
      alt: "Thumb " + (i + 1),
      onClick: function() { setPhotoGallery({ code: photoGallery.code, index: i }); },
      style: { width: 48, height: 48, borderRadius: 6, objectFit: "cover", cursor: "pointer", border: i === photoGallery.index ? "2px solid var(--accent)" : "2px solid transparent", opacity: i === photoGallery.index ? 1 : 0.6 }
    });
  }))), addShowOpen && React.createElement("div", {
    onClick: function(ev) { if (ev.target === ev.currentTarget) { setAddShowOpen(false); } },
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 9998,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    }
  }, React.createElement("div", {
    style: {
      background: C.bg,
      borderRadius: 16,
      border: "1px solid " + C.border,
      width: "100%",
      maxWidth: 480,
      maxHeight: "80vh",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }
  }, React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 20px 12px",
      borderBottom: "1px solid " + C.border
    }
  }, React.createElement("span", {
    style: { fontSize: 16, fontWeight: 800, color: C.txt }
  }, "\u2795 Add a show"), React.createElement("button", {
    onClick: function() { setAddShowOpen(false); },
    style: { border: "none", background: "transparent", fontSize: 20, color: C.txt2, cursor: "pointer" }
  }, "\u2715")), React.createElement("div", {
    style: { padding: "12px 20px" }
  }, React.createElement("input", {
    value: addShowQ,
    onChange: function(ev) { setAddShowQ(ev.target.value); },
    placeholder: "\u{1F50D} Search for a show\u2026",
    autoFocus: true,
    style: {
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid " + C.border,
      background: C.card,
      color: C.txt,
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box"
    }
  })), React.createElement("div", {
    style: {
      flex: 1,
      overflowY: "auto",
      padding: "0 20px 16px"
    }
  }, function() {
    if (!addShowQ.trim() || !n) return React.createElement("div", {
      style: { textAlign: "center", color: C.txt3, fontSize: 13, padding: "20px 0" }
    }, "Type to search for a show to add to your bookings.");
    var q = addShowQ.toLowerCase();
    var matches = n.filter(function(s) {
      return (s.title + " " + s.artist + " " + (s.space || "") + " " + s.venue + " " + s.genre).toLowerCase().indexOf(q) >= 0;
    }).slice(0, 20);
    if (!matches.length) return React.createElement("div", {
      style: { textAlign: "center", color: C.txt3, fontSize: 13, padding: "20px 0" }
    }, "No shows found.");
    return matches.map(function(s) {
      var isBooked = p[s.code] && p[s.code].length > 0;
      return React.createElement("div", {
        key: s.code,
        onClick: function() {
          if (isBooked) { setAddShowOpen(false); de(s); return; }
          setAddShowOpen(false);
          I(s);
        },
        style: {
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          marginBottom: 4,
          background: isBooked ? "rgba(52,211,153,0.08)" : "transparent",
          border: "1px solid " + (isBooked ? "rgba(52,211,153,0.2)" : "transparent")
        }
      }, React.createElement("div", {
        style: { flex: 1, minWidth: 0 }
      }, React.createElement("div", {
        style: { fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
      }, s.title), React.createElement("div", {
        style: { fontSize: 12, color: C.txt2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
      }, s.artist, s.artist && s.venue ? " \u00B7 " : "", venueLabel_(s), priceLabel(showPrice_(s)) ? " \u00B7 " + priceLabel(showPrice_(s)) : ""), React.createElement("div", {
        style: { fontSize: 11, color: C.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }
      }, s.first && s.last ? "\u{1F5D3} " + s.first.slice(5) + " \u2013 " + s.last.slice(5) : "", s.first && s.startStr ? " \u00B7 " : "", s.startStr ? "\u{1F552} " + s.startStr : "", s.duration ? " (" + s.duration + " min)" : ""), (s.venueAddr || s.venuePostcode) && React.createElement("div", {
        style: { fontSize: 11, color: C.txt3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }
      }, "\u{1F4CD} ", [s.venueAddr, s.venuePostcode].filter(Boolean).join(", "))), isBooked && React.createElement("span", {
        style: { fontSize: 11, color: "#34d399", fontWeight: 700, flexShrink: 0 }
      }, "\u2713 Booked"), React.createElement("span", {
        style: { fontSize: 18, flexShrink: 0 }
      }, "\u{1F39F}\uFE0F"));
    });
  }()))), S && React.createElement(BookModal, {
    s: S,
    onConfirm: kn,
    onClose: () => I(null)
  }), guideOpen && React.createElement(GuideModal, { onClose: function() { setGuideOpen(false); } }), k && React.createElement(HelpModal, {
    rows: yt,
    onClose: () => G(!1)
  }), vn && React.createElement(SyncModal, {
    onClose: () => Yt(!1)
  }))
}
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ErrorBoundary, null, React.createElement(App, null)));