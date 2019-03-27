# Experiments in IoT

## Sump pump
Needed to install sump pump under my house. Since i don't want to get my basement flooded, I decided to build a a simple IoT monitor. 
The simple app that helps me monitor it on running as a node app on [Azure](http://homecortex.azurewebsites.net)

## Todo:
* Load the API Key for the darksky from a file so it is not in github
* Add weather 
  - Temperature
  - Percipitation

## Learn about: 
* Look at CSS animation for indicating change
* What is the way to reload node stuff automatically?
* What is the proper way to pass environment variable (and on Azure)

**Critical Fixes**
* I need to get a cert for WSS? (https and wss)
* Let's make sure that to catalog the password and API key somewhere
* Upgrade node
* Figure out how the dependencies work and see if we can update them all

**Backend error handling**
- Socket error handling - ping/pong
- Monitoring on the azure service - figure out app insights or something?
  Can i get this going for the socket?

**Firmware update needed**
* Get device alarm going
* Get better reconnection mechanics for the device
* Get reset going (if needed)
* Reduce the frequency of updates?
* Get some LED indication of the state

**HW section**
* Pump - install auxiliary pump?
* Can we have gravity drain?
* Water analysis
* Can I use it for watering?
* I need large tank research

