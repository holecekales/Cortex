/*
 * Pump.ino
 *
 * reports the depth of the water for the pump
 *
 */

#include <Arduino.h>

#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <WifiUDP.h>

#include <WebSocketsClient.h>

#include <Hash.h>

const char *ssid 			= "Holecek_home";
const char *password 	= "blue1234";
const char *cortex 		= "10.0.0.108";
const int port 				= 8080;

ESP8266WiFiMulti WiFiMulti;
WebSocketsClient webSocket;

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
			webSocket.sendTXT("Connected");
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
	// USE_SERIAL.begin(921600);
	USE_SERIAL.begin(115200);

	//Serial.setDebugOutput(true);
	USE_SERIAL.setDebugOutput(true);

	USE_SERIAL.println();
	USE_SERIAL.println();
	USE_SERIAL.println();

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
// readSensors()
// ------------------------------------------------------------------------------------------
void readSensors() {
	
}

// ------------------------------------------------------------------------------------------
// uploadSensors()
// ------------------------------------------------------------------------------------------
uint32_t timer  = millis();
#define SENSOR_READ 	1000
int level = 0;
int levelInc = 1;
int state = 0;
int t = 0;

// {"l":29.25,"s":1,"t":1505711860702}
const char* msgFormat = "{\"l\":%d, \"s\":%d, \"t\":%d}";

char buffer[256];

void uploadSensors() {
	if (timer > millis())  timer = millis();
	
		if((millis() - timer) > SENSOR_READ) {
			timer = millis(); // reset the timer

			readSensors();
			
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
		}

}

// ------------------------------------------------------------------------------------------
// loop()
// ------------------------------------------------------------------------------------------
void loop() {
	webSocket.loop();
	uploadSensors();
}
