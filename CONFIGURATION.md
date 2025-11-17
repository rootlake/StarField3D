# Configuration Guide

## Standard Frame Size Configuration

This document describes how to configure the standard frame size for your observatory setup.

### Current Setup

The system automatically detects image dimensions from uploaded files. However, for consistency across all student submissions, you should:

1. **Standardize Camera/Telescope Setup**: Ensure all students use the same equipment
2. **Document Standard Dimensions**: Record the typical image dimensions from your setup
3. **Update Student Guide**: Add your specific dimensions to `STUDENT_GUIDE.md`

### Image Requirements

- **Format**: JPG (JPEG) preferred, PNG also supported
- **Naming Convention**: 
  - Front: `[StarName]_Front.jpg`
  - Back: `[StarName]_Back.jpg`
- **File Size**: Recommended < 50MB for web upload
- **Dimensions**: Automatically detected (no hardcoded limits)

### CSV Requirements

The CSV file must include pixel coordinates (`PixelX`, `PixelY`) for each star. These coordinates should match the actual dimensions of the uploaded images.

### Example Configuration

If your observatory produces images of size 4000x3000 pixels:

1. Update `STUDENT_GUIDE.md` with:
   ```
   Standard Dimensions: 4000 x 3000 pixels
   ```

2. Ensure students export pixel coordinates matching these dimensions

3. Verify CSV files reference images with consistent dimensions

### Testing

To verify your configuration:

1. Upload a test CSV with pixel coordinates
2. Upload corresponding images
3. Verify stars appear at correct positions
4. Check that visualization scales correctly

### Troubleshooting

**Stars appear in wrong positions:**
- Verify pixel coordinates match actual image dimensions
- Check that CSV uses correct coordinate system (origin at top-left)

**Images don't match:**
- Ensure all images use same camera/telescope setup
- Verify image dimensions are consistent
- Check that pixel coordinates are scaled correctly

