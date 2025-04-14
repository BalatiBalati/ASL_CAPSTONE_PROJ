// peerjs-server.js
const PORT = process.env.PORT || 3001;
const peerServer = PeerServer({ 
  port: PORT, 
  path: '/peerjs',
  debug: false
});
console.log(`PeerJS server running on port ${PORT}`);