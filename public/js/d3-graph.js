var waitForFinalEvent = (function() {
	var timers = {};
	return function(callback, ms, uniqueId) {
		if (uniqueId) {
			uniqueId = "Don't call this twice without a uniqueId";
		}
		if (timers[uniqueId]) {
			clearTimeout(timers[uniqueId]);
		}
		timers[uniqueId] = setTimeout(callback, ms);
	};
})();

var updateWindow = function(ratio, svg, force, graph, rect) {
	return function() {
		waitForFinalEvent(function() {
			if (ratio) {
				width = $('.container').outerWidth();
				height = width * (ratio);
			} else {
				height = $(window).height() - $('nav').outerHeight();
				width = $(window).innerWidth();
			}
			graph
				.attr("width", width)
				.attr('height', height);

			svg
				.attr("width", width)
				.attr('height', height);

			rect
				.attr("width", width)
				.attr('height', height);

			force.size([width, height])
				.start();

		}, 600, "some unique string");
	}
}

graph = function(queryURL, ratio) {

	d3.json(queryURL, function(err, json) {
		if (err) throw err;
		var height, width;
		if (ratio) {
			width = $('.container').outerWidth();
			height = width * (ratio);
		} else {
			height = $(window).height() - $('nav').outerHeight();
			width = $(window).innerWidth();
		}

		var color = d3.scale.category10();

		var tip = d3.tip().attr('class', 'd3-tip').html(function(d) {
			return d.data.name;
		});


		var svg = d3.select("#graph")
			.append("svg:svg")
			.attr("width", width)
			.attr("height", height)

		var graph = svg.append('g')
			.call(tip)
			.call(d3.behavior.zoom().scaleExtent([.3, 3]).on("zoom", zoom));

		var rect = graph.append('rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'all');

		var vis = graph.append('svg:g');

		var force = d3.layout.force()
			.linkDistance(20)
			.charge(-800)
			.gravity(1.4)
			.size([width, height]);

		force
			.nodes(json.nodes)
			.links(json.links)
			.start();

		var link = vis.selectAll(".link")
			.data(json.links)
			.enter()
			.append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) {
				return Math.sqrt((d.source.weight + d.target.weight) / 2);
			});

		var node = vis.selectAll(".node")
			.data(json.nodes)
			.enter()
			.append('a')
			.attr("xlink:href", function(d) {
				return "http://" + window.location.host + "/graph/users/" + d.id
			})
			.append("circle")
			.attr("class", "node") //
			.attr("r", function(d) {
				return radius(d);
			})
			.style("fill", function(d) {
				return color(Number(d.data.year) - 2012);
			})
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide);

		var maxRadius = 0;
		node.each(function(d) {
			if (radius(d) > maxRadius) maxRadius = radius(d);
		});

		force.on("tick", function() {

			link.attr("x1", function(d) {
				return d.source.x;
			})
				.attr("y1", function(d) {
					return d.source.y;
				})
				.attr("x2", function(d) {
					return d.target.x;
				})
				.attr("y2", function(d) {
					return d.target.y;
				});

			node.each(collide(.5))
				.attr("cx", function(d) {
					return d.x;
				})
				.attr("cy", function(d) {
					return d.y;
				})
		});

		function collide(alpha) {
			var quadtree = d3.geom.quadtree(json.nodes);
			return function(d) {
				var r = radius(d) + maxRadius,
					nx1 = d.x - r,
					nx2 = d.x + r,
					ny1 = d.y - r,
					ny2 = d.y + r;
				quadtree.visit(function(quad, x1, y1, x2, y2) {
					if (quad.point && (quad.point !== d)) {
						var x = d.x - quad.point.x,
							y = d.y - quad.point.y,
							l = Math.sqrt(x * x + y * y),
							r = radius(d) + radius(quad.point);
						if (l < r) {
							l = (l - r) / l * alpha;
							d.x -= x *= l;
							d.y -= y *= l;
							quad.point.x += x;
							quad.point.y += y;
						}
					}
					return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
				});
			};
		}

		function radius(d) {
			return (d.weight + 3) * 1.75;
		}

		function zoom() {
			vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		}

		$(window).resize(updateWindow(ratio, svg, force, graph, rect));
	});
}
