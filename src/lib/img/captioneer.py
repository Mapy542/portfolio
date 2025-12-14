import os
from guizero import App, PushButton, Text, TextBox, Picture, Box
from PIL import Image


class Captioneer:
    def __init__(self):
        self.app = App(title="Captioneer", width=800, height=700)
        self.folder_path = None
        self.images = []
        self.current_image_index = 0

        # UI Elements
        self.controls_box = Box(self.app, align="top", width="fill", border=True)
        self.select_folder_btn = PushButton(
            self.controls_box, text="Select Folder", command=self.select_folder, align="left"
        )
        self.folder_text = Text(self.controls_box, text="No folder selected", align="left")
        self.start_btn = PushButton(
            self.controls_box,
            text="Start",
            command=self.start_captioning,
            align="right",
            enabled=False,
        )

        self.image_box = Box(self.app, width="fill", height="fill")
        self.picture = Picture(self.image_box)

        self.caption_box = Box(self.app, align="bottom", width="fill", border=True)
        Text(self.caption_box, text="Caption:", align="left")
        self.caption_input = TextBox(self.caption_box, width="fill", align="left")
        self.save_btn = PushButton(
            self.caption_box, text="Save & Next", command=self.save_and_next, align="right"
        )

        # Bind Enter key to save_and_next
        self.caption_input.when_key_released = self.handle_key

        self.app.display()

    def select_folder(self):
        self.folder_path = self.app.select_folder()
        if self.folder_path:
            self.folder_text.value = self.folder_path
            self.start_btn.enable()

    def start_captioning(self):
        if not self.folder_path:
            return

        # Get images
        try:
            files = os.listdir(self.folder_path)
            valid_extensions = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp")
            self.images = [f for f in files if f.lower().endswith(valid_extensions)]

            if not self.images:
                self.app.info("Info", "No images found in folder")
                return

            self.current_image_index = 0
            self.load_current_image()
            self.caption_input.focus()
        except Exception as e:
            self.app.error("Error", f"Failed to load images: {e}")

    def load_current_image(self):
        if self.current_image_index < len(self.images):
            img_name = self.images[self.current_image_index]
            img_path = os.path.join(self.folder_path, img_name)

            try:
                # Open and resize image for display
                pil_img = Image.open(img_path)

                # Calculate resize ratio to fit in window (approx 750x500)
                max_width = 750
                max_height = 500
                pil_img.thumbnail((max_width, max_height))

                self.picture.image = pil_img
                self.caption_input.value = ""
                self.app.title = (
                    f"Captioneer - {img_name} ({self.current_image_index + 1}/{len(self.images)})"
                )
            except Exception as e:
                print(f"Error loading image {img_name}: {e}")
                # Skip to next image if this one fails
                self.current_image_index += 1
                self.load_current_image()
        else:
            self.app.info("Done", "All images processed!")
            self.picture.image = None
            self.app.title = "Captioneer - Done"
            self.caption_input.value = ""

    def save_and_next(self):
        if self.current_image_index >= len(self.images):
            return

        caption = self.caption_input.value.strip()
        if caption:
            old_name = self.images[self.current_image_index]
            old_path = os.path.join(self.folder_path, old_name)

            name, ext = os.path.splitext(old_name)
            # Sanitize caption for filename
            safe_caption = "".join(
                [c for c in caption if c.isalpha() or c.isdigit() or c in (" ", "-", "_")]
            ).strip()
            safe_caption = safe_caption.replace(" ", "-")

            if safe_caption:
                new_name = f"{safe_caption}{ext}"
                new_path = os.path.join(self.folder_path, new_name)

                try:
                    # Close the image file handle before renaming (Windows issue)
                    self.picture.image = None

                    if os.path.exists(new_path):
                        # Append a number if file exists
                        i = 1
                        while os.path.exists(new_path):
                            new_name = f"{safe_caption}_{i}{ext}"
                            new_path = os.path.join(self.folder_path, new_name)
                            i += 1

                    os.rename(old_path, new_path)
                    print(f"Renamed {old_name} to {new_name}")
                except Exception as e:
                    self.app.error("Error", f"Could not rename file: {e}")
                    # Reload image if rename failed
                    self.load_current_image()
                    return

        self.current_image_index += 1
        self.load_current_image()
        self.caption_input.focus()

    def handle_key(self, event):
        # Check if Enter key was pressed
        if event.key == "\r":
            self.save_and_next()


if __name__ == "__main__":
    Captioneer()
