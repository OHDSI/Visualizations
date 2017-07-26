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

Authors: Christopher Knoll, Mark Valez, Sigfried Gold

*/

define(["jquery", "d3", "d3_tip", "./util"], function($, d3, d3_tip, util) {
	"use strict";

	function boxplot() {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 10,
					right: 10,
					bottom: 10,
					left: 10
				},
				yFormat: d3.format('s'),
				tickPadding: 15
			};

			options = $.extend({}, defaults, options);
			var valueFormatter = util.formatSI(3);

			var svg;
			if (!$(target + " svg")[0]) {
				svg = d3.select(target).append("svg")
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet');
			} else {
				svg = d3.select(target + " svg");
			}

			var tip = d3_tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function (d) {
					var content = '<table class="boxplotValues">' + '<tr><td>Max:</td><td>' + valueFormatter(d.max) + '</td></tr>' + '<tr><td>P90:</td><td>' + valueFormatter(d.UIF) + '</td></tr>' + '<tr><td>P75:</td><td>' + valueFormatter(d.q3) + '</td></tr>' + '<tr><td>Median:</td><td>' + valueFormatter(d.median) + '</td></tr>' + '<tr><td>P25:</td><td>' + valueFormatter(d.q1) + '</td></tr>' + '<tr><td>P10:</td><td>' + valueFormatter(d.LIF) + '</td></tr>' + '<tr><td>Min:</td><td>' + valueFormatter(d.min) + '</td></tr>' + '</table>';
					return content;
				});
			svg.call(tip);

			var bbox;
			// apply labels (if specified) and offset margins accordingly
			if (options.xLabel) {
				var xAxisLabel = svg.append("g")
					.attr("transform", "translate(" + w / 2 + "," + (h - 5) + ")");

				xAxisLabel.append("text")
					.attr("class", "axislabel")
					.style("text-anchor", "middle")
					.text(options.xLabel);

				if (xAxisLabel.node()) {
					bbox = xAxisLabel.node().getBBox();
					options.margin.bottom += bbox.height + 5;
				}
			}

			if (options.yLabel) {
				var yAxisLabel = svg.append("g")
					.attr("transform", "translate(0," + (((h - options.margin.bottom - options.margin.top) / 2) + options.margin.top) + ")");
				yAxisLabel.append("text")
					.attr("class", "axislabel")
					.attr("transform", "rotate(-90)")
					.attr("y", 0)
					.attr("x", 0)
					.attr("dy", "1em")
					.style("text-anchor", "middle")
					.text(options.yLabel);

				if (yAxisLabel.node()) {
					bbox = yAxisLabel.node().getBBox();
					options.margin.left += bbox.width + 5;
				}
			}

			options.margin.left += options.tickPadding;
			options.margin.bottom += options.tickPadding;

			var width = w - options.margin.left - options.margin.right;
			var height = h - options.margin.top - options.margin.bottom;

			var x = d3.scale.ordinal()
				.rangeRoundBands([0, width], (1.0 / data.length))
				.domain(data.map(function (d) {
					return d.Category;
				}));

			var y = d3.scale.linear()
				.range([height, 0])
				.domain([options.yMin || 0, options.yMax || d3.max(data, function (d) {
					return d.max;
				})]);

			var boxWidth = 10;
			var boxOffset = (x.rangeBand() / 2) - (boxWidth / 2);
			var whiskerWidth = boxWidth / 2;
			var whiskerOffset = (x.rangeBand() / 2) - (whiskerWidth / 2);

			var chart = svg.append("g")
				.attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

			// draw main box and whisker plots
			var boxplots = chart.selectAll(".boxplot")
				.data(data)
				.enter().append("g")
				.attr("class", "boxplot")
				.attr("transform", function (d) {
					return "translate(" + x(d.Category) + ",0)";
				});

			// for each g element (containing the boxplot render surface), draw the whiskers, bars and rects
			boxplots.each(function (d, i) {
				var boxplot = d3.select(this);
				if (d.LIF !== d.q1) // draw whisker
				{
					boxplot.append("line")
						.attr("class", "bar")
						.attr("x1", whiskerOffset)
						.attr("y1", y(d.LIF))
						.attr("x2", whiskerOffset + whiskerWidth)
						.attr("y2", y(d.LIF));
					boxplot.append("line")
						.attr("class", "whisker")
						.attr("x1", x.rangeBand() / 2)
						.attr("y1", y(d.LIF))
						.attr("x2", x.rangeBand() / 2)
						.attr("y2", y(d.q1));
				}

				boxplot.append("rect")
					.attr("class", "box")
					.attr("x", boxOffset)
					.attr("y", y(d.q3))
					.attr("width", boxWidth)
					.attr("height", Math.max(1, y(d.q1) - y(d.q3)))
					.on('mouseover', tip.show)
					.on('mouseout', tip.hide);

				boxplot.append("line")
					.attr("class", "median")
					.attr("x1", boxOffset)
					.attr("y1", y(d.median))
					.attr("x2", boxOffset + boxWidth)
					.attr("y2", y(d.median));

				if (d.UIF !== d.q3) // draw whisker
				{
					boxplot.append("line")
						.attr("class", "bar")
						.attr("x1", whiskerOffset)
						.attr("y1", y(d.UIF))
						.attr("x2", x.rangeBand() - whiskerOffset)
						.attr("y2", y(d.UIF));
					boxplot.append("line")
						.attr("class", "whisker")
						.attr("x1", x.rangeBand() / 2)
						.attr("y1", y(d.UIF))
						.attr("x2", x.rangeBand() / 2)
						.attr("y2", y(d.q3));
				}
				// to do: add max/min indicators


			});

			// draw x and y axis
			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left")
				.tickFormat(options.yFormat)
				.ticks(5);

			chart.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			chart.selectAll(".tick text")
				.call(module.util.wrap, x.rangeBand() || x.range());

			chart.append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(0," + 0 + ")")
				.call(yAxis);

		};
	};
	
	return boxplot;
	
});
