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
        process: 'grayscale',
        mode: null,
        imgWidth: 150,
        imgHeight: 150,
        contrastFactor: 1,
        reverseIntensity : false,
        maintainAspectRatio : false,
        charSet: 'ascii'
    } 

    //========================
    // Initialization
    //========================
    
    constructor() {
        this.canvas = document.createElement('canvas');
        this.context = this.canvas.getContext('2d', {alpha: false, willReadFrequently: true})
        this.currentImage = null;
        this.settings = {
            ...ImageToAsciiProcessor.DEFAULT_SETTINGS,
            aspectRatio: null,
            asciiDivider: Math.floor(255 / (ImageToAsciiProcessor.ASCII_MAPS.standard.length - 1))
        }
    }

    //========================
    // Settings Management
    //========================
    
    validateDimensions(width, height) {
        if (width < 1 || height < 1) {
            throw new Error('Dimensions must be greater than 0');
        }
        if (width > 1000 || height > 1000) {
            throw new Error('Dimensions must be less than 1000');
        }
    }

    updateSettings(setting, value) {
        if (!(setting in ImageToAsciiProcessor.DEFAULT_SETTINGS)) {
            throw new Error(`Invalid setting: ${setting}`);
        }

        if (setting === 'imgWidth' || setting === 'imgHeight') {
            this.validateDimensions(
                setting === 'imgWidth' ? value : this.settings.imgWidth,
                setting === 'imgHeight' ? value : this.settings.imgHeight
            );
        }
        
        const oldWidth = this.settings.imgWidth;
        const oldHeight = this.settings.imgHeight;
        
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

        if (this.currentImage?.element && 
            (this.settings.imgWidth !== oldWidth || this.settings.imgHeight !== oldHeight)) {
            this.currentImage.pixelData = this.capturePixelData(this.currentImage.element);
            this.currentImage.pixelLuminanceData = null;
            this.currentImage.gaussianPixelLuminanceData = null;
        }
    }

    //========================
    // Image Loading & Data Management
    //========================
    
    async loadImage(file) {
        if (!file) throw new Error('No file provided');

        if (this.currentImage?.element?.src) {
            URL.revokeObjectURL(this.currentImage.element.src);
        }

        if (this.currentImage) {
            this.currentImage.pixelData = null;
            this.currentImage.pixelLuminanceData = null;
            this.currentImage.gaussianPixelLuminanceData = null;
            this.currentImage.element = null;
        }

        return new Promise((resolve, reject) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file)
            
            img.onload = () => {
                this.currentImage = {
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
        if (!this.currentImage?.pixelLuminanceData) {
            this.currentImage.pixelLuminanceData = this.calculateLuminance(this.pixelData)
        }
        return this.currentImage.pixelLuminanceData
    }

    get gaussianPixelLuminanceData() {
        if (!this.currentImage?.gaussianPixelLuminanceData) {
            this.currentImage.gaussianPixelLuminanceData = this.calculateLuminance(this.applyGaussianBlur())
        }
        return this.currentImage.gaussianPixelLuminanceData
    }

    get pixelData() {
        if (!this.currentImage?.pixelData) {
            throw new Error('No image data available');
        }
        return this.currentImage.pixelData
    }

    //========================
    // Image Processing Utilities
    //========================
    
    capturePixelData(img) {
        if (this.currentImage) {
            this.currentImage.pixelLuminanceData = null;
            this.currentImage.gaussianPixelLuminanceData = null;
        }

        this.canvas.width = this.settings.imgWidth;
        this.canvas.height = this.settings.imgHeight;
    
        this.context.drawImage(img, 0, 0, this.settings.imgWidth, this.settings.imgHeight);
        return this.context.getImageData(0, 0, this.settings.imgWidth, this.settings.imgHeight).data;
    }

    shadingMap = {
        'ascii' : () => this.settings.reverseIntensity 
        ? ImageToAsciiProcessor.ASCII_MAPS.standardReversed 
        : ImageToAsciiProcessor.ASCII_MAPS.standard,
        'braille' : () => this.settings.reverseIntensity 
        ? ImageToAsciiProcessor.ASCII_MAPS.brailleReversed 
        : ImageToAsciiProcessor.ASCII_MAPS.braille
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

    calculateSobelGradient(pixels, pixelIndex, width) {
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

        return {gx, gy}
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

    processToGrayscaleAscii(options = {}) {
        const shadingMap = this.shadingMap[options.charSet]()
        const whiteSpaceChar = options.charSet === 'ascii' ? ' ' : '⠀'
        
        const contrastedData = this.applyContrast();
        const artLines = [];
    
        for (let y = 0; y < contrastedData.length; y += this.settings.imgWidth) {
            const line = [];
            let whitespace = ''
            for (let x = 0; x < this.settings.imgWidth; x++) {
                const pixelIndex = y + x;
                const index = Math.min(
                    Math.floor(contrastedData[pixelIndex] / this.settings.asciiDivider), 
                    shadingMap.length - 1
                );
                const character = shadingMap[index];
                if (character === whiteSpaceChar) {
                    whitespace += character;
                } else {
                    line.push(whitespace + character);
                    whitespace = '';
                }
            }
            artLines.push(line.join('').trimEnd());
        }
        return artLines.join('\n');
    }
    
    processToColoredAscii(options = {}) {
        const mode = options.mode || 'singleCharacter'
        const shadingMap = mode === 'shading' ? this.shadingMap[options.charSet]() : null
        const pixelCount = this.pixelData.length / 4;
        const artLines = [];
    
        for (let y = 0; y < pixelCount; y += this.settings.imgWidth) {
            const line = [];
            for (let x = 0; x < this.settings.imgWidth; x++) {
                const pixelIndex = (y + x) * 4;
                const red = this.pixelData[pixelIndex + 0];
                const green = this.pixelData[pixelIndex + 1];
                const blue = this.pixelData[pixelIndex + 2];
                const character = mode === 'singleCharacter' ? '@' : shadingMap[Math.min(Math.floor(this.pixelLuminanceData[y + x] / this.settings.asciiDivider), shadingMap.length - 1)]
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">${character}</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    processSobelToAscii(options = {}) {
        const mode = options.mode || 'outline'
        const directionChars = options.charSet === 'ascii' ? ImageToAsciiProcessor.ASCII_MAPS.standardEdges : ImageToAsciiProcessor.ASCII_MAPS.brailleEdges;
        const shadingMap = this.shadingMap[options.charSet]()
        const height = this.settings.imgHeight;
        const width = this.settings.imgWidth;
        
        const pixels = this.gaussianPixelLuminanceData;
        const artLines = [];
        
        for (let y = 1; y < height - 1; y++) {
            const line = [];
            for (let x = 1; x < width - 1; x++) {
                const pixelIndex = y * width + x;
                const {gx, gy} = this.calculateSobelGradient(pixels, pixelIndex, width)
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const angle = Math.atan2(gy, gx) * (180 / Math.PI);
                let char;

                if (magnitude < 50) {
                    char = mode === 'fill' ? 
                    shadingMap[Math.min(Math.floor(pixels[pixelIndex] / this.settings.asciiDivider), shadingMap.length - 1)] :
                    directionChars.empty;
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
    processingMethods = {
        grayscale: (options) => this.processToGrayscaleAscii(options),
        color: (options) => this.processToColoredAscii(options),
        edgeDetection: (options) => this.processSobelToAscii(options)
    }
    
    async processImage(process='grayscale', options = {}) {
        try {
            options = {
                ...this.settings,
                ...options
            }
    
            if (options.image) {
                await this.loadImage(options.image);
                delete options.image;
            }
    
            if (!this.currentImage) {
                throw new Error('No image loaded');
            }
    
            const processor = this.processingMethods[process];
            if (!processor) {
                throw new Error(`Unsupported processing mode: ${process}`);
            }
    
            return processor(options);
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }
}








































//========================
// DOM Setup & Event Handlers
//========================
document.addEventListener('DOMContentLoaded', () => {
    const processor = new ImageToAsciiProcessor()
    let currentMode = 'grayscale'

    const elements = {
        upload: document.getElementById('imageUpload'),
        width: document.getElementById('imgWidth'),
        height: document.getElementById('imgHeight'),
        mode: document.getElementById('mode'),
        display: document.getElementById('art'),
        settings: document.getElementById('imageSettings'),
        aspectRatio: document.getElementById('maintainAspectRatio'),
        fontSize: document.getElementById('fontSize')
    }

    elements.width.value = processor.settings.imgWidth
    elements.height.value = processor.settings.imgHeight

    const modes = {
        grayscale: {
            process: 'grayscale',
            charSet: 'ascii'
        },
        grayscaleBraille: {
            process: 'grayscale',
            charSet: 'braille'
        },
        color: {
            process: 'color',
            mode: 'singleCharacter'
        },
        colorBrightnessMapAscii: {
            process: 'color',
            mode: 'shading',
            charSet: 'ascii'
        },
        colorBrightnessMapBraille: {
            process: 'color',
            mode: 'shading',
            charSet: 'braille'
        },
        edgeDetectionOutline: {
            process: 'edgeDetection',
            mode: 'outline',
            charSet: 'ascii'
        },
        edgeDetectionFill: {
            process: 'edgeDetection',
            mode: 'fill',
            charSet: 'ascii'
        },
        edgeDetectionBraille: {
            process: 'edgeDetection',
            mode: 'fill',
            charSet: 'braille'
        }
    }

    const settings = {
        mode: (value) => {
            currentMode = value
            return true
        },
        imgWidth: (value) => {
            processor.updateSettings('imgWidth', parseInt(value))
            return true
        },
        imgHeight: (value) => {
            processor.updateSettings('imgHeight', parseInt(value))
            return true
        },
        contrastFactor: (value) => {
            processor.updateSettings('contrastFactor', parseFloat(value))
            return true
        },
        reverseIntensity: (value) => {
            processor.updateSettings('reverseIntensity', value)
            return true
        },
        maintainAspectRatio: (value) => {
            processor.updateSettings('maintainAspectRatio', value)
            return true
        },
        fontSize: (value) => {
            elements.display.style.fontSize = `${value}px`
            return false
        }
    }

    async function updateImage(imageFile = null) {
        try {
            const options = {
                ...modes[currentMode],
                ...(imageFile && { image: imageFile })
            }
            
            const art = await processor.processImage(options.process, options)
            elements.display.innerHTML = `<pre>${art}</pre>`
        } catch (error) {
            console.error('Processing failed:', error)
            alert('Failed to process image: ' + error.message)
        }
    }

    function updateDimensions() {
        if (elements.aspectRatio.checked) {
            if (event.target.name === 'imgWidth') {
                elements.height.value = processor.settings.imgHeight
            } else {
                elements.width.value = processor.settings.imgWidth
            }
        }
    }

    async function handleSettings(event) {
        try {
            const handler = settings[event.target.name]
            if (!handler) return

            const shouldUpdate = handler(event.target.type === 'checkbox' ? 
                event.target.checked : event.target.value)
            
            updateDimensions()

            if (shouldUpdate && elements.upload.files[0]) {
                await updateImage()
            }
        } catch (error) {
            console.error('Settings update failed:', error)
            alert('Failed to update settings: ' + error.message)
        }
    }

    async function handleUpload(event) {
        const file = event.target.files[0]
        if (!file) return
        
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file')
            return
        }

        await updateImage(file)
    }

    elements.settings.addEventListener('change', handleSettings)
    elements.upload.addEventListener('change', handleUpload)
})