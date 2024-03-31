from flask import Flask, request, jsonify
import imgur
import db
import ai_generate
from datetime import datetime


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
            name = request.form.get('name')
            x = int(request.form.get('x'))
            y = int(request.form.get('y'))
            free = db.check_if_coordinate_free(x,y)
            x,y = db.reverse_convert_coordinates(x,y)
            if free:
            # Upload image to Imgur
                imgur_link = imgur.upload(image, name+'.png')
                db.update_annotations(imgur_link, x, y, name)
                if imgur_link:
                    return jsonify({'message': 'File uploaded successfully', 'image_link': imgur_link}), 200
                else:
                    return jsonify({'error': 'Failed to upload file to Imgur'}), 500
            else:
                return jsonify({'error': 'The location is occupied'}), 200
    else:
        return jsonify({'error': 'File type not allowed'}), 400

@app.route('/generate_pixel_art', methods=['POST'])
def generate_pixel_art():
    data = request.get_json()
    name = data.get('name')
    prompt = data.get('prompt')
    coords = db.get_random_free_coordinate()
    if coords:
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
    else:
        return jsonify({'error': 'No free space on canvas'}), 500

@app.route('/upload_pixel_art', methods=['POST'])
def upload_pixel_art():
    name = request.form.get('name')
    image_link = request.form.get('image_link')
    try:
        x = int(request.form.get('x'))
        y = int(request.form.get('y'))
        if image_link:
            free = db.check_if_coordinate_free(x,y)
            x,y = db.reverse_convert_coordinates(x,y)
            if free:
                link = imgur.download_and_upload(image_link, name+'.png')
                db.update_annotations(link, x, y, name)
                return jsonify({'message': 'Pixel art uploaded successfully', 'image_link': image_link}), 200
            else:
                return jsonify({'message': 'The location is occupied'}), 200
        else:
            return jsonify({'error': 'Failed to upload pixel art to Imgur'}), 500
    except Exception as e:
        return jsonify({'error': 'Failed to upload pixel art'}), 500

@app.route('/annotations')
def get_annotations():
    annotations = db.get_today_annotations()
    return jsonify(annotations)

@app.route('/prev_annotations')
def prev_annotations():
    selected_date_str = request.args.get('date')
    if selected_date_str:
        selected_date = datetime.strptime(selected_date_str, '%a, %d %b %Y %H:%M:%S GMT').date()
        annotations_for_date =  db.get_annotations(selected_date)
        return jsonify(annotations_for_date)

@app.route('/annotation_dates')
def get_annotation_dates():
    dates_with_annotations = db.get_annotation_dates()
    return jsonify(dates_with_annotations)

@app.route('/get_free_coordinates')
def get_free_coordinates():
    coords = db.get_random_free_coordinate()
    return jsonify({'message':'Values fetched','x': coords[0], 'y':coords[1]}), 200

@app.route('/get_all_free_coordinates')
def get_all_free_coordinates():
    data = db.get_all_free_coordinates()
    return jsonify({'message':'Values fetched','allowed_coords':data["allowed_coordinates"],"used_coords":data["used_coordinates"]}), 200

@app.route('/check_free_coordinates', methods=['POST'])
def check_free_coordinates():
    data = request.get_json()
    try:
        x = int(data.get('x'))
        y = int(data.get('y'))
        free = db.check_if_coordinate_free(x,y)
        if free:
            return jsonify({'message':'The coordinates are available', 'isFree': free}), 200
        else:
            return jsonify({'message':'The coordinates are not available', 'isFree': free}), 200
    except Exception as e:
            print(e)

@app.route('/')
def index():
    return app.send_static_file('index.html')

if __name__ == '__main__':
    app.run(debug=True)
