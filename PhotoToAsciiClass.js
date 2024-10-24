class PhotoToAsciiProcessor {
    static ASCII_MAPS = {
        standard: ' _.,-=+:;cba!?0123456789$W#@Ñ',
        reversed: 'Ñ@#W$9876543210?!abc;:+=-,._ ',

    }

    static DEFAULT_SETTINGS = {
        mode: 'grayscale',
        imgWidth: 150,
        imgHeight: 150,
        contrastFactor: 1,
        reverseIntensity : false,
        maintainAspectRatio : false
    }

    constructor(canvas) {
        if (!canvas) {
            throw new Error('Canvas is required');
        }

        this.canvas = canvas
        this.context = this.canvas.getContext('2d')
        this.settings = {
            ...PhotoToAsciiProcessor.DEFAULT_SETTINGS,
            aspectRatio: null,
            currentImage: null,
            asciiDivider: Math.floor(255 / (PhotoToAsciiProcessor.ASCII_MAPS.standard.length - 1))
        }
    }

    _updateSettings = {
        mode: (value) => this.settings.mode = value,
        imgWidth: (value) => this.settings.imgWidth = value,
        imgHeight: (value) => this.settings.imgHeight = value,
        contrastFactor: (value) => this.settings.contrastFactor = value,
        reverseIntensity: (value) => this.settings.reverseIntensity = value,
        maintainAspectRatio: (value) => this.settings.maintainAspectRatio = value,
    }

    updateSettings(setting, value) {
        this._updateSettings[setting](value)
        this.handleImageDimensions(setting)
    }

    handleImageDimensions(setting) {
        if (!this.settings.aspectRatio) return

        if (setting === 'maintainAspectRatio') {
            if (this.settings.aspectRatio) {
                this._updateSettings.imgHeight(Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2))
            }
            return
        }

        if (setting === 'imgWidth') {
            if (this.settings.maintainAspectRatio && this.settings.aspectRatio) {
                this._updateSettings.imgHeight(Math.floor((this.settings.imgWidth / this.settings.aspectRatio) / 2))
            }
            return
        }

        if (setting === 'imgHeight') {
            if (this.settings.maintainAspectRatio && this.settings.aspectRatio) {
                this._updateSettings.imgWidth(Math.floor((this.settings.imgHeight * this.settings.aspectRatio) * 2))
            }
            return
        }
    }

    async loadImage(file) {
        if (!file) throw new Error('No file provided');
        if (this.settings.currentImage?.element?.src) {
            URL.revokeObjectURL(this.settings.currentImage.element.src);
        }
        return new Promise((resolve, reject) => {
            const img = new Image();
            
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
                resolve(img);
            };
            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    get pixelLuminanceData() {
        if (!this.settings.currentImage?.pixelLuminanceData) this.settings.currentImage.pixelLuminanceData = this.calculateLuminance()
        return this.settings.currentImage.pixelLuminanceData
    }

    get pixelData() {
        if (!this.settings.currentImage?.pixelData) {
            throw new Error('No image data available');
        }
        return this.settings.currentImage.pixelData
    }

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

    processToGrayscaleAscii() {
        const asciiIntensity = this.settings.reverseIntensity 
            ? PhotoToAsciiProcessor.ASCII_MAPS.reversed 
            : PhotoToAsciiProcessor.ASCII_MAPS.standard;
        
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
            artLines.push(line.join(''));
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
            ? PhotoToAsciiProcessor.ASCII_MAPS.reversed 
            : PhotoToAsciiProcessor.ASCII_MAPS.standard;
        const artLines = [];
    
        for (let i = 0; i < this.pixelLuminanceData.length; i += this.settings.imgWidth) {
            const line = [];
            for (let j = 0; j < this.settings.imgWidth; j++) {
                const pixelIndex = (i + j) * 4;
                const red = this.pixelData[pixelIndex];
                const green = this.pixelData[pixelIndex + 1];
                const blue = this.pixelData[pixelIndex + 2];
                const charindex = Math.min(
                    Math.floor(this.pixelLuminanceData[i + j] / this.settings.asciiDivider), 
                    asciiIntensity.length - 1
                );
                const character = asciiIntensity[charindex];
                
                line.push(`<span style="color: rgb(${red}, ${green}, ${blue})">${character}</span>`);
            }
            artLines.push(line.join(''));
        }
        return artLines.join('\n');
    }

    async processImage(image, mode = this.settings.mode) {
        await this.loadImage(image);
        switch (mode) {
            case 'grayscale':
                return this.processToGrayscaleAscii();
            case 'color':
                return this.processToColoredAscii();
            case 'colorBrightnessMap':
                return this.processToBrightnessColoredAscii();
            default:
                throw new Error(`Unsupported mode: ${mode}`);
        }
    }  
}