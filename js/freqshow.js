var headerDiv, waveformsDiv, visualizationDiv, lyricsDiv;
var timeCodeEl;

var audioContext;
var analyzer;
var xScale, yScale;
var svg;
var framesetSize = 2048;
var timeData;
var freqData;
var player;
var subtitles = [];
var subtitlePos = 0;
var waveformFull;
var waveformZoom;
var spectroZoom;
var zoomStartFrame;
var zoomEndFrame;

var boundary1, boundary2, playbackLine;

$(function () {
    var canvas = document.getElementById('oscilliscope');
    var context = canvas.getContext('2d');

    $("#audio-data").hide();
    $(".button-thing").hide();

    headerDiv = $("#header");
    waveformsDiv = $("#waveforms");
    var waveformOverview = $("#waveform-full");
    visualizationDiv = $("#visualization");
    lyricsDiv = $("#lyrics");
    timeCodeEl = $('#time-code');

    //waveformCanvases.attr('height', (waveformsDiv.height() / waveformCanvases.length)-5 + 'px');
    $("#lyrics canvas").attr('width', lyricsDiv.height());

    svg = d3.select("#waveforms").append("svg").attr("height", waveformOverview.attr('height'));
    resizeLayout();

    boundary1 = addDraggableLine(svg, 0, boundariesChanged, boundariesChangedOnRelease);
    boundary2 = addDraggableLine(svg, svg.attr('width'), boundariesChanged, boundariesChangedOnRelease);

    playbackLine = addPlaybackLine(svg);


    $("#play-pause").click(function() {
        if (player) {
            var i = $(this).children('i');
            if (player.isPlaying)
            {
                player.pause();
                i.removeClass("fi-pause").addClass("fi-play");
            }
            else
            {
                player.play();
                i.removeClass("fi-play").addClass("fi-pause");
            }
        }
    });
    
    $("#loop-enable").click(function() {
        if (player) {
            var i = $(this).children('i');
            //if (player.isPlaying)
            //{
            //    player.pause();
            //    i.removeClass("fi-pause").addClass("fi-play");
            //}
            
            if(player.isLooping) {
            	player.isLooping = false;
            	i.css({color:'#444444'})
            }
            else {
            	player.isLooping = true; 
            	i.css({color:'#44ff88'})
            }
        }
    });

    audioContext = new AudioContext();
    var url = 'audio/one_week.mp3';
    $("#track-name").text(url);
    audioContext.loadSound(url, finishedLoading);
});

$(window).resize(resizeLayout);
function resizeLayout() {
    var body = $('body');
    $('canvas').attr('width', body.width() + 'px');
    svg.attr('width', body.width());

    var vizHeight = body.height() - headerDiv.height() - waveformsDiv.height() - lyricsDiv.height();
    visualizationDiv.height(vizHeight);
    visualizationDiv.children('canvas').attr('height', vizHeight + 'px');
    var canvas = document.getElementById('oscilliscope');

    xScale = d3.scale.linear().domain([0, (framesetSize/2)-1]).range([0, canvas.width]);
    yScale = d3.scale.linear().domain([1, -1]).range([0, vizHeight]);
}


function finishedLoading(buffer) {
    if ($("#track-name").text() == "audio/one_week.mp3") {
        $.getJSON('audio/oneweek.analysis.json', function (data) {
            $("#artist-name").text(data.meta.artist);
            $("#track-name").text(data.meta.title);
        });
        $.getJSON('audio/oneweek.subtitles.json', function (data) {
            var subtitleInfo = data.message.body.subtitle;
            var st = JSON.parse(subtitleInfo.subtitle_body);
            for (var i = 0; i < st.length; i++) {
                var nextOne = i + 1 < st.length ? st[i + 1].time.total : subtitleInfo.subtitle_length;
                var duration = Math.min(nextOne - st[i].time.total, 5);
                subtitles.push({
                    text: st[i].text,
                    startTime: st[i].time.total - 2,
                    duration: duration,
                    endTime: st[i].time.total + duration - 2
                });
            }
        });
    }

    buffer.oneOverDuration = buffer.sampleRate / buffer.length;
    // display the audio buffer data
    $("#samplerate").text(buffer.sampleRate + " Hz");
    $("#audio-data").show();
/*    $("#numchannels").text(buffer.numberOfChannels + " channel(s)");
    $("#numframes").text(buffer.length + " frames");*/

	var canvas = $("#waveform-full")[0];
	zoomPower = Math.log2(buffer.length/canvas.width);
	waveformFull = new WaveformOverview(buffer.getChannelData(0),zoomPower,0,canvas.width);
	var ctx = canvas.getContext('2d');
	plotMinMax(ctx,waveformFull.maxVals,waveformFull.minVals,0);
	
	waveformZoom = new WaveformOverview(buffer.getChannelData(0),1,0,canvas.width);

	canvas = $("#spectrogram-zoom")[0];
	spectroZoom = new SpectrogramGenerator(framesetSize,framesetSize/2,buffer.sampleRate);
	var ctx = canvas.getContext('2d');
	spectroZoom.generate(buffer.getChannelData(0));
	spectroZoom.draw(ctx,0,buffer.length);
	

    analyzer = audioContext.createAnalyser();
    analyzer.fftSize = framesetSize;
    var bufferLength = analyzer.frequencyBinCount;
    timeData = new Float32Array(bufferLength);
    freqData = new Float32Array(bufferLength);

    player = new SourcePlayer(audioContext, buffer);
    player.connect(analyzer, audioContext.destination);
    
    zoomStartFrame = 0;
    zoomEndFrame = buffer.sampleRate*5;
    setZoom(zoomStartFrame,zoomEndFrame);
    draw();

    $(".button-thing").show();
}

function boundariesChanged() {
    var max = Math.max(boundary1.datum().x, boundary2.datum().x);
    var min = Math.min(boundary1.datum().x, boundary2.datum().x);
    var width = svg.attr('width');
    leftPos = Math.floor(min/width*player.buffer.length);
    rightPos = Math.floor(max/width*player.buffer.length);
    setZoom(leftPos, rightPos);

    var startPos = leftPos/player.buffer.sampleRate;
    var endPos = rightPos/player.buffer.sampleRate;
    player.setPosition(startPos);
    player.setEndPosition(endPos);
    console.log(startPos+"->"+endPos);

}

function boundariesChangedOnRelease() {
	var max = Math.max(boundary1.datum().x, boundary2.datum().x);
    var min = Math.min(boundary1.datum().x, boundary2.datum().x);
    var width = svg.attr('width');
    leftPos = Math.floor(min/width*player.buffer.length);
    rightPos = Math.floor(max/width*player.buffer.length);
    setZoomOnRelease(leftPos, rightPos);

    var startPos = leftPos/player.buffer.sampleRate;
    var endPos = rightPos/player.buffer.sampleRate;
    player.setPosition(startPos);
    player.setEndPosition(endPos);
    console.log(startPos+"->"+endPos);

}

function setZoom( startFrame, endFrame ) {

	var canvas = $("#waveform-zoom")[0];
	var numFramesToShow = endFrame-startFrame;
	
	if(numFramesToShow<canvas.width)
		numFramesToShow = canvas.width;
		
	compressionRatio = numFramesToShow/canvas.width;
		
	zoomPower = Math.log2(compressionRatio);
		

	var ctx = canvas.getContext('2d');
	ctx.clearRect(0,0,canvas.width,canvas.height);
	waveformZoom.position = startFrame;
	waveformZoom.zoomPower = zoomPower;
	waveformZoom.update();
	plotMinMax(ctx,waveformZoom.maxVals,waveformZoom.minVals,0);
}

function setZoomOnRelease( startFrame, endFrame ) {

	var numFramesToShow = endFrame-startFrame;
	var canvas = $("#spectrogram-zoom")[0];
	var ctx = canvas.getContext('2d');
	ctx.clearRect(0,0,canvas.width,canvas.height);
	spectroZoom.draw(ctx,startFrame,numFramesToShow);
}



function draw() {

    timeCodeEl.text(player.getTimeCode());
    var playbackPos = player.getPosition();
    var currentSubtitle = subtitles[subtitlePos];
    var currentText = currentSubtitle && (playbackPos >= currentSubtitle.startTime && playbackPos < currentSubtitle.endTime) ? currentSubtitle.text : "";
    subtitlePos = currentSubtitle && playbackPos >= currentSubtitle.endTime ? subtitlePos+1 : subtitlePos;
    lyricsDiv.children('p').text(currentText);

    playbackLine.updateX(playbackPos*player.buffer.oneOverDuration);

    drawVisual = requestAnimationFrame(draw);
    
    var cnv = $("#oscilliscope")[0];
    var ctx = cnv.getContext('2d');
    clearGraph(ctx);

    analyzer.getFloatTimeDomainData(timeData);
    drawWaveform(ctx,timeData,'white');

    // get frequency data and normalize it
    analyzer.getFloatFrequencyData(freqData);
    var peakIx = getMaxIndex(freqData);
    var peakVal = freqData[peakIx];
    var len = analyzer.frequencyBinCount;
    for(var i = 0; i < len; i++) {
        freqData[i] -= peakVal;
        freqData[i] *= 0.02;
        freqData[i] += 1.0;
    }

    drawWaveform(ctx,freqData,'cyan');
    

    var cnv = $("#waveform-full")[0];
	var ctx = cnv.getContext('2d');
	plotMinMax(ctx,waveformFull.maxVals,waveformFull.minVals,0);
	
	cnv = $("#waveform-zoom")[0];
	ctx = cnv.getContext('2d');
	plotMinMax(ctx,waveformZoom.maxVals,waveformZoom.minVals,0);
	
	//cnv = $("#spectrogram-zoom")[0];
	//ctx = cnv.getContext('2d');
	//ctx.clearRect(0,0,cnv.width,cnv.height);
	//spectroZoom.draw(ctx,zoomStartFrame,zoomEndFrame-zoomStartFrame);
	
};

function clearGraph(context) {
    context.clearRect(0,0,context.canvas.width,context.canvas.height);

    ymid = context.canvas.height/2;
    xmax = context.canvas.width;

    // make a center line
    context.beginPath();
    context.moveTo(0, ymid);
    context.lineTo(xmax, ymid);
    context.lineWidth = 0.5;
    context.strokeStyle = 'grey';
    context.stroke();
}

function drawWaveform(context,inputData,color) {
    var length = inputData.length;

    // draw waveform
    context.beginPath();
    context.moveTo(xScale(0), yScale(inputData[0]));
    for(var i = 1;i<length;i++) {
        context.lineTo(xScale(i), yScale(inputData[i]));
    }
    context.lineWidth = 2;
    context.lineWidth = 2;
    context.strokeStyle = color;
    context.stroke();
}

function plotMinMax(ctx,maxs,mins,offset) {
	ymid = ctx.canvas.height/2;
	xmax = ctx.canvas.width;
	len = Math.min(maxs.length-offset,ctx.canvas.width);
	
	//ctx.beginPath();
	//ctx.moveTo(0, 0);
	//ctx.lineTo(xmax, 2*ymid);
	//ctx.moveTo(0, 2*ymid);
	//ctx.lineTo(xmax, 0);
	//ctx.strokeStyle = '#88ff00';
	//ctx.stroke();
	
	scale = Math.floor(ymid*0.98);
	// draw the data
	ctx.beginPath();
	ctx.moveTo(0, ymid-maxs[offset]*scale);
	for (i = 1; i < len; i++) {
		ctx.lineTo(i, ymid-maxs[offset+i]*scale);
	}
	for (i = len-1; i >= 0; i--) {
		ctx.lineTo(i, ymid-mins[offset+i]*scale);
	}
	
	ctx.fillStyle='#88ffff';
	ctx.fill();
	ctx.lineWidth = 1;
	ctx.strokeStyle = '#448888';
	ctx.stroke();
}
