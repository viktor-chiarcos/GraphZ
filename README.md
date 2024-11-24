# GraphZ

Meine Schaltkreise von [ZNATOK](https://znatok.ru/link/?start-graphz)

1. Kreis , Light_01_04 P. 36, Auswahl Fortgeschrittener,( Import )[komando_licht_streifen_grün_rot_blau_gelb_hell-lila_lila_orange_weiß.gphz]
 Code:#include <Adafruit_GFX.h>
#include <Adafruit_NeoMatrix.h>
#include <Adafruit_NeoPixel.h>
#include <FastLED.h>


#define MATRIX_PIN 8
#define BUTTON_PIN1 9
#define BUTTON_PIN2 5


Adafruit_NeoMatrix matrix = Adafruit_NeoMatrix(8, 8, MATRIX_PIN,
                            NEO_MATRIX_BOTTOM + NEO_MATRIX_RIGHT +
                            NEO_MATRIX_ROWS + NEO_MATRIX_PROGRESSIVE,
                            NEO_GRB + NEO_KHZ800);

const int MAX_BRIGHTNESS = 10;


void setup()
{
  matrix.begin();
  matrix.fillScreen(0);
  matrix.setBrightness(MAX_BRIGHTNESS);
  pinMode(BUTTON_PIN1, INPUT_PULLUP);
  pinMode(BUTTON_PIN2, INPUT_PULLUP);
  
  matrix.fillScreen(0);
  matrix.setPixelColor(0, 255, 255, 255);
  matrix.setPixelColor(1, 255, 150, 0);
  matrix.setPixelColor(2, 200, 0, 255);
  matrix.setPixelColor(3, 100, 0, 255);
  matrix.setPixelColor(4, 255, 255, 0);
  matrix.setPixelColor(5, 0, 0, 255);
  matrix.setPixelColor(6, 255, 0, 0);
  matrix.setPixelColor(7, 150, 255, 0);
  matrix.setPixelColor(8, 255, 150, 0);
  matrix.setPixelColor(9, 200, 0, 255);
  matrix.setPixelColor(10, 100, 0, 255);
  matrix.setPixelColor(11, 255, 255, 0);
  matrix.setPixelColor(12, 0, 0, 255);
  matrix.setPixelColor(13, 255, 0, 0);
  matrix.setPixelColor(14, 150, 255, 0);
  matrix.setPixelColor(15, 255, 0, 0);
  matrix.setPixelColor(16, 200, 0, 255);
  matrix.setPixelColor(17, 100, 0, 255);
  matrix.setPixelColor(18, 255, 255, 0);
  matrix.setPixelColor(19, 0, 0, 255);
  matrix.setPixelColor(20, 255, 0, 0);
  matrix.setPixelColor(21, 150, 255, 0);
  matrix.setPixelColor(22, 255, 0, 0);
  matrix.setPixelColor(23, 0, 0, 255);
  matrix.setPixelColor(24, 100, 0, 255);
  matrix.setPixelColor(25, 255, 255, 0);
  matrix.setPixelColor(26, 0, 0, 255);
  matrix.setPixelColor(27, 255, 0, 0);
  matrix.setPixelColor(28, 150, 255, 0);
  matrix.setPixelColor(29, 255, 0, 0);
  matrix.setPixelColor(30, 0, 0, 255);
  matrix.setPixelColor(31, 255, 255, 0);
  matrix.setPixelColor(32, 255, 255, 0);
  matrix.setPixelColor(33, 0, 0, 255);
  matrix.setPixelColor(34, 255, 0, 0);
  matrix.setPixelColor(35, 150, 255, 0);
  matrix.setPixelColor(36, 255, 0, 0);
  matrix.setPixelColor(37, 0, 0, 255);
  matrix.setPixelColor(38, 255, 255, 0);
  matrix.setPixelColor(39, 100, 0, 255);
  matrix.setPixelColor(40, 0, 0, 255);
  matrix.setPixelColor(41, 255, 0, 0);
  matrix.setPixelColor(42, 150, 255, 0);
  matrix.setPixelColor(43, 255, 0, 0);
  matrix.setPixelColor(44, 0, 0, 255);
  matrix.setPixelColor(45, 255, 255, 0);
  matrix.setPixelColor(46, 100, 0, 255);
  matrix.setPixelColor(47, 200, 0, 255);
  matrix.setPixelColor(48, 255, 0, 0);
  matrix.setPixelColor(49, 150, 255, 0);
  matrix.setPixelColor(50, 255, 0, 0);
  matrix.setPixelColor(51, 0, 0, 255);
  matrix.setPixelColor(52, 255, 255, 0);
  matrix.setPixelColor(53, 100, 0, 255);
  matrix.setPixelColor(54, 200, 0, 255);
  matrix.setPixelColor(55, 255, 150, 0);
  matrix.setPixelColor(56, 150, 255, 0);
  matrix.setPixelColor(57, 255, 0, 0);
  matrix.setPixelColor(58, 0, 0, 255);
  matrix.setPixelColor(59, 255, 255, 0);
  matrix.setPixelColor(60, 100, 0, 255);
  matrix.setPixelColor(61, 200, 0, 255);
  matrix.setPixelColor(62, 255, 150, 0);
  matrix.setPixelColor(63, 255, 255, 255);
  matrix.show();


}
void loop(){}

compile and Upload
error , Check COM PORT
COM 4 
compile and Upload
Upload succesfully
Leuchten erfolgreich

2.Kreis, Lamp_Control-1P. 58, Auswahl Fortgeschrittener, 
Import komando_arduino_start_lampe_benutzerdefinierte_farbe.gphz


#define LAMP_PIN 8




void setup()
{
  pinMode(LAMP_PIN, OUTPUT);
  

}
void loop()
{
  digitalWrite(LAMP_PIN, HIGH);
  delay(9900);
  analogWrite(LAMP_PIN, 127);
  delay(5000);
  for (int br = 255; br > 0; br -= 5)
  {
    analogWrite(LAMP_PIN, br);
    delay(5);
  }

}
Save : Lampprogg.gphz 
compile and Upload 
Upload scussefull

3. Auswahl Arduino Light Mini, Auswahl Scheme Light_01_04,Auswahl Fortgeschrittener, Auswahl LED Matrix Draw, Auswahl Settings,
Auswahl..., Auswahl Finish,Farbebild Code: 
  matrix.fillScreen(0);
  matrix.setPixelColor(0, 100, 0, 255);
  matrix.setPixelColor(1, 100, 0, 255);
  matrix.setPixelColor(2, 100, 0, 255);
  matrix.setPixelColor(3, 100, 0, 255);
  matrix.setPixelColor(4, 100, 0, 255);
  matrix.setPixelColor(5, 100, 0, 255);
  matrix.setPixelColor(6, 100, 0, 255);
  matrix.setPixelColor(7, 100, 0, 255);
  matrix.setPixelColor(8, 100, 0, 255);
  matrix.setPixelColor(9, 200, 0, 255);
  matrix.setPixelColor(10, 200, 0, 255);
  matrix.setPixelColor(11, 200, 0, 255);
  matrix.setPixelColor(12, 200, 0, 255);
  matrix.setPixelColor(13, 200, 0, 255);
  matrix.setPixelColor(14, 200, 0, 255);
  matrix.setPixelColor(15, 100, 0, 255);
  matrix.setPixelColor(16, 100, 0, 255);
  matrix.setPixelColor(17, 200, 0, 255);
  matrix.setPixelColor(18, 0, 0, 255);
  matrix.setPixelColor(19, 0, 0, 255);
  matrix.setPixelColor(20, 0, 0, 255);
  matrix.setPixelColor(21, 0, 0, 255);
  matrix.setPixelColor(22, 200, 0, 255);
  matrix.setPixelColor(23, 100, 0, 255);
  matrix.setPixelColor(24, 100, 0, 255);
  matrix.setPixelColor(25, 200, 0, 255);
  matrix.setPixelColor(26, 0, 0, 255);
  matrix.setPixelColor(27, 0, 200, 255);
  matrix.setPixelColor(28, 0, 200, 255);
  matrix.setPixelColor(29, 0, 0, 255);
  matrix.setPixelColor(30, 200, 0, 255);
  matrix.setPixelColor(31, 100, 0, 255);
  matrix.setPixelColor(32, 100, 0, 255);
  matrix.setPixelColor(33, 200, 0, 255);
  matrix.setPixelColor(34, 0, 0, 255);
  matrix.setPixelColor(35, 0, 200, 255);
  matrix.setPixelColor(36, 0, 200, 255);
  matrix.setPixelColor(37, 0, 0, 255);
  matrix.setPixelColor(38, 200, 0, 255);
  matrix.setPixelColor(39, 100, 0, 255);
  matrix.setPixelColor(40, 100, 0, 255);
  matrix.setPixelColor(41, 200, 0, 255);
  matrix.setPixelColor(42, 0, 0, 255);
  matrix.setPixelColor(43, 0, 0, 255);
  matrix.setPixelColor(44, 0, 0, 255);
  matrix.setPixelColor(45, 0, 0, 255);
  matrix.setPixelColor(46, 200, 0, 255);
  matrix.setPixelColor(47, 100, 0, 255);
  matrix.setPixelColor(48, 100, 0, 255);
  matrix.setPixelColor(49, 200, 0, 255);
  matrix.setPixelColor(50, 200, 0, 255);
  matrix.setPixelColor(51, 200, 0, 255);
  matrix.setPixelColor(52, 200, 0, 255);
  matrix.setPixelColor(53, 200, 0, 255);
  matrix.setPixelColor(54, 200, 0, 255);
  matrix.setPixelColor(55, 100, 0, 255);
  matrix.setPixelColor(56, 100, 0, 255);
  matrix.setPixelColor(57, 100, 0, 255);
  matrix.setPixelColor(58, 100, 0, 255);
  matrix.setPixelColor(59, 100, 0, 255);
  matrix.setPixelColor(60, 100, 0, 255);
  matrix.setPixelColor(61, 100, 0, 255);
  matrix.setPixelColor(62, 100, 0, 255);
  matrix.setPixelColor(63, 100, 0, 255);
  matrix.show();
  
Code: #include <Adafruit_GFX.h>
#include <Adafruit_NeoMatrix.h>
#include <Adafruit_NeoPixel.h>
#include <FastLED.h>


#define MATRIX_PIN 8
#define BUTTON_PIN1 9
#define BUTTON_PIN2 5
#define BUTTON_PIN3 6


Adafruit_NeoMatrix matrix = Adafruit_NeoMatrix(8, 8, MATRIX_PIN,
                            NEO_MATRIX_BOTTOM + NEO_MATRIX_RIGHT +
                            NEO_MATRIX_ROWS + NEO_MATRIX_PROGRESSIVE,
                            NEO_GRB + NEO_KHZ800);

const int MAX_BRIGHTNESS = 10;


void setup()
{
  matrix.begin();
  matrix.fillScreen(0);
  matrix.setBrightness(MAX_BRIGHTNESS);
  pinMode(BUTTON_PIN1, INPUT_PULLUP);
  pinMode(BUTTON_PIN2, INPUT_PULLUP);
  pinMode(BUTTON_PIN3, INPUT_PULLUP);
  
  matrix.fillScreen(0);
  matrix.setPixelColor(0, 100, 0, 255);
  matrix.setPixelColor(1, 100, 0, 255);
  matrix.setPixelColor(2, 100, 0, 255);
  matrix.setPixelColor(3, 100, 0, 255);
  matrix.setPixelColor(4, 100, 0, 255);
  matrix.setPixelColor(5, 100, 0, 255);
  matrix.setPixelColor(6, 100, 0, 255);
  matrix.setPixelColor(7, 100, 0, 255);
  matrix.setPixelColor(8, 100, 0, 255);
  matrix.setPixelColor(9, 200, 0, 255);
  matrix.setPixelColor(10, 200, 0, 255);
  matrix.setPixelColor(11, 200, 0, 255);
  matrix.setPixelColor(12, 200, 0, 255);
  matrix.setPixelColor(13, 200, 0, 255);
  matrix.setPixelColor(14, 200, 0, 255);
  matrix.setPixelColor(15, 100, 0, 255);
  matrix.setPixelColor(16, 100, 0, 255);
  matrix.setPixelColor(17, 200, 0, 255);
  matrix.setPixelColor(18, 0, 0, 255);
  matrix.setPixelColor(19, 0, 0, 255);
  matrix.setPixelColor(20, 0, 0, 255);
  matrix.setPixelColor(21, 0, 0, 255);
  matrix.setPixelColor(22, 200, 0, 255);
  matrix.setPixelColor(23, 100, 0, 255);
  matrix.setPixelColor(24, 100, 0, 255);
  matrix.setPixelColor(25, 200, 0, 255);
  matrix.setPixelColor(26, 0, 0, 255);
  matrix.setPixelColor(27, 0, 200, 255);
  matrix.setPixelColor(28, 0, 200, 255);
  matrix.setPixelColor(29, 0, 0, 255);
  matrix.setPixelColor(30, 200, 0, 255);
  matrix.setPixelColor(31, 100, 0, 255);
  matrix.setPixelColor(32, 100, 0, 255);
  matrix.setPixelColor(33, 200, 0, 255);
  matrix.setPixelColor(34, 0, 0, 255);
  matrix.setPixelColor(35, 0, 200, 255);
  matrix.setPixelColor(36, 0, 200, 255);
  matrix.setPixelColor(37, 0, 0, 255);
  matrix.setPixelColor(38, 200, 0, 255);
  matrix.setPixelColor(39, 100, 0, 255);
  matrix.setPixelColor(40, 100, 0, 255);
  matrix.setPixelColor(41, 200, 0, 255);
  matrix.setPixelColor(42, 0, 0, 255);
  matrix.setPixelColor(43, 0, 0, 255);
  matrix.setPixelColor(44, 0, 0, 255);
  matrix.setPixelColor(45, 0, 0, 255);
  matrix.setPixelColor(46, 200, 0, 255);
  matrix.setPixelColor(47, 100, 0, 255);
  matrix.setPixelColor(48, 100, 0, 255);
  matrix.setPixelColor(49, 200, 0, 255);
  matrix.setPixelColor(50, 200, 0, 255);
  matrix.setPixelColor(51, 200, 0, 255);
  matrix.setPixelColor(52, 200, 0, 255);
  matrix.setPixelColor(53, 200, 0, 255);
  matrix.setPixelColor(54, 200, 0, 255);
  matrix.setPixelColor(55, 100, 0, 255);
  matrix.setPixelColor(56, 100, 0, 255);
  matrix.setPixelColor(57, 100, 0, 255);
  matrix.setPixelColor(58, 100, 0, 255);
  matrix.setPixelColor(59, 100, 0, 255);
  matrix.setPixelColor(60, 100, 0, 255);
  matrix.setPixelColor(61, 100, 0, 255);
  matrix.setPixelColor(62, 100, 0, 255);
  matrix.setPixelColor(63, 100, 0, 255);
  matrix.show();


}
void loop(){}

Compile And Upload 
avarube.exe
Error Ceck COM PORT
COM9
Compile and Upload
avarube.exe
successfully
Save komando_licht_lilla_blau
4.

