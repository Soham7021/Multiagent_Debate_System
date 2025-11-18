import os

# Define folder & file structure
folders = [
    "frontend",
    "frontend/js",
    "frontend/assets"
]

files = {
    "frontend/index.html": "",
    "frontend/styles.css": "",
    "frontend/js/api.js": "",
    "frontend/js/ui.js": "",
    "frontend/js/app.js": "",
    "frontend/assets/.gitkeep": ""   # keeps folder in git
}

def create_structure():
    # Create folders
    for folder in folders:
        os.makedirs(folder, exist_ok=True)
        print(f"Created folder: {folder}")

    # Create files
    for file_path, content in files.items():
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Created file: {file_path}")

if __name__ == "__main__":
    create_structure()
    print("\nFrontend structure generated successfully!")
