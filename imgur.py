import requests
import os

client_id = os.getenv("IMGUR_CLIENT_ID")

def upload(image_file, file_name):
    url = "https://api.imgur.com/3/image"
    
    files = {
        'image': (file_name, image_file, 'image/png')
    }
    
    headers = {
        'Authorization': 'Client-ID '+client_id  # Replace YOUR_CLIENT_ID with your actual Imgur client ID
    }

    response = requests.post(url, headers=headers, files=files)
    
    if response.status_code == 200:
        return response.json()['data']['link']
    else:
        return None  # Return None if upload fails

# Example usage:
# Assuming 'image_file' is the file object and 'file_name' is the filename
# link = upload(image_file, file_name)
