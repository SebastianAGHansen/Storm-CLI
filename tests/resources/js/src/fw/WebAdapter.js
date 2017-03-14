var WebAdapter = function() {
    this.animationFunction = function() {};
    this.animationLoopStopped = false;
    this.canvas = null;

    this.uComponentContext = new UComponentContext();

    // Default: white background.
    this.glClearColor = [0, 0, 0, 0];
};

WebAdapter.prototype.setStage = function(stage) {
    this.uComponentContext.setStage(stage);
};

WebAdapter.prototype.startAnimationLoop = function(f) {
    this.animationFunction = f || this.animationFunction;
    this.animationLoopStopped = false;
    this.loop();
};

WebAdapter.prototype.stopAnimationLoop = function() {
    this.animationLoopStopped = true;
};

WebAdapter.prototype.loop = function() {
    var self = this;
    var lp = function() {
        if (!self.animationLoopStopped) {
            self.animationFunction();
            requestAnimationFrame(lp);
        }
    };
    lp();
};

WebAdapter.prototype.uploadGlTexture = function(gl, textureSource, source) {
    if (source instanceof ImageData || source instanceof HTMLImageElement || source instanceof HTMLCanvasElement || source instanceof HTMLVideoElement) {
        // Web-specific data types.
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureSource.w, textureSource.h, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
};

WebAdapter.prototype.loadTextureSourceString = function(source, cb) {
    var image = new Image();
    if (!(source.substr(0,5) == "data:")) {
        // Base64.
        image.crossOrigin = "Anonymous";
    }
    image.onload = function() {
        cb(image, {renderInfo: {src: source}});
    };
    image.src = source;
};

WebAdapter.prototype.getHrTime = function() {
    return window.performance ? window.performance.now() : (new Date()).getTime();
};

WebAdapter.prototype.getWebGLRenderingContext = function(w, h) {
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    var opts = {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        stencil: true,
        preserveDrawingBuffer: false
    };

    var gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) {
        throw new Error('This browser does not support webGL.');
    }

    this.canvas = canvas;

    return gl;
};

WebAdapter.prototype.getDrawingCanvas = function() {
    return document.createElement('canvas');
};

WebAdapter.prototype.getUComponentContext = function() {
    return this.uComponentContext;
};

WebAdapter.prototype.blit = function() {
    /* WebGL blits automatically */
};

