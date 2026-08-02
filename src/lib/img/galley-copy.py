#!/usr/bin/env python3
"""
galley-copy.py

Small GUI utility to build a markdown image gallery block from a selected
folder (under this img directory) and copy it to the clipboard.

Output format:
#!g
![alt text](relative/path/to/image.ext){}
#!g

Alt text is the image file name (extension removed); caption braces are left empty.
"""

import os
import shutil
import subprocess
from guizero import App, PushButton, Text, TextBox, Box


class GalleyCopy:
    VALID_EXTS = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg")

    def __init__(self):
        self.app = App(title="Galley Copy", width=800, height=480)
        # script directory is the img folder where this script lives
        self.script_dir = os.path.dirname(os.path.realpath(__file__))
        self.folder_path = None

        # Controls
        self.controls = Box(self.app, align="top", width="fill")
        PushButton(self.controls, text="Select Folder", command=self.select_folder, align="left")
        self.folder_text = Text(self.controls, text="No folder selected", align="left")
        self.copy_btn = PushButton(
            self.controls, text="Copy Gallery", command=self.copy_gallery, align="right"
        )
        self.copy_btn.disable()

        # Output preview
        Text(self.app, text="Generated Markdown:", align="top")
        self.output = TextBox(self.app, multiline=True, width="fill", height=18)

        self.app.display()

    def select_folder(self):
        path = self.app.select_folder()
        if not path:
            return

        path = os.path.realpath(path)
        # Ensure selected folder is inside the img folder (script_dir)
        try:
            common = os.path.commonpath([self.script_dir, path])
        except Exception:
            common = ""

        if common != self.script_dir:
            self.app.error("Error", f"Please select a folder under: {self.script_dir}")
            self.folder_path = None
            self.folder_text.value = "No folder selected"
            self.copy_btn.disable()
            return

        self.folder_path = path
        # show path relative to img folder
        rel = os.path.relpath(self.folder_path, self.script_dir)
        rel = rel.replace(os.sep, "/")
        self.folder_text.value = rel
        self.copy_btn.enable()

    def _collect_images(self):
        if not self.folder_path:
            return []
        try:
            items = os.listdir(self.folder_path)
        except Exception:
            return []
        files = [f for f in sorted(items) if f.lower().endswith(self.VALID_EXTS)]
        return files

    def generate_markdown(self):
        files = self._collect_images()
        if not files:
            return ""

        lines = ["#!g"]
        for fn in files:
            abs_path = os.path.join(self.folder_path, fn)
            rel_path = os.path.relpath(abs_path, self.script_dir).replace(os.sep, "/")
            alt = os.path.splitext(fn)[0]
            # make alt more reader-friendly: replace dashes/underscores with spaces
            alt = alt.replace("-", " ").replace("_", " ")
            lines.append(f"![{alt}]({rel_path}){{}}")
        lines.append("#!g")

        return "\n".join(lines)

    def _copy_to_clipboard(self, text):
        # Primary: use the guizero/tk root
        try:
            self.app.tk.clipboard_clear()
            self.app.tk.clipboard_append(text)
            self.app.tk.update()
            return True
        except Exception:
            pass

        # Fallback: standalone tkinter
        try:
            import tkinter as tk

            r = tk.Tk()
            r.withdraw()
            r.clipboard_clear()
            r.clipboard_append(text)
            r.update()
            r.destroy()
            return True
        except Exception:
            pass

        # Fallback: pyperclip if installed
        try:
            import pyperclip

            pyperclip.copy(text)
            return True
        except Exception:
            pass

        # Fallback: try common command-line clipboard tools (wl-copy, xclip, xsel)
        try:
            if shutil.which("wl-copy"):
                p = subprocess.Popen(["wl-copy"], stdin=subprocess.PIPE)
                p.communicate(text.encode("utf-8"))
                return True
            if shutil.which("xclip"):
                p = subprocess.Popen(["xclip", "-selection", "clipboard"], stdin=subprocess.PIPE)
                p.communicate(text.encode("utf-8"))
                return True
            if shutil.which("xsel"):
                p = subprocess.Popen(["xsel", "--clipboard", "--input"], stdin=subprocess.PIPE)
                p.communicate(text.encode("utf-8"))
                return True
        except Exception:
            pass

        return False

    def copy_gallery(self):
        md = self.generate_markdown()
        if not md:
            self.app.info("Info", "No images found in selected folder")
            return

        ok = self._copy_to_clipboard(md)
        self.output.value = md
        if ok:
            self.app.info("Copied", "Gallery markdown copied to clipboard")
        else:
            self.app.error("Error", "Could not copy to clipboard; see the generated markdown below")


if __name__ == "__main__":
    GalleyCopy()
