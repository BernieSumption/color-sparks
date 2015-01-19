


# Represents a property that can take any value in a range
class Range
  constructor: (@from, @to) ->
  get: ->
    random @from, @to

# Configuration constants.
# All measurements are relative to canvas width

RADIUS_DECAY = new Range(0.95, 0.99)
MAX_INITIAL_V = 1
INITIAL_DIAMETER = new Range(.005, .015)
FORCE_AMPLITUDE = new Range(-0.2, 0.2)
FORCE_PERIOD = new Range(10, 50)
GREY_VALUE = new Range(0, 128)
TRANSPARENCY = 0.1
BG_RELEASE_PROBABILITY = 0.3
BACKGROUND_COLOR = "#000000"
SPARK_RELEASE_RADIUS = 0.1
SPARK_RELEASE_POWER = 2
DARKENING_DIAMETER = new Range(0.002, 0.01)
DARKENING_ALPHA = 0.1


INITIAL_SPARKS_PER_SECOND = 500
MAX_SPARKS_PER_SECOND = 1500
MIN_SPARKS_PER_SECOND = 100
TARGET_FPS = 30
SPARKS_PER_SECOND_ADJUST_RATE = 0.05


# A canvas onto which dots are drawn
class ColorSparks
  constructor: (@canvas, velocityMapUrl, @logPerformance = false) ->
    @ctx = canvas.getContext "2d"
    @velocityMap = new VelocityMap(velocityMapUrl)

    @frameCount = 0
    @framesPerSecond = 60
    @sparksPerSecond = INITIAL_SPARKS_PER_SECOND

    @canvas.addEventListener "mousedown", @updateSparkPosition
    @canvas.addEventListener "mousemove", @updateSparkPosition
    @canvas.addEventListener "touchstart", @updateSparkPosition
    @canvas.addEventListener "touchmove", @updateSparkPosition

    @reset()

    window.requestAnimationFrame @draw

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

    if @velocityMap.loaded

      # calculate frames per second, averaging over 10 frames for consistency
      @frameCount += 1
      if @frameCount % 10 == 1
        @framesPerSecond = Math.round(10 / (timestamp - @prevTimestamp) * 1000) || 60 # assume 60 fps on first frame
        @prevTimestamp = timestamp

      # adjust spark release rate up or down to hit target fps
      if @framesPerSecond < TARGET_FPS and @sparksPerSecond > MIN_SPARKS_PER_SECOND
        @sparksPerSecond -= (@sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE)
      else if @framesPerSecond > TARGET_FPS and @sparksPerSecond < MAX_SPARKS_PER_SECOND
        @sparksPerSecond += (@sparksPerSecond * SPARKS_PER_SECOND_ADJUST_RATE)

      if @logPerformance and @frameCount % 10 == 0
        console.log "fps=#{@framesPerSecond}, sparks=#{@sparks.length}, releaseRate=#{@sparksPerSecond.toFixed(2)}"

      sparksToRelease = @sparksPerSecond / @framesPerSecond
      for i in [0..sparksToRelease] by 1
        @releaseSpark(@releaseX, @releaseY)
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
    event.preventDefault()


  releaseSpark: (centerX, centerY) ->
    offset = Math.pow(Math.random(), SPARK_RELEASE_POWER) * SPARK_RELEASE_RADIUS * @width
    angle = Math.random() * Math.PI * 2
    x = centerX + Math.sin(angle) * offset
    y = centerY + Math.cos(angle) * offset

    [velocity, isForeground] = @velocityMap.dataAt(x, y, @width, @height)
    if (!isForeground) and Math.random() > BG_RELEASE_PROBABILITY
      return
    spark = new Spark(
      new Point(x, y),
      velocity,
      isForeground,
      Math.max(@width, @height))
    @sparks.push(spark)



# A single dot on a ColorSparks canvas
class Spark

  # Create a point with location and velocity Points
  # and a color style
  constructor: (@location, @velocity, isForeground, canvasWidth) ->
    @initialLocation = @location.clone()
    @forceCounter = 0
    @active = true

    @radius = INITIAL_DIAMETER.get() / 2 * canvasWidth
    @radiusDecay = RADIUS_DECAY.get()
    @xForceAmplitude = FORCE_AMPLITUDE.get()
    @xForcePeriod = FORCE_PERIOD.get()
    @yForceAmplitude = FORCE_AMPLITUDE.get()
    @yForcePeriod = FORCE_PERIOD.get()

    if isForeground
      @color = randomColor()
      @darkeningRadius = DARKENING_DIAMETER.get() / 2 * canvasWidth
    else
      @color = randomGrey()
      @darkeningRadius = false


  update: (ctx) =>
    ctx.beginPath()
    ctx.arc @location.x, @location.y, @radius, 0, Math.PI * 2, false
    ctx.closePath()
    ctx.fillStyle = @color
    ctx.fill()
    @forceCounter++
    @velocity.x += Math.sin(Math.PI * 2 * @forceCounter / @xForcePeriod) * @xForceAmplitude
    @velocity.y += Math.sin(Math.PI * 2 * @forceCounter / @yForcePeriod) * @yForceAmplitude
    if @darkeningRadius
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


# A class that uses a source image to control direction of movement
# the red and green channels of the image are x and y velocity, the
# blue channel defines whether a pixel is considered "foreground"
class VelocityMap
  constructor: (@src) ->
    @loaded = false
    @image = new Image()
    @image.onload = @handleImageLoad
    @image.onerror = @handleImageError
    @image.src = @src

  handleImageLoad: =>
    imgCanvas = document.createElement("canvas")
    imgCanvas.width = @imgWidth = @image.width
    imgCanvas.height = @imgHeight = @image.height
    imgCtx = imgCanvas.getContext("2d")
    imgCtx.drawImage @image, 0, 0
    @imageData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height).data
    @loaded = true

  handleImageError: (event) =>
    console.error("Image #{@src} failed to load", event)

  # return the data at a specific position as a 2-array of [velocity, isForeground]
  dataAt: (x, y, canvasWidth, canvasHeight) ->

    scale = @imgWidth / canvasWidth
    yOffset = ((canvasHeight * scale) - @imgHeight) / 2

    sampleX = Math.floor(x * scale)
    sampleY = Math.floor(y * scale - yOffset)

    offset = (sampleY * @imgWidth + sampleX) * 4

    if sampleX < 0 or sampleX > @imgWidth or sampleY < 0 or sampleY > @imgHeight
      return [new Point(0, 0), false]

    velocity = new Point(
      (@imageData[offset] / 128 - 1) * MAX_INITIAL_V
      (@imageData[offset+1] / 128 - 1) * MAX_INITIAL_V)
    isForeground = @imageData[offset+2] > 128
    return [velocity, isForeground]



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
