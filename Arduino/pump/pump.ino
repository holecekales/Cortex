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

#include <Hash.h>

const char *ssid 			= "Holecek_home";
const char *password 	= "blue1234";
const char *cortex 		= "10.0.0.108";
const int port 				= 8080;

const int trigPin = 5;
const int echoPin = 4;

long howOften = 2000; 			//How often to take reading in milliseconds
unsigned long lastReading = 0; 	//Keep track of when the last reading was taken

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
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {

	switch(type) {
		case WStype_DISCONNECTED:
			USE_SERIAL.printf("[WSc] Disconnected!\n");
			break;
		case WStype_CONNECTED: {
			USE_SERIAL.printf("[WSc] Connected to url: %s\n", payload);
			// send message to server when Connected
			webSocket.sendTXT("{\"m\": \"i\", \"v\": \"connected\"}");
		}
			break;
		case WStype_TEXT:
			USE_SERIAL.printf("[WSc] get text: %s\n", payload);

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
void setup() {
	USE_SERIAL.begin(115200);

	//Serial.setDebugOutput(true);
	USE_SERIAL.setDebugOutput(true);

	for(uint8_t t = 4; t > 0; t--) {
		USE_SERIAL.printf("[SETUP] BOOT WAIT %d...\n", t);
		USE_SERIAL.flush();
		delay(1000);
	}

	WiFiMulti.addAP(ssid, password);

	//WiFi.disconnect();
	while(WiFiMulti.run() != WL_CONNECTED) {
		delay(100);
	}

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
long readDistance() {
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
const char* msgFormat = "{\"m\":\"d\", \"l\":%d, \"s\":%d, \"t\":%d}";

char buffer[256];

void uploadSensors() {
	if (lastReading > millis())  lastReading = millis();
	
		if((millis() - lastReading) > howOften) {
			level = readDistance();
			
			sprintf(buffer, msgFormat, level, state, t);

			level += levelInc;
			
			if(level > 40) { 
				levelInc = -2;
				state = 1;
			}
			
			if(level <= 0) { 
				levelInc = 1;
				state = 0;
			}

			t +=1;

			webSocket.sendTXT(buffer);

			lastReading = millis(); // reset the timer
		}

}

// ------------------------------------------------------------------------------------------
// loop()
// ------------------------------------------------------------------------------------------
void loop() {
	webSocket.loop();
	uploadSensors();
}
 
 

 
 
 
 