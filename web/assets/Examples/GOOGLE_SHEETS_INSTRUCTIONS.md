# Google Sheets Template for Star Data

## Quick Start

1. **Open Google Sheets** (sheets.google.com)
2. **Create a new spreadsheet**
3. **Import the template**: File → Import → Upload → Select `Google_Sheets_Template.csv`
4. **Fill in your data** (see instructions below)
5. **Export as CSV**: File → Download → Comma-separated values (.csv)

## Column Instructions

### Row 1 (Header) - DO NOT MODIFY
Keep the header row exactly as shown. These column names must match exactly.

### Row 2 (Primary Star - Required)
Fill in ALL columns for the first star:

- **ImageCenterRA_H/M/S**: Right Ascension in hours, minutes, seconds
- **ImageCenterDec_Sign**: `1` for positive (+) declination, `-1` for negative (-) declination
  - Always use `1` or `-1` only (never 0 or other values)
  - Use `1` for declination from 0° to +90° (north celestial hemisphere)
  - Use `-1` for declination from 0° to -90° (south celestial hemisphere)
  - For exactly 0° (celestial equator), use `1`
- **ImageCenterDec_D/M/S**: Declination in degrees, minutes, seconds (always non-negative, 0-90)
- **FrontImage**: Filename of front image (e.g., `StarName_Front.png`)
- **BackImage**: Filename of back image (optional, leave empty if none)
- **Label**: Star name/label (e.g., "Alpheratz", "Vega", "Sirius")
- **HIP**: HIP catalog number
- **Temperature_K**: Temperature in Kelvin (see reference below)
- **Distance_pc**: Distance in parsecs
- **Magnitude**: Apparent magnitude (optional, can be empty)

### Row 3+ (Additional Stars)
For each additional star:
- **Leave ImageCenterRA and ImageCenterDec columns EMPTY** (they use the values from row 2)
- **Leave FrontImage and BackImage columns EMPTY** (they use the values from row 2)
- Fill in: Label, HIP, Temperature_K, Distance_pc, Magnitude

## Temperature Reference

Use these temperatures (Kelvin) for common spectral types:

| Spectral Class | Temperature (K) |
|----------------|------------------|
| O2             | 45000            |
| O5             | 38000            |
| B2             | 22000            |
| A2             | 9500             |
| F2             | 7000             |
| G2             | 5800 (Sun)       |
| K2             | 4800             |
| M2             | 3600             |

The system will automatically match your temperature to the closest spectral class.

## Example

```
ImageCenterRA_H | ImageCenterRA_M | ImageCenterRA_S | ... | FrontImage              | BackImage                | Label    | HIP | Temperature_K | Distance_pc | Magnitude
0               | 8               | 36.250         | ... | MyStar_Front.png        | MyStar_Back.png          | MyStar   | 677 | 9500         | 29.8        | 2.1
                |                 |                | ... |                         |                          | A        | 544 | 9500         | 13.8        |
                |                 |                | ... |                         |                          | B        | 540 | 9500         | 14.2        |
```

## Important Notes

1. **DO NOT DELETE THE HEADER ROW**
2. **DO NOT ADD EXTRA COLUMNS**
3. **Keep image filenames in row 2 only** - leave empty for other rows
4. **Keep coordinates in row 2 only** - leave empty for other rows
5. **All stars must have Label, HIP, Temperature_K, and Distance_pc**
6. **Magnitude is optional** - can be left empty

## Exporting

1. File → Download → Comma-separated values (.csv)
2. Save the file with a descriptive name (e.g., `Vega.csv`)
3. Upload to the GAIAView application using the "Upload CSV" button

## Troubleshooting

- **Wrong number of columns?** Make sure you haven't added or deleted any columns
- **Import fails?** Check that all required fields are filled in row 2
- **Images not loading?** Ensure image filenames match files in `assets/images/` folder
- **Temperature not matching?** The system finds the closest match - use exact values from the reference table if needed

