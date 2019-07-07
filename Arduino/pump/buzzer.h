#ifndef BUZZER_H
#define BUZZER_H

const int buzzer = D8; //buzzer to arduino pin 9

#define LENGTH(x)  (sizeof(x) / sizeof((x)[0]))
#define PLAY(x) (playMusic((Note*)(x), LENGTH(x)))

// Note frequency definition

const int rst = 0;

const int c3  = 261;
const int cs3 = 277;
const int d3  = 293;
const int ds3 = 311;
const int e3  = 329;
const int f3  = 349;
const int fs3 = 369;
const int g3  = 392;
const int gs3 = 415;
const int a3  = 440;
const int as3 = 466;
const int b3  = 493;

const int c4  = c3  << 1;
const int cs4 = cs3 << 1;
const int d4  = d3  << 1;
const int ds4 = ds3 << 1;
const int e4  = e3  << 1;
const int f4  = f3  << 1;
const int fs4 = fs3 << 1;
const int g4  = g3  << 1;
const int gs4 = gs3 << 1;
const int a4  = a3  << 1;
const int as4 = as3 << 1;
const int b4  = b3  << 1;
const int c5  = 523 << 1;

const int _32    = 50;
const int _16    = 100;
const int _8    =  200;
const int _81   = _8 + _16;
const int _4    = _8 << 1;
const int _41   = _4 + _8;
const int _2    = _8 << 2;
const int _1    = _8 << 3;

typedef struct {
   int fr;
   int len;
} Note;

Note music[] = { 
 {fs3, _4},{as3, _32},{b3, _32},{c4, _32},{cs4, _1},{rst, _1}
};

 Note alarm[] = { 
  {c4, _1},{rst, _1}
}; 


/*  {e3, _8}, {a3, _8}, {c4, _8}, {e4, _8}, {a4, _8}, {b4, _8},
    {e3, _8}, {es3, _8}, {b3, _8}, {b4, _8},
    {fs3, _4},{as3, _32},{b3, _32},{c4, _32},{cs4, _1},{rst, _1}
    {c4, _2},{g3, _2},{g4, _1},{rst, _1} 
*/

void playMusic(Note* m, size_t l) 
{ 
  for(int i= 0; i < l; i++) 
  {
    if(m[i].fr == 0)
    {
      noTone(buzzer);
    }
    else 
    {
      tone(buzzer, m[i].fr); 
    }
    
    delay(m[i].len);
  }
}

#endif  BUZZER_H