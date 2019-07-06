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

#include "WebSocketsClient.h"

#include <NewPing.h>

#include <TimeLib.h>

#include <Hash.h>

// const char *ssid = SSID;		// wifi creds (uff) - all bad
// const char *password = PASSWORD;		
const int eepromAddr = 0;
const char *cortex = "homecortex.azurewebsites.net";		// address of the brain
const int port = 80; // 8080

unsigned int localPort = 123; //Set local port listen to UDP
IPAddress timeSRV;

// PIN DEFINITION
#define TRIG 05
#define ECHO 04
// #define ALRM 16

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

// Sensor timer
long howOften = 2000;					 //How often to take reading in milliseconds
unsigned long lastReading = 0; //Keep track of when the last reading was taken

ESP8266WiFiMulti WiFiMulti;
WebSocketsClient webSocket;

NewPing sonar(TRIG, ECHO, 60); // NewPing setup of pins and maximum distance.
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
// ------------------------------------------------------------------------------------------
// webSocket event handler
// ------------------------------------------------------------------------------------------
void webSocketEvent(WStype_t type, uint8_t *payload, size_t length)
{
	switch (type)
	{
	case WStype_DISCONNECTED:
		USE_SERIAL.printf("[WSc] Disconnected!\n");
		digitalWrite(D4, LOW);   
		break;
	case WStype_CONNECTED:
	{
		digitalWrite(D4, HIGH);   
		USE_SERIAL.printf("[WSc] Connected to url: %s\n", payload);
		// send message to server when Connected
		webSocket.sendTXT("{\"m\": \"i\", \"v\": \"connected\"}");
	}
	break;
	case WStype_TEXT:
		// USE_SERIAL.printf("[WSc] get text: %s\n", payload);
		// send message to server
		// webSocket.sendTXT("message here");
		break;
	case WStype_BIN:
		USE_SERIAL.printf("[WSc] get binary length: %u\n", length);
		hexdump(payload, length);
		// send data to server
		// webSocket.sendBIN(payload, length);
		break;
	}
}

// WiFi data
struct { 
	char SSID[16] = "";
	char PWD[16]  = "";
} wifiCreds;


// ------------------------------------------------------------------------------------------
// setup()
// ------------------------------------------------------------------------------------------
void setup()
{

	// pinMode(ALRM, OUTPUT);
	// digitalWrite(ALRM, LOW);

	USE_SERIAL.begin(115200);
	while(!USE_SERIAL){};
	delay(1000);
	USE_SERIAL.println("");

	// Initialize the LED_BUILTIN pin as an output
	pinMode(LED_BUILTIN, OUTPUT);     
	digitalWrite(LED_BUILTIN, LOW);   

	USE_SERIAL.println("Get Wifi Data from EEPROM...");
  EEPROM.begin(512);
  // read bytes (i.e. sizeof(data) from "EEPROM"),
  // in reality, reads from byte-array cache
  // cast bytes into structure called data
  EEPROM.get(eepromAddr,wifiCreds);
  Serial.println("WiFi SSID:"+String(wifiCreds.SSID)+", PWD:"+String(wifiCreds.PWD));
	delay(200);
	USE_SERIAL.print("Connecting >: ");
	WiFiMulti.addAP(wifiCreds.SSID, wifiCreds.PWD);

	while (WiFi.status() != WL_CONNECTED)
	{
		delay(600);
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

	pinMode(D4, OUTPUT);     // Initialize the LED_BUILTIN pin as an output
	digitalWrite(D4, LOW);   

	// server address, port and URL
	webSocket.begin(cortex, port, "/", "arduino");

	// event handler
	webSocket.onEvent(webSocketEvent);

	// try ever 5000 again if connection has failed
	webSocket.setReconnectInterval(15000);

  // start the sensor
  // Serial.println("Adafruit VL53L0X test");
  // if (!lox.begin()) {
  //   Serial.println(F("Failed to boot VL53L0X"));
  //   while(1);
  // }

	digitalWrite(LED_BUILTIN, HIGH);   
}

// ------------------------------------------------------------------------------------------
// readSensors
// ------------------------------------------------------------------------------------------
long readDistance()
{
	// unsigned long duration = sonar.ping_median(5); // Send ping, get distance in cm and print result (0 = outside set distance range)
	// long dist = NewPing::convert_cm(duration);

	return 0;

  VL53L0X_RangingMeasurementData_t measure;
    
  Serial.print("Reading a measurement... ");
  lox.rangingTest(&measure, false); // pass in 'true' to get debug data printout!

  if (measure.RangeStatus != 4) {  // phase failures have incorrect data
    Serial.print("Distance (mm): "); Serial.println(measure.RangeMilliMeter);
  } else {
    Serial.println(" out of range ");
  }

	// USE_SERIAL.print("Ping: ");
	// USE_SERIAL.print(dist);
	// USE_SERIAL.println("cm");

  return measure.RangeMilliMeter / 10;
	// return dist;
}

// ------------------------------------------------------------------------------------------
// uploadSensors()
// ------------------------------------------------------------------------------------------
// {"l":29.25,"s":1,"t":1505711860702}
const char *msgFormat = "{\"m\":\"d\", \"l\":%d, \"s\":%d, \"t\":%d}";

char buffer[256];

void uploadSensors()
{
	if (lastReading > millis())
		lastReading = millis();

	if ((millis() - lastReading) > howOften)
	{
		if (timeStatus() != timeNotSet)
		{
			long level = readDistance();
			long state = 0;
			// digitalClockDisplay();
			sprintf(buffer, msgFormat, level, state, now());
			webSocket.sendTXT(buffer);
		}

		lastReading = millis(); // reset the timer
	}
}

// ------------------------------------------------------------------------------------------
// evalAlarm()
// ------------------------------------------------------------------------------------------
void evalAlarm()
{
	return;
	const int alarmCheckFrequency = 30000;
	static long lastAlarmCheck = 0;

	if ((millis() - lastAlarmCheck) > alarmCheckFrequency)
	{
		// check for some alarm condition. If satisfied
		// turn the buzzer on 	
		lastAlarmCheck = millis(); // reset the timer
	}
}

// ------------------------------------------------------------------------------------------
// loop()
// ------------------------------------------------------------------------------------------
void loop()
{
	webSocket.loop();
	uploadSensors();
	evalAlarm();
}
