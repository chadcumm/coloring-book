#!/usr/bin/env python3
"""
Script to download all PDF files from a given URL
"""

import os
import sys
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import time

def get_pdf_links(url):
    """
    Fetch a URL and extract all PDF links
    """
    try:
        print(f"Fetching {url}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Find all links that end with .pdf
        pdf_links = []
        for link in soup.find_all('a'):
            href = link.get('href', '')
            if href.lower().endswith('.pdf'):
                full_url = urljoin(url, href)
                pdf_links.append(full_url)

        return pdf_links

    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return []

def download_pdf(url, output_dir):
    """
    Download a single PDF file
    """
    try:
        filename = os.path.basename(urlparse(url).path)
        if not filename:
            filename = f"file_{int(time.time())}.pdf"

        filepath = os.path.join(output_dir, filename)

        # Skip if file already exists
        if os.path.exists(filepath):
            print(f"  ✓ {filename} (already exists, skipping)")
            return True

        print(f"  ↓ Downloading {filename}...")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()

        with open(filepath, 'wb') as f:
            f.write(response.content)

        print(f"  ✓ {filename} ({len(response.content) / 1024:.1f} KB)")
        return True

    except Exception as e:
        print(f"  ✗ Error downloading {url}: {e}")
        return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 download_pdfs.py <url1> [url2] [url3] ... [--output-dir <path>]")
        print("\nExample:")
        print("  python3 download_pdfs.py https://greencoloring.com/animal-coloring-pages/")
        print("  python3 download_pdfs.py url1 url2 url3 --output-dir ./pdfs")
        sys.exit(1)

    # Parse arguments
    urls = []
    output_dir = "./coloring_pages_pdfs"

    i = 1
    while i < len(sys.argv):
        if sys.argv[i] == "--output-dir" and i + 1 < len(sys.argv):
            output_dir = sys.argv[i + 1]
            i += 2
        else:
            urls.append(sys.argv[i])
            i += 1

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    print(f"Output directory: {output_dir}\n")

    all_pdfs = []

    # Process each URL
    for url in urls:
        print(f"Processing: {url}")
        pdfs = get_pdf_links(url)
        print(f"Found {len(pdfs)} PDF(s)\n")
        all_pdfs.extend(pdfs)

    if not all_pdfs:
        print("No PDFs found!")
        sys.exit(1)

    # Download all PDFs
    print(f"\nDownloading {len(all_pdfs)} PDF(s)...\n")
    successful = 0
    for pdf_url in all_pdfs:
        if download_pdf(pdf_url, output_dir):
            successful += 1
        time.sleep(0.5)  # Be polite to the server

    print(f"\n✓ Complete! Downloaded {successful}/{len(all_pdfs)} PDFs")
    print(f"Location: {os.path.abspath(output_dir)}")

if __name__ == "__main__":
    main()
