//Just to push changes to GitHub

const express = require('express');
const http = require('http');
const socket = require('socket.io');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socket(server);

// Set up proxies if environment variables exist
if (process.env.PEERJS_URL) {
  app.use('/peerjs', createProxyMiddleware({ 
    target: process.env.PEERJS_URL,
    changeOrigin: true,
    ws: true
  }));
  console.log(`Proxying /peerjs to ${process.env.PEERJS_URL}`);
}

if (process.env.DETECTION_URL) {
  app.use('/detect', createProxyMiddleware({ 
    target: process.env.DETECTION_URL,
    changeOrigin: true
  }));
  console.log(`Proxying /detect to ${process.env.DETECTION_URL}`);
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle joining a room
  socket.on('join-room', (roomId, userId) => {
    console.log(`User ${userId} joined room ${roomId}`);
    
    // Join the room
    socket.join(roomId);
    
    // Broadcast to others in the room that a new user has joined
    socket.to(roomId).emit('user-connected', userId);
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected`);
      socket.to(roomId).emit('user-disconnected', userId);
    });
    
    // Handle signaling - forward messages to the appropriate peer
    socket.on('signal', (userId, signal) => {
      socket.to(roomId).emit('signal', userId, signal);
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
