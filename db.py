from datetime import datetime, timedelta
from supabase import create_client, Client
import os

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

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