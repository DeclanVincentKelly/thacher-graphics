graph = function(config) {
	d3.json(config.queryURL, function(err, data) {
		if (err) throw err;

		nodes = data.nodes,
		links = data.links;
		computeNeighbors(nodes, links);
		computeWeight(nodes, links);

		var weight = {},
			weightList = [];

		var shiftRange = 25;

		var highSelected;

		var dijSelected = [];
		var dijToggle = 0;

		if (config.onDataLoad)
			config.onDataLoad();

		var width,
			height,
			innerRadius = 160;

		updateWidthHeight();

		var color = d3.scale.category10();

		var svg = d3.select('#graph')
			.append('svg:svg')
			.attr("width", width)
			.attr('height', height);

		var zoomBehavior = d3.behavior.zoom()
			.scaleExtent([.15, 4])
			.on("zoom", zoom)
			.translate([((width / 2) - 245), ((height / 2) - 125)])
			.scale(.35);

		var tip = d3.tip().attr('class', 'd3-tip').html(function(d) {
			return d.data.name + ' - ' + d.weight;
		});

		var graph = svg.append('g')
			.call(tip)
			.call(zoomBehavior);

		var rect = graph.append('rect')
			.attr('width', width)
			.attr('height', height)
			.style('fill', 'none')
			.style('pointer-events', 'all')
			.on('click', function() {
				if ((dijToggle != 0 || highSelected) && !d3.event.defaultPrevented) {
					resetStyling();
				} else if ($('#search').val()) {
					resetStyling();
				}
			});

		var vis = graph.append('svg:g')
			.attr('transform', 'translate(' + ((width / 2) - 245) + ',' + ((height / 2) - 125) + ') scale(.35)');

		weight = _(nodes).groupBy(function(d) { return d.weight }).forEach(function(d) { _(d).sortBy(function(n) { return n.data.year }).forEach(function(n, i) {n.r = i;});}).value();

		angle = d3.scale.ordinal().domain(_.map(weight, function(d, i) {return Number(i)})).rangePoints([0, 2 * Math.PI - (Math.PI / 6)]);

		var link = vis.selectAll(".link")
			.data(links)
			.enter().append("path")
			.attr("class", "link")
			.attr("d",
				d3.hive.link()
				.angle(function(d) {
					return angle(nodes[d].weight) + Math.PI / 2;
				})
				.radius(function(d) {
					return radius(nodes[d]);
				})
			);

		var node = vis.selectAll(".node")
			.data(nodes)
			.enter().append("circle")
			.attr("class", "node")
			.attr("cy", function(d) {
				return radius(d) * Math.sin(angle(d.weight));
			})
			.attr("cx", function(d) {
				return radius(d) * Math.cos(angle(d.weight));
			})
			.attr("r", function(d) {
				return (d.weight + 3) * 3;
			})
			.style("fill", function(d) {
				return color(d.data.year - 2013);
			})
			.on('mouseover', function(d, i) {
				var highlight = [d];
				link.attr("opacity", function(l) {
					if (nodes[l.source] == d || nodes[l.target] == d) {
						highlight.push(nodes[l.source] == d ? nodes[l.target] : nodes[l.source]);
						return 1;
					}
					return 0.1;
				});
				node.attr("opacity", function(d) {
					return _.contains(highlight, d) ? 1 : 0.1;
				});

				tip.show.call(this, d, i);
			})
			.on('mouseout', function(d, i) {
				link.attr('opacity', 1);
				node.attr('opacity', 1);
				tip.hide.call(this, d, i);
			})
			.on('click', function(d, i) {
				if (d3.select(this).style('opacity') == "1") {
					clickRoute.call(this, d, i);
				} else {
					resetStyling();
				}
			});

		if (d3.select('#search').length) {
			var search = d3.select('#search')
				.on('input', function() {
					highlightSearch.call(this);
				}).on('change', function() {
					highlightSearch.call(this);
				}).on('mouseover', function() {
					d3.select('#search').transition().duration(250).style('opacity', 1);
				}).on('mouseout', function() {
					if(!$("#search").is(":focus"))
						d3.select('#search').transition().duration(250).style('opacity', 0.25);
				}).on('focusout', function() {
					d3.select('#search').transition().duration(250).style('opacity', 0.25);
				}).on('keyup', function() {
    				if (d3.event.keyCode == 13) {
        				highlightSearch.call(this);
    				}
				});
		}

		function resetStyling(d) {
			node
				.style({'stroke': "#fff", 'stroke-width': '1.5px', 'opacity': 1});

			link
				.style({"opacity": 1, 'stroke': '#999'});

			highSelected = null;
			dijToggle = 0;
			dijSelected.clear();
			source = null;
			target = null;
		}

		function clickRoute(d) {
			d3.event.preventDefault();
			if (!d3.event.shiftKey && !d3.event.altKey) {
				if (!highSelected || d3.select(this).style('opacity') == '1') {
					highSelected = d;

					node
						.style("opacity", function(o) {
							return (o.index == highSelected.index || _.contains(highSelected.neighbors, o.index)) ? 1 : 0.1;
						});
					link
						.style("opacity", function(o) {
							return ((o.source == highSelected.index || o.target == highSelected.index) && (_.contains(highSelected.neighbors, o.source) || _.contains(highSelected.neighbors, o.target))) ? 1 : 0;
						})
				}
			} else if (d3.event.shiftKey && !d3.event.altKey) {
				if (dijToggle == 0) {
					source = _.cloneDeep(d);
					dijSelected.push(source);
					dijToggle++;

					var origColor = d3.hsl(d3.select(this).style('fill'));
					d3.select(this)
						.style('stroke', d3.hsl((origColor.h + 180) % 360, origColor.s, origColor.l).toString())
						.style('stroke-width', '3px');

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
					}).style({
						'stroke': "#fff",
						'stroke-width': '1.5px'
					});

					link.style("opacity", function(o) {
						return (_.some(dijSelected, function(d) {
							return d.index == o.source
						}) && _.some(dijSelected, function(d) {
							return d.index == o.target
						})) ? 1 : 0;
					});
				}
			} else if (!d3.event.shiftKey && d3.event.altKey) {
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
			} else if (d3.event.shiftKey && d3.event.altKey) {
				var duration = 750;
				var shift = Math.round(Math.random() * shiftRange);
				node.transition()
					.duration(duration)
					.style("fill", function(d) {
						return color(Number(d.data.year) + shift);
					})
			}
		}

		function highlightSearch() {
			var search = this.value.toLowerCase();
			if (search == "") {
				node.style('opacity', 1);
				link.style('opacity', 1);

				return;
			}

			node.style('opacity', function(d) {
					return d.data.name.toLowerCase().indexOf(search) != -1 ? 1 : 0.1;
				})

			link.style('opacity', function(d) {
					return (nodes[d.source].data.name.toLowerCase().indexOf(search) != -1 && nodes[d.target].data.name.toLowerCase().indexOf(search) != -1) ? 1 : 0.1;
				})
		}

		function zoom() {
			vis.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		}

		function degrees(radians) {
			return radians / Math.PI * 180 - 90;
		}

		function radius(d) {
			return innerRadius + (d.r * ((d.weight + 3) * 6));
		}

		function updateWidthHeight() {
			var dim = [512, 384]
			if (config.onWindowResize)
				dim = config.onWindowResize(width, height);
			width = dim[0];
			height = dim[1];
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
			}, 600, "some unique string");
		}

		$(window).resize(updateWindow);
	});
}
