// DOM elements
const joinBtn = document.getElementById('join-btn');
const createBtn = document.getElementById('create-btn');
const roomIdInput = document.getElementById('room-id');
const callContainer = document.getElementById('call-container');
const welcomeScreen = document.getElementById('welcome-screen');
const localVideo = document.getElementById('local-video');
const remoteVideo = document.getElementById('remote-video');
const muteBtn = document.getElementById('mute-btn');
const videoBtn = document.getElementById('video-btn');
const leaveBtn = document.getElementById('leave-btn');
const toggleDetectionBtn = document.getElementById('toggle-detection');
const detectionResults = document.getElementById('detection-results');
const detectionCanvas = document.getElementById('detection-canvas');

// Initialize variables
let peer;
let localStream;
let remoteStream;
let roomId;
let currentPeerId;
let currentCall;
let detectionEnabled = false;
let model = null;
let ctx = detectionCanvas.getContext('2d');
const socket = io('/');

// New variables for server-side detection
let serverDetectionEnabled = false;
const SERVER_URL = window.location.origin + '/detect';

// Define class labels for sign language detection
const signClasses = [
  'Hello', 'Thank You', 'Yes', 'No', 'Please', 'I Love You'
];

// Function to initialize the peer connection
async function initializePeer() {
  return new Promise((resolve) => {
    // Create a new Peer with a random ID
    peer = new Peer(undefined, {
      host: window.location.hostname,
      port: window.location.protocol === 'https:' ? 443 : 80,
      path: '/peerjs',
      secure: window.location.protocol === 'https:'
    });

    peer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      currentPeerId = id;
      resolve(id);
    });

    // Handle incoming calls
    peer.on('call', (call) => {
      currentCall = call;
      
      // Answer the call with our local stream
      call.answer(localStream);
      
      // When we receive the remote stream, display it
      call.on('stream', (stream) => {
        remoteStream = stream;
        displayRemoteStream(stream);
      });
    });
  });
}

// Function to get user media (camera/microphone)
async function setupLocalStream() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    
    localStream = stream;
    localVideo.srcObject = stream;
    return stream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
    alert('Cannot access camera or microphone. Please check your permissions.');
  }
}

// Function to display remote stream
function displayRemoteStream(stream) {
  remoteVideo.srcObject = stream;
}

// Function to join a room
async function joinRoom(roomId) {
  try {
    // Initialize local stream if not already done
    if (!localStream) {
      await setupLocalStream();
    }
    
    // Initialize peer if not already done
    if (!currentPeerId) {
      currentPeerId = await initializePeer();
    }
    
    // Join the room via socket.io
    socket.emit('join-room', roomId, currentPeerId);
    
    // Handle when a new user connects to our room
    socket.on('user-connected', (userId) => {
      console.log('User connected:', userId);
      connectToNewUser(userId, localStream);
    });
    
    // Handle when a user disconnects
    socket.on('user-disconnected', (userId) => {
      console.log('User disconnected:', userId);
      // Additional cleanup if needed
    });
    
    // Show call container, hide welcome screen
    callContainer.classList.remove('hidden');
    welcomeScreen.classList.add('hidden');
    
  } catch (error) {
    console.error('Error joining room:', error);
    alert('Failed to join room. Please try again.');
  }
}

// Function to connect to a new user
function connectToNewUser(userId, stream) {
  // Call the user
  const call = peer.call(userId, stream);
  currentCall = call;
  
  // When they answer, display their stream
  call.on('stream', (remoteStream) => {
    displayRemoteStream(remoteStream);
  });
  
  // When they leave, clean up
  call.on('close', () => {
    remoteVideo.srcObject = null;
  });
}

// Function to create a random room ID
function createRoomId() {
  return Math.random().toString(36).substring(2, 15);
}

// Load the sign language detection model
async function loadModel() {
  try {
    console.log('Loading sign language detection model...');
    detectionResults.innerText = 'Loading model...';
    
    if (serverDetectionEnabled) {
      console.log('Using server-side detection');
      detectionResults.innerText = 'Using server-side detection';
      return true;
    } else {
      // Simulated model loading for client-side
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Model loaded successfully (simulation)');
      detectionResults.innerText = 'Model loaded successfully. Detection ready.';
      return true;
    }
  } catch (error) {
    console.error('Error loading model:', error);
    detectionResults.innerText = 'Error loading model. Please try again.';
    return false;
  }
}

// Function to start sign language detection
async function startDetection() {
  if (!model) {
    const modelLoaded = await loadModel();
    if (!modelLoaded) return;
    model = true; // Placeholder for the actual model
  }
  
  detectionEnabled = true;
  toggleDetectionBtn.innerText = 'Turn Off Detection';
  
  // Start the detection loop
  detectSigns();
}

// Function to stop sign language detection
function stopDetection() {
  detectionEnabled = false;
  toggleDetectionBtn.innerText = 'Turn On Detection';
  detectionResults.innerText = 'Detection paused.';
  clearCanvas();
}

// Updated: Function to detect signs in the video stream
function detectSigns() {
  if (!detectionEnabled) return;
  
  // Set up canvas dimensions
  detectionCanvas.width = localVideo.videoWidth;
  detectionCanvas.height = localVideo.videoHeight;
  
  // Draw the current video frame to the canvas
  ctx.drawImage(localVideo, 0, 0, detectionCanvas.width, detectionCanvas.height);
  
  if (serverDetectionEnabled) {
    // Real detection using server
    sendFrameToServer();
  } else {
    // Simulated detection
    simulateDetection();
  }
  
  // Continue the detection loop
  requestAnimationFrame(detectSigns);
}

// New: Function to send frames to the server
async function sendFrameToServer() {
  try {
    // Get the image data from the canvas
    const imageData = detectionCanvas.toDataURL('image/jpeg', 0.7);
    
    // Send to server
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageData
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Clear previous drawings
      ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
      
      // Draw the detections
      const detections = result.detections;
      
      for (const detection of detections) {
        const { box, class: className, confidence } = detection;
        
        // Draw bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw label
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(`${className}: ${(confidence * 100).toFixed(1)}%`, box.x, box.y - 5);
      }
      
      // Display top detection result
      if (detections.length > 0) {
        const topDetection = detections[0];
        detectionResults.innerText = `Detected: ${topDetection.class} (${(topDetection.confidence * 100).toFixed(1)}% confidence)`;
      } else {
        detectionResults.innerText = 'No signs detected';
      }
    } else {
      throw new Error(result.error || 'Server detection failed');
    }
  } catch (error) {
    console.error('Error with server detection:', error);
    detectionResults.innerText = 'Server detection error. Using simulation.';
    
    // Fall back to simulation
    simulateDetection();
  }
}

// Function to simulate sign language detection results
function simulateDetection() {
  // Randomly choose if we detect a sign (30% chance)
  if (Math.random() < 0.3) {
    const randomSignIndex = Math.floor(Math.random() * signClasses.length);
    const detectedSign = signClasses[randomSignIndex];
    const confidence = (Math.random() * 0.5 + 0.5).toFixed(2); // Random confidence between 0.5 and 1.0
    
    detectionResults.innerText = `Detected: ${detectedSign} (${confidence * 100}% confidence)`;
    
    // Draw a bounding box for the detected sign
    const boxX = Math.random() * (detectionCanvas.width - 100);
    const boxY = Math.random() * (detectionCanvas.height - 100);
    const boxWidth = 100 + Math.random() * 100;
    const boxHeight = 100 + Math.random() * 100;
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 3;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    // Add label
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(`${detectedSign}: ${confidence * 100}%`, boxX, boxY - 5);
  }
}

// Function to clear the detection canvas
function clearCanvas() {
  ctx.clearRect(0, 0, detectionCanvas.width, detectionCanvas.height);
}

// Function to leave the call
function leaveCall() {
  if (currentCall) {
    currentCall.close();
  }
  
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  
  localVideo.srcObject = null;
  remoteVideo.srcObject = null;
  
  callContainer.classList.add('hidden');
  welcomeScreen.classList.remove('hidden');
  
  // Reset detection
  stopDetection();
}

// Updated: Event listeners for toggle detection
toggleDetectionBtn.addEventListener('click', () => {
  if (detectionEnabled) {
    stopDetection();
  } else {
    // Give user option to choose server or simulated detection
    if (confirm('Use server-side detection? Click OK for server detection, Cancel for simulation.')) {
      serverDetectionEnabled = true;
      startDetection();
    } else {
      serverDetectionEnabled = false;
      startDetection();
    }
  }
});

// Event listeners
joinBtn.addEventListener('click', () => {
  const enteredRoomId = roomIdInput.value.trim();
  if (enteredRoomId) {
    roomId = enteredRoomId;
    joinRoom(roomId);
  } else {
    alert('Please enter a room ID');
  }
});

createBtn.addEventListener('click', () => {
  roomId = createRoomId();
  roomIdInput.value = roomId;
  joinRoom(roomId);
  alert(`Room created! Share this ID with others: ${roomId}`);
});

muteBtn.addEventListener('click', () => {
  const audioTracks = localStream.getAudioTracks();
  const muted = audioTracks[0].enabled;
  audioTracks.forEach(track => {
    track.enabled = !muted;
  });
  muteBtn.innerText = muted ? 'Unmute' : 'Mute';
});

videoBtn.addEventListener('click', () => {
  const videoTracks = localStream.getVideoTracks();
  const videoOff = videoTracks[0].enabled;
  videoTracks.forEach(track => {
    track.enabled = !videoOff;
  });
  videoBtn.innerText = videoOff ? 'Show Video' : 'Hide Video';
});

leaveBtn.addEventListener('click', leaveCall);

// Initialize the application
window.addEventListener('load', () => {
  // Set up canvas for detection
  detectionCanvas.width = 640;
  detectionCanvas.height = 480;
});
