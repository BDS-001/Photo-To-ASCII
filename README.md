# Photo-To-ASCII

# Image to ASCII Art Converter

A JavaScript library that transforms images into ASCII art with multiple rendering modes and customization options. Supports standard ASCII characters, Braille patterns, and edge detection.

## Features

- Multiple rendering modes:
  - Grayscale ASCII
  - Grayscale Braille
  - Colored ASCII
  - Color with brightness mapping
  - Edge detection (outline and fill modes)
- Real-time preview
- Adjustable dimensions with aspect ratio preservation
- Contrast adjustment
- Customizable font size
- Reversible intensity mapping

## Demo

[Add your demo link here]

## Installation

1. Download Module File:
```bash
ImageToAsciiModule.js
```

2. Include the script in your HTML:
```html
<script src="path/to/ImageToAsciiModule.js"></script>
```

## Usage

### Basic Setup

```html
<div id="imageSettings">
    <input type="file" id="imageUpload" accept="image/*">
    <input type="number" id="imgWidth" name="imgWidth" value="150">
    <input type="number" id="imgHeight" name="imgHeight" value="150">
    <select id="mode" name="mode">
        <option value="grayscale">Grayscale ASCII</option>
        <option value="grayscaleBraille">Grayscale Braille</option>
        <!-- Add other modes -->
    </select>
    <input type="checkbox" id="maintainAspectRatio" name="maintainAspectRatio">
    <input type="number" id="fontSize" name="fontSize" value="12">
</div>
<div id="art"></div>
```

### JavaScript Implementation

```javascript
const processor = new ImageToAsciiProcessor();

// Process an image after loading image
await processor.loadImage(imageFile);
const result = await processor.processImage('grayscale', optionsObject);

//Process image and load an image
const result = await processor.processImage('grayscale', {
    charSet: 'ascii',
    imgWidth: 150,
    imgHeight: 150,
    image: imageFile
});

//========================
// Mode Examples
//========================

// 1. Standard Grayscale ASCII
const grayscaleArt = await processor.processImage('grayscale', {
    charSet: 'ascii',
});

// 2. Grayscale Braille
const brailleArt = await processor.processImage('grayscale', {
    charSet: 'braille',
});

// 3. Simple Colored ASCII (single character)
const coloredArt = await processor.processImage('color', {
    mode: 'singleCharacter',
});

// 4. Colored ASCII with brightness mapping
const colorBrightnessAscii = await processor.processImage('color', {
    mode: 'shading',
    charSet: 'ascii',
});

// 5. Colored Braille with brightness mapping
const colorBrightnessBraille = await processor.processImage('color', {
    mode: 'shading',
    charSet: 'braille',
});

// 6. Edge Detection (outline mode)
const edgeOutline = await processor.processImage('edgeDetection', {
    mode: 'outline',
    charSet: 'ascii',
});

// 7. Edge Detection with fill (ASCII)
const edgeFillAscii = await processor.processImage('edgeDetection', {
    mode: 'fill',
    charSet: 'ascii',
});

// 8. Edge Detection with fill (Braille)
const edgeFillBraille = await processor.processImage('edgeDetection', {
    mode: 'fill',
    charSet: 'braille',
});

// Advanced usage with all options
const advancedArt = await processor.processImage('grayscale', {
    // Required processing options
    process: 'grayscale',        // 'grayscale' | 'color' | 'edgeDetection'
    charSet: 'ascii',            // 'ascii' | 'braille'
    mode: 'shading',             // For color: 'singleCharacter' | 'shading'
                                // For edgeDetection: 'outline' | 'fill'
    
    // Dimension settings
    imgWidth: 150,              // 1-1000
    imgHeight: 150,             // 1-1000
    maintainAspectRatio: true,  // boolean
    
    // Image adjustments
    contrastFactor: 1.5,        // 0.1-3.0
    reverseIntensity: false,    // boolean
    
    // Optional: Load image directly
    image: imageFile            // File object
});
```


## Available Modes

1. **Grayscale ASCII**
   - Standard ASCII characters
   - Brightness-based mapping

2. **Grayscale Braille**
   - Uses Braille patterns
   - Enhanced density for detailed images

3. **Colored ASCII**
   - Maintains original colors
   - Single character or brightness-mapped characters

4. **Edge Detection**
   - Outline mode: Shows edges only
   - Fill mode: Combines edges with grayscale fill
   - Available in both ASCII and Braille

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| imgWidth | number | 150 | Output width in characters |
| imgHeight | number | 150 | Output height in characters |
| contrastFactor | number | 1 | Contrast adjustment (0.1 - 3.0) |
| reverseIntensity | boolean | false | Invert brightness mapping |
| maintainAspectRatio | boolean | false | Preserve image proportions |
| charSet | string | 'ascii' | Character set ('ascii' or 'braille') |


## Performance Considerations

- Image dimensions affect processing time
- Recommended maximum dimensions: 1000x1000
- Edge detection mode requires more processing power
- Consider using WebWorkers for large images

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires Canvas API support
- ES6+ JavaScript features used