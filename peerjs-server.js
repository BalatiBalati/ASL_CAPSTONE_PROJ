// peerjs-server.js
const { PeerServer } = require('peer');

// Create a PeerJS server
const peerServer = PeerServer({ 
  port: 3001, 
  path: '/peerjs',
  debug: true
});

console.log('PeerJS server running on port 3001');