graph = function(config) {
    d3.json(config.queryURL, function(err, data) {
        if (err) throw err;

        nodes = data.nodes,
        links = data.links;

        var weight = {},
            weightList = [];

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

        var vis = graph.append('svg:g')
            .attr('transform', 'translate(' + ((width / 2) - 245) + ',' + ((height / 2) - 125) + ') scale(.35)');

        weight = addNecessaryAttributes(nodes, links, weight);
        weightList = _.map(weight, function(d, i) {
            return Number(i)
        });

        angle = d3.scale.ordinal().domain(weightList).rangePoints([0, 2 * Math.PI - (Math.PI / 6)]);

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
                link.classed("selected", function(l) {
                    if (nodes[l.source] == d || nodes[l.target] == d) {
                        highlight.push(nodes[l.source] == d ? nodes[l.target] : nodes[l.source]);
                        return true;
                    }
                    return false;
                });
                link.classed("deselected", function(l) {
                    if (nodes[l.source] == d || nodes[l.target] == d) {
                        return false;
                    }
                    return true;
                });
                node.classed("deselected", function(d) {
                    return !_.contains(highlight, d);
                });
                node.classed("selected", function(d) {
                    return _.contains(highlight, d);
                });

                tip.show.call(this, d, i);
            })
            .on('mouseout', function(d, i) {
                link.classed({"selected": false, 'deselected': false});
                node.classed({"selected": false, 'deselected': false});
                tip.hide.call(this, d, i);
            });

        function addNecessaryAttributes(nodes, links) {
            return addWeight();

            function addWeight() {
                for (var i in links) {
                    if (nodes[links[i].source].weight)
                        nodes[links[i].source].weight += 1;
                    else
                        nodes[links[i].source].weight = 1;

                    if (nodes[links[i].target].weight)
                        nodes[links[i].target].weight += 1;
                    else
                        nodes[links[i].target].weight = 1;
                }


                var temp = _.groupBy(nodes, function(d) {
                    d.weight = d.weight ? d.weight : 0;
                    return d.weight;
                });
                _.each(temp, function(elem, ind, list) {
                    temp[ind] = _.sortBy(elem, function(d) {
                        return d.data.year
                    });
                    _.each(temp[ind], function(elem, ind, list) {
                        elem.r = ind;
                    });
                });
                return temp;
            }
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
