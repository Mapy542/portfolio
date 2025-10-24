from PIL import Image
import os, multiprocessing

CWD = os.path.dirname(os.path.realpath(__file__))  # get the directory of the script

thread_count = multiprocessing.cpu_count() - 2 if multiprocessing.cpu_count() > 2 else 1

# get all the images in the directory
images = os.listdir(CWD)
subdirs = [d for d in images if os.path.isdir(os.path.join(CWD, d))]
for subdir in subdirs:
    images.extend([os.path.join(subdir, img) for img in os.listdir(os.path.join(CWD, subdir))])

images = [
    img for img in images if img.endswith(".webp")
]  # get all webp images only to convert to thumbnails


def create_thumbnails(img_list, sizes):
    for img in img_list:
        try:
            with Image.open(os.path.join(CWD, img)) as image:
                for size in sizes:
                    image_copy = image.copy()
                    image_copy.thumbnail((size, size))
                    thumb_path = os.path.join(
                        CWD,
                        "thumb",
                        str(size),
                        img.replace(" ", "-"),
                    )
                    image_copy.save(thumb_path, "webp", quality=100)
        except Exception as e:
            print(e)
            print("Error with image: ", img)
            continue


if __name__ == "__main__":
    # create thumbnail folders if they don't exist
    sizes = [150, 225, 320, 480, 640, 960, 1280, 1920, 2560]  # downscale sizes only

    thumb_dir = os.path.join(CWD, "thumb")
    if not os.path.exists(thumb_dir):
        os.makedirs(thumb_dir)

    for size in sizes:
        size_dir = os.path.join(thumb_dir, str(size))
        if not os.path.exists(size_dir):
            os.makedirs(size_dir)
        # make subdirs in thumb folders
        for subdir in subdirs:
            subdir_path = os.path.join(size_dir, subdir)
            if not os.path.exists(subdir_path):
                os.makedirs(subdir_path)

    # Split images into chunks for each thread
    chunk_size = (len(images) + thread_count - 1) // thread_count
    processes = []
    for i in range(thread_count):
        chunk = images[i * chunk_size : (i + 1) * chunk_size]
        p = multiprocessing.Process(target=create_thumbnails, args=(chunk, sizes))
        processes.append(p)
        p.start()

    for p in processes:
        p.join()

    print("Thumbnail creation done!")

    exit(0)
