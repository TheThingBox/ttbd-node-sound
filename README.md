[![License](https://img.shields.io/badge/license-WTFPL-blue.svg)](http://www.wtfpl.net/)
![GitHub issues](https://img.shields.io/github/issues-raw/thethingbox/ttbd-node-sound.svg)
![GitHub package.json version](https://img.shields.io/github/package-json/v/thethingbox/ttbd-node-sound.svg)

# ttbd-node-sound

## Presentation
ttbd-node-sound is a Node-RED node that play mp3 files online or local. It can play mp3 streams too.

## Limitation

This node works under docker with a TheThingBox like environment only.

# Usages

<h3>Play mp3 !</h3>
<p>Play the mp3 file found on the incomming flow or in the edit fields if there is nothing in the incomming flow.</p>
<p>The first output is for when the sound is played. The second is for when the sound is ended.</p>

<h3>Advanced</h3>
<p>The node takes the mp3 URL in msg.sound, msg.value or msg.payload if the value in the node editable form is not defined.</p>
<p>It understands the intents "Open", "Close", "More", "Less", "Intensity".</p>
<p>It understand an http URL as well as complete path on the Thingbox (beginning with "/") as well as a relativ path.
In this case, the path is relativ to /root/sounds that already contains sounds named from beep1.mp3 to beep50.mp3.</p>
<p>Based on (forked) lib https://github.com/turingou/player.</p>
