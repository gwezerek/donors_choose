var DATA, REQUESTS, FULFILLED, CONNECTORS, CHART, XSCALE, STATE;

var comma = d3.format(",");
var percent = d3.format(".0%");
var width = $('.fc-graphic-legend').width(),
    height = 102;

STATE = $('select').val();
XSCALE = d3.scale.linear()
    .rangeRound([0, width]);

// Sets ordinal scale
var eachState = d3.scale.ordinal();
    

// Adds SVG element, append a container g element for each state
CHART = d3.select(".fc-stacked-bar").append("svg")
    .attr("width", width)
    .attr("height", height)
  
CHART.append("g")
  	.attr("class", "state-container");

// DAT DATA
d3.tsv("requests.tsv", function(error, data) {

  DATA = data;
  		
  // Only returns index
  eachState.domain(d3.keys(DATA[0]).filter(function(key, index) {
	    if( (index > 0) && (index < 8) ) {
	    	return key; 
    	} else {
    		return;
    	} 
  }));

  DATA.forEach(function(d) {
    var x0 = 0;
    var stateArray = $.map(d, function (value) { return value; });

    // Whatever is returned becomes a
    var reqTotal = stateArray.reduce(function(a, b, index, array){
    	if( (index > 1) && (index < 8) ) {
		  return parseInt(a) + parseInt(b);
    	} else if ( index < 2 ) {
    		return b;
    	} else {
    		return a;
    	}
	});

	var filledTotal = stateArray.reduce(function(a, b, index, array){
    	if( (index > 8)) {
		  return parseInt(a) + parseInt(b);
    	} else {
    		return b ;
    	}
	});

    // Add Total property to each state object
    d.reqTotal = reqTotal;
    d.filledTotal = filledTotal;

    // Creates a new sub-array in each d that holds the returned vals
    // Putting reqTotal into each item for easy access in the filled width calc in the updateData function
    d.categories = eachState.domain().map(function(name, index) { 
	    	return {name: name, requested:+d[name], filled:+d["FILLED " + name], reqTotal:reqTotal, x0: x0, x1: x0 += +d[name]}; 
    });

    d.categories.forEach(function(d) { 
    	d.x0 /= x0; d.x1 /= x0; 
    });
  });

  var currentDatum = DATA.filter(function(row) {
    return row['State'] == STATE;
  });

  REQUESTS = CHART.selectAll(".requests")
      .data(currentDatum)
    .enter().append("g")
      .attr("class", "requests");

	  CONNECTORS = CHART.selectAll(".connectors")
      .data(currentDatum)
    .enter().append("g")
      .attr("transform", "translate(0,40)")
      .attr("class", "connectors");

  FULFILLED = CHART.selectAll(".fulfilled")
      .data(currentDatum)
    .enter().append("g")
      .attr("transform", "translate(0,60)")
      .attr("class", "fulfilled");

	  updateData(STATE);

});



// =============================================
// HANDLERS
// =============================================

// Select box
$('select').on('change', function() {
  STATE = this.value;
  updateData(STATE);
  $('.fc-graphic-extremes-item').removeClass("fc-graphic-extremes-active");
});

// Extremes list
$('.fc-graphic-extremes-item').on('click', function() {
  var 	$this = $(this);
  		STATE = $this.data( "state" );

  updateData(STATE); // or $(this).val()
  $('select').val(STATE);
  $this.addClass("fc-graphic-extremes-active");
	  $this.siblings().removeClass("fc-graphic-extremes-active");
});

// Hover
$('.fc-stacked-bar').on({
    mouseenter: function () {
    	var nopeClasses = justThisClass(this);
    	var currentDatum = DATA.filter(function(row) {
	        return row['State'] == STATE;
	    });
    	for (var i = 0; i < nopeClasses.length; i++) {
		    nopeClasses[i].classList.add('fc-graphic-inactive');
		};

		updateAnnotationsSegment(currentDatum, this);
    },
    mouseleave: function () {
        var errybody = $('rect, polygon, .fc-graphic-legend-item');
    	for (var i = 0; i < errybody.length; i++) {
		    errybody[i].classList.remove('fc-graphic-inactive');
		};
    }
}, "rect, polygon, .fc-graphic-legend-item"); //pass the element as an argument to .on

// Resize
window.addEventListener("resize", debounce(function () {
    resize();
}, 250), false);





// =============================================
// HELPER FUNCTIONS
// =============================================

function getChildren(n, skipMe){
    var r = [];
    var elem = null;
    for ( ; n; n = n.nextSibling ) 
       if ( n.nodeType == 1 && n != skipMe)
          r.push( n );        
    return r;
};

function getSiblings(n) {
    return getChildren(n.parentNode.firstChild, n);
}

function justThisClass(selected) {
	var className = selected.getAttribute('class');
	return $('rect, polygon, .fc-graphic-legend-item').not('.'+className);
}

function updateData(STATE) {		  
  var currentDatum = DATA.filter(function(row) {
    return row['State'] == STATE;
  });

  updateReqRects(currentDatum);
  updateConnectPolys(currentDatum);
  updateFilledRects(currentDatum);
  updateAnnotations(currentDatum);
}


function updateReqRects(currentDatum) {
  var reqRects = REQUESTS.selectAll("rect")
      .data(currentDatum[0]['categories']);

  reqRects.enter().append("rect")
      .attr("height", "40")
      .attr("class", function(d) { return d.name.replace(/[\s+\&]/g, ''); });

   reqRects
	      .attr("x", function(d) { return XSCALE(d.x0); })
	      .attr("class", function(d) { 
      	if (d.requested < 40){
	      	return "fc-insufficient"; 
      	} else {
      		return d.name.replace(/[\s+\&]/g, '');
      	}
      })
      .attr("width", function(d) { return (XSCALE(d.x1) - XSCALE(d.x0)); });
}


function updateConnectPolys(currentDatum) {
  var connectPolys = CONNECTORS.selectAll("polygon")
      .data(currentDatum[0]['categories']);

  connectPolys.enter().append("polygon")
	  .attr("class", function(d) { return d.name.replace(/[\s+\&]/g, ''); });

   connectPolys
	  .attr("class", function(d) { 
      	if (d.requested < 40){
	      	return "fc-insufficient"; 
      	} else {
      		return d.name.replace(/[\s+\&]/g, '');
      	}
      })
	      .attr("points", function(d) { 
      	return XSCALE(d.x0) + ",0 " + XSCALE(d.x1) + ",0 " + ( XSCALE(d.x0) + (XSCALE(d.x1) - XSCALE(d.x0)) * ( d.filled / d.requested ) ) + ",20 " + XSCALE(d.x0) + ",20";
      });
}


function updateFilledRects(currentDatum) {
  var filledRects = FULFILLED.selectAll("rect")
      .data(currentDatum[0]['categories']);

  filledRects.enter().append("rect")
      .attr("height", "40")
      .attr("class", function(d) { return d.name.replace(/[\s+\&]/g, ''); });

   filledRects
	      .attr("x", function(d) { return XSCALE(d.x0); })
	      .attr("class", function(d) { 
      	if (d.requested < 40){
	      	return "fc-insufficient"; 
      	} else {
      		return d.name.replace(/[\s+\&]/g, '');
      	}
      })
      .attr("width", function(d) { return ( ( XSCALE(d.x1) - XSCALE(d.x0) ) * ( d.filled / d.requested ) ); });
}


function updateAnnotations(currentDatum) {
	var comma = d3.format(",");
	var percent = d3.format(".0%");

	$('.fc-graphic-annotation-requests').text("Teachers requested "+ comma(currentDatum[0].reqTotal) +" resources overall.");
	$('.fc-graphic-annotation-funded').text("Donors funded "+ percent(currentDatum[0].filledTotal/currentDatum[0].reqTotal, 0) +" of those requests.");
}

function updateAnnotationsSegment(currentDatum, selected) {
	// var comma = d3.format(",");
	// var percent = d3.format(".0%");
	var elIndex = $(selected).index();
	var currentCat = currentDatum[0]['categories'][elIndex];

	var category = currentCat.name;
	var reqPercent = percent(currentCat.requested/currentDatum[0].reqTotal, 0);
	var filledPecrcent = percent(currentCat.filled/currentCat.requested, 0);

	$('.fc-graphic-annotation-requests').text(reqPercent +" of requests were for "+ category +".");
	$('.fc-graphic-annotation-funded').text("Donors funded "+ filledPecrcent +" of those requests.");
}

function debounce(fn, wait) {
    var timeout;

    return function () {
        var context = this,              // preserve context
            args = arguments,            // preserve arguments
            later = function () {        // define a function that:
                timeout = null;          // * nulls the timeout (GC)
                fn.apply(context, args); // * calls the original fn
            };

        // (re)set the timer which delays the function call
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

function resize() {

	var currentDatum = DATA.filter(function(row) {
        return row['State'] == STATE;
    });

	// Update width
	var width = parseInt(d3.select('.fc-graphic-content-block').style('width'), 10);

	XSCALE = d3.scale.linear()
	    .rangeRound([0, width]);

	// Resize SVG element
	CHART.attr("width", width);

	// Recalc x0 and x1s
	DATA.forEach(function(d) {
	    var x0 = 0;
	    var stateArray = $.map(d, function (value) { return value; });

	    // Creates a new sub-array in each d that holds the returned vals
	    d.categories = eachState.domain().map(function(name, index) { 
		    	return {name: name, requested:+d[name], filled:+d["FILLED " + name], x0: x0, x1: x0 += +d[name]}; 
	    });

	    d.categories.forEach(function(d) { 
	    	d.x0 /= x0; d.x1 /= x0; 
	    });
	});


    REQUESTS = CHART.selectAll(".requests")
	      .data(currentDatum);

		CONNECTORS = CHART.selectAll(".connectors")
	      .data(currentDatum);

	FULFILLED = CHART.selectAll(".fulfilled")
	      .data(currentDatum);

	// Redraw shapes
	updateReqRects(currentDatum);
    updateConnectPolys(currentDatum);
	updateFilledRects(currentDatum);

};

// Dangerous hack to get around wrong SVG width due to width not being set by time d3 runs
setTimeout(function(){ 
	resize();
	$(".fc-stacked-bar").css("opacity", "1");
}, 500);