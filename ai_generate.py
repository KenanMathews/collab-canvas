import requests
import os

LIMEWIRE_API_KEY = os.getenv("LIMEWIRE_API_KEY")

def generate_pixel_art(prompt):
    url = "https://api.limewire.com/api/image/generation"

    payload = {
        "prompt": 'A pixel art image of'+prompt,
        "aspect_ratio": "1:1",
        "quality": "LOW"
    }

    headers = {
        "Content-Type": "application/json",
        "X-Api-Version": "v1",
        "Accept": "application/json",
        "Authorization": "Bearer "+LIMEWIRE_API_KEY
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()  # Raise an exception for bad status codes
        data = response.json()
        return data
    except requests.exceptions.RequestException as e:
        print("Request failed:", e)
        return None  # Or handle the failure in some other way