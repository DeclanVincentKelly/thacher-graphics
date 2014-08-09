graph = function(config) {

	d3.json(config.queryURL, function(err, json) {
		if (err) throw err;


		nodes = json.nodes;
		links = json.links;
		if (config.onDataLoad)
			config.onDataLoad();

		var toggle = 0;
		var linkedByIndex = {};
		for (i = 0; i < nodes.length; i++) {
			linkedByIndex[i + "," + i] = 1;
		};

		var height, width;
		updateWidthHeight();

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
			.call(d3.behavior.zoom().scaleExtent([.3, 3]).on("zoom", zoom)).on('dblclick.zoom', null);

		var rect = graph.append('rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.on('click', function() {
				if(toggle != 0) {
					node.style("opacity", 1);
					link.style("opacity", 1);
					toggle = 0;
				}
			});

		var vis = graph.append('svg:g');

		var force = d3.layout.force()
			.linkDistance(30)
			.charge(-800)
			.gravity(1.4)
			.size([width, height]);

		var drag = d3.behavior.drag()
			.on('dragstart', function() {
				d3.event.sourceEvent.stopPropagation();
				force.resume();
			})
			.on('drag', dragMove);

		force
			.nodes(nodes)
			.links(links)
			.start();

		var link = vis.selectAll(".link")
			.data(links)
			.enter()
			.append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) {
				return Math.sqrt((d.source.weight + d.target.weight) / 2);
			});

			links.forEach(function(d) {
				linkedByIndex[d.source.index + "," + d.target.index] = 1;
			});

		var node = vis.selectAll(".node")
			.data(nodes)
			.enter()
			.append("circle")
			.attr("class", "node")
			.attr("r", function(d) {
				return radius(d);
			})
			.style("fill", function(d) {
				return color(Number(d.data.year) - 2012);
			})
			.on('mouseover', tip.show)
			.on('mouseout', tip.hide)
			.on('click', connectedNodes)
			.on('dblclick', function(d) {
				window.location = "http://" + window.location.host + "/graph/users/" + d.id
			})
			.call(drag);

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
			var quadtree = d3.geom.quadtree(nodes);
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

		function updateWindow() {
			waitForFinalEvent(function() {
				updateWidthHeight();
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

		function updateWidthHeight() {
			var dim = [512, 384]
			if (config.onWindowResize)
				dim = config.onWindowResize(width, height);
			width = dim[0];
			height = dim[1];
		}

		function dragMove(d) {
			d3.select(this)
				.attr("cx", d.x = d3.event.x)
				.attr("cy", d.y = d3.event.y);
		}

		function neighboring(a, b) {
			return linkedByIndex[a.index + "," + b.index];
		}

		function connectedNodes() {
			if (toggle == 0) {
				d = d3.select(this).node().__data__;
				node.style("opacity", function(o) {
					return neighboring(d, o) | neighboring(o, d) ? 1 : 0.1;
				});
				link.style("opacity", function(o) {
					return d.index == o.source.index | d.index == o.target.index ? 1 : 0.1;
				});
				toggle = 1;
			} else {
				node.style("opacity", 1);
				link.style("opacity", 1);
				toggle = 0;
			}
		}

		$(window).resize(updateWindow);
	});
}
