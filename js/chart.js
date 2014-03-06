(function($) {

	// Creating for later
	var ourData, requests, filled, connectors, state;
	var rankings = [];

	// Formatting
	var comma = d3.format(",");
	var percent = d3.format(".0%");

	// Config
	var width = $('.fc-graphic-legend').width();
	var height = 102;
	var state = $('select').val();
	var xscale = d3.scale.linear()
					.rangeRound([0, width]);

	// Sets ordinal scale
	var eachState = d3.scale.ordinal();

	// Adds SVG element, append a container g element for each state
	var chart = d3.select(".fc-stacked-bar").append("svg")
				  .attr("width", width)
				  .attr("height", height)

			  chart.append("g")
				  .attr("class", "state-container");

	// DAT ourData
	d3.tsv("requests.tsv", function(error, data) {

	  	ourData = data;

		// Setting domain just for the base categories, so we don't graph FILLED
		eachState.domain(d3.keys(ourData[0]).filter(function(key, index) {
			if( (index > 0) && (index < 8) ) {
				return key;
			} else {
				return;
			}
		}));

		// Running a forEach here to create a subarray that holds the individual segments
		ourData.forEach(function(d) {
			var x0 = 0;
			var stateArray = $.map(d, function (value) { return value; });

			// Adds all of the base category keys in d to get total
			// Whatever is returned becomes "a"
			var reqTotal = stateArray.reduce(function(a, b, index, array){
				if( (index > 1) && (index < 8) ) {
					return parseInt(a) + parseInt(b);
				} else if ( index < 2 ) {
					return b;
				} else {
					return a;
				}
			});

			// Adds all of the FILLED category keys in d to get total
			var filledTotal = stateArray.reduce(function(a, b, index, array){
				if( (index > 8)) {
					return parseInt(a) + parseInt(b);
				} else {
					return b ;
				}
			});

			// Populate rankings array
			rankings.push( { name:d.State, reqTotal:reqTotal, filledPercent:filledTotal/reqTotal } );

			// Add Total property to each state object
			$.extend(d, {
				reqTotal: reqTotal,
				filledTotal: filledTotal,
			});

			// Creates a new sub-array in each d that holds the returned vals
			// Putting reqTotal into each item for easy access in the filled width calc in the updateData function
			d.categories = eachState.domain().map(function(name, index) {
				return {name: name, requested:+d[name], filled:+d["FILLED " + name], reqTotal:reqTotal, x0: x0, x1: x0 += +d[name]};
			});

			// Divides by the iterated x0 to move each segment to the right place
			d.categories.forEach(function(d) {
				d.x0 /= x0; d.x1 /= x0;
			});
		});

		
		var currentDatum = ourData.filter(function(row) {
			return row['State'] == state;
		});

		// Defining our bar segment variables that we declared up top
		requests = chart.selectAll(".requests")
			.data(currentDatum)
			.enter().append("g")
			.attr("class", "requests");

		connectors = chart.selectAll(".connectors")
			.data(currentDatum)
			.enter().append("g")
			.attr("transform", "translate(0,40)")
			.attr("class", "connectors");

		filled = chart.selectAll(".fulfilled")
			.data(currentDatum)
			.enter().append("g")
			.attr("transform", "translate(0,60)")
			.attr("class", "fulfilled");	


		addRanking();
		updateData(state);

	});




	// =============================================
	// HANDLERS
	// =============================================

	// Select box
	$('select').on('change', function() {
		state = this.value;
		updateData(state);
		$('.fc-graphic-extremes-item').removeClass("fc-graphic-extremes-active");
	});

	// Extremes list
	$('.fc-graphic-extremes-item').on('click', function() {
		var $this = $(this);
		var selected = getSelected(this);
		var nopeClasses = justThisData(this);
        var errybody = $('rect, polygon, .fc-graphic-legend-item');
		state = $this.data( "state" );
		var currentDatum = ourData.filter(function(row) {
			return row['State'] == state;
		});

		updateData(state);
		$('select').val(state);
		$this.addClass("fc-graphic-extremes-active");
		$this.siblings().removeClass("fc-graphic-extremes-active");
        $('.fc-graphic-inline-tag').removeClass("fc-graphic-extremes-active");

		for (var i = 0; i < errybody.length; i++) {
			errybody[i].classList.remove('fc-graphic-inactive');
		};
		
		if(selected.length > 0) {
			// Highlighting particular segment		
			for (var i = 0; i < nopeClasses.length; i++) {
				nopeClasses[i].classList.add('fc-graphic-inactive');
			}
			console.log(selected)	;
			updateAnnotationsSegment(currentDatum, selected);
		}


	});


	$('.fc-graphic-inline-tag').on('click', function() {
		var 	$this = $(this);
		state = $this.data( "state" );

		updateData(state);
		$('select').val(state);
		$this.addClass("fc-graphic-extremes-active");
		$this.siblings().removeClass("fc-graphic-extremes-active");
		$('.fc-graphic-extremes-item').removeClass("fc-graphic-extremes-active");
	});


	// Prevents link from reloading page
	$('.fc-graphic-tag, .fc-graphic-inline-tag').on('click', function(event) {
		event.preventDefault();
	});

	// Hover
	$('.fc-stacked-bar').on({
		mouseenter: function () {
			var nopeClasses = justThisClass(this);
			var currentDatum = ourData.filter(function(row) {
				return row['State'] == state;
			});
			for (var i = 0; i < nopeClasses.length; i++) {
				nopeClasses[i].classList.add('fc-graphic-inactive');
			}	
			updateAnnotationsSegment(currentDatum, this);
		},
		mouseleave: function () {
			var errybody = $('rect, polygon, .fc-graphic-legend-item');
			for (var i = 0; i < errybody.length; i++) {
				errybody[i].classList.remove('fc-graphic-inactive');
			};
		}
	}, "rect, polygon, .fc-graphic-legend-item");

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

  	function getSelected(selected) {
  		var className = selected.getAttribute('data-category');
  		return $('.'+className);
  	}

  	function justThisData(selected) {
  		var className = selected.getAttribute('data-category');
  		return $('rect, polygon, .fc-graphic-legend-item').not('.'+className);
  	}

  	function justThisClass(selected) {
  		var className = selected.getAttribute('class');
  		return $('rect, polygon, .fc-graphic-legend-item').not('.'+className);
  	}

  	function updateData(state) {
  		var currentDatum = ourData.filter(function(row) {
  			return row['State'] == state;
  		});

  		updateReqRects(currentDatum);
  		updateConnectPolys(currentDatum);
  		updateFilledRects(currentDatum);
  		updateAnnotations(currentDatum);
  	}

  	function addRanking() {
  		// reqTotal sorting
		rankings.sort(function(a, b) {
			return a.reqTotal - b.reqTotal;
		});

		ourData.forEach(function(d) {
			var reqRank = 50 - rankings.map(function(el) {
				return el.name;
			}).indexOf(d.State);
			d.reqRank = reqRank;
		});

		// filledPercent sorting
		rankings.sort(function(a, b) {
			return a.filledPercent - b.filledPercent;
		});

		ourData.forEach(function(d) {
			var filledRank = 50 - rankings.map(function(el) {
				return el.name;
			}).indexOf(d.State);
			d.filledRank = filledRank;
		});
  	}

  	function updateReqRects(currentDatum) {
  		var reqRects = requests.selectAll("rect")
  		.data(currentDatum[0]['categories']);

  		reqRects.enter().append("rect")
  		.attr("height", "40")
  		.attr("class", function(d) { return d.name.replace(/[\s+\&]/g, ''); });

  		reqRects
  		.attr("x", function(d) { return xscale(d.x0); })
  		.attr("class", function(d) {
  			if (d.requested < 40){
  				return "fc-insufficient";
  			} else {
  				return d.name.replace(/[\s+\&]/g, '');
  			}
  		})
  		.attr("width", function(d) { return (xscale(d.x1) - xscale(d.x0)); });
  	}


  	function updateConnectPolys(currentDatum) {
  		var connectPolys = connectors.selectAll("polygon")
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
  			return xscale(d.x0) + ",0 " + xscale(d.x1) + ",0 " + ( xscale(d.x0) + (xscale(d.x1) - xscale(d.x0)) * ( d.filled / d.requested ) ) + ",20 " + xscale(d.x0) + ",20";
  		});
  	}


  	function updateFilledRects(currentDatum) {
  		var filledRects = filled.selectAll("rect")
  		.data(currentDatum[0]['categories']);

  		filledRects.enter().append("rect")
  		.attr("height", "40")
  		.attr("class", function(d) { return d.name.replace(/[\s+\&]/g, ''); });

  		filledRects
  		.attr("x", function(d) { return xscale(d.x0); })
  		.attr("class", function(d) {
  			if (d.requested < 40){
  				return "fc-insufficient";
  			} else {
  				return d.name.replace(/[\s+\&]/g, '');
  			}
  		})
  		.attr("width", function(d) { return ( ( xscale(d.x1) - xscale(d.x0) ) * ( d.filled / d.requested ) ); });
  	}

  	function getGetOrdinal(n) {
	   var s=["th","st","nd","rd"],
	       v=n%100;
	   return n+(s[(v-20)%10]||s[v]||s[0]);
	}


  	function updateAnnotations(currentDatum) {
  		var comma = d3.format(",");
  		var percent = d3.format(".0%");

  		$('.fc-graphic-annotation-requests').text("Teachers proposed "+ comma(currentDatum[0].reqTotal) +" projects (" + getGetOrdinal(currentDatum[0].reqRank) + "/50 states).");
  		$('.fc-graphic-annotation-funded').text("Donors funded "+ percent(currentDatum[0].filledTotal/currentDatum[0].reqTotal, 0) +" of those projects (" + getGetOrdinal(currentDatum[0].filledRank) + "/50).");
  	}

  	function updateAnnotationsSegment(currentDatum, selected) {
		var elIndex = $(selected).index();
		var currentCat = currentDatum[0]['categories'][elIndex];
				console.log(currentDatum[0]);

		var category = currentCat.name;
		var reqPercent = percent(currentCat.requested/currentDatum[0].reqTotal, 0);
		var filledPecrcent = percent(currentCat.filled/currentCat.requested, 0);

		$('.fc-graphic-annotation-requests').text(reqPercent +" of proposals were for "+ category +".");
		$('.fc-graphic-annotation-funded').text("Donors funded "+ filledPecrcent +" of those projects.");
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

		var currentDatum = ourData.filter(function(row) {
			return row['State'] == state;
		});

		// Update width
		var width = parseInt(d3.select('.fc-graphic-content-block').style('width'), 10);

		xscale = d3.scale.linear()
		.rangeRound([0, width]);

		// Resize SVG element
		chart.attr("width", width);

		// Recalc x0 and x1s
		ourData.forEach(function(d) {
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


		requests = chart.selectAll(".requests")
		.data(currentDatum);

		connectors = chart.selectAll(".connectors")
		.data(currentDatum);

		filled = chart.selectAll(".fulfilled")
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
	}, 600);


})(jQuery);