class ImageToAsciiProcessor {
    //========================
    // Static Configuration
    //========================
    
    static ASCII_MAPS = {
        standard: ' _.,-=+:;cba!?0123456789$W#@Ñ',
        standardReversed: 'Ñ@#W$9876543210?!abc;:+=-,._ ',
        braille : ['⠀', '⠁', '⠃', '⠇', '⠏', '⠟', '⠿', '⡿', '⣿'],
        brailleReversed : ['⣿', '⡿', '⠿', '⠟', '⠏', '⠇', '⠃', '⠁', '⠀']
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
            this.settings.currentImage.pixelLuminanceData = this.calculateLuminance()
        }
        return this.settings.currentImage.pixelLuminanceData
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

    calculateLuminance() {
        const luminanceData = new Uint8ClampedArray(this.pixelData.length / 4);
        for (let i = 0; i < luminanceData.length; i++) {
            const Red = this.pixelData[i * 4];
            const Green = this.pixelData[(i * 4) + 1];
            const Blue = this.pixelData[(i * 4) + 2];
    
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

    applyGuassianBlur() {
        const guassianBlurPixelArray = new Uint8ClampedArray(this.pixelData)
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