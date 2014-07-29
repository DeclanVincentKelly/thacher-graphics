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

updateWindow = function(ratio, svg, force) {
	return function() {
		waitForFinalEvent(function() {
			if (ratio) {
				width = $('.container').outerWidth();
				height = width * (ratio);
			} else {
				height = $(window).height() - $('nav').outerHeight() - 5;
				width = $('#graph').outerWidth();
			}
			svg
				.attr("width", width)
				.attr('height', height);

			force.size([width, height])
				.start();

		}, 500, "some unique string");
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
			height = $(window).height() - $('nav').outerHeight() - 5;
			width = $('#graph').outerWidth();
		}

		var svg = d3.select("#graph")
			.append("svg")
			.attr("width", width)
			.attr("height", height);

		var force = d3.layout.force()
			.linkDistance(20)
			.charge(-800)
			.gravity(1.4)
			.size([width, height]);

		var color = d3.scale.category10()

		force
			.nodes(json.nodes)
			.links(json.links)
			.start();

		var link = svg.selectAll(".link")
			.data(json.links)
			.enter()
			.append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) {
				return Math.sqrt((d.source.weight + d.target.weight) / 2);
			});

		var node = svg.selectAll(".node")
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
			.call(force.drag);

		node.append("title")
			.text(function(d) {
				return d.data.name;
			});

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
					return d.x = Math.max((d.weight + 3) * 1.5, Math.min(width - ((d.weight + 3) * 1.5), d.x));
				})
				.attr("cy", function(d) {
					return d.y = Math.max((d.weight + 3) * 1.5, Math.min(height - (d.weight + 3) * 1.5, d.y));
				});
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
		$(window).resize(updateWindow(ratio, svg, force));
	});
}
