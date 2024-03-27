from prodiapy import Prodia
import os

PRODIA_API_KEY = os.getenv("PRODIA_API_KEY")

def generate_pixel_art(prompt):
    prodia = Prodia(api_key=PRODIA_API_KEY)
    prompt = 'Generate an image in the style of pixel art for the following info.'+prompt
    job = prodia.sdxl.generate(prompt=prompt)
    result = prodia.wait(job)
    return result.image_url