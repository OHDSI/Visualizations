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

Authors: Christopher Knoll

*/

define(["jquery", "d3", "d3_tip", "./util"], function($, d3, d3_tip, util) {
	"use strict";

	function histogram() {
		var self = this;
		self.xScale = null; // shared xScale for histogram and boxplot

		self.drawBoxplot = function (g, data, width, height) {
			var boxplot = g,
				x = self.xScale,
				whiskerHeight = height / 2;

			if (data.LIF !== data.q1) // draw whisker
			{
				boxplot.append("line")
					.attr("class", "bar")
					.attr("x1", x(data.LIF))
					.attr("y1", (height / 2) - (whiskerHeight / 2))
					.attr("x2", x(data.LIF))
					.attr("y2", (height / 2) + (whiskerHeight / 2));

				boxplot.append("line")
					.attr("class", "whisker")
					.attr("x1", x(data.LIF))
					.attr("y1", height / 2)
					.attr("x2", x(data.q1))
					.attr("y2", height / 2);
			}

			boxplot.append("rect")
				.attr("class", "box")
				.attr("x", x(data.q1))
				.attr("width", x(data.q3) - x(data.q1))
				.attr("height", height);

			boxplot.append("line")
				.attr("class", "median")
				.attr("x1", x(data.median))
				.attr("y1", 0)
				.attr("x2", x(data.median))
				.attr("y2", height);

			if (data.UIF !== data.q3) // draw whisker
			{
				boxplot.append("line")
					.attr("class", "bar")
					.attr("x1", x(data.UIF))
					.attr("y1", (height / 2) - (whiskerHeight / 2))
					.attr("x2", x(data.UIF))
					.attr("y2", (height / 2) + (whiskerHeight / 2));

				boxplot.append("line")
					.attr("class", "whisker")
					.attr("x1", x(data.q3))
					.attr("y1", height / 2)
					.attr("x2", x(data.UIF))
					.attr("y2", height / 2);
			}
		};

		self.render = function (data, target, w, h, options) {

			data = data || []; // default to empty set if null is passed in
			var defaults = {
				margin: {
					top: 5,
					right: 5,
					bottom: 5,
					left: 5
				},
				ticks: 10,
				xFormat: d3.format(',.0f'),
				yFormat: d3.format('s'),
				yScale: d3.scale.linear(),
				boxplotHeight: 10
			};

			options = $.extend({}, defaults, options);

			// alocate the SVG container, only creating it if it doesn't exist using the selector
			var chart;
			var isNew = false; // this is a flag to determine if chart has already been ploted on this target.
			if (!$(target + " svg")[0]) {
				chart = d3.select(target).append("svg")
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet');
				isNew = true;
			} else {
				chart = d3.select(target + " svg");
			}

			var tip = d3_tip()
				.attr('class', 'd3-tip')
				.offset([-10, 0])
				.html(function (d) {
					return util.formatInteger(d.y);
				});
			chart.call(tip);

			var xAxisLabelHeight = 0;
			var yAxisLabelWidth = 0;
			var bboxNode, bbox;

			// apply labels (if specified) and offset margins accordingly
			if (options.xLabel) {
				var xAxisLabel = chart.append("g")
					.attr("transform", "translate(" + w / 2 + "," + (h - options.margin.bottom) + ")");

				xAxisLabel.append("text")
					.attr("class", "axislabel")
					.style("text-anchor", "middle")
					.text(options.xLabel);

				bboxNode = xAxisLabel.node();
				if (bboxNode) {
					bbox = bboxNode.getBBox();
					if (bbox) {
						xAxisLabelHeight = bbox.height;
					}
				}
			}

			if (options.yLabel) {
				var yAxisLabel = chart.append("g")
					.attr("transform", "translate(" + options.margin.left + "," + (((h - options.margin.bottom - options.margin.top) / 2) + options.margin.top) + ")");
				yAxisLabel.append("text")
					.attr("class", "axislabel")
					.attr("transform", "rotate(-90)")
					.attr("y", 0)
					.attr("x", 0)
					.attr("dy", "1em")
					.style("text-anchor", "middle")
					.text(options.yLabel);

				bboxNode = yAxisLabel.node();
				if (bboxNode) {
					bbox = bboxNode.getBBox();
					if (bbox) {
						yAxisLabelWidth = 1.5 * bbox.width; // width is calculated as 1.5 * box height due to rotation anomolies that cause the y axis label to appear shifted.
					}
				}
			}

			// calculate an intial width and height that does not take into account the tick text dimensions
			var width = w - options.margin.left - options.margin.right - yAxisLabelWidth;
			var height = h - options.margin.top - options.margin.bottom - xAxisLabelHeight;

			// define the intial scale (range will be updated after we determine the final dimensions)
			var x = self.xScale = d3.scale.linear()
				.domain(options.xDomain || [d3.min(data, function (d) {
					return d.x;
				}), d3.max(data, function (d) {
					return d.x + d.dx;
				})])
				.range([0, width]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.orient("bottom")
				.ticks(options.ticks)
				.tickFormat(options.xFormat);

			var y = options.yScale
				.domain([0, options.yMax || d3.max(data, function (d) {
					return d.y;
				})])
				.range([height, 0]);

			var yAxis = d3.svg.axis()
				.scale(y)
				.orient("left")
				.ticks(4)
				.tickFormat(options.yFormat);

			// create temporary x axis
			var tempXAxis = chart.append("g").attr("class", "axis");
			tempXAxis.call(xAxis);

			var yAxisWidth, xAxisHeight, xAxisWidth;

			if (tempXAxis.node() && tempXAxis.node().getBBox()) {
				// update width & height based on temp xaxis dimension and remove
				xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
				xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
				height = height - xAxisHeight;
				width = width - Math.max(0, (xAxisWidth - width)); // trim width if xAxisWidth bleeds over the allocated width.
				tempXAxis.remove();

			}
			// create temporary y axis
			var tempYAxis = chart.append("g").attr("class", "axis");
			tempYAxis.call(yAxis);

			if (tempYAxis.node() && tempYAxis.node().getBBox()) {
				// update height based on temp xaxis dimension and remove
				yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
				width = width - yAxisWidth;
				tempYAxis.remove();
			}

			// reset x range
			x.range([0, width]);

			// draw boxplot
			if (options.boxplot) {
				height -= 12; // boxplot takes up 12 vertical space
				var boxplotG = chart.append("g")
					.attr("class", "boxplot")
					.attr("transform", "translate(" + (options.margin.left + yAxisLabelWidth + yAxisWidth) + "," + (options.margin.top + height + xAxisHeight) + ")");
				self.drawBoxplot(boxplotG, options.boxplot, width, 8);
			}

			// reset y axis range
			y.range([height, 0]);

			var hist = chart.append("g")
				.attr("transform", "translate(" + (options.margin.left + yAxisLabelWidth + yAxisWidth) + "," + options.margin.top + ")");

			var bar = hist.selectAll(".bar")
				.data(data)
				.enter().append("g")
				.attr("class", "bar")
				.attr("transform", function (d) {
					return "translate(" + x(d.x) + "," + y(d.y) + ")";
				})
				.on('mouseover', tip.show)
				.on('mouseout', tip.hide);

			bar.append("rect")
				.attr("x", 1)
				.attr("width", function (d) {
					return Math.max((x(d.x + d.dx) - x(d.x) - 1), 0.5);
				})
				.attr("height", function (d) {
					return height - y(d.y);
				});

			if (isNew) {
				hist.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);

				hist.append("g")
					.attr("class", "y axis")
					.attr("transform", "translate(0," + 0 + ")")
					.call(yAxis);
			}
		};
	};
	
	return histogram;
	
});
