import processing.core.*; 
import processing.xml.*; 

import java.applet.*; 
import java.awt.Dimension; 
import java.awt.Frame; 
import java.awt.event.MouseEvent; 
import java.awt.event.KeyEvent; 
import java.awt.event.FocusEvent; 
import java.awt.Image; 
import java.io.*; 
import java.net.*; 
import java.text.*; 
import java.util.*; 
import java.util.zip.*; 
import java.util.regex.*; 

public class imagine_processing extends PApplet {

// CONFIGURATION CONSTANTS
final Range RADIUS_DECAY = new Range(0.95f, 0.98f);
final float MAX_INITIAL_V = 1;
final Range INITIAL_RADIUS = new Range(5, 20);
final Range FORCE_AMPLITUDE = new Range(-0.05f, 0.05f);
final Range FORCE_PERIOD = new Range(10, 50);
final Range GREY_VALUE = new Range(0, 128);
final float TRANSPARENCY = 0.1f;

final int SPARKS_PER_FRAME = 50;
final float SPARK_RELEASE_RADIUS = 200;
final float SPARK_RELEASE_POWER = 2;
final float BG_RELEASE_PROBABILITY = 0.3f;

final Range DARKENING_RADIUS = new Range(3, 7);
final int DARKENING_BEGIN_DELAY = 5;
final int DARKENING = color(0, 0, 0, 20);


// IMPLEMENTATION

LinkedList<Spark> sparks = new LinkedList<Spark>();
ImageData data;
long timeStart;
int frame;

public void setup() {
  data = new ImageData("logo.jpg");
  size(1000, 800);
  background(0);
  frameRate(200);
  mousePressed();
}

// uncomment to enable performance timing
//void mousePressed() {
//  int grid = 10;
//  frame = 0;
//  timeStart = System.currentTimeMillis();
//  for (int i=0; i<width; i+= grid) {
//    for (int j=0; j<height; j+= grid) {
//      sparks.add(new Spark(i, j, data.isTextAt(i, j)));
//    }
//  }
//}

public void draw() {
  if (mousePressed) {
    addSparks(mouseX, mouseY);
  }
  Iterator<Spark> iter = sparks.iterator();
  while(iter.hasNext()) {
    Spark spark = iter.next();
    spark.update();
    if (spark._finished) {
      iter.remove();
    }
  }
  if (timeStart > 0 && ++frame == 20) {
    println("20 frames with " + sparks.size() + " sparks in " + (System.currentTimeMillis() - timeStart) + " ms");
  }
}

public void addSparks(int centerX, int centerY) {
  for (int i=0; i<SPARKS_PER_FRAME; i++) {
    float offset = pow(random(0, 1), SPARK_RELEASE_POWER) * SPARK_RELEASE_RADIUS;
    float angle = random(0, TWO_PI);
    int x = (int) (centerX + sin(angle) * offset);
    int y = (int) (centerY + cos(angle) * offset);
    boolean isText = data.isTextAt(x, y);
    if (!isText && random(0, 1) > BG_RELEASE_PROBABILITY) {
      continue;
    }
    sparks.add(new Spark(x, y, isText));
  }
}


class Spark {
  PVector _location;
  PVector _initialLocation;
  PVector _velocity;
  float _radius;
  float _darkeningRadius;
  float _radiusDecay;
  int _color;
  float _xForceAmplitude;
  float _xForcePeriod;
  float _yForceAmplitude;
  float _yForcePeriod;
  int _forceCounter = 0;
  boolean _isText;
  boolean _finished = false;
  
  
  Spark(int x, int y, boolean isText) {
    _location = new PVector(x, y);
    _initialLocation = new PVector(x, y);
    _isText = isText;
    _velocity = data.velocityAt(x, y);
    _velocity.mult(MAX_INITIAL_V);
    _radius = INITIAL_RADIUS.get();
    _radiusDecay = RADIUS_DECAY.get();
    _color = isText ? randomColor() : randomGrey();
    _darkeningRadius = DARKENING_RADIUS.get();
    
    _xForceAmplitude = FORCE_AMPLITUDE.get();
    _xForcePeriod = FORCE_PERIOD.get();
    _yForceAmplitude = FORCE_AMPLITUDE.get();
    _yForcePeriod = FORCE_PERIOD.get();
  }
  
  public void update() {    
    noStroke();
    fill(_color);
    ellipse(_location.x, _location.y, _radius, _radius);
    
    _forceCounter++;
    float xForce = sin(TWO_PI * _forceCounter / _xForcePeriod) * _xForceAmplitude;
    float yForce = sin(TWO_PI * _forceCounter / _yForcePeriod) * _yForceAmplitude;
    _velocity.add(xForce, yForce, 0);
    
    if (_isText) {
      fill(DARKENING);
      ellipse(_initialLocation.x + random(-1, 1), _initialLocation.y + random(-1, 1), _darkeningRadius, _darkeningRadius);
    }
    
    
    if (_radius < 1) {
      _finished = true;
    }
    
    _location.add(_velocity);
    _radius *= _radiusDecay;
  }
}

class Range {
  float _from, _to;
  Range(float from, float to) {
    _from = from;
    _to = to;
  }
  public float get() {
    return random(_from, _to);
  }
}

/**
 * An image file containing a special kind of image used to drive the
 * animation, where for each pixel, the red and green values encode the
 * x and y velocity vector. The blue is a text mask, where values over
 * 128 indicate text, and equal to or less than 128 indicate background
 */
class ImageData {
  
  PImage _image;
  
  ImageData(String file) {
    _image = loadImage(file);
  }
  
  public boolean isTextAt(float x, float y) {
    return blue(_image.get(dataX(x), dataY(y))) > 128;
  }
  
  public PVector velocityAt(float x, float y) {
    int value = _image.get(dataX(x), dataY(y));
    float vx = (red(value) / 128 - 1) * MAX_INITIAL_V;
    float vy = (green(value) / 128 - 1) * MAX_INITIAL_V;
    return new PVector(vx, vy);
  }
  
  public int dataX(float windowX) {
    return (int) (windowX / width * _image.width);
  }
  
  public int dataY(float windowY) {
    return (int) (windowY / height * _image.height);
  }
}

private int randomColor() {
  // Create a random fully saturated colour. Colours are fully saturated if they have
  // one RGB  value at 255, one at 0, and the third at some  arbitrary value.
  int[] parts = new int[] {255, (int)random(0, 255), 0};
  for (int from=0; from<parts.length; from++) {
    int to = (int) random(0, parts.length);
    int tmp = parts[from];
    parts[from] = parts[to];
    parts[to] = tmp;
  }
  return color(parts[0], parts[1], parts[2], (int) (255 * TRANSPARENCY));
}

private int randomGrey() {
  int shade = (int) GREY_VALUE.get();
  return color(shade, shade, shade, (int) (255 * TRANSPARENCY));
}
  static public void main(String args[]) {
    PApplet.main(new String[] { "--present", "--bgcolor=#666666", "--stop-color=#cccccc", "imagine_processing" });
  }
}
