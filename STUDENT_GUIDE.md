# Student Guide: Using GAIAView 3D Visualization

## Overview

This tool allows you to create 3D visualizations of star fields from your observatory images. You'll upload JPG images (front and back) and a CSV file with star data.

## Standard Frame Size

**All students must use the same frame size for consistency:**

- **Image Format**: JPG (JPEG)
- **Standard Dimensions**: Your observatory images should be taken with the same camera/telescope setup
- **File Naming**: 
  - Front image: `[StarName]_Front.jpg` (e.g., `Alpheratz_Front.jpg`)
  - Back image: `[StarName]_Back.jpg` (e.g., `Alpheratz_Back.jpg`)

**Note**: The system accepts any image size, but all students should use images from the same observatory setup for consistent results. The actual pixel dimensions will be automatically detected from your uploaded images.

## Required Files

For each star field visualization, you need:

1. **Front Image** (JPG) - The main star field image
2. **Back Image** (JPG, optional) - A second image from a different orientation
3. **CSV File** - Star data with coordinates and distances

## CSV File Format

Your CSV file must include the following columns:

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `FrontImage` | Filename of front image | `Alpheratz_Front.jpg` |
| `BackImage` | Filename of back image (optional) | `Alpheratz_Back.jpg` |
| `Label` | Star name/label | `Alpheratz`, `A`, `B`, `C` |
| `HIP` | HIP catalog number | `677` |
| `Temperature_K` | Temperature in Kelvin | `9500` |
| `Distance_pc` | Distance in parsecs | `29.8` |
| `Magnitude` | Apparent magnitude (optional) | `2.1` |
| `PixelX` | X pixel coordinate | `1024` |
| `PixelY` | Y pixel coordinate | `683` |

### Important Notes

- **First row**: Contains headers (do not modify)
- **Second row**: Fill in ALL columns including image filenames
- **Subsequent rows**: Leave `FrontImage` and `BackImage` empty (they use values from row 2)
- **Pixel Coordinates**: These are the (x, y) positions of stars in your image, typically obtained from image processing software like PixInsight

### Example CSV Structure

```csv
FrontImage,BackImage,Label,HIP,Temperature_K,Distance_pc,Magnitude,PixelX,PixelY
Alpheratz_Front.jpg,Alpheratz_Back.jpg,Alpheratz,677,9500,29.8,2.1,1024,683
,,A,544,9500,13.8,2.3,1200,500
,,B,540,9500,14.2,2.4,1500,600
```

## Step-by-Step Instructions

### 1. Prepare Your Images

- Take images from the observatory (front and back views)
- Save as JPG format
- Name files: `[YourStarName]_Front.jpg` and `[YourStarName]_Back.jpg`

### 2. Create CSV File

**Option A: Use Google Sheets Template**

1. Open `Google_Sheets_Template.csv` in Google Sheets
2. Fill in your star data following the format above
3. Export as CSV: File → Download → Comma-separated values (.csv)

**Option B: Create Manually**

1. Create a new spreadsheet
2. Add the header row with all column names
3. Fill in your star data
4. Export as CSV

### 3. Upload to GAIAView

1. Open the GAIAView web application
2. Click **"Upload CSV"** and select your CSV file
3. Upload your **Front Image** (JPG)
4. Upload your **Back Image** (JPG, optional)
5. Click **"Generate 3D Model"**

### 4. Explore Your Visualization

- Rotate: Left-click and drag
- Zoom: Mouse wheel
- Pan: Right-click and drag
- Adjust settings using the controls panel

## Getting Pixel Coordinates

Pixel coordinates (PixelX, PixelY) tell the system where each star appears in your image. You can get these from:

1. **PixInsight**: Use the annotation tool to identify stars and export coordinates
2. **Image Processing Software**: Most astronomy software can export star positions
3. **Manual Measurement**: Use image editing software to find pixel positions (less accurate)

## Temperature Reference

Common stellar temperatures (Kelvin):

| Spectral Class | Temperature (K) |
|----------------|-----------------|
| O2             | 45,000          |
| B2             | 22,000          |
| A2             | 9,500           |
| F2             | 7,000           |
| G2 (Sun)       | 5,800           |
| K2             | 4,800           |
| M2             | 3,600           |

## Troubleshooting

**Images won't upload?**
- Check file format is JPG
- Ensure file size is reasonable (< 50MB recommended)

**CSV import fails?**
- Verify all required columns are present
- Check that row 2 has image filenames filled in
- Ensure pixel coordinates are numbers (not text)

**Stars don't appear in visualization?**
- Verify pixel coordinates are within image bounds
- Check that HIP numbers are correct
- Ensure distances are in parsecs (not light-years)

**Visualization looks wrong?**
- Verify pixel coordinates match your actual image
- Check that image dimensions match your uploaded files
- Ensure all star data is complete

## Need Help?

- Check the example CSV files in `assets/Examples/`
- Review `GOOGLE_SHEETS_INSTRUCTIONS.md` for detailed CSV format
- Ask your instructor for assistance

