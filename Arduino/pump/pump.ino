/*
 * Pump.ino
 * 
 * Wiring for HC-SR04
 *  
 *  ESP8266 | HC-SR04
 *  GPIO05  | Trig
 *  GPIO04  | Echo
 *  5v      | VCC
 *  GND     | GND
 * 
 * Wiring for VL53L0X (Laser)
 *  
 *  ESP8266 | HC-SR04
 *  GPIO05  | Trig
 *  GPIO04  | Echo
 *  5v      | VCC
 *  GND     | GND
 *  
 */

#include <Arduino.h>
#include <EEPROM.h>


#include "Adafruit_VL53L0X.h"

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WifiUDP.h>
#include <ESP8266HTTPClient.h>

#include "WebSocketsClient.h"

#include <NewPing.h>

#include <TimeLib.h>

// #include <Hash.h>
#include "buzzer.h"

const int eepromAddr = 0;

const char* localhost = "http://10.0.0.104:8080/api/pump";
const char *cortex = localhost; //"homecortex.azurewebsites.net/api/pump";		// address of the brain
const int port = 8080; // 80

unsigned int localPort = 123; //Set local port listen to UDP
IPAddress timeSRV;

// PIN DEFINITION


// NTP Servers:
static const char srvName[] = "us.pool.ntp.org";
//static const char srvName[] = "time.nist.gov";
//static const char srvName[] = "time-a.timefreq.bldrdoc.gov";
//static const char srvName[] = "time-b.timefreq.bldrdoc.gov";
//static const char srvName[] = "time-c.timefreq.bldrdoc.gov";
//static const char srvName[] = "3.pool.ntp.org";

// Timezones
//const int timeZone = 1;   // Central European Time
//const int timeZone = -5;  // Eastern Standard Time (USA)
//const int timeZone = -4;  // Eastern Daylight Time (USA)
//const int timeZone = -8;  // Pacific Standard Time (USA)
const int timeZone = -7; // Pacific Daylight Time (USA)

// UDP
const int NTP_PACKET_SIZE = 48;			// NTP time stamp is in the first 48 bytes of the message
byte packetBuffer[NTP_PACKET_SIZE]; //buffer to hold incoming and outgoing packets
WiFiUDP udp;												// Set to send and receive packets via UDP

ESP8266WiFiMulti WiFiMulti;

Adafruit_VL53L0X lox = Adafruit_VL53L0X();

#define USE_SERIAL Serial

// ------------------------------------------------------------------------------------------
// webSocket event handler
// ------------------------------------------------------------------------------------------
unsigned long sendNTPpacket(IPAddress &address) //Sending NTP req to the time server
{
	memset(packetBuffer, 0, NTP_PACKET_SIZE); // Set bytes to buffer turn 0

	// Initializing the required values form NTP request

	packetBuffer[0] = 0b11100011; //Set to LI version mode
	packetBuffer[1] = 0;					// Set to Stratum type
	packetBuffer[2] = 6;					// Set to pooling interval
	packetBuffer[3] = 0xEC;				// Set to Peer Clock Precision
	packetBuffer[12] = 49;				// 8bytes of 0
	packetBuffer[13] = 0x4E;			// 8bytes of 0
	packetBuffer[14] = 49;				// 8bytes of 0
	packetBuffer[15] = 52;				// 8bytes of 0
	//Set NTP requests to port 123
	udp.beginPacket(address, 123);
	udp.write(packetBuffer, NTP_PACKET_SIZE);
	udp.endPacket();
}

// ------------------------------------------------------------------------------------------
// printDigits
// ------------------------------------------------------------------------------------------
void printDigits(int digits)
{
	Serial.print(":");
	if (digits < 10)
		Serial.print('0');
	Serial.print(digits);
}

// ------------------------------------------------------------------------------------------
// digitalClockDisplay
// ------------------------------------------------------------------------------------------
void digitalClockDisplay()
{
	USE_SERIAL.print(hour());
	printDigits(minute());
	printDigits(second());
	USE_SERIAL.print(" ");
	USE_SERIAL.print(month());
	USE_SERIAL.print(".");
	USE_SERIAL.print(day());
	USE_SERIAL.print(".");
	USE_SERIAL.print(year());
	USE_SERIAL.println();
}

// ------------------------------------------------------------------------------------------
// webSocket event handler
// ------------------------------------------------------------------------------------------
time_t getNTPTime()
{
	while (udp.parsePacket() > 0)
		; // discard any previously received packets

	WiFi.hostByName(srvName, timeSRV);
	sendNTPpacket(timeSRV); // Sending NTP packets to NTP server

	uint32_t beginWait = millis();
	while (millis() - beginWait < 1500)
	{

		int npkts = udp.parsePacket();
		if (npkts)
		{
			udp.read(packetBuffer, NTP_PACKET_SIZE); // set to read packets from buffer

			/*Timestamp starting at byte 40 at the RX packet @ 4 bytes - 2 words long then extract the 2 words*/
			unsigned long hWord = word(packetBuffer[40], packetBuffer[41]);
			unsigned long lwWord = word(packetBuffer[42], packetBuffer[43]);

			/* Merging 4bytes - 2words into long integer */
			unsigned long seconds1990 = hWord << 16 | lwWord;

			/* now convert NTP time into everyday time:, UNIX time start on JAN 1 1970 in seconds will be 2208988800 */
			USE_SERIAL.print("UNIX TIME = ");
			const unsigned long _70Years = 2208988800UL;
			unsigned long timeOut = seconds1990 - _70Years; //Set to subtract 70 years
			USE_SERIAL.println(timeOut);
			return timeOut; // + timeZone * SECS_PER_HOUR;
		}
	}
	USE_SERIAL.print("No packets recieved");
	return 0;
}

// WiFi data
struct { 
	char SSID[16] = "";
	char PWD[16]  = "";
} wifiCreds;


#define RED D0
#define BLU D4
inline void LED(int pin, bool on = true) { digitalWrite(pin, on ? LOW : HIGH); }

// ------------------------------------------------------------------------------------------
// setup()
// ------------------------------------------------------------------------------------------
void setup()
{
	USE_SERIAL.begin(115200);
	while(!USE_SERIAL){};
	delay(1000);
	USE_SERIAL.println("");

	// Initialize the LED_BUILTIN pin as an output
	pinMode(D0, OUTPUT); 
	pinMode(D4, OUTPUT);     
	
	LED(RED, true);
	LED(BLU, false);

	USE_SERIAL.println("Get Wifi Data from EEPROM...");
  EEPROM.begin(512);
  // read bytes (i.e. sizeof(data) from "EEPROM"),
  // in reality, reads from byte-array cache
  // cast bytes into structure called data
  EEPROM.get(eepromAddr,wifiCreds);
  Serial.println("WiFi SSID:"+String(wifiCreds.SSID)+", PWD:"+String(wifiCreds.PWD));
	USE_SERIAL.print("Connecting >: ");
	WiFiMulti.addAP(wifiCreds.SSID, wifiCreds.PWD);

	while (WiFi.status() != WL_CONNECTED)
	{
		delay(500);
		USE_SERIAL.print("..");
	}
	USE_SERIAL.println(" Connected");
	USE_SERIAL.print("IP address: ");
	USE_SERIAL.println(WiFi.localIP());

	USE_SERIAL.println("Initializing UDP...");
	udp.begin(localPort);
	USE_SERIAL.print("port: ");
	USE_SERIAL.println(udp.localPort());

	setSyncProvider(getNTPTime);
	setSyncInterval(3600); // re-sync time every hour
	  
	LED(RED, false);
	LED(BLU, true);

  // start the sensor
  // Serial.println("Adafruit VL53L0X test");
  // if (!lox.begin()) {
  //   Serial.println(F("Failed to boot VL53L0X"));
  //   while(1);
  // }
	LED(BLU, false);

	const bs=200;	// blink speed

	// wink
	LED(RED, true);
	LED(BLU, true);
	delay(bs);
	LED(RED, false);
	LED(BLU, false);
	delay(bs);
	LED(RED, true);
	LED(BLU, true);
	delay(bs);
	LED(RED, false);
	LED(BLU, false);
	delay(bs);
	LED(RED, true);
	LED(BLU, true);
	delay(bs);
	LED(RED, false);
	LED(BLU, false);

	PLAY(music);
}

// ------------------------------------------------------------------------------------------
// readSensors
// ------------------------------------------------------------------------------------------
int readDistance()
{
	return random(0, 50);

	int dist = 0;

  VL53L0X_RangingMeasurementData_t measure;
    
  // Serial.print("Reading a measurement... ");
  
	lox.rangingTest(&measure, false); // pass in 'true' to get debug data printout!

  if (measure.RangeStatus != 4) {  // phase failures have incorrect data
    // Serial.print("Distance (mm): "); Serial.println(measure.RangeMilliMeter);
		dist = measure.RangeMilliMeter / 10; 
  } else {
    // Serial.println(" out of range ");
  }

	// USE_SERIAL.print("Ping: ");
	// USE_SERIAL.print(dist);
	// USE_SERIAL.println("cm");

	return dist;
}

int setAlarm = 0;
// ------------------------------------------------------------------------------------------
// evalAlarm()
// ------------------------------------------------------------------------------------------
void evalAlarm()
{
	if(setAlarm < 100)
		return;

	// keep the alarm set
	if(setAlarm > 100)
		setAlarm = 100;

	PLAY(alarm);
}

HTTPClient http;

// ------------------------------------------------------------------------------------------
// postData()
// ------------------------------------------------------------------------------------------
void postData() 
{
	const int postFrequency = 5000;
	static long lastPost = 0;

	const char *msgFormat = "l=%d&t=%d";
	char buffer[50];

	if ((millis() - lastPost) > postFrequency)
	{

		int level = readDistance();
		http.begin(cortex);

		http.addHeader("Content-Type", "application/x-www-form-urlencoded");		//application/json
		sprintf(buffer, msgFormat, level, now());

		Serial.print("message: ");
		Serial.println(buffer);
		
		int httpCode = http.POST(buffer);
		if(httpCode == 200)
		{
			setAlarm = 0;
			// digitalWrite(D4, LOW); 
			// delay(100);
			// digitalWrite(D4, HIGH);    
		}
		else { 
			setAlarm += 1;
			LED(RED, true); 
			delay(100);
			LED(RED, false); 
		}

		// when debugging the server response
		// String payload = http.getString();
		// Serial.println(httpCode);
		// Serial.println(payload);
		// Serial.println("HTTP Done");

		http.end();
		lastPost = millis(); // reset the timer
	}
}


// ------------------------------------------------------------------------------------------
// loop()
// ------------------------------------------------------------------------------------------
void loop()
{
	postData();
	evalAlarm();
}
