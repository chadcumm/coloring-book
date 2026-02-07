#!/usr/bin/env python3
"""
Script to combine PDFs into a 3x2 grid (6 per page)
Creates a new PDF with multiple pages, each page containing 6 PDFs arranged in a 3x2 grid
"""

import os
import sys
import glob
from pathlib import Path
from pdf2image import convert_from_path
from PIL import Image
import io

def get_pdf_files(folder_path):
    """
    Get all PDF files from a folder, sorted by name
    """
    pdf_files = sorted(glob.glob(os.path.join(folder_path, "*.pdf")))
    return pdf_files

def pdf_to_image(pdf_path, dpi=150):
    """
    Convert the first page of a PDF to an image
    """
    try:
        images = convert_from_path(pdf_path, first_page=1, last_page=1, dpi=dpi)
        return images[0]
    except Exception as e:
        print(f"  ✗ Error converting {pdf_path}: {e}")
        return None

def create_grid_page(pdf_files, grid_width=3, grid_height=2, dpi=150):
    """
    Create a single page with PDFs arranged in a grid
    Returns a PIL Image or None if not enough PDFs
    """
    if len(pdf_files) == 0:
        return None

    # Convert PDFs to images
    images = []
    for pdf_file in pdf_files:
        img = pdf_to_image(pdf_file, dpi=dpi)
        if img:
            images.append(img)

    if not images:
        return None

    # Calculate grid dimensions
    # Each cell should have some padding
    cell_padding = 20

    # Get the size of the first image to determine cell size
    sample_width, sample_height = images[0].size

    # Calculate cell size (images will be scaled to fit)
    cell_width = sample_width + cell_padding
    cell_height = sample_height + cell_padding

    # Create grid image
    grid_width_px = grid_width * cell_width
    grid_height_px = grid_height * cell_height

    # Create white background
    grid_image = Image.new('RGB', (grid_width_px, grid_height_px), 'white')

    # Place images in grid
    for idx, img in enumerate(images):
        if idx >= grid_width * grid_height:
            break

        row = idx // grid_width
        col = idx % grid_width

        # Scale image to fit cell (with padding)
        max_img_width = cell_width - cell_padding
        max_img_height = cell_height - cell_padding

        # Calculate scaling to fit in cell while maintaining aspect ratio
        scale = min(max_img_width / img.width, max_img_height / img.height)
        new_width = int(img.width * scale)
        new_height = int(img.height * scale)

        # Resize image
        resized_img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Calculate position to center image in cell
        x_offset = col * cell_width + (cell_width - new_width) // 2
        y_offset = row * cell_height + (cell_height - new_height) // 2

        # Paste image onto grid
        grid_image.paste(resized_img, (x_offset, y_offset))

    return grid_image

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 combine_pdfs_grid.py <folder_path> [--output <filename>]")
        print("\nExample:")
        print("  python3 combine_pdfs_grid.py ./coloring_pages_pdfs")
        print("  python3 combine_pdfs_grid.py ./coloring_pages_pdfs --output combined.pdf")
        sys.exit(1)

    # Parse arguments
    folder_path = sys.argv[1]
    output_file = "combined_grid.pdf"

    if len(sys.argv) > 3 and sys.argv[2] == "--output":
        output_file = sys.argv[3]

    # Validate folder
    if not os.path.isdir(folder_path):
        print(f"Error: Folder '{folder_path}' not found!")
        sys.exit(1)

    # Get PDF files
    pdf_files = get_pdf_files(folder_path)
    if not pdf_files:
        print(f"Error: No PDF files found in '{folder_path}'")
        sys.exit(1)

    print(f"Found {len(pdf_files)} PDF(s)")
    print(f"Creating grid pages (3 wide x 2 high = 6 per page)...\n")

    # Process PDFs in batches of 6
    grid_images = []
    batch_size = 6

    for i in range(0, len(pdf_files), batch_size):
        batch = pdf_files[i:i + batch_size]
        print(f"Page {len(grid_images) + 1}: Processing {len(batch)} PDF(s)...")

        grid_image = create_grid_page(batch, grid_width=3, grid_height=2, dpi=150)
        if grid_image:
            grid_images.append(grid_image)

    if not grid_images:
        print("Error: No images were created!")
        sys.exit(1)

    # Save as PDF
    print(f"\nSaving to {output_file}...")

    # Convert RGBA to RGB if needed
    final_images = []
    for img in grid_images:
        if img.mode == 'RGBA':
            final_images.append(img.convert('RGB'))
        else:
            final_images.append(img)

    final_images[0].save(
        output_file,
        save_all=True,
        append_images=final_images[1:] if len(final_images) > 1 else [],
        quality=95
    )

    print(f"✓ Complete!")
    print(f"Created {len(grid_images)} page(s)")
    print(f"Output: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    main()
