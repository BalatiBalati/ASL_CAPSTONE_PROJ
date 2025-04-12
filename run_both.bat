@echo off
echo Starting all servers...

:: Start PeerJS server in a new window
start cmd /k "echo Starting PeerJS server... && npm run peerjs"

:: Start Express server in a new window
start cmd /k "echo Starting Express server... && npm run dev"

:: Start Python detection server in a new window
start cmd /k "echo Starting Detection server... && python detection_server.py"

echo All servers started. You can now access the application at http://localhost:3000