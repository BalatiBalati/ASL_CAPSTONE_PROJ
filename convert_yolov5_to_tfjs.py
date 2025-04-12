# convert_yolov5_to_tfjs.py
import argparse
import sys
import os
import torch
import tensorflow as tf
import subprocess

def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('--weights', type=str, default='best.pt', help='PyTorch model weights path')
    parser.add_argument('--output', type=str, default='./public/model', help='Output directory for TF.js model')
    return parser.parse_args()

def convert_pt_to_saved_model(weights_path, output_dir):
    """Convert PyTorch model to TensorFlow SavedModel format"""
    print(f"Converting {weights_path} to TensorFlow SavedModel format...")
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Use YOLOv5's export.py to convert to TensorFlow SavedModel
    command = [
        "python", "export.py",
        "--weights", weights_path,
        "--include", "saved_model",
        "--tf",
        "--dynamic"
    ]
    
    try:
        subprocess.run(command, check=True)
        print("PyTorch to SavedModel conversion successful")
        
        # The export.py script typically saves the model with the same name as the input
        # but with different extension
        model_name = os.path.basename(weights_path).split('.')[0]
        saved_model_path = f"{model_name}_saved_model"
        
        return saved_model_path
    
    except subprocess.CalledProcessError as e:
        print(f"Error during export.py: {e}")
        return None

def convert_saved_model_to_tfjs(saved_model_path, output_dir):
    """Convert TensorFlow SavedModel to TensorFlow.js format"""
    print(f"Converting SavedModel to TensorFlow.js format...")
    
    # Create the output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        import tensorflowjs as tfjs
        
        # Convert SavedModel to TensorFlow.js format
        tfjs.converters.convert_tf_saved_model(
            saved_model_path,
            output_dir
        )
        
        print(f"Conversion successful. TensorFlow.js model saved to {output_dir}")
        return True
    
    except ImportError:
        print("Error: tensorflowjs package not found. Install with 'pip install tensorflowjs'")
        return False
    except Exception as e:
        print(f"Error during TensorFlow.js conversion: {e}")
        return False

def main():
    args = parse_args()
    
    # Step 1: Convert PyTorch model to TensorFlow SavedModel
    saved_model_path = convert_pt_to_saved_model(args.weights, args.output)
    if not saved_model_path:
        print("Failed to convert PyTorch model to SavedModel. Exiting.")
        sys.exit(1)
    
    # Step 2: Convert SavedModel to TensorFlow.js format
    conversion_success = convert_saved_model_to_tfjs(saved_model_path, args.output)
    if not conversion_success:
        print("Failed to convert SavedModel to TensorFlow.js. Exiting.")
        sys.exit(1)
    
    # Create a metadata.json file with class labels
    class_names = [ 'Hello', 'Yes', 'No', 'Thanks', 'ILoveYou', 'Please' ]
    
    metadata = {
        "classNames": class_names,
        "modelType": "yolov5",
        "inputShape": [640, 640, 3]
    }
    
    import json
    with open(os.path.join(args.output, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print("Conversion completed successfully.")
    print(f"Model and metadata saved to {args.output}")

if __name__ == "__main__":
    main()