graph = function(config) {

	d3.json(config.queryURL, function(err, json) {
		if (err) throw err;

		nodes = json.nodes;
		links = json.links;
		if (config.onDataLoad)
			config.onDataLoad();

		var shiftRange = 25;

		var highSelected;

		var dijSelected = [];
		var dijToggle = 0;

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


		var rect = graph.append('rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.on('click', function() {
				if ((dijToggle != 0 || highSelected) && !d3.event.defaultPrevented) {
					resetStyling();
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
				if (force.alpha() == 0)
					force.alpha(.01);
			})
			.on('dragend', function() {
				d3.event.sourceEvent.stopPropagation();
			});

		force
			.nodes(nodes)
			.links(links)
			.start();

		computeNeighbors(nodes, links);

		var link = vis.selectAll(".link")
			.data(links)
			.enter()
			.append("line")
			.attr("class", "link")
			.style("stroke-width", function(d) {
				return Math.sqrt((d.source.weight + d.target.weight) / 2);
			});

		var shift = Math.round(Math.random() * shiftRange);

		var node = vis.selectAll(".node")
			.data(nodes)
			.enter()
			.append("circle")
			.attr("class", "node")
			.attr("r", function(d) {
				return radius(d);
			})
			.style("fill", function(d) {
				return color(Number(d.data.year) + shift);
			})
			.on('mouseover', function(d, i) {
				if (d3.select(this).style('opacity') == "1") {
					tip.show.call(this, d, i);
				}
			})
			.on('mouseout', function(d, i) {
				tip.hide.call(this, d, i);
			})
			.on('click', function(d, i) {
				if (d3.select(this).style('opacity') == "1") {
					clickRoute.call(this, d, i);
				} else {
					resetStyling();
				}
			})
			.call(drag);

		if (d3.select('#search').length) {
			var search = d3.select('#search')
				.on('input', function() {
					highlightSearch.call(this);
				}).on('change', function() {
					highlightSearch.call(this);
				});
		}

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

		function resetStyling(d) {
			node
				.style("opacity", 1);

			link
				.style("opacity", 1)
				.style("stroke", "#999");

			highSelected = null;
			dijToggle = 0;
			dijSelected.clear();
			source = null;
			target = null;
		}

		function highlightSearch() {
			var search = this.value.toLowerCase();
			if (search == "") {
				node
					.style('stroke', '#fff')
					.style('stroke-width', '1.5px');

				return;
			}

			node
				.style('stroke', function(d) {
					return d.data.name.toLowerCase().indexOf(search) != -1 ? "#000" : "#fff";
				})
				.style('stroke-width', function(d) {
					return d.data.name.toLowerCase().indexOf(search) != -1 ? "5px" : "1.5px";
				});
		}

		function clickRoute(d) {
			if (!d3.event.shiftKey && !d3.event.ctrlKey) {
				if (!highSelected || d3.select(this).style('opacity') == '1') {
					highSelected = d;

					node
						.style("opacity", function(o) {
							return (o.index == highSelected.index || _.contains(highSelected.neighbors, o.index)) ? 1 : 0.1;
						});
					link
						.style("opacity", function(o) {
							return ((o.source.index == highSelected.index || o.target.index == highSelected.index) && (_.contains(highSelected.neighbors, o.source.index) || _.contains(highSelected.neighbors, o.target.index))) ? 1 : 0;
						})

				}
			} else if (d3.event.shiftKey && !d3.event.ctrlKey) {
				if (dijToggle == 0) {
					source = _.cloneDeep(d);
					dijSelected.push(source);
					dijToggle++;
				} else if (dijToggle == 1) {
					var target = _.cloneDeep(d);
					var source = dijSelected[0];
					dijSelected = readDijkstra(target, dijkstra(nodes, source, target).prev);
					dijSelected.push(source);
					dijToggle++;
					node.style("opacity", function(o) {
						return (_.some(dijSelected, function(d) {
							return d.index == o.index
						})) ? 1 : 0.1;
					})

					link.style("opacity", function(o) {
						return (_.some(dijSelected, function(d) {
							return d.index == o.source.index
						}) && _.some(dijSelected, function(d) {
							return d.index == o.target.index
						})) ? 1 : 0;
					});
				}
			} else if (!d3.event.shiftKey && d3.event.ctrlKey) {
				var source = d;
				var dist = dijkstra(nodes, source).dist;

				var distNodes = _(dist).map(function(d, i) {
					return {
						val: d,
						index: i
					}
				}).filter(function(d) {
					return d.val != Infinity
				}).map(function(d, index) {
					return {
						node: nodes[d.index],
						distance: d.val
					}
				}).value();

				var heatColor = d3.scale.linear().domain([0, _.max(distNodes, function(d) {
					return d.distance
				}).distance]).range(['#FF0000', '#00FFFF']); //['#d62728', '#27d6d5']

				var duration = 750;

				node.transition()
					.duration(duration)
					.delay(function(datum) {
						var sel;
						if (_.find(distNodes, function(node) {
							sel = node;
							return datum.id === node.node.id;
						})) {
							return sel.distance * duration;
						} else {
							return (_.max(distNodes, function(d) {
								return d.distance
							}).distance + 1) * duration;
						}
					})
					.style('fill', function(datum) {
						var sel;
						if (_.find(distNodes, function(node) {
							sel = node;
							return datum.id === node.node.id;
						})) {
							return heatColor(sel.distance);
						} else {
							return '#000000';
						}
					});
			} else if (d3.event.shiftKey && d3.event.ctrlKey) {
				var duration = 750;
				var shift = Math.round(Math.random() * shiftRange);
				node.transition()
					.duration(duration)
					.style("fill", function(d) {
						return color(Number(d.data.year) + shift);
					})
			}
		}

		$(window).resize(updateWindow);
	});
}