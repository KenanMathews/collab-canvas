from datetime import datetime, timedelta
from supabase import create_client, Client
import os

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

max_x = 1600
max_y = 1600
step = 400

import random

def update_annotations(filepath, x_coord, y_coord, name):

    # Insert data into Supabase table
    data = {
        'image_path': filepath,
        'x_coord': x_coord,
        'y_coord': y_coord,
        'name': name,
    }
    res = supabase.table('test-table').insert(data).execute()
    if res.data:
        print(res.data)
    else:
        print(res.error)

def update_generated_url(name, url):
    # Insert data into Supabase table
    data = {
        'url': url,
        'name': name,
    }
    res = supabase.table('generated-images-table').insert(data).execute()
    if res.data:
        print(res.data)
    else:
        print(res.error)

from datetime import datetime

def get_today_annotations():
    return get_annotations(datetime.utcnow().date())
def get_annotations(date):
    # Define start and end time for the given date
    start_time = datetime.combine(date, datetime.min.time())
    end_time = datetime.combine(date, datetime.max.time())

    # Construct query to fetch annotations created between start and end time
    res = supabase.table('test-table').select('*').filter('created_at', 'gte', start_time.isoformat()).filter('created_at', 'lte', end_time.isoformat()).execute()

    if res.data:
        annotations = res.data
        return annotations
    else:
        print("Failed to fetch annotations from Supabase.")
        print(res)
        return []

def convert_coordinates(x, y):
    converted_x = x // step
    converted_y = y // step
    return converted_x, converted_y

def reverse_convert_coordinates(converted_x, converted_y):
    x = converted_x * step
    y = converted_y * step
    return x, y

def convert_all_coordinates(coordinates):
    arr = []
    for coordinate in coordinates:
        arr.append(convert_coordinates(coordinate[0],coordinate[1]))
    return arr

def get_all_free_coordinates():
    annotations = get_today_annotations()
    all_coordinates = [(anno['x_coord'], anno['y_coord']) for anno in annotations]
    all_possible_coordinates = [(i, j) for i in range(0, max_x, step) for j in range(0, max_y, step)]
    free_coordinates = list(set(all_possible_coordinates) - set(all_coordinates))   
    return {"allowed_coordinates":convert_all_coordinates(free_coordinates),"used_coordinates":convert_all_coordinates(all_coordinates)}
def check_if_coordinate_free(x,y):
    annotations = get_today_annotations()
    all_coordinates = [(anno['x_coord'], anno['y_coord']) for anno in annotations]
    all_possible_coordinates = [(i, j) for i in range(0, max_x, step) for j in range(0, max_y, step)]
    free_coordinates = list(set(all_possible_coordinates) - set(all_coordinates))
    return reverse_convert_coordinates(x, y) in free_coordinates

def get_random_free_coordinate():
    annotations = get_today_annotations()
    # Assuming annotations is a list of dictionaries containing 'x' and 'y' coordinates
    all_coordinates = [(anno['x_coord'], anno['y_coord']) for anno in annotations]

    # Generate all possible coordinates in your grid
    all_possible_coordinates = [(x, y) for x in range(0, max_x, step) for y in range(0, max_y, step)]

    # Filter out used coordinates
    free_coordinates = list(set(all_possible_coordinates) - set(all_coordinates))
    if free_coordinates:
        return random.choice(free_coordinates)
    else:
        print("No free coordinates available.")
        return None

def get_annotation_dates():
    # Fetch annotations from Supabase
    res = supabase.table('test-table').select('created_at').execute()

    if res.data:
        annotation_dates = set()  # Using a set to store unique dates
        for entry in res.data:
            created_at_str = entry.get('created_at')
            if created_at_str:
                created_at = datetime.fromisoformat(created_at_str)
                annotation_dates.add(created_at.date())
        
        return sorted(list(annotation_dates)) # Convert set to list before returning
    else:
        print("Failed to fetch annotations from Supabase.")
        print(res)
        return []


# Example usage:
#update_annotations(upload_folder_path, filepath, x_coord, y_coord, name)