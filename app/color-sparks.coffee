


# Represents a property that can take any value in a range
class Range
  constructor: (@from, @to) ->
  get: ->
    random @from, @to

# Configuration constants


RADIUS_DECAY = new Range(0.95, 0.99)
MAX_INITIAL_V = 1
INITIAL_DIAMETER = new Range(5, 20)
FORCE_AMPLITUDE = new Range(-0.05, 0.05)
FORCE_PERIOD = new Range(10, 50)
GREY_VALUE = new Range(0, 128)
TRANSPARENCY = 0.1
SPARKS_PER_SECOND = 250
SPARK_FRAMES_PER_SECOND = 10
BG_RELEASE_PROBABILITY = 0.3
DARKENING_DIAMETER = new Range(3, 7)
DARKENING_BEGIN_DELAY = 5
DARKENING_ALPHA = 0.1
BACKGROUND_COLOR = "#000000"

# A canvas onto which dots are drawn
class ColorSparks
  constructor: (@canvas, @logPerformance = false) ->
    @ctx = canvas.getContext "2d"
    @reset()

    window.requestAnimationFrame @draw

    @showFrameRate = true
    window.addEventListener "keyup", (event) =>
      if event.keyCode == 70 # f key
        @showFrameRate = !@showFrameRate

    @canvas.addEventListener "mousedown", @startSparks
    @canvas.addEventListener "mousemove", @updateSparkPosition
    @canvas.addEventListener "mouseup", @endSparks
    @canvas.addEventListener "touchstart", @startSparks
    @canvas.addEventListener "touchmove", @updateSparkPosition
    @canvas.addEventListener "touchend", @endSparks

  # wipe the canvas and reset the animation state
  reset: ->
    @canvas.height = @height = @canvas.offsetHeight
    @canvas.width = @width = @canvas.offsetWidth
    @ctx.beginPath()
    @ctx.rect 0, 0, @canvas.width, @canvas.height
    @ctx.closePath()
    @ctx.fillStyle = BACKGROUND_COLOR
    @ctx.fill()
    @sparks = []

  # main rendering function executed every frame
  draw: (timestamp) =>
    unless @height == @canvas.offsetHeight and @width == @canvas.offsetWidth
      @reset()

    if @releaseSparksAt
      for i in [0..10]
        @sparks.push(
          new Spark(
            @releaseSparksAt.clone(),
            new Point(Math.random()*2-1, Math.random()*2-1),
            randomColor()))

    i = 0
    while i < @sparks.length
      unless @sparks[i].finished
        @sparks[i].update(@ctx)
      else finishedUpTo = i  if finishedUpTo is i - 1
      i++
    @sparks.splice 0, finishedUpTo + 1  unless finishedUpTo is -1

    if @logPerformance
      @frameCount = (@frameCount || 0) + 1
      if Math.floor(timestamp / 1000) != Math.floor(@prevLogTimestamp / 1000)
        fps = Math.round((@frameCount - @prevFrameCount) / (timestamp - @prevLogTimestamp) * 1000)
        console.log "fps= #{fps}"
        @prevLogTimestamp = timestamp
        @prevFrameCount = @frameCount

    window.requestAnimationFrame @draw
    return


  startSparks: (event) =>
    @releaseSparksAt = new Point()
    @updateSparkPosition(event)

  updateSparkPosition: (event) =>
    if @releaseSparksAt
      @releaseSparksAt.x = event.offsetX || event.layerX
      @releaseSparksAt.y = event.offsetY || event.layerY

  endSparks: (event) =>
    @releaseSparksAt = null





# A single dot on a ColorSparks canvas
class Spark

  # Create a point with location and velocity Points
  # and a color style
  constructor: (@location, @velocity, @color) ->
    @initialLocation = @location.clone()
    @forceCounter = 0
    @finished = false

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
    @finished = true  if @radius < 1
    @location.x += @velocity.x
    @location.y += @velocity.y
    @radius *= @radiusDecay
    return


# Generate a random number between from and to
random = (from, to) ->
  from + (Math.random() * (to - from))


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
