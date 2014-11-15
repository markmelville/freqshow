window.AudioContext = window.AudioContext||window.webkitAudioContext;
navigator.getUserMedia = (navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia);

AudioContext.prototype.loadSound = function (url, onBufferLoad) {
    var context = this;
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    // Decode asynchronously
    request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
            if (!buffer) {
                alert('error decoding file data: ' + url);
                return;
            }
            onBufferLoad && onBufferLoad(buffer);
        }, function () {
            alert('error decoding audio');
        });
    };
    request.send();
};

AudioContext.prototype.createMonitor = function (bufferSize, callback) {
    var monitor = this.createScriptProcessor(bufferSize, 2, 2);
    monitor.onaudioprocess = function(audioProcessingEvent) {
        // The input buffer is a portion of the audio file we loaded earlier
        var inputBuffer = audioProcessingEvent.inputBuffer;

        // The output buffer contains the samples that will be modified and played
        var outputBuffer = audioProcessingEvent.outputBuffer;

        for (var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {

            // get the input and output arrays for this channel
            var inputData = inputBuffer.getChannelData(channel);
            var outputData = outputBuffer.getChannelData(channel);

            callback && callback(inputData, audioProcessingEvent.playbackTime);

            // copy the input data to the output
            outputData.set(inputData);
        }
    };
    return monitor;
};

function assert(condition, message) {
    if (!condition) {
        throw message || "Assertion failed";
    }
}

// returns the index of the float32array that has the highest value
function getMaxIndex(xarray) {
	var N = xarray.length;
	var ix = 0;
	var peak = xarray[0];
	for(var i = 1; i < N; i++) {
		if(xarray[i]>peak) {
			peak = xarray[i];
			ix = i;
		}
	}
	
	return ix;
}

function getNanIndex(xarray) {
	var N = xarray.length;
	for(var i = 1; i < N; i++) {
		if(isNaN(xarray[i])) {
			return i;
		}
	}
	
	return -1;
}


function WaveformOverview (audioData,zoomPower,position,width) {

	// this is the data you want to plot
	this.maxVals;
	this.minVals;
	
	// these are the properties you can change
	this.zoomPower = zoomPower;
	this.position = position;
	
	// private stuff:
	
	this.width = width;
	
	this.minVals = new Float32Array(width);
	this.maxVals = new Float32Array(width);
	
	// each array is for a set of decimated audio data.
	// index n decimates the audio at a factor of 2^n
	this.minValsArray = new Array(16);
	this.maxValsArray = new Array(16);
	
	// decimate the audio data to discrete zoom levels
	this.maxValsArray[0] = new Float32Array(audioData.length);
	this.minValsArray[0] = new Float32Array(audioData.length);
	this.maxValsArray[0].set(audioData);
	this.minValsArray[0].set(audioData);
	var N = this.minValsArray.length;
	for(var i = 1; i < N; i++) {
		this.minValsArray[i] = this.decimateAndGetMinValues(this.minValsArray[i-1],2);
		this.maxValsArray[i] = this.decimateAndGetMaxValues(this.maxValsArray[i-1],2);
	}
	
	this.update();
}

WaveformOverview.prototype.decimateAndGetMaxValues = function(audioData,decimation) {

	// length of the decimated data
	var newLen = Math.ceil(1+(audioData.length-1)/decimation);
	var vals = new Float32Array(newLen);
	
	var pos = 0; // position in the original data
	var maxN = audioData.length-1;
	
	// get each decimated value
	for(i = 0; i < newLen; i++) {

		var val = 0;
		if(pos<=maxN)
			val = audioData[pos];
			
		for (n = 1; n < decimation; n++) { 
			if(pos+n<=maxN)
			{
				if(audioData[pos+n]>val)
					val = audioData[pos+n];
			}
		}
		
		vals[i] = val;
		pos += decimation;
	}
	
	return vals;
}

WaveformOverview.prototype.decimateAndGetMinValues = function(audioData,decimation) {

	// length of the decimated data
	var newLen = Math.ceil(1+(audioData.length-1)/decimation);
	var vals = new Float32Array(newLen);
	
	var pos = 0; // position in the original data
	var maxN = audioData.length-1;
	
	
	// get each decimated value
	for(i = 0; i < newLen; i++) {
	
		var val = 0;
		if(pos<=maxN)
			val = audioData[pos];
		
		for (n = 1; n < decimation; n++) { 
			if(pos+n<=maxN) {
				if(audioData[pos+n]<val)
					val = audioData[pos+n];
			}
		}
		
		vals[i] = val;
		pos += decimation;
	}
	
	return vals;
}


WaveformOverview.prototype.update = function() {

    var maxs;
	var mins;
	var offest;
	
	var zoomIndex = Math.floor(this.zoomPower);
	var increment = Math.pow(2,this.zoomPower)/Math.pow(2,zoomIndex);
	
	maxs = this.maxValsArray[zoomIndex];
	mins = this.minValsArray[zoomIndex];
	offset = this.position/Math.pow(2,zoomIndex);
	offset = Math.round(offset);
	
	linearInterp(maxs,offset,increment,this.maxVals);
	linearInterp(mins,offset,increment,this.minVals);
}

function linearInterp(x,pos,increment,y) {

	var N = y.length;
	var maxX = x.length-1;
	var posi;
	var posf;
	var mixa;
	var mixb;
	
	for(var n = 0; n < N; n++) {
		posi = Math.floor(pos);
		posf = pos - posi;
		mixb = posf;
		mixa = 1-mixb;
		
		
		a = 0;
		if(pos <= maxX) {
			a = x[posi];
		}
		
		b = 0;
		if(posi+1 <= maxX) {
			b = x[posi+1];
		}
		
		
		y[n] = mixa*a + mixb*b;
		pos += increment;
	}
	
}





function SpectrogramGenerator (fftSize,stepSize,sampleRate) {
    this.fftSize = fftSize;
    this.stepSize = stepSize;
    this.sampleRate = sampleRate;
    this.numSteps = 0;
    this.peak = 0;
    this.windowFunc = WindowFunction.Hamming;
    this.spectrogram = null;
}

// pass in a Float32Array of audio data (the whole-file kind), and the spectrogram will be generated
// access it via getSpectrogram
SpectrogramGenerator.prototype.generate = function(audioData) {

	// pad with half an fft at the beginning, and a full one at the end
	paddedLength = audioData.length + 1.5*this.fftSize;
	var paddedData = new Float32Array(paddedLength);
	paddedData.set(audioData,this.fftSize/2);
	
	// set up the 2D spectrogram array
	var numSteps = Math.ceil(paddedData.length/this.stepSize);
	this.numSteps = numSteps;
	this.spectrogram = new Array(numSteps);
	for (var i = 0; i < numSteps; i++) {
    	this.spectrogram[i] = new Float32Array(this.fftSize/2);
  	}
  	
  	// compute the window
  	var windowedData = new Float32Array(this.fftSize);
  	var window = new Float32Array(this.fftSize);
  	this.windowFunc(this.fftSize,i);
  	for(var i = 0; i < this.fftSize; i++) {
  		window[i] = this.windowFunc(this.fftSize,i);
  	}
  	
  	var peak = 0;
  	// compute the windowed fft for each step
  	var fft = new FFT(this.fftSize,this.sampleRate);
  	for (var i = 0; i < numSteps; i++) {
  	
  		// window the data
  		pos = i*this.stepSize;
  		var size = this.fftSize;
  		for(var n = 0; n < size; n++) {
  			windowedData[n] = window[n]*audioData[pos+n];
  		}
  		
  		fft.forward(windowedData);
  		this.spectrogram[i].set(fft.spectrum);
  		if(fft.peak>peak)
  			peak = fft.peak;
  	}  		
  	
  	this.peak = peak;
}

SpectrogramGenerator.prototype.draw = function(context,startSample,numSamples) {

	var startStep = Math.floor(startSample/this.stepSize);
	var numSteps = Math.ceil(numSamples/this.stepSize);

    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    
    numSteps = Math.min(this.numSteps,numSteps);
    canvas.width = numSteps;
    canvas.height = this.fftSize/2;
    var width = canvas.width;
    var height = canvas.height;
    
    var img = ctx.createImageData(width,height);
    var imgdata = img.data;

    // canvas pixels are arranged in a single array, row by row
    
    // copy the spectrogram data into the canvas

	peak_db = 20*Math.log10(this.peak);

	var endStep = startStep + numSteps;
    for(var r = 0; r < height; r++) {
    	for(var c = startStep; c < endStep; c++) {
    		var ix = 4*(r*width + c);
    		var value = this.spectrogram[c][height-r];
    		var db = 20*Math.log10(value) - peak_db;
    		var norm = (db + 60)/60;
    		imgdata[ix+0] = 0; // red
    		imgdata[ix+1] = 255*norm; // green
    		imgdata[ix+2] = 128; // blue
    		imgdata[ix+3] = 255*norm; //value; // alpha
    	}
    }
    
    ctx.putImageData(img,0,0);

    
    context.drawImage(canvas,0,0,width,height,0,0,context.canvas.width,context.canvas.height);
}

function SourcePlayer(aCtx,buffer) {
    var me = this;
    var audioContext = aCtx;
    var destinations = [];
    this.source;

    var pos = 0;
    var endPos = 0;
    var startOffset = 0;
    this.buffer = buffer;
    this.isPlaying = false;
    this.isLooping = false;
    this.connect = function () {
        destinations = arguments;
    };
    this.play = function () {
        if (me.isPlaying) return;
        this.source = audioContext.createBufferSource();
        this.source.buffer = buffer;
        for (var i = 0; i < destinations.length; i++ )
        {
            this.source.connect(destinations[i]);
        }
        startOffset = this.source.context.currentTime - pos;
        
        this.source.loop = me.isLooping;
        if(me.isLooping) {
        	this.source.loopStart = pos;
        	this.source.loopEnd = endPos;
        	//pos = 0.85;
        }

        this.source.start(0,pos);
        this.source.onended = function() {
            me.pause();
        };
        me.isPlaying = true;
    };
    this.pause = function () {
        if (!me.isPlaying) return;
        pos = this.source.context.currentTime - startOffset;
        this.source.stop();
        startOffset = 0;
        me.isPlaying = false;
    };
    this.setPosition = function (position) {
        me.pause();
        pos = position;
        //this.source && this.source.loopStart = position;
    };
    this.getPosition = function () {
        pos = startOffset ? this.source.context.currentTime - startOffset : pos;
        return pos;
    }
    this.setEndPosition = function (position) {
        me.pause();
        endPos = position;
        //this.source && this.source.loopEnd = endPos;
    };
    this.getTimeCode = function () {
        pos = startOffset ? this.source.context.currentTime - startOffset : pos;
        var x = pos.toFixed(0);
        return pad(Math.floor(x/60),1) + ":" + pad(x%60,2);
    }
    function pad(num, size) {
        var s = "000000000" + num;
        return s.substr(s.length-size);
    }
}

