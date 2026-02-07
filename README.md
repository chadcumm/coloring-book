# Coloring Book PDF Downloader & Combiner

A Python-based toolkit for downloading coloring page PDFs from websites and combining them into compact grid layouts.

## Features

- **Download PDFs**: Fetch all PDF links from a website and download them in bulk
- **Combine PDFs**: Create a compact coloring book by arranging 6 PDFs per page in a 3×2 grid
- Batch processing support
- Automatic duplicate detection (skips already downloaded files)
- High-quality output with proper image scaling

## Scripts

### 1. `download_pdfs.py`

Downloads all PDF files from one or more URLs.

**Usage:**
```bash
python3 download_pdfs.py <url1> [url2] [url3] ... [--output-dir <path>]
```

**Examples:**
```bash
# Download from a single URL
python3 download_pdfs.py https://greencoloring.com/animal-coloring-pages/

# Download from multiple URLs
python3 download_pdfs.py https://example.com/page1 https://example.com/page2

# Specify output directory
python3 download_pdfs.py https://example.com --output-dir ./my_pdfs
```

**Output:**
- Creates `coloring_pages_pdfs/` folder by default
- Organizes files by their original names
- Skips duplicate files on subsequent runs

### 2. `combine_pdfs_grid.py`

Combines PDF files into a multi-page document with a 3×2 grid layout (6 PDFs per page).

**Usage:**
```bash
python3 combine_pdfs_grid.py <folder_path> [--output <filename>]
```

**Examples:**
```bash
# Combine PDFs with default output name
python3 combine_pdfs_grid.py ./coloring_pages_pdfs

# Specify custom output filename
python3 combine_pdfs_grid.py ./coloring_pages_pdfs --output my_coloring_book.pdf
```

**Output:**
- Creates a PDF with all PDFs arranged in a 3-column × 2-row grid
- Each page contains up to 6 PDFs (smaller and scaled to fit)
- Last page may contain fewer items if not divisible by 6
- High quality output (95% compression, 150 DPI)

## Installation

### Requirements
- Python 3.6+
- `pip` (Python package manager)
- `poppler` (for PDF to image conversion)

### Setup

1. Clone this repository:
```bash
git clone https://github.com/yourusername/coloring-book.git
cd coloring-book
```

2. Install Python dependencies:
```bash
pip3 install requests beautifulsoup4 pdf2image pillow
```

3. Install poppler (required for PDF processing):

**macOS:**
```bash
brew install poppler
```

**Ubuntu/Debian:**
```bash
sudo apt-get install poppler-utils
```

**Windows:**
```bash
choco install poppler
```

Or download from: https://github.com/oschwartz10612/poppler-windows/releases/

## Workflow Example

1. Download coloring pages from a website:
```bash
python3 download_pdfs.py https://greencoloring.com/animal-coloring-pages/ https://greencoloring.com/valentines-day-coloring-pages/
```

2. Combine them into a compact book:
```bash
python3 combine_pdfs_grid.py ./coloring_pages_pdfs
```

3. Open `combined_grid.pdf` to view your compact coloring book!

## License

MIT License - Feel free to use and modify these scripts for your own projects.
