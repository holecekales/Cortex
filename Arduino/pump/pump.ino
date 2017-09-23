/*
 * Pump.ino
 * 
 * Wiring:
 *  
 *  ESP8266 | HC-SR04
 *  05      | Trig
 *  04      | Echo
 *  5v      | VCC
 *  GND     | GND
 *  
 */

#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WifiUDP.h>

#include <WebSocketsClient.h>

#include <NewPing.h>

#include <TimeLib.h>

#include <Hash.h>

const char *ssid = "Holecek_home";
const char *password = "blue1234";
const char *cortex = "10.0.0.108";
const int port = 8080;

unsigned int localPort = 123; //Set local port listen to UDP
IPAddress timeSRV;

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
const int timeZone = -7; 	// Pacific Daylight Time (USA)

// UDP
const int NTP_PACKET_SIZE = 48;			// NTP time stamp is in the first 48 bytes of the message
byte packetBuffer[NTP_PACKET_SIZE]; //buffer to hold incoming and outgoing packets
WiFiUDP udp;												// Set to send and receive packets via UDP

// Sensor
const int trigPin = 5;
const int echoPin = 4;
long howOften = 2000;					 //How often to take reading in milliseconds
unsigned long lastReading = 0; //Keep track of when the last reading was taken

long level = 0;

// simulator
int levelInc = 1;
int state = 0;
int t = 0;

ESP8266WiFiMulti WiFiMulti;
WebSocketsClient webSocket;

NewPing sonar(trigPin, echoPin, 500); // NewPing setup of pins and maximum distance.

#define USE_SERIAL Serial

// ------------------------------------------------------------------------------------------
// webSocket event handler
// ------------------------------------------------------------------------------------------
unsigned long sendNTPpacket(IPAddress &address) //Sending NTP req to the time server
{
	USE_SERIAL.println("Syn NTP Pckets: ");
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
	/*All NTP fields has been given values its time to send a packets that request a timestamp*/
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
		if (!npkts)
		{
			
		}
		else
		{
			USE_SERIAL.print("Packets received length = ");
			USE_SERIAL.println(npkts);
			udp.read(packetBuffer, NTP_PACKET_SIZE); // set to read packets from buffer

			/*Timestamp starting at byte 40 at the RX packet @ 4 bytes - 2 words long then extract the 2 words*/
			unsigned long hWord = word(packetBuffer[40], packetBuffer[41]);
			unsigned long lwWord = word(packetBuffer[42], packetBuffer[43]);

			/* Merging 4bytes - 2words into long integer */
			unsigned long seconds1990 = hWord << 16 | lwWord;
			USE_SERIAL.print("Seconds since Jan 1 1900 = ");
			USE_SERIAL.println(seconds1990);

			/* now convert NTP time into everyday time:, UNIX time start on JAN 1 1970 in seconds will be 2208988800 */
			USE_SERIAL.print("UNIX TIME = ");
			const unsigned long _70Years = 2208988800UL;
			unsigned long timeOut = seconds1990 - _70Years; //Set to subtract 70 years
			USE_SERIAL.println(timeOut);
			return timeOut + timeZone * SECS_PER_HOUR;
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
		break;
	case WStype_CONNECTED:
	{
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

// ------------------------------------------------------------------------------------------
// setup()
// ------------------------------------------------------------------------------------------
void setup()
{
	USE_SERIAL.begin(115200);
	USE_SERIAL.setDebugOutput(true);

	for (uint8_t t = 4; t > 0; t--)
	{
		USE_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
		USE_SERIAL.flush();
		delay(1000);
	}

	USE_SERIAL.println("Starting....");
	delay(200);
	USE_SERIAL.println("Initializing...");
	delay(200);
	USE_SERIAL.print("Connecting >: ");
	USE_SERIAL.println(ssid);
	WiFiMulti.addAP(ssid, password);

	while (WiFi.status() != WL_CONNECTED)
	{
		delay(600);
		USE_SERIAL.print("...");
	}
	USE_SERIAL.println("Connected");
	USE_SERIAL.print("IP address: ");
	USE_SERIAL.println(WiFi.localIP());

	USE_SERIAL.println("Initializing UDP...");
	udp.begin(localPort);
	USE_SERIAL.print("PORT: ");
	USE_SERIAL.println(udp.localPort());

	setSyncProvider(getNTPTime);
	setSyncInterval(2);

	// server address, port and URL
	webSocket.begin(cortex, port, "/");

	// event handler
	webSocket.onEvent(webSocketEvent);

	// try ever 5000 again if connection has failed
	webSocket.setReconnectInterval(5000);
}

// ------------------------------------------------------------------------------------------
// readSensors
// ------------------------------------------------------------------------------------------
long readDistance()
{
	unsigned long duration = sonar.ping_median(3); // Send ping, get distance in cm and print result (0 = outside set distance range)
	long dist = NewPing::convert_cm(duration);

	USE_SERIAL.print("Ping: ");
	USE_SERIAL.print(dist);
	USE_SERIAL.println("cm");

	return dist;
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
			level = readDistance();
			digitalClockDisplay();
			sprintf(buffer, msgFormat, level, state, now());
			webSocket.sendTXT(buffer);
		}

		lastReading = millis(); // reset the timer
	}
}

// ------------------------------------------------------------------------------------------
// loop()
// ------------------------------------------------------------------------------------------
void loop()
{
	webSocket.loop();
	uploadSensors();
}
