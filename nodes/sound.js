module.exports = function(RED) {
  "use strict";
  var Player = require("player");
  var exec = require("ttbd-exec");
  var exec_opt = {
    hydra_exec_host: "mosquitto"
  }
  var path = require("path")

  var INCREMENT_STEP = 5;

  function Sound(n) {
    RED.nodes.createNode(this, n);

    this.sound = n.sound;
    this.playing = false;
    createPlayer(this, this.sound);

    var node = this;
    node.messageOnFinish = {};

    this.on('input', function(msg) {
      if(msg.intent || msg.intent == 0) {
        if(msg.intent == 1) { // open
          startPlayer(node, msg);
          msg.payload = n.name;
          node.send([msg, null]);
        } else if(msg.intent == 0) { // close
          stopPlayer(node);
          node.send([msg,null]);
        } else if(msg.intent == 2) { // more
          getVolume(function(err, vol) {
            if(err) { node.warn(err); }
            var volume = vol + INCREMENT_STEP;
            if(volume < 0) volume = 0;
            if(volume > 100) volume = 100;
            setVolume(volume, function(err) {
              if(err) {
                node.warn(err);
              }
            });
          })
        } else if(msg.intent == 3) { // less
          getVolume(function(err, vol) {
            if(err) { node.warn(err); }
            var volume = vol - INCREMENT_STEP;
            if(volume < 0) volume = 0;
            if(volume > 100) volume = 100;
            setVolume(volume, function(err) {
              if(err) {
                node.warn(err);
              }
            });
          })
        }
      } else if(msg.intensity) {
        var volume = Number(msg.intensity)
        if(volume < 0) volume = 0;
        if(volume > 100) volume = 100;
        setVolume(volume, function(err) {
          if(err) {
            node.warn(err);
          }
        });
      } else if(msg.command && msg.command === "stop" && node.playing) {
        stopPlayer(node);
        node.send([msg,null]);
      } else {
        startPlayer(node, msg);
        node.send([msg, null]);
      }
    });

    this.on("close", function() {
      if(node.playing)
        node.player.stop();
    });
  }
  RED.nodes.registerType("sound", Sound);

  function createPlayer(node, sound) {
    stopPlayer(node);
    node.player = new Player([sound],{downloads:"/root/userdir/"});
    node.player.on("error", function(err) {
      if(err === "No next song was found"){
        return;
      }
      node.warn(err);
    });
    node.player.on("finish", function(current) {
      node.send([null, node.messageOnFinish]);
      node.playing = false;
    });
  }

  function stopPlayer(node) {
    if(!node.playing) return;
    node.player.stop();
    node.playing = false;
  }

  function startPlayer(node, msg) {
    var toplay =  node.sound;

    if(toplay === "") {
      toplay = msg.payload;
    }

    if(toplay === "") {
      return;
    }

    if(toplay.charAt(0) !== "/" && toplay.indexOf("http://") !== 0 && toplay.indexOf("https://") !== 0 ){
      toplay = path.join('/root', 'sounds', toplay)
    }

    if(toplay && node.player.list[0] !== toplay) {
      createPlayer(node, toplay);
    }

    if(node.playing){
      stopPlayer(node);
    }

    node.player.play();
    node.playing = true;
    node.messageOnFinish = msg;
  }

  function amixer(args, cb) {
    exec(`amixer ${args.join(' ')}`, exec_opt, function(err, stdout, stderr) {
      cb(err || stderr || null, stdout.trim())
    })
  }

  var reDefaultDevice = /Simple mixer control \'([a-z0-9 -]+)\',[0-9]+/i;
  var defaultDeviceCache = null;
  function defaultDevice(cb) {
    if(defaultDeviceCache === null) {
      amixer([], function (err, data) {
        if(err) {
          cb(err);
        } else {
          var res = reDefaultDevice.exec(data);
          if(res === null) {
            cb(new Error('Alsa Mixer Error: failed to parse output'));
          } else {
            defaultDeviceCache = res[1];
            cb(null, defaultDeviceCache);
          }
        }
      });
    } else {
      cb(null, defaultDeviceCache);
    }
  };

  var reInfo = /[a-z][a-z ]*\: Playback [0-9-]+ \[([0-9]+)\%\] (?:[[0-9\.-]+dB\] )?\[(on|off)\]/i;
  function getInfo(cb) {
    defaultDevice(function (err, dev) {
      if(err) {
        cb(err);
      } else {
        amixer(['get', dev], function (err, data) {
          if(err) {
            cb(err);
          } else {
            var res = reInfo.exec(data);
            if(res === null) {
              cb(new Error('Alsa Mixer Error: failed to parse output'));
            } else {
              cb(null, {
                volume: parseInt(res[1], 10),
                muted: (res[2] == 'off')
              });
            }
          }
        });
      }
    });
  };

  function getVolume(cb) {
    getInfo(function (err, obj) {
      if(err) {
        cb(err);
      } else {
        cb(null, obj.volume);
      }
    });
  };

  function setVolume(val, cb) {
    defaultDevice(function (err, dev) {
      if(err) {
        cb(err);
      } else {
        amixer(['set', dev, val + '%'], function (err) {
          cb(err);
        });
      }
    });
  };
}
