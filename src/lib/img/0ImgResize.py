from PIL import Image
import os

CWD = os.path.dirname(os.path.realpath(__file__))  # get the directory of the script

# get all the images in the directory
images = os.listdir(CWD)
subdirs = [d for d in images if os.path.isdir(os.path.join(CWD, d))]
for subdir in subdirs:
    images.extend([os.path.join(subdir, img) for img in os.listdir(os.path.join(CWD, subdir))])

images = [
    img
    for img in images
    if img.endswith(".jpg")
    or img.endswith(".png")
    or img.endswith(".jpeg")
    or img.endswith(".gif")
    or img.endswith(".JPG")
    or img.endswith(".PNG")
    or img.endswith(".JPEG")
    or img.endswith(".GIF")
]

print(images)

# resize the images
i = 0
for img in images:
    print(str(i / len(images) * 100) + "%")
    i += 1
    try:
        with Image.open(os.path.join(CWD, img)) as image:
            image = image.convert("RGB")
            path = img.split(".")[0] + ".webp"
            image.save(os.path.join(CWD, path), "webp", quality=75)

    except Exception as e:
        print(e)
        print("Error with image: ", img)
        continue

print("Done!")
