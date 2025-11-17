# Star Field 3D

Interactive 3D visualization tool that transforms 2D star field images into dynamic 3D volumes showing true stellar distances. Designed for astronomy students to explore the spatial relationships between stars and demonstrate that even within a small field of view, the actual distances between stars are immense.

## Overview

GAIAView allows students to:
- Upload 2D star field images (PNG/JPG format)
- Enter HIP star catalog numbers and distance measurements
- Automatically generate 3D visualizations showing stars at their true distances
- Interactively rotate, zoom, and explore the 3D volume
- Customize labels, distance units, and visualization settings
- Capture screenshots for lab reports

The visualization shows the original 2D image as the front face of a wireframe volume, with lines extending from stars into the 3D space representing their true distances from Earth. This effectively demonstrates how stars that appear close together in a 2D projection can be at vastly different distances in 3D space.

## Features

### Core Visualization
- **3D Volume Visualization**: Transform a 2D star field image into a rotatable 3D wireframe volume
- **Distance Lines**: Visualize star distances with lines extending from the image plane
- **Interactive Controls**: Rotate, zoom, and pan the 3D view using mouse/trackpad
- **Star Filtering**: Adjust the number of visible stars via slider (brightest first)
- **Distance Labels**: Display distances in light-years or parsecs at star positions
- **Customizable**: Adjust depth scale, toggle lines and labels

### Student Interface
- **Web-based Data Entry**: Simple form interface for entering star data
- **HIP Catalog Lookup**: Automatic RA/Dec coordinate lookup for HIP stars
- **Image Upload**: Upload PNG/JPG star field images
- **Coordinate Conversion**: Automatic conversion from RA/Dec to pixel coordinates using gnomonic projection
- **Up to 27 Stars**: Support for one primary star (e.g., "Alpheratz") plus 26 additional stars (Star A-Z)

### Instructor Tools
- **Data Converter Script**: Process PixInsight annotation output files
- **SIMBAD API Integration**: Automatic distance lookup for HIP stars
- **Pre-processing Pipeline**: Convert CSV/JSON/text formats to visualization data

## Deployment Modes

### Mode 1: GitHub Pages (Student Interface)

Students access the tool via GitHub Pages and enter their data directly in the browser:

1. Navigate to the GitHub Pages site
2. Upload star field image (PNG/JPG)
3. Enter image center coordinates (RA/Dec in degrees) from PixInsight ImageSolver
4. Enter star data:
   - Primary star (e.g., "Alpheratz") with HIP number and distance (pc)
   - Additional stars (Star A-Z) with HIP number and distance
   - Click "Add Star" to add more entries
5. Click "Generate Visualization"
6. Explore the 3D view, customize labels and settings
7. Take screenshots for lab reports

**Note**: The system automatically looks up RA/Dec coordinates for HIP stars from a catalog and maps them to pixel coordinates in your image using gnomonic projection.

### Mode 2: Local/Pre-processed (Instructor Mode)

Instructors can pre-process data using the converter script:

1. Run PixInsight ImageSolver on star field image
2. Run PixInsight annotation script to identify HIP stars
3. Export annotation data (CSV/text format)
4. Run converter script to process data:
   ```bash
   cd converter
   npm install
   node data-converter.js <input-file> <image-file> ./web/assets
   ```
5. Place generated files in `web/assets/` directory
6. Open `web/index.html` in browser (or serve via local server)

## Project Structure

```
StarField3D/
├── converter/              # Node.js scripts for data processing
│   ├── pixinsight-parser.js    # Parse annotation/export data
│   ├── distance-lookup.js      # SIMBAD API or HIP catalog lookup
│   ├── data-converter.js       # Main conversion script
│   └── package.json
├── web/                    # Frontend web application
│   ├── index.html              # Main HTML (data entry + visualization)
│   ├── js/
│   │   ├── main.js             # Three.js scene setup and rendering
│   │   ├── volume.js           # Wireframe box geometry
│   │   ├── stars.js            # Star positioning, lines, and labels
│   │   ├── utils.js            # Coordinate conversion utilities
│   │   ├── data-entry.js       # Student data entry form handling
│   │   ├── catalog.js          # HIP catalog lookup
│   │   └── coordinate-converter.js  # RA/Dec to pixel conversion
│   ├── css/
│   │   └── styles.css
│   └── assets/             # User data (generated or uploaded)
│       ├── starfield.jpg        # Star field image
│       ├── stars.json           # Star data with distances
│       └── hip-catalog.json    # HIP catalog subset
├── .github/
│   └── workflows/
│       └── pages.yml           # GitHub Pages deployment
├── .gitignore
└── README.md
```

## Setup

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Node.js (for converter script, optional)
- PixInsight (for image processing, optional)

### Web Application Setup

#### Option 1: GitHub Pages (Recommended)

**Automatic Deployment (Recommended)**

The repository includes a GitHub Actions workflow that automatically deploys to GitHub Pages:

1. Push repository to GitHub
2. Go to repository Settings → Pages
3. Under "Source", select "GitHub Actions"
4. The workflow will automatically deploy when you push to the `main` branch
5. Your site will be available at `https://rootlake.github.io/StarField3D/`

**Manual Deployment (Alternative)**

If you prefer manual deployment:

1. Push repository to GitHub
2. Go to repository Settings → Pages
3. Set Source to "Deploy from a branch"
4. Select branch: `main` (or your main branch)
5. Set folder to `/web`
6. Save - site will be available at `https://rootlake.github.io/StarField3D/`

#### Option 2: Local Development

1. Clone or download the repository
2. Navigate to the `web` directory
3. Serve files using a local server:

   **Python:**
   ```bash
   cd web
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser

   **Node.js:**
   ```bash
   cd web
   npx http-server -p 8000
   ```

   **VS Code:**
   Use the "Live Server" extension

### Converter Script Setup (Optional)

For instructors who want to pre-process PixInsight data:

```bash
cd converter
npm install
```

## Quick Start for Students

**For detailed instructions, see [STUDENT_GUIDE.md](STUDENT_GUIDE.md)**

1. **Prepare your files:**
   - Front image: `[StarName]_Front.jpg`
   - Back image: `[StarName]_Back.jpg` (optional)
   - CSV file with star data (see CSV format below)

2. **Access the tool:**
   - Navigate to the GitHub Pages site
   - Or open `web/index.html` locally

3. **Upload and visualize:**
   - Click "Upload CSV" and select your CSV file
   - Upload your front and back images
   - Click "Generate 3D Model"
   - Explore your visualization!

## Usage

### Controls

- **Left Click + Drag**: Rotate the 3D view
- **Right Click + Drag**: Pan the view
- **Mouse Wheel**: Zoom in/out

### UI Controls

- **Stars Visible**: Slider to adjust how many stars are displayed (brightest first)
- **Distance Unit**: Toggle between light-years and parsecs
- **Show Distance Lines**: Toggle visibility of distance lines
- **Show Labels**: Toggle visibility of star labels
- **Depth Scale**: Adjust the depth scale of the visualization volume (0.5x to 2.0x)

### Data Entry

**Image Upload:**
- Upload PNG or JPG format star field image
- Standard frame size: All students should use images from the same observatory setup
- Front image (required): `[StarName]_Front.jpg`
- Back image (optional): `[StarName]_Back.jpg`

**CSV File Format:**
- Required columns: `FrontImage`, `BackImage`, `Label`, `HIP`, `Temperature_K`, `Distance_pc`, `Magnitude`, `PixelX`, `PixelY`
- First row: Headers (do not modify)
- Second row: Fill in ALL columns including image filenames
- Subsequent rows: Leave `FrontImage` and `BackImage` empty
- See `STUDENT_GUIDE.md` for detailed CSV format instructions

**Manual Data Entry (Alternative):**
- Enter star label (e.g., "Alpheratz" or "Star A")
- Enter HIP catalog number (e.g., 677)
- Enter distance in parsecs (e.g., 29.8)
- Enter pixel coordinates (X, Y) if available
- Click "Add Star" to add more stars (up to 27 total)

**Sample Data:**
- Use the "Load Example" dropdown to load example CSV files
- Examples are available in `web/assets/Examples/`

## Technical Details

### Coordinate Systems

The tool handles three coordinate systems:

1. **Pixel Coordinates**: (x, y) positions in the uploaded image
2. **Celestial Coordinates**: Right Ascension (RA) and Declination (Dec) in degrees
3. **3D Cartesian Coordinates**: (x, y, z) for visualization

### Coordinate Conversion

The system uses **gnomonic projection** to convert RA/Dec to pixel coordinates:

1. HIP star catalog numbers are looked up to get RA/Dec coordinates
2. RA/Dec coordinates are converted to pixel positions using:
   - Image center coordinates (from user input)
   - Field of view calculation (based on telescope parameters)
   - Gnomonic projection mathematics

### Distance Scaling

Distances are automatically scaled to fit within the visualization volume:

- Minimum distance determines the "front offset"
- All distances are normalized to fit within the volume depth
- Formula: `scaledZ = (distance - frontOffset) / (maxDistance - frontOffset)`

### Volume Dimensions

Default volume dimensions match typical screen sizes:
- Width: 1920 pixels (screen width)
- Height: 1080 pixels (screen height)
- Depth: 1920 pixels (matches width for optimal viewing)

These can be adjusted via the depth scale slider.

## Data Format

The converter generates a `stars.json` file with the following structure:

```json
{
  "image": {
    "width": 2048,
    "height": 1365,
    "aspectRatio": 1.5,
    "filename": "starfield.jpg"
  },
  "volume": {
    "width": 1920,
    "height": 1080,
    "depth": 1920
  },
  "scaling": {
    "frontOffsetLy": 0,
    "maxDistanceLy": 500,
    "distanceRangeLy": 500
  },
  "stars": [
    {
      "hip": 677,
      "name": "Alpheratz",
      "ra": 0.1398,
      "dec": 29.0905,
      "pixelX": 1024,
      "pixelY": 683,
      "magnitude": 2.1,
      "distanceLy": 97.3,
      "distancePc": 29.8,
      "scaledDistance": 0.15
    }
  ]
}
```

## Technology Stack

- **Three.js**: 3D visualization and rendering (WebGL)
- **Node.js**: Data processing and conversion (for converter script)
- **Vanilla JavaScript**: Frontend application (no framework dependencies)
- **GitHub Pages**: Static site hosting

## Educational Use Cases

This tool is designed for:

- **HIP Star Lab**: Students calculate distances from parallax and apparent magnitude
- **Spatial Visualization**: Understanding that 2D projections don't represent true 3D distances
- **Star Cluster Analysis**: Visualizing how star clusters appear dense in 2D but spread out in 3D
- **Distance Scale Comprehension**: Demonstrating the immense distances between stars

## Future Enhancements

- [ ] HIP star selection UI (click stars or checkbox list)
- [ ] Multiple image support
- [ ] Export/save visualization state
- [ ] Animation showing distances expanding
- [ ] Star cluster highlighting
- [ ] Comparison mode (side-by-side views)
- [ ] Educational overlays and tooltips
- [ ] Expanded HIP catalog with more stars
- [ ] Custom telescope parameter input
- [ ] Screenshot export functionality

## For Instructors

### Setting Up for Your Class

1. **Standardize Frame Size:**
   - Ensure all students use the same camera/telescope setup
   - Document the standard image dimensions for your observatory
   - Update `STUDENT_GUIDE.md` with your specific requirements

2. **Prepare Example Data:**
   - Add example CSV files to `web/assets/Examples/`
   - Include corresponding images in `web/assets/images/`
   - Examples will appear in the "Load Example" dropdown

3. **Deploy to GitHub Pages:**
   - Follow the GitHub Pages setup instructions above
   - Share the GitHub Pages URL with students
   - Students can access the tool from any device with a web browser

### CSV Template

Students should use the template in `web/assets/Examples/Google_Sheets_Template.csv`. See `STUDENT_GUIDE.md` for detailed instructions.

## Contributing

This project is designed for educational use. Contributions welcome!

## License

MIT License

## Acknowledgments

- Built for Pomfret Astronomy GAIA/HIP star lab
- Uses Three.js for 3D visualization
- HIP catalog data from Hipparcos mission
- SIMBAD API for star coordinate lookup
