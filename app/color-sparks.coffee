


# Represents a property that can take any value in a range
class Range
  constructor: (@from, @to) ->
  get: ->
    random @from, @to

# Configuration constants


RADIUS_DECAY = new Range(0.95, 0.99)
MAX_INITIAL_V = 1
INITIAL_DIAMETER = new Range(5, 20)
FORCE_AMPLITUDE = new Range(-0.2, 0.2)
FORCE_PERIOD = new Range(10, 50)
GREY_VALUE = new Range(0, 128)
TRANSPARENCY = 0.1
SPARK_FRAMES_PER_SECOND = 10
BG_RELEASE_PROBABILITY = 0.3
DARKENING_DIAMETER = new Range(3, 7)
DARKENING_BEGIN_DELAY = 5
DARKENING_ALPHA = 0.1
BACKGROUND_COLOR = "#000000"


INITIAL_SPARKS_PER_SECOND = 1000
MAX_SPARKS_PER_SECOND = 2000
MIN_SPARKS_PER_SECOND = 100
TARGET_FPS = 50
SPARKS_PER_SECOND_ADJUST_RATE = 0.001


# A canvas onto which dots are drawn
class ColorSparks
  constructor: (@canvas, velocityMapUrl, @logPerformance = false) ->
    @ctx = canvas.getContext "2d"
    @reset()

    @frameCount = 0
    @framesPerSecond = 60
    @sparksPerSecond = INITIAL_SPARKS_PER_SECOND

    window.requestAnimationFrame @draw

    @canvas.addEventListener "mousedown", @updateSparkPosition
    @canvas.addEventListener "mousemove", @updateSparkPosition
    @canvas.addEventListener "touchstart", @updateSparkPosition
    @canvas.addEventListener "touchmove", @updateSparkPosition

  # wipe the canvas and reset the animation state
  reset: ->
    @canvas.height = @height = @canvas.offsetHeight
    @canvas.width = @width = @canvas.offsetWidth
    @ctx.beginPath()
    @ctx.rect 0, 0, @canvas.width, @canvas.height
    @ctx.closePath()
    @ctx.fillStyle = BACKGROUND_COLOR
    @ctx.fill()
    @releaseX = @width/2
    @releaseY = @height/2
    @sparks = []
    return

  # main rendering function executed every frame
  draw: (timestamp) =>
    unless @height == @canvas.offsetHeight and @width == @canvas.offsetWidth
      @reset()

    # calculate frames per second, averaging over 10 frames for consistency
    @frameCount += 1
    if @frameCount % 10 == 1
      @framesPerSecond = Math.round(10 / (timestamp - @prevTimestamp) * 1000) || 60 # assume 60 fps on first frame
      @prevTimestamp = timestamp

    # adjust spark release rate up or down to hit target fps
    if @framesPerSecond < TARGET_FPS and @sparksPerSecond < MAX_SPARKS_PER_SECOND
      @sparksPerSecond -= (@sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE)
    else if @framesPerSecond > TARGET_FPS and @sparksPerSecond > MIN_SPARKS_PER_SECOND
      @sparksPerSecond += (@sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE)

    if @logPerformance and @frameCount % 100 == 0
        console.log "fps=#{@framesPerSecond}, sparks=#{@sparks.length}, releaseRate=#{@sparksPerSecond.toFixed(2)}"

    sparksToRelease = @sparksPerSecond / @framesPerSecond
    for i in [0..sparksToRelease] by 1
      spark = new Spark(
        new Point(@releaseX, @releaseY),
        new Point(Math.random()*2-1, Math.random()*2-1),
        randomColor())
      @sparks.push(spark)
    @timestampLastFrame = timestamp

    i = 0
    finishedUpTo = -1
    while i < @sparks.length
      if @sparks[i].active
        @sparks[i].update(@ctx)
      else if finishedUpTo == i - 1
          finishedUpTo = i
      i++
    if finishedUpTo > -1
      @sparks.splice 0, finishedUpTo + 1

    window.requestAnimationFrame @draw
    return


  updateSparkPosition: (event) =>
    @releaseX = event.offsetX || event.layerX
    @releaseY = event.offsetY || event.layerY


  calculateReleaseRate: ->
    milliseconds = 10
    sparksPerIteration = 100
    start = getTimer()
    totalSparks = 0
    while getTimer() - start < milliseconds
      for i in [0..sparksPerIteration] by 1
        spark = new Spark(
          new Point(50, 50),
          new Point(Math.random()*2-1, Math.random()*2-1),
          randomColor())
        spark.update(@ctx)
        totalSparks += sparksPerIteration
    @reset()
    idealReleaseRate = totalSparks / milliseconds / 60 / 2
    console.log "ideal release rate = #{idealReleaseRate}"
    return idealReleaseRate





# A single dot on a ColorSparks canvas
class Spark

  # Create a point with location and velocity Points
  # and a color style
  constructor: (@location, @velocity, @color) ->
    @initialLocation = @location.clone()
    @forceCounter = 0
    @active = true

    @radius = INITIAL_DIAMETER.get() / 2
    @radiusDecay = RADIUS_DECAY.get()
    @darkeningRadius = DARKENING_DIAMETER.get() / 2
    @xForceAmplitude = FORCE_AMPLITUDE.get()
    @xForcePeriod = FORCE_PERIOD.get()
    @yForceAmplitude = FORCE_AMPLITUDE.get()
    @yForcePeriod = FORCE_PERIOD.get()

  update: (ctx) ->
    ctx.beginPath()
    ctx.arc @location.x, @location.y, @radius, 0, Math.PI * 2, false
    ctx.closePath()
    ctx.fillStyle = @color
    ctx.fill()
    @forceCounter++
    @velocity.x += Math.sin(Math.PI * 2 * @forceCounter / @xForcePeriod) * @xForceAmplitude
    @velocity.y += Math.sin(Math.PI * 2 * @forceCounter / @yForcePeriod) * @yForceAmplitude
    if @isText
      ctx.beginPath()
      ctx.arc @initialLocation.x + random(-1, 1), @initialLocation.y + random(-1, 1), @darkeningRadius, 0, Math.PI * 2, false
      ctx.closePath()
      ctx.fillStyle = "rgba(0, 0, 0, " + DARKENING_ALPHA + ")"
      ctx.fill()
    if @radius < 1
      @active = false
    @location.x += @velocity.x
    @location.y += @velocity.y
    @radius *= @radiusDecay
    return


# A class for reading pixel data from an image
class VelocityMap
  constructor: (src) ->
    @image = new Image()
    @image.onload = @handleImageLoad
    @loaded = false

  handleImageLoad: =>
    imgCanvas = document.createElement("canvas")
    imgCanvas.width = imgWidth = @image.width
    imgCanvas.height = imgHeight = @image.height
    imgCtx = imgCanvas.getContext("2d")
    imgCtx.drawImage image, 0, 0
    @imageData = imgCtx.getImageData(x, y, imgCanvas.width, imgCanvas.height)
    @width = imgCanvas.width

  velocityAt: (x, y) ->
    offset = y * @width + x
    return new Point(
      (@imageData[offset] / 128 - 1) * MAX_INITIAL_V
      (@imageData[offset+1] / 128 - 1) * MAX_INITIAL_V)

  isTextAt: (x, y) ->
    offset = y * @width + x
    return @imageData[offset+2] > 128


# Generate a random number between from and to
random = (from, to) ->
  from + (Math.random() * (to - from))

# Function to get millisecond-accurate epoch timer, more efficient in
# browsres that support Date.now()

if Date.now
  getTimer = Date.now
else
  getTimer = ->
    new Date().getTime()

# Create a random fully saturated color. Colors are fully
# saturated if they have one RGB value at 255, one at 0, and
# the third at some  arbitrary value.
randomColor = ->
  parts = [
    255
    Math.floor(random(0, 255))
    0
  ]
  parts[1] = "0" + parts[1]  if parts[1].length is 1
  from = 0

  while from < parts.length
    to = Math.floor(random(0, parts.length))
    tmp = parts[from]
    parts[from] = parts[to]
    parts[to] = tmp
    from++
  "rgba(" + parts[0] + "," + parts[1] + "," + parts[2] + "," + TRANSPARENCY + ")"

# Create a random fully desaturated color, i.e. one in which
# R, G and B values are all the same
randomGrey = ->
  shade = Math.floor(GREY_VALUE.get())
  "rgba(" + shade + "," + shade + "," + shade + "," + TRANSPARENCY + ")"



class Point
  constructor: (@x, @y) ->

  clone: -> new Point(@x, @y)
