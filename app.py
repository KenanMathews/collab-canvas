from flask import Flask, request, jsonify
import imgur
import db
import ai_generate

app = Flask(__name__)
ALLOWED_EXTENSIONS = {'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@app.route('/generate_pixel_art', methods=['POST'])
def generate_pixel_art():
    data = request.get_json()
    name = data.get('name')
    prompt = data.get('prompt')
    try:
        url = ai_generate.generate_pixel_art(prompt)
        if url:
            db.update_generated_url(name,url)
            return jsonify({'message': 'Pixel art generated successfully', 'image_link': url}), 200
        else:
            return jsonify({'error': 'Failed to generate'}), 500
    except Exception as e:
        print(e)
        return jsonify({'error': 'Image generation issue'}), 500

@app.route('/upload_pixel_art', methods=['POST'])
def upload_pixel_art():
    name = request.form.get('name')
    image_link = request.form.get('image_link')
    try:
        print(name)
        print(image_link)
        if image_link:
            coords = db.get_random_free_coordinate(db.get_annotations())
            db.update_annotations(image_link, coords[0], coords[1], name)
            return jsonify({'message': 'Pixel art uploaded successfully', 'image_link': image_link}), 200
        else:
            return jsonify({'error': 'Failed to upload pixel art to Imgur'}), 500
    except Exception as e:
        return jsonify({'error': 'Failed to upload pixel art'}), 500

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
