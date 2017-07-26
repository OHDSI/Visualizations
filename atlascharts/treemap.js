/* 

Copyright 2017 Observational Health Data Sciences and Informatics

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Authors: Frank Defalco, Christopher Knoll, Pavel Grafkin

*/

define(["d3", "d3_tip"], function(d3, d3_tip) {
	"use strict";

	function treemap() {
		var self = this;

		var root,
			node,
			nodes,
			treemap,
			svg,
			x,
			y,
			current_depth = 0;

		this.render = function (data, target, width, height, options) {
			
			d3.select(target).select('.treemap_zoomtarget').text('');

			root = data;
			x = d3.scale.linear().range([0, width]);
			y = d3.scale.linear().range([0, height]);


			
			treemap = d3.layout.treemap()
				.round(false)
				.size([width, height])
				.sticky(true)
				.value(function (d) {
					return options.getsizevalue(d);
				});

			svg = d3.select(target)
				.append("svg:svg")
				.attr("viewBox", `0 0 ${width} ${height}`)
				.attr('preserveAspectRatio', 'xMinYMin meet')
				.append("svg:g");

			var tip = d3_tip()
				.attr('class', 'd3-tip')
				.direction(function(d) {
					const scaledWidth = x.domain()[1] === 1 ? width : x.domain()[1];
					if (d.dx >= scaledWidth - scaledWidth / 10) {
						return 'w';
					} else if (d.x <= scaledWidth / 10) {
						return 'e';
					}
					return 'n';
				})
				.offset([3, 0])
				.html(d => `${options.gettitle(d)}<br/><br/>${options.getcontent(d)}`);
			
			nodes = treemap.nodes(data)
				.filter(function (d) {
					return options.getsizevalue(d);
				});

			var extent = d3.extent(nodes, function (d) {
				return options.getcolorvalue(d);
			});
			var median = d3.median(nodes, function (d) {
				return options.getcolorvalue(d);
			});

			var colorRange;
			if (options.getcolorrange) {
				colorRange = options.getcolorrange();
			} else {
				colorRange = ["#E4FF7A", "#FC7F00"];
			}

			var colorScale = [extent[0], median, extent[1]];
			if (options.getcolorscale) {
				colorScale = options.getcolorscale();
			}
			var color = d3.scale.linear()
				.domain(colorScale)
				.range(colorRange);

			var cell = svg.selectAll("g")
				.data(nodes)
				.enter().append("svg:g")
				.attr("class", "cell")
				.attr("transform", function (d) {
					return "translate(" + d.x + "," + d.y + ")";
				});

			cell.append("svg:rect")
				.attr("width", function (d) {
					return Math.max(0, d.dx - 1);
				})
				.attr("height", function (d) {
					return Math.max(0, d.dy - 1);
				})
				.attr("id", function (d) {
					return d.id;
				})
				.style("fill", function (d) {
					return color(options.getcolorvalue(d));
				})
				.attr("data-title", function (d) {
					return options.gettitle(d);
				})
				.on('mouseover', tip.show)
  			.on('mouseout', tip.hide)			
				.on('click', function (d) {
					if (d3.event.altKey) {
						zoom(root);
						applyGroupers(root);
					} else if (d3.event.ctrlKey) {
						var target = d;

						while (target.depth !== current_depth + 1) {
							target = target.parent;
						}
						current_depth = target.depth;
						if (target.children && target.children.length > 1) {
							applyGroupers(target);
							zoom(target);
						} else {
							current_depth = 0;
							applyGroupers(root);
							zoom(root);
						}
					} else {
						options.onclick && options.onclick(d);
					}
				});


			function zoom(d) {
				var kx = width / d.dx,
					ky = height / d.dy;
				x.domain([d.x, d.x + d.dx]);
				y.domain([d.y, d.y + d.dy]);

				var zoom_target = d3.select(target).select('.treemap_zoomtarget');
				if (d.name === 'root') {
					zoom_target.text('');
				} else {
					var current_zoom_caption = zoom_target.text(); 
					d3.select(target).select('.treemap_zoomtarget').text(current_zoom_caption + ' > ' + d.name);
				}

				var t = svg.selectAll("g.cell,.grouper").transition()
					.duration(750)
					.attr("transform", function (d) {
						return "translate(" + x(d.x) + "," + y(d.y) + ")";
					})
					.each("end", function () {
						$('.grouper').show();
					});

				// patched to prevent negative value assignment to width and height
				t.select("rect")
					.attr("width", function (d) {
						return Math.max(0, kx * d.dx - 1);
					})
					.attr("height", function (d) {
						return Math.max(0, ky * d.dy - 1);
					});

				node = d;
				d3.event.stopPropagation();
			}

			function applyGroupers(target) {
				var kx, ky;

				kx = width / target.dx;
				ky = height / target.dy;

				svg.selectAll('.grouper').remove();

				var top_nodes = treemap.nodes(target)
					.filter(function (d) {
						return d.parent === target;
					});

				var groupers = svg.selectAll(".grouper")
					.data(top_nodes)
					.enter().append("svg:g")
					.attr("class", "grouper")
					.attr("transform", function (d) {
						return "translate(" + (d.x + 1) + "," + (d.y + 1) + ")";
					});

				groupers.append("svg:rect")
					.attr("width", function (d) {
						return Math.max(0, (kx * d.dx) - 1);
					})
					.attr("height", function (d) {
						return Math.max(0, (ky * d.dy) - 1);
					})
					.attr("title", function (d) {
						return d.name;
					})
					.attr("id", function (d) {
						return d.id;
					});
			}
			
			if (options.useTip) {
				svg.call(tip);
				cell
					.on('mouseover', d => tip.show(d, event.target))
					.on('mouseout', d => tip.hide(d, event.target));
			} else {
				cell
					.attr('data-container', 'body')
					.attr('data-toggle', 'popover')
					.attr('data-trigger', 'hover')
					.attr('data-placement', 'top')
					.attr('data-html', true)
					.attr('data-title', d => options.gettitle(d.data))
					.attr('data-content', d => options.getcontent(d.data));
			}
 
			applyGroupers(root);
			svg.selectAll('.grouper')
				.attr('display', 'block');
		};
	};
	
	return treemap;
	
});