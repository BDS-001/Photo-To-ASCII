class ImageToAsciiProcessor {
    //========================
    // Static Configuration
    //========================
    
    static ASCII_MAPS = {
        standard: ' _.,-=+:;cba!?0123456789$W#@Ñ',
        standardReversed: 'Ñ@#W$9876543210?!abc;:+=-,._ ',
        braille : ['⠀', '⠁', '⠃', '⠇', '⠏', '⠟', '⠿', '⡿', '⣿'],
        brailleReversed : ['⣿', '⡿', '⠿', '⠟', '⠏', '⠇', '⠃', '⠁', '⠀'],
        standardEdges : {
            horizontal: '─',
            vertical: '│',
            diagonal1: '/',
            diagonal2: '\\',
            empty: ' '
        },
        brailleEdges : {
            horizontal: '⠤',
            vertical: '⠇', 
            diagonal1: '⠔',
            diagonal2: '⠢',
            empty: '⠀'
        },
        braille2 : ['⠀', '⣿']
    }

    static DEFAULT_SETTINGS = {
        mode: 'grayscale',
        imgWidth: 150,
        imgHeight: 150,
        contrastFactor: 1,
        reverseIntensity : false,
        maintainAspectRatio : false
    } 

    //========================
    // Initialization
    //========================
    
    constructor() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d', {alpha: false, willReadFrequently: true})
        this.settings = {
            ...ImageToAsciiProcessor.DEFAULT_SETTINGS,
            aspectRatio: null,
            currentImage: null,
            asciiDivider: Math.floor(255 / (ImageToAsciiProcessor.ASCII_MAPS.standard.length - 1))
        }
    }

    //========================
    // Settings Management
    //========================
    
    updateSettings(setting, value) {
        if (!(setting in ImageToAsciiProcessor.DEFAULT_SETTINGS)) {
            throw new Error(`Invalid setting: ${setting}`);
        }
        this.settings[setting] = value;

        if (this.settings.aspectRatio && this.settings.maintainAspectRatio) {
            if (setting === 'maintainAspectRatio' || setting === 'imgWidth') {
                if (this.settings.maintainAspectRatio) {
                    this.settings.imgHeight = Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2);
                }
            } else if (setting === 'imgHeight') {
                this.settings.imgWidth = Math.floor((this.settings.imgHeight * this.settings.aspectRatio) * 2);
            }
        }
    }

    //========================
    // Image Loading & Data Management
    //========================
    
    async loadImage(file) {
        if (!file) throw new Error('No file provided');

        if (this.settings.currentImage?.element?.src) {
            URL.revokeObjectURL(this.settings.currentImage.element.src);
        }

        if (this.settings.currentImage) {
            this.settings.currentImage.pixelData = null;
            this.settings.currentImage.pixelLuminanceData = null;
            this.settings.currentImage.element = null;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file)
            
            img.onload = () => {
                this.settings.currentImage = {
                    file: file,
                    element: img,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    pixelData: this.capturePixelData(img),
                    pixelLuminanceData: null,
                    gaussianPixelLuminanceData: null,
                };
                
                this.settings.aspectRatio = img.width / img.height;
                
                if (this.settings.maintainAspectRatio) {
                    this.settings.imgHeight = Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2);
                }

                URL.revokeObjectURL(objectUrl)
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = objectUrl
        });
    }

    //========================
    // Pixel Data Getters
    //========================
    
    get pixelLuminanceData() {
        if (!this.settings.currentImage?.pixelLuminanceData) {
            this.settings.currentImage.pixelLuminanceData = this.calculateLuminance(this.pixelData)
        }
        return this.settings.currentImage.pixelLuminanceData
    }

    get gaussianPixelLuminanceData() {
        if (!this.settings.currentImage?.gaussianPixelLuminanceData) {
            this.settings.currentImage.gaussianPixelLuminanceData = this.calculateLuminance(this.applyGaussianBlur())
        }
        return this.settings.currentImage.gaussianPixelLuminanceData
    }

    get pixelData() {
        if (!this.settings.currentImage?.pixelData) {
            throw new Error('No image data available');
        }
        return this.settings.currentImage.pixelData
    }

    //========================
    // Image Processing Utilities
    //========================
    
    capturePixelData(img) {
        this.canvas.width = this.settings.imgWidth;
        this.canvas.height = this.settings.imgHeight;
    
        this.context.drawImage(img, 0, 0, this.settings.imgWidth, this.settings.imgHeight);
        return this.context.getImageData(0, 0, this.settings.imgWidth, this.settings.imgHeight).data;
    }

    calculateLuminance(pixelData) {
        const luminanceData = new Uint8ClampedArray(pixelData.length / 4);
        for (let i = 0; i < luminanceData.length; i++) {
            const Red = pixelData[i * 4];
            const Green = pixelData[(i * 4) + 1];
            const Blue = pixelData[(i * 4) + 2];
    
            luminanceData[i] = Math.floor(0.299 * Red + 0.587 * Green + 0.114 * Blue);
        }
        return luminanceData;
    }

    applyContrast() {
        return this.pixelLuminanceData.map(pixel => 
            Math.floor(((pixel / 255 - 0.5) * this.settings.contrastFactor + 0.5) * 255)
        );
    }

    generateGaussianKernel(radius = 2) {
        const kernel = new Float32Array(2 * radius + 1);
        const sigma = radius/3;
        let sum = 0;
        
        for (let i = -radius; i <= radius; i++) {
            const exp = Math.exp(-(i * i) / (2 * sigma * sigma));
            kernel[i + radius] = exp;
            sum += exp;
        }
        
        for (let i = 0; i < kernel.length; i++) {
            kernel[i] /= sum;
        }
        
        return kernel;
    }

    applyGaussianBlur(radius = 2) {
        const pixels = this.pixelData;
        const width = this.settings.imgWidth;
        const height = this.settings.imgHeight;
        const kernel = this.generateGaussianKernel(radius);
        
        const firstPixelArray = new Uint8ClampedArray(pixels.length);
        
        // Horizontal pass
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let red = 0, green = 0, blue = 0, alpha = 0;
                let weightSum = 0;
                
                for (let k = -radius; k <= radius; k++) {
                    const posX = Math.min(Math.max(x + k, 0), width - 1);
                    const pixelIndex = (y * width + posX) * 4;
                    const weight = kernel[k + radius];
                    
                    red += pixels[pixelIndex] * weight;
                    green += pixels[pixelIndex + 1] * weight;
                    blue += pixels[pixelIndex + 2] * weight;
                    alpha += pixels[pixelIndex + 3] * weight;
                    weightSum += weight;
                }
                
                const targetIndex = (y * width + x) * 4;
                firstPixelArray[targetIndex] = red / weightSum;
                firstPixelArray[targetIndex + 1] = green / weightSum;
                firstPixelArray[targetIndex + 2] = blue / weightSum;
                firstPixelArray[targetIndex + 3] = alpha / weightSum;
            }
        }
        
        // Vertical pass
        const finalPixelArray = new Uint8ClampedArray(pixels.length);
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let red = 0, green = 0, blue = 0, alpha = 0;
                let weightSum = 0;
                
                for (let k = -radius; k <= radius; k++) {
                    const posY = Math.min(Math.max(y + k, 0), height - 1);
                    const pixelIndex = (posY * width + x) * 4;
                    const weight = kernel[k + radius];
                    
                    red += firstPixelArray[pixelIndex] * weight;
                    green += firstPixelArray[pixelIndex + 1] * weight;
                    blue += firstPixelArray[pixelIndex + 2] * weight;
                    alpha += firstPixelArray[pixelIndex + 3] * weight;
                    weightSum += weight;
                }
                
                const targetIndex = (y * width + x) * 4;
                finalPixelArray[targetIndex] = red / weightSum;
                finalPixelArray[targetIndex + 1] = green / weightSum;
                finalPixelArray[targetIndex + 2] = blue / weightSum;
                finalPixelArray[targetIndex + 3] = alpha / weightSum;
            }
        }
        
        return finalPixelArray;
    }

    //========================
    // ASCII Conversion Methods
    //========================
    
    processToGrayscaleBraille() {
        const asciiIntensity = this.settings.reverseIntensity 
            ? ImageToAsciiProcessor.ASCII_MAPS.brailleReversed 
            : ImageToAsciiProcessor.ASCII_MAPS.braille;
        
        const contrastedData = this.applyContrast();
        const artLines = [];
    
        for (let y = 0; y < contrastedData.length; y += this.settings.imgWidth) {
            const line = [];
            let whitespace = '';
            for (let x = 0; x < this.settings.imgWidth; x++) {
                const pixelIndex = y + x;
                const index = Math.min(
                    Math.floor(contrastedData[pixelIndex] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[index];
                if (character === '⠀') {
                    whitespace += '⠀';
                } else {
                    line.push(whitespace + character);
                    whitespace = '';
                }
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    processToGrayscaleAscii() {
        const asciiIntensity = this.settings.reverseIntensity 
            ? ImageToAsciiProcessor.ASCII_MAPS.standardReversed 
            : ImageToAsciiProcessor.ASCII_MAPS.standard;
        
        const contrastedData = this.applyContrast();
        const artLines = [];
    
        for (let y = 0; y < contrastedData.length; y += this.settings.imgWidth) {
            const line = [];
            for (let x = 0; x < this.settings.imgWidth; x++) {
                const pixelIndex = y + x;
                const index = Math.min(
                    Math.floor(contrastedData[pixelIndex] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[index];
                line.push(character);
            }
            artLines.push(line.join('').trimEnd());
        }
        return artLines.join('\n');
    }
    
    processToColoredAscii() {
        const pixelCount = this.pixelData.length / 4;
        const artLines = [];
    
        for (let y = 0; y < pixelCount; y += this.settings.imgWidth) {
            const line = [];
            for (let x = 0; x < this.settings.imgWidth; x++) {
                const pixelIndex = (y + x) * 4;
                const red = this.pixelData[pixelIndex];
                const green = this.pixelData[pixelIndex + 1];
                const blue = this.pixelData[pixelIndex + 2];
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">@</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }
    
    processToBrightnessColoredAscii() {
        const asciiIntensity = this.settings.reverseIntensity 
            ? ImageToAsciiProcessor.ASCII_MAPS.standardReversed 
            : ImageToAsciiProcessor.ASCII_MAPS.standard;
        const artLines = [];
    
        for (let y = 0; y < this.pixelLuminanceData.length; y += this.settings.imgWidth) {
            const line = [];
            let whitespace = true;
            for (let x = this.settings.imgWidth - 1; x >= 0; x--) {
                const pixelIndex = (y + x) * 4;
                const red = this.pixelData[pixelIndex];
                const green = this.pixelData[pixelIndex + 1];
                const blue = this.pixelData[pixelIndex + 2];
                const charIndex = Math.min(
                    Math.floor(this.pixelLuminanceData[y + x] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[charIndex];

                if (whitespace && character.trim() === '') continue;
                whitespace = false;
                line.unshift(`<span style="color: rgb(${red}, ${green}, ${blue})">${character}</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    processSobelToAsciiOutline() {
        const directionChars = ImageToAsciiProcessor.ASCII_MAPS.standardEdges;
        const shading = this.settings.reverseIntensity 
            ? ImageToAsciiProcessor.ASCII_MAPS.standardReversed 
            : ImageToAsciiProcessor.ASCII_MAPS.standard;
        const height = this.settings.imgHeight;
        const width = this.settings.imgWidth;
        
        const pixels = this.gaussianPixelLuminanceData;
        const artLines = [];
        
        for (let y = 1; y < height - 1; y++) {
            const line = [];
            for (let x = 1; x < width - 1; x++) {
                const pixelIndex = y * width + x;
                
                // Horizontal gradient
                const gx = (
                    -1 * pixels[pixelIndex - 1 - width] +
                    1 * pixels[pixelIndex + 1 - width] +
                    -2 * pixels[pixelIndex - 1] +
                    2 * pixels[pixelIndex + 1] +
                    -1 * pixels[pixelIndex - 1 + width] +
                    1 * pixels[pixelIndex + 1 + width]
                ) / 8;
                
                // Vertical gradient
                const gy = (
                    -1 * pixels[pixelIndex - width - 1] +
                    -2 * pixels[pixelIndex - width] +
                    -1 * pixels[pixelIndex - width + 1] +
                    1 * pixels[pixelIndex + width - 1] +
                    2 * pixels[pixelIndex + width] +
                    1 * pixels[pixelIndex + width + 1]
                ) / 8;
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const angle = Math.atan2(gy, gx) * (180 / Math.PI);
                
                let char;
                if (magnitude < 50) {
                    char = directionChars.empty
                } else {
                    const normalizedAngle = angle < 0 ? angle + 360 : angle;
                    
                    if ((normalizedAngle >= 337.5 || normalizedAngle < 22.5) || 
                        (normalizedAngle >= 157.5 && normalizedAngle < 202.5)) {
                        char = directionChars.horizontal;
                    } else if ((normalizedAngle >= 22.5 && angle < 67.5) || 
                              (normalizedAngle >= 202.5 && normalizedAngle < 247.5)) {
                        char = directionChars.diagonal1;
                    } else if ((normalizedAngle >= 67.5 && normalizedAngle < 112.5) || 
                              (normalizedAngle >= 247.5 && normalizedAngle < 292.5)) {
                        char = directionChars.vertical;
                    } else {
                        char = directionChars.diagonal2;
                    }
                }
                
                line.push(char);
            }
            artLines.push(line.join('').trimEnd());
        }
        
        return artLines.join('\n');
    }

    processSobelToAsciiFill() {
        const directionChars = ImageToAsciiProcessor.ASCII_MAPS.standardEdges;
        const shading = this.settings.reverseIntensity 
            ? ImageToAsciiProcessor.ASCII_MAPS.standardReversed 
            : ImageToAsciiProcessor.ASCII_MAPS.standard;
        const height = this.settings.imgHeight;
        const width = this.settings.imgWidth;
        
        const pixels = this.gaussianPixelLuminanceData;
        const artLines = [];
        
        for (let y = 1; y < height - 1; y++) {
            const line = [];
            for (let x = 1; x < width - 1; x++) {
                const pixelIndex = y * width + x;
                
                // Horizontal gradient
                const gx = (
                    -1 * pixels[pixelIndex - 1 - width] +
                    1 * pixels[pixelIndex + 1 - width] +
                    -2 * pixels[pixelIndex - 1] +
                    2 * pixels[pixelIndex + 1] +
                    -1 * pixels[pixelIndex - 1 + width] +
                    1 * pixels[pixelIndex + 1 + width]
                ) / 8;
                
                // Vertical gradient
                const gy = (
                    -1 * pixels[pixelIndex - width - 1] +
                    -2 * pixels[pixelIndex - width] +
                    -1 * pixels[pixelIndex - width + 1] +
                    1 * pixels[pixelIndex + width - 1] +
                    2 * pixels[pixelIndex + width] +
                    1 * pixels[pixelIndex + width + 1]
                ) / 8;
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const angle = Math.atan2(gy, gx) * (180 / Math.PI);
                
                let char;
                if (magnitude < 50) {
                    const shadingIndex = Math.min(
                        Math.floor(pixels[pixelIndex] / this.settings.asciiDivider),
                        shading.length - 1
                    );
                    char = shading[shadingIndex];
                } else {
                    const normalizedAngle = angle < 0 ? angle + 360 : angle;
                    
                    if ((normalizedAngle >= 337.5 || normalizedAngle < 22.5) || 
                        (normalizedAngle >= 157.5 && normalizedAngle < 202.5)) {
                        char = directionChars.horizontal;
                    } else if ((normalizedAngle >= 22.5 && angle < 67.5) || 
                              (normalizedAngle >= 202.5 && normalizedAngle < 247.5)) {
                        char = directionChars.diagonal1;
                    } else if ((normalizedAngle >= 67.5 && normalizedAngle < 112.5) || 
                              (normalizedAngle >= 247.5 && normalizedAngle < 292.5)) {
                        char = directionChars.vertical;
                    } else {
                        char = directionChars.diagonal2;
                    }
                }
                
                line.push(char);
            }
            artLines.push(line.join('').trimEnd());
        }
        
        return artLines.join('\n');
    }

    processSobelToBraille() {
        const directionChars = ImageToAsciiProcessor.ASCII_MAPS.brailleEdges; 
        const height = this.settings.imgHeight;
        const width = this.settings.imgWidth;
        
        const pixels = this.gaussianPixelLuminanceData;
        const artLines = [];
        
        for (let y = 1; y < height - 1; y++) {
            const line = [];
            for (let x = 1; x < width - 1; x++) {
                const pixelIndex = y * width + x;
                
                // Horizontal gradient
                const gx = (
                    -1 * pixels[pixelIndex - 1 - width] +
                    1 * pixels[pixelIndex + 1 - width] +
                    -2 * pixels[pixelIndex - 1] +
                    2 * pixels[pixelIndex + 1] +
                    -1 * pixels[pixelIndex - 1 + width] +
                    1 * pixels[pixelIndex + 1 + width]
                ) / 8;
                
                // Vertical gradient
                const gy = (
                    -1 * pixels[pixelIndex - width - 1] +
                    -2 * pixels[pixelIndex - width] +
                    -1 * pixels[pixelIndex - width + 1] +
                    1 * pixels[pixelIndex + width - 1] +
                    2 * pixels[pixelIndex + width] +
                    1 * pixels[pixelIndex + width + 1]
                ) / 8;
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const angle = Math.atan2(gy, gx) * (180 / Math.PI);
                
                let char;
                if (magnitude < 50) {
                    char = directionChars.empty
                } else {
                    const normalizedAngle = angle < 0 ? angle + 360 : angle;
                    
                    if ((normalizedAngle >= 337.5 || normalizedAngle < 22.5) || 
                        (normalizedAngle >= 157.5 && normalizedAngle < 202.5)) {
                        char = directionChars.horizontal;
                    } else if ((normalizedAngle >= 22.5 && angle < 67.5) || 
                              (normalizedAngle >= 202.5 && normalizedAngle < 247.5)) {
                        char = directionChars.diagonal1;
                    } else if ((normalizedAngle >= 67.5 && normalizedAngle < 112.5) || 
                              (normalizedAngle >= 247.5 && normalizedAngle < 292.5)) {
                        char = directionChars.vertical;
                    } else {
                        char = directionChars.diagonal2;
                    }
                }
                
                line.push(char);
            }
            artLines.push(line.join(''));
        }
        
        return artLines.join('\n');
    }

    //========================
    // Main Processing Method
    //========================
    
    async processImage(image, mode = this.settings.mode) {
        await this.loadImage(image);
        switch (mode) {
            case 'grayscale':
                return this.processToGrayscaleAscii();
            case 'color':
                return this.processToColoredAscii();
            case 'colorBrightnessMap':
                return this.processToBrightnessColoredAscii();
            case 'grayscaleBraille':
                return this.processToGrayscaleBraille()
            case 'edgeDetectionOutline':
                return this.processSobelToAsciiOutline()
            case 'edgeDetectionFill':
                return this.processSobelToAsciiFill()
            case 'edgeDetectionBraille':
                return this.processSobelToBraille()
            default:
                throw new Error(`Unsupported mode: ${mode}`);
        }
    }
}














































document.addEventListener('DOMContentLoaded', () => {
    const ImageProcessor = new ImageToAsciiProcessor()

    const domElements = {
        imageUpload : document.getElementById('imageUpload'),
        imgWidthInput : document.getElementById('imgWidth'),
        imgHeightInput : document.getElementById('imgHeight'),
        modeSelect : document.getElementById('mode'),
        asciiDisplay : document.getElementById('art'),
        imageSettings : document.getElementById('imageSettings'),
        maintainAspectRatio : document.getElementById('maintainAspectRatio'),
        fontSize : document.getElementById('fontSize')

    }

    const settingHandlers = {
        mode: (e) => ImageProcessor.updateSettings(e.target.name, e.target.value),
        imgWidth: (e) => ImageProcessor.updateSettings(e.target.name, parseInt(e.target.value)),
        imgHeight: (e) => ImageProcessor.updateSettings(e.target.name, parseInt(e.target.value)),
        contrastFactor: (e) => ImageProcessor.updateSettings(e.target.name, parseFloat(e.target.value)),
        reverseIntensity: (e) => ImageProcessor.updateSettings(e.target.name, e.target.checked),
        maintainAspectRatio: (e) => ImageProcessor.updateSettings(e.target.name, e.target.checked)
    }
    
    domElements.imageSettings.addEventListener('change', handleSettingsChange)
    domElements.imageUpload.addEventListener('change', handleImageUpload)
    
    async function handleSettingsChange(e) {
        if (e.target.name === 'fontSize') {
            domElements.asciiDisplay.style.fontSize = `${e.target.value}px`
            return
        }

        const handler = settingHandlers[e.target.name]
        if (handler) {
            handler(e)
        } 

        if ((e.target.name === 'imgWidth' || e.target.name === 'maintainAspectRatio') && domElements.maintainAspectRatio.checked) domElements.imgHeightInput.value = ImageProcessor.settings.imgHeight
        if (e.target.name === 'imgHeight' && domElements.maintainAspectRatio.checked) domElements.imgWidthInput.value = ImageProcessor.settings.imgWidth
       
        if (domElements.imageUpload.files[0]) {
            const artData = await ImageProcessor.processImage(domElements.imageUpload.files[0])
            displayArt(artData)
        }
    }

    async function handleImageUpload(e) {
        const imageFile = e.target.files[0]
        if (!imageFile) return
        if (!imageFile.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        if (domElements.imageUpload.files[0]) {
            const artData = await ImageProcessor.processImage(imageFile);
            displayArt(artData)
        }
    }
    
    function displayArt(artData) {
        domElements.asciiDisplay.innerHTML = `<pre>${artData}</pre>`;
    }
});