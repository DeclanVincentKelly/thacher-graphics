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
		var selected = [];

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
			.call(d3.behavior.zoom().scaleExtent([.2, 4]).on("zoom", zoom));


		log= [];
		var rect = graph.append('rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.on('click', function() {
				if(toggle != 0 && !d3.event.defaultPrevented) {
					node.style("opacity", 1);
					link.style("opacity", 1);
					link.style("stroke", "#C0C0C0");
					toggle = 0;
					selected.clear();
				}
			});

		var vis = graph.append('svg:g');

		var force = d3.layout.force()
			.linkDistance(40)
			.charge(-800)
			.gravity(0.6)
			.size([width, height]);

		var drag = force.drag()
			.on('dragstart', function() {
				d3.event.sourceEvent.stopPropagation();
				if(force.alpha() == 0)
					force.alpha(.01);
			})
			.on('dragend', function() {d3.event.sourceEvent.stopPropagation();});

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
			.on('mouseover', function(d, i) {
				//d.fixed = true;
				if(d3.select(this).style('opacity') == "1") {
					tip.show.call(this, d, i);
				}
			})
			.on('mouseout', function(d, i) {
				//d.fixed = false;
				tip.hide.call(this, d, i);
			})
			.on('click', clickRoute)
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

		function neighboring(a, b) {
			return linkedByIndex[a.index + "," + b.index];
		}

		function neighbors(a, b) {
			return neighboring(a, b) | neighboring(b, a);
		}

		function neighboringSelected(a) {
			for(var i = 0; i < selected.length; i++)
				if(neighbors(selected[i], a))
					return true;
			return false;
		}

		function updateSelection(d) {
			node.style("opacity", function(o) {
				return (neighbors(d, o) || selected.indexOf(o) != -1) ? 1 : 0.1;
			});
			link.style("opacity", function(o) {
				return ((selected.indexOf(o.source) != -1 && selected.indexOf(o.target) != -1) || o.source.index == d.index || o.target.index == d.index) ? 1 : 0;
			});
			link.style("stroke", function(o) {
				return (selected.indexOf(o.source) != -1 && selected.indexOf(o.target) != -1) ? "#000" : '#C0C0C0';
			});
		}

		function clickRoute(d) {
			if(!d3.event.shiftKey && !d3.event.ctrlKey) {
				if (toggle == 0 || (selected.length < 2 && neighboringSelected(d)) || (selected.indexOf(d) > -1) ) {
					updateSelection(d);
					toggle = 1;

					if(selected.length < 2)
						selected[0] = d;
					else
						selected.push(d);

				} else if ( toggle == 1 && !( !(selected.length < 2) && neighboringSelected(d) ) ) {
					node.style("opacity", 1);
					link.style("opacity", 1);
					link.style("stroke", "#C0C0C0");
					toggle = 0;
					selected.clear();
				}
			} else if (!d3.event.ctrlKey) {
				if (toggle == 1 || neighboringSelected(d)) {
					selected.push(d);
					updateSelection(d);
				}
			} else {
				window.location = "http://" + window.location.host + "/pages/users/" + d.id
			}
			console.log(d3.event);
		}

		$(window).resize(updateWindow);
	});
}
