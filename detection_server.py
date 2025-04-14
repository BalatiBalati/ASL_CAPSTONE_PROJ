from flask import Flask, request, jsonify
import torch
import cv2
import numpy as np
import base64
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Enable cross-origin requests

# Load YOLOv5 model
MODEL_PATH = 'best_windows2.pt'  # Path to your model
model = None
port = int(os.environ.get('PORT', 5000))

def load_model():
    global model
    if model is None:
        print("Loading YOLOv5 model...")
        model = torch.hub.load('ultralytics/yolov' \
        '5', 'custom', path=MODEL_PATH)
        model.conf = 0.5  # Confidence threshold
        print("Model loaded successfully")
    return model

# Class names for your model
CLASS_NAMES = ['Hello', 'IloveYou', 'No', 'Please', 'Thanks', 'Yes']

@app.route('/detect', methods=['POST'])
def detect_signs():
    if request.method == 'POST':
        try:
            # Get base64 encoded image from request
            data = request.json
            image_data = data['image'].split(',')[1]
            
            # Decode base64 image
            image_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # Load model if not already loaded
            model = load_model()
            
            # Perform detection
            results = model(image)
            
            # Process results
            detections = []
            for pred in results.xyxy[0].cpu().numpy():
                x1, y1, x2, y2, conf, cls_id = pred
                detections.append({
                    'box': {
                        'x': float(x1),
                        'y': float(y1),
                        'width': float(x2 - x1),
                        'height': float(y2 - y1)
                    },
                    'class': CLASS_NAMES[int(cls_id)],
                    'confidence': float(conf)
                })
            
            return jsonify({
                'success': True,
                'detections': detections
            })
        
        except Exception as e:
            print(f"Error: {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            })

if __name__ == '__main__':
     app.run(host='0.0.0.0', port=port, debug=False)
