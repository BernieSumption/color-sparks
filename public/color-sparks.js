(function() {
  var WebSocket = window.WebSocket || window.MozWebSocket;
  var br = window.brunch = (window.brunch || {});
  var ar = br['auto-reload'] = (br['auto-reload'] || {});
  if (!WebSocket || ar.disabled) return;

  var cacheBuster = function(url){
    var date = Math.round(Date.now() / 1000).toString();
    url = url.replace(/(\&|\\?)cacheBuster=\d*/, '');
    return url + (url.indexOf('?') >= 0 ? '&' : '?') +'cacheBuster=' + date;
  };

  var reloaders = {
    page: function(){
      window.location.reload(true);
    },

    stylesheet: function(){
      [].slice
        .call(document.querySelectorAll('link[rel="stylesheet"]'))
        .filter(function(link){
          return (link != null && link.href != null);
        })
        .forEach(function(link) {
          link.href = cacheBuster(link.href);
        });

      // hack to force page repaint
      var el = document.body;
      var bodyDisplay = el.style.display || 'block';
      el.style.display = 'none';
      el.offsetHeight;
      el.style.display = bodyDisplay;
    }
  };
  var port = ar.port || 9485;
  var host = br.server || window.location.hostname;

  var connect = function(){
    var connection = new WebSocket('ws://' + host + ':' + port);
    connection.onmessage = function(event){
      if (ar.disabled) return;
      var message = event.data;
      var reloader = reloaders[message] || reloaders.page;
      reloader();
    };
    connection.onerror = function(){
      if (connection.readyState) connection.close();
    };
    connection.onclose = function(){
      window.setTimeout(connect, 1000);
    };
  };
  connect();
})();

var BACKGROUND_COLOR, BG_RELEASE_PROBABILITY, ColorSparks, DARKENING_ALPHA, DARKENING_BEGIN_DELAY, DARKENING_DIAMETER, FORCE_AMPLITUDE, FORCE_PERIOD, GREY_VALUE, INITIAL_DIAMETER, MAX_INITIAL_V, Point, RADIUS_DECAY, Range, SPARKS_PER_SECOND, SPARK_FRAMES_PER_SECOND, Spark, TRANSPARENCY, random, randomColor, randomGrey,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

Range = (function() {
  function Range(from, to) {
    this.from = from;
    this.to = to;
  }

  Range.prototype.get = function() {
    return random(this.from, this.to);
  };

  return Range;

})();

RADIUS_DECAY = new Range(0.95, 0.99);

MAX_INITIAL_V = 1;

INITIAL_DIAMETER = new Range(5, 20);

FORCE_AMPLITUDE = new Range(-0.05, 0.05);

FORCE_PERIOD = new Range(10, 50);

GREY_VALUE = new Range(0, 128);

TRANSPARENCY = 0.1;

SPARKS_PER_SECOND = 250;

SPARK_FRAMES_PER_SECOND = 10;

BG_RELEASE_PROBABILITY = 0.3;

DARKENING_DIAMETER = new Range(3, 7);

DARKENING_BEGIN_DELAY = 5;

DARKENING_ALPHA = 0.1;

BACKGROUND_COLOR = "#000000";

ColorSparks = (function() {
  function ColorSparks(canvas, logPerformance) {
    this.canvas = canvas;
    this.logPerformance = logPerformance != null ? logPerformance : false;
    this.endSparks = __bind(this.endSparks, this);
    this.updateSparkPosition = __bind(this.updateSparkPosition, this);
    this.startSparks = __bind(this.startSparks, this);
    this.draw = __bind(this.draw, this);
    this.ctx = canvas.getContext("2d");
    this.reset();
    window.requestAnimationFrame(this.draw);
    this.showFrameRate = true;
    window.addEventListener("keyup", (function(_this) {
      return function(event) {
        if (event.keyCode === 70) {
          return _this.showFrameRate = !_this.showFrameRate;
        }
      };
    })(this));
    this.canvas.addEventListener("mousedown", this.startSparks);
    this.canvas.addEventListener("mousemove", this.updateSparkPosition);
    this.canvas.addEventListener("mouseup", this.endSparks);
    this.canvas.addEventListener("touchstart", this.startSparks);
    this.canvas.addEventListener("touchmove", this.updateSparkPosition);
    this.canvas.addEventListener("touchend", this.endSparks);
  }

  ColorSparks.prototype.reset = function() {
    this.canvas.height = this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width = this.canvas.offsetWidth;
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fill();
    return this.sparks = [];
  };

  ColorSparks.prototype.draw = function(timestamp) {
    var finishedUpTo, fps, i, _i;
    if (!(this.height === this.canvas.offsetHeight && this.width === this.canvas.offsetWidth)) {
      this.reset();
    }
    if (this.releaseSparksAt) {
      for (i = _i = 0; _i <= 10; i = ++_i) {
        this.sparks.push(new Spark(this.releaseSparksAt.clone(), new Point(Math.random() * 2 - 1, Math.random() * 2 - 1), randomColor()));
      }
    }
    i = 0;
    while (i < this.sparks.length) {
      if (!this.sparks[i].finished) {
        this.sparks[i].update(this.ctx);
      } else {
        if (finishedUpTo === i - 1) {
          finishedUpTo = i;
        }
      }
      i++;
    }
    if (finishedUpTo !== -1) {
      this.sparks.splice(0, finishedUpTo + 1);
    }
    if (this.logPerformance) {
      this.frameCount = (this.frameCount || 0) + 1;
      if (Math.floor(timestamp / 1000) !== Math.floor(this.prevLogTimestamp / 1000)) {
        fps = Math.round((this.frameCount - this.prevFrameCount) / (timestamp - this.prevLogTimestamp) * 1000);
        console.log("fps= " + fps);
        this.prevLogTimestamp = timestamp;
        this.prevFrameCount = this.frameCount;
      }
    }
    window.requestAnimationFrame(this.draw);
  };

  ColorSparks.prototype.startSparks = function(event) {
    this.releaseSparksAt = new Point();
    return this.updateSparkPosition(event);
  };

  ColorSparks.prototype.updateSparkPosition = function(event) {
    if (this.releaseSparksAt) {
      this.releaseSparksAt.x = event.offsetX || event.layerX;
      return this.releaseSparksAt.y = event.offsetY || event.layerY;
    }
  };

  ColorSparks.prototype.endSparks = function(event) {
    return this.releaseSparksAt = null;
  };

  return ColorSparks;

})();

Spark = (function() {
  function Spark(location, velocity, color) {
    this.location = location;
    this.velocity = velocity;
    this.color = color;
    this.initialLocation = this.location.clone();
    this.forceCounter = 0;
    this.finished = false;
    this.radius = INITIAL_DIAMETER.get() / 2;
    this.radiusDecay = RADIUS_DECAY.get();
    this.darkeningRadius = DARKENING_DIAMETER.get() / 2;
    this.xForceAmplitude = FORCE_AMPLITUDE.get();
    this.xForcePeriod = FORCE_PERIOD.get();
    this.yForceAmplitude = FORCE_AMPLITUDE.get();
    this.yForcePeriod = FORCE_PERIOD.get();
  }

  Spark.prototype.update = function(ctx) {
    ctx.beginPath();
    ctx.arc(this.location.x, this.location.y, this.radius, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();
    this.forceCounter++;
    this.velocity.x += Math.sin(Math.PI * 2 * this.forceCounter / this.xForcePeriod) * this.xForceAmplitude;
    this.velocity.y += Math.sin(Math.PI * 2 * this.forceCounter / this.yForcePeriod) * this.yForceAmplitude;
    if (this.isText) {
      ctx.beginPath();
      ctx.arc(this.initialLocation.x + random(-1, 1), this.initialLocation.y + random(-1, 1), this.darkeningRadius, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 0, 0, " + DARKENING_ALPHA + ")";
      ctx.fill();
    }
    if (this.radius < 1) {
      this.finished = true;
    }
    this.location.x += this.velocity.x;
    this.location.y += this.velocity.y;
    this.radius *= this.radiusDecay;
  };

  return Spark;

})();

random = function(from, to) {
  return from + (Math.random() * (to - from));
};

randomColor = function() {
  var from, parts, tmp, to;
  parts = [255, Math.floor(random(0, 255)), 0];
  if (parts[1].length === 1) {
    parts[1] = "0" + parts[1];
  }
  from = 0;
  while (from < parts.length) {
    to = Math.floor(random(0, parts.length));
    tmp = parts[from];
    parts[from] = parts[to];
    parts[to] = tmp;
    from++;
  }
  return "rgba(" + parts[0] + "," + parts[1] + "," + parts[2] + "," + TRANSPARENCY + ")";
};

randomGrey = function() {
  var shade;
  shade = Math.floor(GREY_VALUE.get());
  return "rgba(" + shade + "," + shade + "," + shade + "," + TRANSPARENCY + ")";
};

Point = (function() {
  function Point(x, y) {
    this.x = x;
    this.y = y;
  }

  Point.prototype.clone = function() {
    return new Point(this.x, this.y);
  };

  return Point;

})();
;(function() {
  var lastTime, vendors, x;
  lastTime = 0;
  vendors = ["ms", "moz", "webkit", "o"];
  x = 0;
  while (x < vendors.length && !window.requestAnimationFrame) {
    window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
    window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] || window[vendors[x] + "CancelRequestAnimationFrame"];
    ++x;
  }
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime, id, timeToCall;
      currTime = new Date().getTime();
      timeToCall = Math.max(0, 16 - (currTime - lastTime));
      id = window.setTimeout(function() {
        callback(currTime + timeToCall);
      }, timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
})();
;
//# sourceMappingURL=color-sparks.js.map