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

var BACKGROUND_COLOR, BG_RELEASE_PROBABILITY, ColorSparks, DARKENING_ALPHA, DARKENING_DIAMETER, FORCE_AMPLITUDE, FORCE_PERIOD, GREY_VALUE, INITIAL_DIAMETER, INITIAL_SPARKS_PER_SECOND, MAX_INITIAL_V, MAX_SPARKS_PER_SECOND, MIN_SPARKS_PER_SECOND, Point, RADIUS_DECAY, Range, SPARKS_PER_SECOND_ADJUST_RATE, SPARK_RELEASE_POWER, SPARK_RELEASE_RADIUS, Spark, TARGET_FPS, TRANSPARENCY, VelocityMap, getTimer, random, randomColor, randomGrey,
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

INITIAL_DIAMETER = new Range(.005, .015);

FORCE_AMPLITUDE = new Range(-0.2, 0.2);

FORCE_PERIOD = new Range(10, 50);

GREY_VALUE = new Range(0, 128);

TRANSPARENCY = 0.1;

BG_RELEASE_PROBABILITY = 0.3;

BACKGROUND_COLOR = "#000000";

SPARK_RELEASE_RADIUS = 0.1;

SPARK_RELEASE_POWER = 2;

DARKENING_DIAMETER = new Range(0.002, 0.01);

DARKENING_ALPHA = 0.1;

INITIAL_SPARKS_PER_SECOND = 500;

MAX_SPARKS_PER_SECOND = 1500;

MIN_SPARKS_PER_SECOND = 100;

TARGET_FPS = 30;

SPARKS_PER_SECOND_ADJUST_RATE = 0.05;

ColorSparks = (function() {
  function ColorSparks(canvas, velocityMapUrl, logPerformance) {
    this.canvas = canvas;
    this.logPerformance = logPerformance != null ? logPerformance : false;
    this.updateSparkPosition = __bind(this.updateSparkPosition, this);
    this.draw = __bind(this.draw, this);
    this.ctx = canvas.getContext("2d");
    this.velocityMap = new VelocityMap(velocityMapUrl);
    this.frameCount = 0;
    this.framesPerSecond = 60;
    this.sparksPerSecond = INITIAL_SPARKS_PER_SECOND;
    this.canvas.addEventListener("mousedown", this.updateSparkPosition);
    this.canvas.addEventListener("mousemove", this.updateSparkPosition);
    this.canvas.addEventListener("touchstart", this.updateSparkPosition);
    this.canvas.addEventListener("touchmove", this.updateSparkPosition);
    this.reset();
    window.requestAnimationFrame(this.draw);
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
    var finishedUpTo, i, sparksToRelease, _i;
    if (!(this.height === this.canvas.offsetHeight && this.width === this.canvas.offsetWidth)) {
      this.reset();
    }
    if (this.velocityMap.loaded) {
      this.frameCount += 1;
      if (this.frameCount % 10 === 1) {
        this.framesPerSecond = Math.round(10 / (timestamp - this.prevTimestamp) * 1000) || 60;
        this.prevTimestamp = timestamp;
      }
      if (this.framesPerSecond < TARGET_FPS && this.sparksPerSecond > MIN_SPARKS_PER_SECOND) {
        this.sparksPerSecond -= this.sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE;
      } else if (this.framesPerSecond > TARGET_FPS && this.sparksPerSecond < MAX_SPARKS_PER_SECOND) {
        this.sparksPerSecond += this.sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE;
      }
      if (this.logPerformance && this.frameCount % 10 === 0) {
        console.log("fps=" + this.framesPerSecond + ", sparks=" + this.sparks.length + ", releaseRate=" + (this.sparksPerSecond.toFixed(2)));
      }
      sparksToRelease = this.sparksPerSecond / this.framesPerSecond;
      for (i = _i = 0; _i <= sparksToRelease; i = _i += 1) {
        this.releaseSpark(this.releaseX, this.releaseY);
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
    }
    window.requestAnimationFrame(this.draw);
  };

  ColorSparks.prototype.updateSparkPosition = function(event) {
    this.releaseX = event.offsetX || event.layerX;
    this.releaseY = event.offsetY || event.layerY;
    return event.preventDefault();
  };

  ColorSparks.prototype.releaseSpark = function(centerX, centerY) {
    var angle, isForeground, offset, spark, velocity, x, y, _ref;
    offset = Math.pow(Math.random(), SPARK_RELEASE_POWER) * SPARK_RELEASE_RADIUS * this.width;
    angle = Math.random() * Math.PI * 2;
    x = centerX + Math.sin(angle) * offset;
    y = centerY + Math.cos(angle) * offset;
    _ref = this.velocityMap.dataAt(x, y, this.width, this.height), velocity = _ref[0], isForeground = _ref[1];
    if ((!isForeground) && Math.random() > BG_RELEASE_PROBABILITY) {
      return;
    }
    spark = new Spark(new Point(x, y), velocity, isForeground, Math.max(this.width, this.height));
    return this.sparks.push(spark);
  };

  return ColorSparks;

})();

Spark = (function() {
  function Spark(location, velocity, isForeground, canvasWidth) {
    this.location = location;
    this.velocity = velocity;
    this.update = __bind(this.update, this);
    this.initialLocation = this.location.clone();
    this.forceCounter = 0;
    this.active = true;
    this.radius = INITIAL_DIAMETER.get() / 2 * canvasWidth;
    this.radiusDecay = RADIUS_DECAY.get();
    this.xForceAmplitude = FORCE_AMPLITUDE.get();
    this.xForcePeriod = FORCE_PERIOD.get();
    this.yForceAmplitude = FORCE_AMPLITUDE.get();
    this.yForcePeriod = FORCE_PERIOD.get();
    if (isForeground) {
      this.color = randomColor();
      this.darkeningRadius = DARKENING_DIAMETER.get() / 2 * canvasWidth;
    } else {
      this.color = randomGrey();
      this.darkeningRadius = false;
    }
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
    if (this.darkeningRadius) {
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
    this.src = src;
    this.handleImageError = __bind(this.handleImageError, this);
    this.handleImageLoad = __bind(this.handleImageLoad, this);
    this.loaded = false;
    this.image = new Image();
    this.image.onload = this.handleImageLoad;
    this.image.onerror = this.handleImageError;
    this.image.src = this.src;
  }

  VelocityMap.prototype.handleImageLoad = function() {
    var imgCanvas, imgCtx;
    imgCanvas = document.createElement("canvas");
    imgCanvas.width = this.imgWidth = this.image.width;
    imgCanvas.height = this.imgHeight = this.image.height;
    imgCtx = imgCanvas.getContext("2d");
    imgCtx.drawImage(this.image, 0, 0);
    this.imageData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height).data;
    return this.loaded = true;
  };

  VelocityMap.prototype.handleImageError = function(event) {
    return console.error("Image " + this.src + " failed to load", event);
  };

  VelocityMap.prototype.dataAt = function(x, y, canvasWidth, canvasHeight) {
    var isForeground, offset, sampleX, sampleY, scale, velocity, yOffset;
    scale = this.imgWidth / canvasWidth;
    yOffset = ((canvasHeight * scale) - this.imgHeight) / 2;
    sampleX = Math.floor(x * scale);
    sampleY = Math.floor(y * scale - yOffset);
    offset = (sampleY * this.imgWidth + sampleX) * 4;
    if (sampleX < 0 || sampleX > this.imgWidth || sampleY < 0 || sampleY > this.imgHeight) {
      return [new Point(0, 0), false];
    }
    velocity = new Point((this.imageData[offset] / 128 - 1) * MAX_INITIAL_V, (this.imageData[offset + 1] / 128 - 1) * MAX_INITIAL_V);
    isForeground = this.imageData[offset + 2] > 128;
    return [velocity, isForeground];
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