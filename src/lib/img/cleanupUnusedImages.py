import os, re

relativeMarkdown = "../data/"

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
    or img.endswith(".webp")
    or img.endswith(".WEBP")
    or img.endswith(".pdf")
]

print(images)

# find all used images in markdown files
mardownFiles = []
for file in os.listdir(os.path.join(CWD, relativeMarkdown)):
    if file.endswith(".md"):
        mardownFiles.append(file)
    elif os.path.isdir(os.path.join(CWD, relativeMarkdown, file)):
        for subfile in os.listdir(os.path.join(CWD, relativeMarkdown, file)):
            if subfile.endswith(".md"):
                mardownFiles.append(os.path.join(file, subfile))

staticJsonFiles = []
for file in os.listdir(os.path.join(CWD, relativeMarkdown)):
    if file.endswith(".json"):
        staticJsonFiles.append(file)
    elif os.path.isdir(os.path.join(CWD, relativeMarkdown, file)):
        for subfile in os.listdir(os.path.join(CWD, relativeMarkdown, file)):
            if subfile.endswith(".json"):
                staticJsonFiles.append(os.path.join(file, subfile))

usedImages = set()
for mdFile in mardownFiles:
    try:
        with open(os.path.join(CWD, relativeMarkdown, mdFile), "r", encoding="utf-8") as f:
            content = f.readlines()
            for line in content:
                # regex to find image paths
                matches = re.findall(r"!\[.*?\]\((.*?)\)", line)
                if matches:
                    for match in matches:
                        imgPath = match.split(" ")[0]  # in case there's a title after the URL
                        imgPath = imgPath.lstrip("/")  # remove leading slash if present
                        usedImages.add(imgPath)

                # match for metadata "#! image: path"
                meta_matches = re.findall(
                    r"#!\s*image:\s*(.*?\.(?:jpg|jpeg|png|gif|webp|pdf))", line, re.IGNORECASE
                )
                if meta_matches:
                    for match in meta_matches:
                        imgPath = match.lstrip("/")  # remove leading slash if present
                        usedImages.add(imgPath)
    except Exception as e:
        print(f"Error reading {mdFile}: {e}")

for jsonFile in staticJsonFiles:
    try:
        with open(os.path.join(CWD, relativeMarkdown, jsonFile), "r", encoding="utf-8") as f:
            content = f.read()
            # regex to find image paths in JSON
            matches = re.findall(r'"(.*?\.(?:jpg|jpeg|png|gif|webp|pdf))"', content, re.IGNORECASE)
            for match in matches:
                imgPath = match.lstrip("/")  # remove leading slash if present
                usedImages.add(imgPath)
    except Exception as e:
        print(f"Error reading {jsonFile}: {e}")

print("Used images:")
print(usedImages)

# delete unused images
# move to "unused" folder

unusedDir = os.path.join(CWD, "unused")
if not os.path.exists(unusedDir):
    os.makedirs(unusedDir)
for img in images:
    if img not in usedImages:
        print(f"Moving unused image: {img}")
        try:
            os.rename(os.path.join(CWD, img), os.path.join(unusedDir, os.path.basename(img)))
        except Exception as e:
            print(f"Error moving {img}: {e}")

print("Done!")
