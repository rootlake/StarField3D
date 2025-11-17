# Demo Library

This folder contains CSV files for demo star fields. Each CSV file contains all the data needed to visualize a star field in 3D.

## File Organization

For each star field demo, you need:

1. **CSV file** in `assets/demos/` (e.g., `Alpheratz.csv`)
2. **Image files** in `assets/images/` referenced by the CSV:
   - Front image (e.g., `Alpheratz_Annotated.png`)
   - Back image (optional, e.g., `Alpheratz_Annotated_Back.png`)

The CSV file references the image filenames in the `FrontImage` and `BackImage` columns. When you load a demo CSV, the system automatically loads the corresponding images from `assets/images/`.

## Adding New Demos

To add a new demo:

1. Create a CSV file following the format in `Google_Sheets_Template.csv`
2. Place it in `assets/demos/` (e.g., `Pleiades.csv`)
3. Add the corresponding image files to `assets/images/`
4. Update the `knownDemos` array in `web/js/data-entry.js` to include your new CSV filename

## Available Demos

- **Alpheratz** - Alpha Andromedae star field
- **Diphda** - Beta Ceti star field

## CSV Format

See `Google_Sheets_Template.csv` for the required format. The CSV includes:

### Required Columns
- `FrontImage`, `BackImage` - Image filenames (only in first row)
- `Label` - Star label/name (e.g., "Alpheratz", "A", "B")
- `HIP` - HIP catalog number
- `Temperature_K` - Stellar temperature in Kelvin
- `Distance_pc` - Distance in parsecs
- `Magnitude` - Apparent magnitude
- `PixelX`, `PixelY` - Pixel coordinates for star positions

### Optional Columns (from image solver)
- `PixelScale_ArcsecPerPixel` - Image scale in arcseconds per pixel
- `FOV_Width_Deg`, `FOV_Height_Deg` - Field of view dimensions in degrees

### Image Center Coordinates (Optional, for RA/Dec conversion fallback)
- `ImageCenterRA_H`, `ImageCenterRA_M`, `ImageCenterRA_S`
- `ImageCenterDec_Sign`, `ImageCenterDec_D`, `ImageCenterDec_M`, `ImageCenterDec_S`

Note: Center coordinates are only needed if some stars don't have pixel coordinates and need RA/Dec conversion.

## For Students

Students can create their own CSV files using Google Sheets:

1. Import `Google_Sheets_Template.csv` into Google Sheets
2. Follow instructions in `GOOGLE_SHEETS_INSTRUCTIONS.md`
3. Fill in star data with pixel coordinates
4. Export as CSV and upload via the web interface
5. Upload corresponding images via the web interface

The system works best when pixel coordinates are provided in the CSV, eliminating the need for image center coordinates.
