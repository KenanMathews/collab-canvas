from datetime import datetime, timedelta
from supabase import create_client, Client
import os

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_KEY")
SUPABASE_KEY = os.getenv("SUPABASE_URL")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

import random

def update_annotations(filepath, x_coord, y_coord, name):
    # Get current timestamp
    timestamp = datetime.now().isoformat()

    # Insert data into Supabase table
    data = {
        'image_path': filepath,
        'x_coord': x_coord,
        'y_coord': y_coord,
        'name': name,
        'created_at': timestamp,
    }
    res = supabase.table('test-table').insert(data).execute()
    if res.data:
        print(res.data)
    else:
        print(res.error)

def get_annotations():
    # Get today's date at 12:00 AM GMT
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    # Get tomorrow's date at 12:00 AM GMT to use as the upper bound
    tomorrow = today + timedelta(days=1)

    # Construct query to fetch annotations created between today and tomorrow
    res = supabase.table('test-table').select('*').filter('created_at', 'gte', today.isoformat()).filter('created_at', 'lt', tomorrow.isoformat()).execute()

    if res.data:
        annotations = res.data
        return annotations
    else:
        print("Failed to fetch annotations from Supabase.")
        print(res)
        return []

def get_random_free_coordinate(annotations):
    # Assuming annotations is a list of dictionaries containing 'x' and 'y' coordinates
    all_coordinates = [(anno['x_coord'], anno['y_coord']) for anno in annotations]

    # Generate all possible coordinates in your grid
    max_x = 1600
    max_y = 1600
    step = 400
    all_possible_coordinates = [(x, y) for x in range(0, max_x, step) for y in range(0, max_y, step)]

    # Filter out used coordinates
    free_coordinates = list(set(all_possible_coordinates) - set(all_coordinates))
    if free_coordinates:
        return random.choice(free_coordinates)
    else:
        print("No free coordinates available.")
        return None

# Example usage:
# update_annotations(upload_folder_path, filepath, x_coord, y_coord, name)