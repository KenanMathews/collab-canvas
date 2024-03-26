from flask import Flask, request, jsonify, send_file
import os
import json
from datetime import date
from PIL import Image
from io import BytesIO
import imgur
import db

app = Flask(__name__)
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


import os
from flask import request, jsonify
from datetime import date
from PIL import Image
from io import BytesIO
import requests

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No image part'}), 400

    image = request.files['file']
    
    if image.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if image and allowed_file(image.filename):
        coords = db.get_random_free_coordinate(db.get_annotations())
        if coords:
            name = request.form.get('name')
            # Upload image to Imgur
            imgur_link = imgur.upload(image, name)
            db.update_annotations(imgur_link, coords[0], coords[1], name)
            if imgur_link:
                return jsonify({'message': 'File uploaded successfully', 'image_link': imgur_link}), 200
            else:
                return jsonify({'error': 'Failed to upload file to Imgur'}), 500
        else:
            return jsonify({'error': 'Limit reached'}), 200
    else:
        return jsonify({'error': 'File type not allowed'}), 400

@app.route('/annotations')
def get_annotations():
    annotations = db.get_annotations()
    return jsonify(annotations)

@app.route('/get_free_coordinates')
def get_free_coordinates():
    coords = db.get_random_free_coordinate(db.get_annotations())
    return jsonify({'message':'Values fetched','x': coords[0], 'y':coords[1]}), 200



@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)
