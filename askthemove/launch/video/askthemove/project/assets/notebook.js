/*
 * notebook.js: shared helpers for the AskTheMove demo frames.
 *
 * The stroke geometry is a port of the landing page's ink.js (site/public/assets/ink.js):
 * seeded, never Math.random, so every render draws the same marks.
 * The rest is HyperFrames plumbing: camera poses over the footage, marks drawn with a
 * stroke animation, and notes that write themselves word by word.
 * Everything here builds tweens on a paused GSAP timeline; nothing reads the clock.
 */
(function () {
  'use strict';

  // ---------- Ink geometry (port of site ink.js) ----------

  function seedFrom(text) {
    var h = 0x811c9dc5;
    for (var i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function r2(n) {
    return Math.round(n * 100) / 100;
  }

  function spread(rand, amount) {
    return (rand() * 2 - 1) * amount;
  }

  function smoothPath(pts) {
    if (pts.length < 2) return '';
    var d = 'M' + r2(pts[0][0]) + ' ' + r2(pts[0][1]);
    for (var i = 0; i < pts.length - 1; i += 1) {
      var p0 = pts[i - 1] || pts[i];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      var c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + r2(c1[0]) + ' ' + r2(c1[1]) + ' ' + r2(c2[0]) + ' ' + r2(c2[1]) + ' ' + r2(p2[0]) + ' ' + r2(p2[1]);
    }
    return d;
  }

  function polyLength(pts) {
    var len = 0;
    for (var i = 1; i < pts.length; i += 1) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return len;
  }

  function linePoints(a, b, o) {
    o = o || {};
    var seed = o.seed == null ? 1 : o.seed;
    var bow = o.bow == null ? 0.035 : o.bow;
    var tremor = o.tremor == null ? 0.01 : o.tremor;
    var overshoot = o.overshoot == null ? 0.02 : o.overshoot;
    var steps = o.steps == null ? 6 : o.steps;
    var rand = rng(seed);
    var dx = b[0] - a[0];
    var dy = b[1] - a[1];
    var len = Math.hypot(dx, dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    var bend = spread(rand, bow) * len;
    var pts = [];
    for (var i = 0; i <= steps; i += 1) {
      var t = i / steps;
      var along = t * (1 + overshoot);
      var off = Math.sin(Math.PI * t) * bend + (i === 0 || i === steps ? 0 : spread(rand, tremor) * len);
      pts.push([a[0] + dx * along + nx * off, a[1] + dy * along + ny * off]);
    }
    pts[0] = [pts[0][0] + spread(rand, tremor) * len, pts[0][1] + spread(rand, tremor) * len];
    return pts;
  }

  function polylinePoints(points, o) {
    o = o || {};
    var rand = rng(o.seed == null ? 1 : o.seed);
    var tremor = o.tremor == null ? 0.012 : o.tremor;
    var pts = [];
    for (var i = 0; i < points.length - 1; i += 1) {
      var a = points[i];
      var b = points[i + 1];
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var steps = 4;
      for (var s = i === 0 ? 0 : 1; s <= steps; s += 1) {
        var t = s / steps;
        var j = s === 0 || s === steps ? 0 : spread(rand, tremor) * len;
        pts.push([a[0] + (b[0] - a[0]) * t + j, a[1] + (b[1] - a[1]) * t + j]);
      }
    }
    return pts;
  }

  function loopPoints(cx, cy, rx, ry, o) {
    o = o || {};
    var rand = rng(o.seed == null ? 1 : o.seed);
    var turns = o.turns == null ? 1.14 : o.turns;
    var wobble = o.wobble == null ? 0.05 : o.wobble;
    var tilt = o.tilt || 0;
    var n = o.points == null ? 30 : o.points;
    var a0 = -Math.PI * (0.55 + rand() * 0.35);
    var phase = rand() * Math.PI * 2;
    var shrink = 0.05 + rand() * 0.05;
    var cosT = Math.cos(tilt);
    var sinT = Math.sin(tilt);
    var pts = [];
    for (var i = 0; i <= n; i += 1) {
      var t = i / n;
      var ang = a0 + t * Math.PI * 2 * turns;
      var k = 1 + Math.sin(ang * 2 + phase) * wobble + spread(rand, wobble * 0.35) - shrink * t;
      var x = Math.cos(ang) * rx * k;
      var y = Math.sin(ang) * ry * k;
      pts.push([cx + x * cosT - y * sinT, cy + x * sinT + y * cosT]);
    }
    return pts;
  }

  function stroke(pts) {
    return { d: smoothPath(pts), len: polyLength(pts) };
  }

  function arrowHead(tip, u, size, o) {
    o = o || {};
    var seed = o.seed == null ? 1 : o.seed;
    var spreadAngle = o.spreadAngle == null ? 0.5 : o.spreadAngle;
    var rand = rng(seed);
    var out = [];
    [1, -1].forEach(function (side) {
      var ang = Math.atan2(u[1], u[0]) + Math.PI + side * (spreadAngle + spread(rand, 0.08));
      var len = size * (0.9 + rand() * 0.2);
      var end = [tip[0] + Math.cos(ang) * len, tip[1] + Math.sin(ang) * len];
      var s = stroke(linePoints(end, tip, { seed: seed + side * 7, bow: 0.06, tremor: 0.01, overshoot: 0.04, steps: 3 }));
      s.head = true;
      out.push(s);
    });
    return out;
  }

  // Marks in footage (stage) coordinates. Each returns a list of strokes {d, len, head?}.
  var marks = {
    ring: function (g, seed) {
      return [stroke(loopPoints(g.cx, g.cy, g.rx, g.ry, { seed: seed, turns: g.turns || 1.12, wobble: g.wobble == null ? 0.035 : g.wobble, tilt: g.tilt == null ? -0.04 : g.tilt }))];
    },
    underline: function (g, seed) {
      return [stroke(linePoints([g.x0, g.y], [g.x1, g.y + (g.dy == null ? -4 : g.dy)], { seed: seed, bow: 0.012, tremor: 0.004, overshoot: 0.01, steps: 8 }))];
    },
    swipe: function (g, seed) {
      return [stroke(linePoints([g.x0, g.y], [g.x1, g.y - 4], { seed: seed, bow: 0.01, tremor: 0.003, overshoot: 0, steps: 6 }))];
    },
    arrow: function (g, seed) {
      var a = g.from;
      var b = g.to;
      var shaft = stroke(linePoints(a, b, { seed: seed, overshoot: 0, bow: g.bow == null ? 0.035 : g.bow }));
      var len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      var u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
      return [shaft].concat(arrowHead(b, u, g.head || 30, { seed: seed + 3 }));
    },
    curvedArrow: function (g, seed) {
      var a = g.from;
      var c = g.via;
      var b = g.to;
      var rand = rng(seed);
      var len0 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      var pts = [];
      var steps = 12;
      for (var i = 0; i <= steps; i += 1) {
        var t = i / steps;
        var mt = 1 - t;
        var j = i === 0 || i === steps ? 0 : spread(rand, 0.006) * len0;
        pts.push([mt * mt * a[0] + 2 * mt * t * c[0] + t * t * b[0] + j, mt * mt * a[1] + 2 * mt * t * c[1] + t * t * b[1] + j]);
      }
      var p = pts[pts.length - 2];
      var q = pts[pts.length - 1];
      var l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [stroke(pts)].concat(arrowHead(q, [(q[0] - p[0]) / l, (q[1] - p[1]) / l], g.head || 30, { seed: seed + 11 }));
    },
    tick: function (g, seed) {
      var rand = rng(seed);
      var w = g.w;
      var h = g.h;
      var a = [g.x + w * 0.08, g.y + h * (0.5 + spread(rand, 0.06))];
      var b = [g.x + w * 0.36, g.y + h * 0.92];
      var c = [g.x + w * 0.96, g.y + h * (0.06 + spread(rand, 0.04))];
      return [stroke(polylinePoints([a, b, c], { seed: seed, tremor: 0.015 }))];
    },
    hash: function (g, seed) {
      // A pen "#": two downstrokes, then two crossbars.
      var x = g.x;
      var y = g.y;
      var s = g.size;
      var o = { bow: 0.04, tremor: 0.01, overshoot: 0.04, steps: 3 };
      return [
        stroke(linePoints([x + s * 0.38, y], [x + s * 0.28, y + s], Object.assign({ seed: seed }, o))),
        stroke(linePoints([x + s * 0.74, y], [x + s * 0.64, y + s], Object.assign({ seed: seed + 1 }, o))),
        stroke(linePoints([x + s * 0.06, y + s * 0.33], [x + s * 0.98, y + s * 0.31], Object.assign({ seed: seed + 2 }, o))),
        stroke(linePoints([x + s * 0.02, y + s * 0.68], [x + s * 0.94, y + s * 0.66], Object.assign({ seed: seed + 3 }, o))),
      ];
    },
  };

  // ---------- Layout ----------

  var W = 1920;
  var H = 1080;
  // The footage window ("the figure") on the notebook page, in canvas px.
  var FIG = { x: 132, y: 64, w: 1176, h: 952 };

  /**
   * Camera pose that fits a footage rectangle [x0, y0, x1, y1] (source px) into the figure
   * window. Returns {x, y, scale} for the stage (transform-origin 0 0).
   * opts.scale forces a scale; opts.cx/cy force a centre; minX keeps the app sidebar
   * (and its wordmark) out of shot.
   */
  function fit(rect, opts) {
    opts = opts || {};
    var w = rect[2] - rect[0];
    var h = rect[3] - rect[1];
    var s = opts.scale || Math.min(FIG.w / w, FIG.h / h);
    var cx = opts.cx == null ? (rect[0] + rect[2]) / 2 : opts.cx;
    var cy = opts.cy == null ? (rect[1] + rect[3]) / 2 : opts.cy;
    var hw = FIG.w / (2 * s);
    var hh = FIG.h / (2 * s);
    var minX = opts.minX == null ? 290 : opts.minX;
    var maxX = opts.maxX == null ? W : opts.maxX;
    var minY = opts.minY == null ? 0 : opts.minY;
    var maxY = opts.maxY == null ? H : opts.maxY;
    if (opts.alignBottom) cy = rect[3] - hh;
    if (opts.alignTop) cy = rect[1] + hh;
    cx = Math.max(minX + hw, Math.min(maxX - hw, cx));
    cy = Math.max(minY + hh, Math.min(maxY - hh, cy));
    return { x: r2(FIG.w / 2 - cx * s), y: r2(FIG.h / 2 - cy * s), scale: Math.round(s * 10000) / 10000 };
  }

  /** Visible footage rectangle for a pose (for checks). */
  function view(pose) {
    return [-pose.x / pose.scale, -pose.y / pose.scale, (FIG.w - pose.x) / pose.scale, (FIG.h - pose.y) / pose.scale].map(Math.round);
  }

  // ---------- Timeline helpers ----------

  var SVGNS = 'http://www.w3.org/2000/svg';

  /**
   * Adds a mark's strokes to an <svg> (viewBox in footage px) and returns a handle.
   * opts: color (CSS value), px (stroke width in canvas px), scale (pose scale the mark is
   * drawn at, so the pen width reads the same at any zoom), seed (string or number).
   */
  function mark(svg, kind, geom, opts) {
    opts = opts || {};
    var seed = typeof opts.seed === 'string' ? seedFrom(opts.seed) % 100000 : opts.seed || 7;
    var strokes = marks[kind](geom, seed);
    var scale = opts.scale || 1;
    var width = (opts.px || 7) / scale;
    var els = strokes.map(function (s) {
      var p = document.createElementNS(SVGNS, 'path');
      p.setAttribute('d', s.d);
      p.setAttribute('pathLength', '1');
      p.setAttribute('class', 'nb-stroke' + (opts.cls ? ' ' + opts.cls : ''));
      p.style.stroke = opts.color || 'var(--red)';
      p.style.strokeWidth = String(Math.round(width * 100) / 100);
      svg.appendChild(p);
      return { el: p, len: s.len * scale, head: !!s.head };
    });
    return { strokes: els };
  }

  /**
   * Draws a mark onto the timeline at time t, stroke by stroke, the way a hand does:
   * pace ~1.1 ms per canvas px, eased in and out, with a short pen lift between strokes.
   * Returns the time the last stroke ends.
   */
  function draw(tl, m, t, opts) {
    opts = opts || {};
    var pace = opts.pace || 1.1;
    var at = t;
    m.strokes.forEach(function (s, i) {
      var dur = s.head ? 0.14 : Math.max(0.26, Math.min(opts.max || 1.1, (s.len * pace) / 1000));
      if (i > 0) at += s.head ? 0.04 : opts.lift || 0.18;
      tl.fromTo(s.el, { strokeDashoffset: 1.01 }, { strokeDashoffset: 0, duration: dur, ease: s.head ? 'power1.out' : 'power2.inOut' }, at);
      at += dur;
    });
    return at;
  }

  /**
   * Splits an element's text into words and writes them in, left to right, at a
   * handwriting pace (~26 ms per character, a beat after commas and full stops).
   * Returns the time the last word lands.
   */
  function write(tl, el, t, opts) {
    opts = opts || {};
    var msPerChar = opts.ms || 26;
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    el.textContent = '';
    var words = text.split(' ');
    var spans = words.map(function (w, i) {
      var s = document.createElement('span');
      s.className = 'nb-word';
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      return s;
    });
    var at = t;
    spans.forEach(function (s, i) {
      var w = words[i];
      var dur = Math.max(0.1, (w.length * msPerChar) / 1000);
      tl.fromTo(s, { clipPath: 'inset(-30% 108% -30% -8%)' }, { clipPath: 'inset(-30% -8% -30% -8%)', duration: dur, ease: 'none' }, at);
      at += dur + 0.035;
      if (/[.?!:]$/.test(w)) at += 0.09;
      else if (/[,;]$/.test(w)) at += 0.045;
    });
    return at;
  }

  /** Camera move to a pose. */
  function move(tl, stage, pose, t, dur, ease) {
    tl.to(stage, { x: pose.x, y: pose.y, scale: pose.scale, duration: dur, ease: ease || 'power2.inOut' }, t);
    return t + dur;
  }

  /** Initial camera pose, set at time 0 so seeking back always restores it. */
  function pose(tl, stage, p) {
    tl.set(stage, { x: p.x, y: p.y, scale: p.scale, transformOrigin: '0 0' }, 0);
  }

  /** Frame entrance (crossfade in over the previous frame) and the notes' exit. */
  function enter(tl, page, dur) {
    tl.fromTo(page, { opacity: 0 }, { opacity: 1, duration: dur || 0.3, ease: 'none' }, 0);
  }

  function leave(tl, el, end, dur) {
    dur = dur || 0.3;
    tl.to(el, { opacity: 0, duration: dur, ease: 'none' }, end - dur);
  }

  window.NB = {
    W: W,
    H: H,
    FIG: FIG,
    seedFrom: seedFrom,
    rng: rng,
    marks: marks,
    fit: fit,
    view: view,
    mark: mark,
    draw: draw,
    write: write,
    move: move,
    pose: pose,
    enter: enter,
    leave: leave,
  };
})();
