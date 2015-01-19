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

var BACKGROUND_COLOR, BG_RELEASE_PROBABILITY, ColorSparks, DARKENING_ALPHA, DARKENING_BEGIN_DELAY, DARKENING_DIAMETER, FORCE_AMPLITUDE, FORCE_PERIOD, GREY_VALUE, INITIAL_DIAMETER, INITIAL_SPARKS_PER_SECOND, MAX_INITIAL_V, MAX_SPARKS_PER_SECOND, MIN_SPARKS_PER_SECOND, Point, RADIUS_DECAY, Range, SPARKS_PER_SECOND_ADJUST_RATE, SPARK_FRAMES_PER_SECOND, Spark, TARGET_FPS, TRANSPARENCY, VelocityMap, getTimer, random, randomColor, randomGrey,
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

FORCE_AMPLITUDE = new Range(-0.2, 0.2);

FORCE_PERIOD = new Range(10, 50);

GREY_VALUE = new Range(0, 128);

TRANSPARENCY = 0.1;

SPARK_FRAMES_PER_SECOND = 10;

BG_RELEASE_PROBABILITY = 0.3;

DARKENING_DIAMETER = new Range(3, 7);

DARKENING_BEGIN_DELAY = 5;

DARKENING_ALPHA = 0.1;

BACKGROUND_COLOR = "#000000";

INITIAL_SPARKS_PER_SECOND = 1000;

MAX_SPARKS_PER_SECOND = 2000;

MIN_SPARKS_PER_SECOND = 100;

TARGET_FPS = 50;

SPARKS_PER_SECOND_ADJUST_RATE = 0.001;

ColorSparks = (function() {
  function ColorSparks(canvas, velocityMapUrl, logPerformance) {
    this.canvas = canvas;
    this.logPerformance = logPerformance != null ? logPerformance : false;
    this.updateSparkPosition = __bind(this.updateSparkPosition, this);
    this.draw = __bind(this.draw, this);
    this.ctx = canvas.getContext("2d");
    this.reset();
    this.frameCount = 0;
    this.framesPerSecond = 60;
    this.sparksPerSecond = INITIAL_SPARKS_PER_SECOND;
    window.requestAnimationFrame(this.draw);
    this.canvas.addEventListener("mousedown", this.updateSparkPosition);
    this.canvas.addEventListener("mousemove", this.updateSparkPosition);
    this.canvas.addEventListener("touchstart", this.updateSparkPosition);
    this.canvas.addEventListener("touchmove", this.updateSparkPosition);
  }

  ColorSparks.prototype.reset = function() {
    this.canvas.height = this.height = this.canvas.offsetHeight;
    this.canvas.width = this.width = this.canvas.offsetWidth;
    this.ctx.beginPath();
    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fill();
    this.releaseX = this.width / 2;
    this.releaseY = this.height / 2;
    this.sparks = [];
  };

  ColorSparks.prototype.draw = function(timestamp) {
    var finishedUpTo, i, spark, sparksToRelease, _i;
    if (!(this.height === this.canvas.offsetHeight && this.width === this.canvas.offsetWidth)) {
      this.reset();
    }
    this.frameCount += 1;
    if (this.frameCount % 10 === 1) {
      this.framesPerSecond = Math.round(10 / (timestamp - this.prevTimestamp) * 1000) || 60;
      this.prevTimestamp = timestamp;
    }
    if (this.framesPerSecond < TARGET_FPS && this.sparksPerSecond < MAX_SPARKS_PER_SECOND) {
      this.sparksPerSecond -= this.sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE;
    } else if (this.framesPerSecond > TARGET_FPS && this.sparksPerSecond > MIN_SPARKS_PER_SECOND) {
      this.sparksPerSecond += this.sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE;
    }
    if (this.logPerformance && this.frameCount % 100 === 0) {
      console.log("fps=" + this.framesPerSecond + ", sparks=" + this.sparks.length + ", releaseRate=" + (this.sparksPerSecond.toFixed(2)));
    }
    sparksToRelease = this.sparksPerSecond / this.framesPerSecond;
    for (i = _i = 0; _i <= sparksToRelease; i = _i += 1) {
      spark = new Spark(new Point(this.releaseX, this.releaseY), new Point(Math.random() * 2 - 1, Math.random() * 2 - 1), randomColor());
      this.sparks.push(spark);
    }
    this.timestampLastFrame = timestamp;
    i = 0;
    finishedUpTo = -1;
    while (i < this.sparks.length) {
      if (this.sparks[i].active) {
        this.sparks[i].update(this.ctx);
      } else if (finishedUpTo === i - 1) {
        finishedUpTo = i;
      }
      i++;
    }
    if (finishedUpTo > -1) {
      this.sparks.splice(0, finishedUpTo + 1);
    }
    window.requestAnimationFrame(this.draw);
  };

  ColorSparks.prototype.updateSparkPosition = function(event) {
    this.releaseX = event.offsetX || event.layerX;
    return this.releaseY = event.offsetY || event.layerY;
  };

  ColorSparks.prototype.calculateReleaseRate = function() {
    var i, idealReleaseRate, milliseconds, spark, sparksPerIteration, start, totalSparks, _i;
    milliseconds = 10;
    sparksPerIteration = 100;
    start = getTimer();
    totalSparks = 0;
    while (getTimer() - start < milliseconds) {
      for (i = _i = 0; _i <= sparksPerIteration; i = _i += 1) {
        spark = new Spark(new Point(50, 50), new Point(Math.random() * 2 - 1, Math.random() * 2 - 1), randomColor());
        spark.update(this.ctx);
        totalSparks += sparksPerIteration;
      }
    }
    this.reset();
    idealReleaseRate = totalSparks / milliseconds / 60 / 2;
    console.log("ideal release rate = " + idealReleaseRate);
    return idealReleaseRate;
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
    this.active = true;
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
      this.active = false;
    }
    this.location.x += this.velocity.x;
    this.location.y += this.velocity.y;
    this.radius *= this.radiusDecay;
  };

  return Spark;

})();

VelocityMap = (function() {
  function VelocityMap(src) {
    this.handleImageLoad = __bind(this.handleImageLoad, this);
    this.image = new Image();
    this.image.onload = this.handleImageLoad;
    this.loaded = false;
  }

  VelocityMap.prototype.handleImageLoad = function() {
    var imgCanvas, imgCtx, imgHeight, imgWidth;
    imgCanvas = document.createElement("canvas");
    imgCanvas.width = imgWidth = this.image.width;
    imgCanvas.height = imgHeight = this.image.height;
    imgCtx = imgCanvas.getContext("2d");
    imgCtx.drawImage(image, 0, 0);
    this.imageData = imgCtx.getImageData(x, y, imgCanvas.width, imgCanvas.height);
    return this.width = imgCanvas.width;
  };

  VelocityMap.prototype.velocityAt = function(x, y) {
    var offset;
    offset = y * this.width + x;
    return new Point((this.imageData[offset] / 128 - 1) * MAX_INITIAL_V, (this.imageData[offset + 1] / 128 - 1) * MAX_INITIAL_V);
  };

  VelocityMap.prototype.isTextAt = function(x, y) {
    var offset;
    offset = y * this.width + x;
    return this.imageData[offset + 2] > 128;
  };

  return VelocityMap;

})();

random = function(from, to) {
  return from + (Math.random() * (to - from));
};

if (Date.now) {
  getTimer = Date.now;
} else {
  getTimer = function() {
    return new Date().getTime();
  };
}

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