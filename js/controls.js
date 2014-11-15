function addDraggableLine(svg, posX, onDrag, onRelease) {
    var width = svg.attr('width');
    var height = svg.attr('height');
    lineState = { x : posX };

    var lineDrag = d3.behavior.drag()
        .on("dragstart", function() {
            selectedLineGroup = d3.select(this);
            d3.select("body").addClass("dragging");
        })
        .on("drag", function() {
            var ev = d3.event;
            if (selectedLineGroup){
                mouse = d3.mouse(svg.node());
                var newX = mouse[0];
                newX = Math.max(newX, 1);
                newX = Math.min(newX, width-2);
                selectedLineGroup.attr("transform", "translate(" + newX + " 0)")
                .datum().x = newX;
                if (ev.sourceEvent.shiftKey)
                {
                    var other = (selectedLineGroup.attr('id') == 'line0') ? boundary2 : boundary1;
                    var newOtherX = other.datum().x += ev.dx;
                    other.attr("transform", "translate(" + newOtherX + " 0)")
                }
                onDrag && onDrag(newX);
            }
        })
        .on("dragend", function() {
            selectedLineGroup = undefined;
            d3.select("body").removeClass("dragging");
            onRelease && onRelease();
        })
    lineGroup = svg.append("g")
        .attr('id','line'+posX)
        .datum(lineState)
        .attr("class","draggable")
        .attr("transform", "translate(" + posX + " 0)")
        .call(lineDrag);

    lineGroup.addLine([0,0], [0,height], {  stroke: "yellow", "stroke-width": 2 });
    //lineGroup.addRect([lineState.x-5, lineState.y-5], [lineState.x+5, lineState.y+5], { opacity: .001, fill: "white" });
    lineGroup.rect({
        x: -2,
        y: 0,
        width: 6,
        height: height,
        opacity: .001,
        fill: "white"
    });
    return lineGroup;

}

function addPlaybackLine(svg) {
    var width = svg.attr('width');
    var height = svg.attr('height');
    lineState = { x : 0 };

    var lineDrag = d3.behavior.drag()
        .on("dragstart", function() {
            selectedLineGroup = d3.select(this);
            d3.select("body").addClass("dragging");
        })
        .on("drag", function() {
            if (selectedLineGroup){
                mouse = d3.mouse(svg.node());
                var newX = mouse[0];
                newX = Math.max(newX, 1);
                newX = Math.min(newX, width-2);
                selectedLineGroup.attr("transform", "translate(" + newX + " 0)")
                    .datum().x = newX;
            }
        })
        .on("dragend", function() {
            selectedLineGroup = undefined;
            d3.select("body").removeClass("dragging");
        })
    lineGroup = svg.append("g")
        .attr('id','playbackLine')
        .datum(lineState)
        .attr("class","draggable")
        //.attr("transform", "translate(" + posX + " 0)")
        .call(lineDrag);

    lineGroup.addLine([0,0], [0,height], {  stroke: "black", "stroke-width": 2 });
    //lineGroup.addRect([lineState.x-5, lineState.y-5], [lineState.x+5, lineState.y+5], { opacity: .001, fill: "white" });
    lineGroup.rect({
        x: -2,
        y: 0,
        width: 6,
        height: height,
        opacity: .001,
        fill: "white"
    });

    lineGroup.updateX = function(xSignal) {
        var x = Math.floor(xSignal * width);
        lineGroup.attr("transform", "translate(" + x + " 0)")
            .datum().x = x;
    };

    return lineGroup;

}
