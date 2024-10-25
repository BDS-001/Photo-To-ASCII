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
        }
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
                    guassianPixelLuminanceData: null,
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

    get guassianPixelLuminanceData() {
        if (!this.settings.currentImage?.guassianPixelLuminanceData) {
            this.settings.currentImage.guassianPixelLuminanceData = this.calculateLuminance(this.applyGuassianBlur())
        }
        return this.settings.currentImage.guassianPixelLuminanceData
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

    applyGuassianBlur(radius = 2) {
        const pixels = this.pixelData
        const firstPixelArray = new Uint8ClampedArray(pixels.length)
        const kernel = this.generateGaussianKernel(radius)
        const width = this.settings.imgWidth
        const height = this.settings.imgHeight
        
        //horizontal first
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let red = 0, green = 0, blue = 0, alpha = 0
                let weightSum = 0
                
                for (let i = -radius; i <= radius; i++) {
                    const positionX = Math.min(Math.max(x + i, 0), width - 1)
                    const indexX = (y * width + positionX) * 4
                    const weight = kernel[i + radius]
                    
                    red += pixels[indexX] * weight
                    green += pixels[indexX + 1] * weight
                    blue += pixels[indexX + 2] * weight
                    alpha += pixels[indexX + 3] * weight
                    weightSum += weight
                }
                
                const pixelOriginIndex = (y * width + x) * 4
                firstPixelArray[pixelOriginIndex] = red / weightSum
                firstPixelArray[pixelOriginIndex + 1] = green / weightSum
                firstPixelArray[pixelOriginIndex + 2] = blue / weightSum
                firstPixelArray[pixelOriginIndex + 3] = alpha / weightSum
            }
        }
        
        //vertical second
        const finalPixelArray = new Uint8ClampedArray(pixels.length)
        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let red = 0, green = 0, blue = 0, alpha = 0
                let weightSum = 0
                
                for (let i = -radius; i <= radius; i++) {
                    const positionY = Math.min(Math.max(y + i, 0), height - 1)
                    const indexY = (positionY * width + x) * 4
                    const weight = kernel[i + radius]
                    
                    red += firstPixelArray[indexY] * weight
                    green += firstPixelArray[indexY + 1] * weight
                    blue += firstPixelArray[indexY + 2] * weight
                    alpha += firstPixelArray[indexY + 3] * weight
                    weightSum += weight
                }
                
                const pixelOriginIndex = (y * width + x) * 4
                finalPixelArray[pixelOriginIndex] = red / weightSum
                finalPixelArray[pixelOriginIndex + 1] = green / weightSum
                finalPixelArray[pixelOriginIndex + 2] = blue / weightSum
                finalPixelArray[pixelOriginIndex + 3] = alpha / weightSum
            }
        }
        
        return finalPixelArray
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
    
        for (let i = 0; i < contrastedData.length; i += this.settings.imgWidth) {
            const line = [];
            let whitespace = ''
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const index = Math.min(
                    Math.floor(contrastedData[i + j] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[index];
                if (character === '⠀') {
                    whitespace += '⠀'
                } else {
                    line.push(whitespace + character)
                    whitespace = ''
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
    
        for (let i = 0; i < contrastedData.length; i += this.settings.imgWidth) {
            const line = [];
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const index = Math.min(
                    Math.floor(contrastedData[i + j] / this.settings.asciiDivider), 
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
    
        for (let i = 0; i < pixelCount; i += this.settings.imgWidth) {
            const line = [];
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const pixelIndex = (i + j) * 4;
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
    
        for (let i = 0; i < this.pixelLuminanceData.length; i += this.settings.imgWidth) {
            const line = [];
            let whitespace = true
            for (let j = this.settings.imgWidth - 1; j >= 0; j--) {
                const pixelIndex = (i + j) * 4;
                const red = this.pixelData[pixelIndex];
                const green = this.pixelData[pixelIndex + 1];
                const blue = this.pixelData[pixelIndex + 2];
                const charindex = Math.min(
                    Math.floor(this.pixelLuminanceData[i + j] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[charindex];

                if (whitespace && character.trim() === '') continue
                whitespace = false
                line.unshift(`<span style="color: rgb(${red}, ${green}, ${blue})">${character}</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    processSobelToAscii() {
        const directionChars = ImageToAsciiProcessor.ASCII_MAPS.standardEdges
        const shading = this.settings.reverseIntensity 
        ? ImageToAsciiProcessor.ASCII_MAPS.standardReversed 
        : ImageToAsciiProcessor.ASCII_MAPS.standard
        const height = this.settings.imgHeight;
        const width = this.settings.imgWidth;
        
        const pixels = this.guassianPixelLuminanceData;
        const artLines = [];
        
        for(let y = 1; y < height-1; y++) {
            const line = [];
            for(let x = 1; x < width-1; x++) {
                const pos = y * width + x;
                
                //horizontal
                const gx = (
                    -1 * pixels[pos - 1 - width] +
                    1 * pixels[pos + 1 - width] +
                    -2 * pixels[pos - 1] +
                    2 * pixels[pos + 1] +
                    -1 * pixels[pos - 1 + width] +
                    1 * pixels[pos + 1 + width]
                ) / 8;
                
                //vertical
                const gy = (
                    -1 * pixels[pos - width - 1] +
                    -2 * pixels[pos - width] +
                    -1 * pixels[pos - width + 1] +
                    1 * pixels[pos + width - 1] +
                    2 * pixels[pos + width] +
                    1 * pixels[pos + width + 1]
                ) / 8;
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const angle = Math.atan2(gy, gx) * (180 / Math.PI);
                
                let char;
                if(magnitude < 50) {
                    const shadingIndex = Math.min(
                        Math.floor(pixels[pos] / this.settings.asciiDivider),
                        shading.length - 1
                    );
                    char = shading[shadingIndex];
                } else {
                    const normalizedAngle = angle < 0 ? angle + 360 : angle;
                    
                    if((normalizedAngle >= 337.5 || normalizedAngle < 22.5) || 
                       (normalizedAngle >= 157.5 && normalizedAngle < 202.5)) {
                        char = directionChars.horizontal;
                    } else if((normalizedAngle >= 22.5 && angle < 67.5) || 
                             (normalizedAngle >= 202.5 && normalizedAngle < 247.5)) {
                        char = directionChars.diagonal1;
                    } else if((normalizedAngle >= 67.5 && normalizedAngle < 112.5) || 
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
            case 'edgeDetection':
                return this.processSobelToAscii()
            default:
                throw new Error(`Unsupported mode: ${mode}`);
        }
    }
}

export default ImageToAsciiProcessor;