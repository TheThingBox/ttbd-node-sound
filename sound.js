module.exports = function(RED) {
  "use strict";
  const { Player } = require("ttbd-player")

  function Sound(n) {
    RED.nodes.createNode(this, n);

    this.sound = n.sound;
    this.player = new Player()
    this.lastInfos = null
    this.statusMode = {}

    var node = this;

    function updateStatus(content, mode, reset) {
      if(reset){
        node.status({})
        return
      }
      if(mode){
        node.statusMode = mode
      }
      if(content){
        node.lastInfos = content
      }
      node.status(Object.assign({fill: "grey", shape: "dot"}, node.statusMode, { text: `${node.lastInfos.name}: ${node.lastInfos.current}/${node.lastInfos.end} | vol: ${node.lastInfos.volume}%` }))
    }

    this.player.on('next', (name) => {
      node.send([{
        payload: name
      }, null])
    })

    this.player.on('progress', (infos) => {
      let musicName = infos.name.split('/')
      let volume = node.player.volume
      musicName = musicName[musicName.length-1]
      updateStatus({
        name: musicName,
        current: infos.current,
        end: (infos.end || '--:--'),
        volume: (node.player.volume || '--')
      },{
        fill: "blue",
        shape: "ring"
      })
    })

    this.player.on('volume', (volume) => {
      if(node.lastInfos){
        node.lastInfos.volume = volume
      }
      updateStatus()
    })

    this.player.on('end', (name) => {
      node.lastInfos = null
      updateStatus(null, null, true)
      node.send([null, {
        payload: name
      }])
    })

    this.player.on('error', (err) => {
      if(err+"" == "Error: Illegal residual coding method 2" || err+"" == "Error: Invalid sync code"){
        return
      }
      node.warn(err)
      this.player.skip()
    })

    this.on('input', function(msg) {
      if(msg.intent || msg.intent == 0) {
        if(msg.intent == 1) { // open
          this.player.resume()
        } else if(msg.intent == 0) { // close
          this.player.pause()
          if(node.lastInfos){
            updateStatus(null, {fill: "yellow", shape: "dot"})
          }
        } else if(msg.intent == 2) { // more
          this.player.volumeUp()
        } else if(msg.intent == 3) { // less
          this.player.volumeDown()
        }
      }
      else {
        if(msg.intensity || msg.intensity === 0) {
          this.player.volume = msg.intensity
        }

        if(msg.command){
          switch(msg.command){
            case 'stop':
              this.player.stop()
              break;
            case 'skip':
              this.player.skip()
              break;
            default:
          }
        }
        else {
          var toplay = msg.sound || msg.value || msg.payload || "";
          var playNow = msg.playNow || false
          if(toplay === "" || typeof toplay !== "string"){
            toplay = node.sound;
          }
          this.player.start(toplay, playNow)
        }
      }
    });

    this.on("close", function() {
      if(this.player){
        this.player.clear()
      }
    });
  }
  RED.nodes.registerType("sound", Sound);

}
