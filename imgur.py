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

def download_image(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            return response.content
        else:
            print("Failed to download image from URL:", url)
            return None
    except Exception as e:
        print("Error downloading image:", e)
        return None

def download_and_upload(url, file_name='file.png'):
    image_content = download_image(url)
    if image_content:
        imgur_link = upload(image_content, file_name)
        if imgur_link:
            print("Image uploaded successfully to Imgur:", imgur_link)
            return imgur_link
        else:
            print("Failed to upload image to Imgur.")
    else:
        print("Failed to download image from URL.")
# Example usage:
# Assuming 'image_file' is the file object and 'file_name' is the filename
# link = upload(image_file, file_name)