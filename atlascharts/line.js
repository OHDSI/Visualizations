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

	function line_defaultTooltip(xLabel, xFormat, xAccessor, yLabel, yFormat, yAccessor, seriesAccessor) {
		return function (d) {
			var tipText = "";
			if (seriesAccessor(d)) {
				tipText = "Series: " + seriesAccessor(d) + "</br>";
			}
			tipText += xLabel + ": " + xFormat(xAccessor(d)) + "</br>";
			tipText += yLabel + ": " + yFormat(yAccessor(d));
			return tipText;
		};
	}
	
	function line() {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 5,
					right: 5,
					bottom: 5,
					left: 5
				},
				xFormat: util.formatSI(3),
				yFormat: util.formatSI(3),
				interpolate: "linear",
				seriesName: "SERIES_NAME",
				xValue: "xValue",
				yValue: "yValue",
				cssClass: "lineplot",
				ticks: 10,
				showSeriesLabel: false,
				colorScale: null,
				labelIndexDate: false,
				colorBasedOnIndex: false
			};
			options = $.extend({}, defaults, options);

			var tooltipBuilder = line_defaultTooltip(options.xLabel || "x", options.xFormat, function (d) {
					return d[options.xValue];
				},
				options.yLabel || "y", options.yFormat,
				function (d) {
					return d[options.yValue];
				},
				function (d) {
					return d[options.seriesName];
				});

			var offscreen = $('<div class="offscreen"></div>').appendTo('body');

			var chart = d3.select(offscreen[0])
				.append("svg:svg")
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet');

			if (data.length > 0) {

				// convert data to multi-series format if not already formatted
				if (!data[0].hasOwnProperty("values")) {
					// assumes data is just an array of values (single series)
					data = [
						{
							name: '',
							values: data
						}];
				}
				chart.data(data);

				var focusTip = d3_tip()
					.attr('class', 'd3-tip')
					.offset([-10, 0])
					.html(tooltipBuilder);
				chart.call(focusTip);

				var xAxisLabelHeight = 0;
				var yAxisLabelWidth = 0;
				var bbox;
				// apply labels (if specified) and offset margins accordingly
				if (options.xLabel) {
					var xAxisLabel = chart.append("g")
						.attr("transform", "translate(" + w / 2 + "," + (h - options.margin.bottom) + ")");

					xAxisLabel.append("text")
						.attr("class", "axislabel")
						.style("text-anchor", "middle")
						.text(options.xLabel);

					bbox = xAxisLabel.node().getBBox();
					xAxisLabelHeight += bbox.height;
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

					bbox = yAxisLabel.node().getBBox();
					yAxisLabelWidth = 1.5 * bbox.width; // width is calculated as 1.5 * box height due to rotation anomolies that cause the y axis label to appear shifted.
				}

				var legendWidth = 0;
				if (options.showLegend) {
					var legend = chart.append("g")
						.attr("class", "legend");

					var maxWidth = 0;

					data.forEach(function (d, i) {
						legend.append("rect")
							.attr("x", 0)
							.attr("y", (i * 15))
							.attr("width", 10)
							.attr("height", 10)
							.style("fill", options.colors(d.name));

						var legendItem = legend.append("text")
							.attr("x", 12)
							.attr("y", (i * 15) + 9)
							.text(d.name);
						maxWidth = Math.max(legendItem.node().getBBox().width + 12, maxWidth);
					});
					legend.attr("transform", "translate(" + (w - options.margin.right - maxWidth) + ",0)");
					legendWidth += maxWidth + 5;
				}

				// calculate an intial width and height that does not take into account the tick text dimensions
				var width = w - options.margin.left - options.margin.right - yAxisLabelWidth - legendWidth;
				var height = h - options.margin.top - options.margin.bottom - xAxisLabelHeight;

				// define the intial scale (range will be updated after we determine the final dimensions)
				var x = options.xScale || d3.scale.linear()
					.domain([d3.min(data, function (d) {
						return d3.min(d.values, function (d) {
							return d[options.xValue];
						});
					}), d3.max(data, function (d) {
						return d3.max(d.values, function (d) {
							return d[options.xValue];
						});
					})]);

				var xAxis = d3.svg.axis()
					.scale(x)
					.ticks(options.ticks)
					.orient("bottom");

				// check for custom tick formatter
				if (options.tickFormat) {
					xAxis.tickFormat(options.tickFormat);
				} else // apply standard formatter
				{
					xAxis.tickFormat(options.xFormat);
				}

				// if x scale is ordinal, then apply rangeRoundBands, else apply standard range.
				if (typeof x.rangePoints === 'function') {
					x.rangePoints([0, width]);
				} else {
					x.range([0, width]);
				}

				var y = options.yScale || d3.scale.linear()
					.domain([0, d3.max(data, function (d) {
						return d3.max(d.values, function (d) {
							return d[options.yValue];
						});
					})])
					.range([height, 0]);

				var yAxis = d3.svg.axis()
					.scale(y)
					.tickFormat(options.yFormat)
					.ticks(4)
					.orient("left");

				var tempXAxis = chart.append("g").attr("class", "axis");
				tempXAxis.call(xAxis);
				var xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
				var xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
				height = height - xAxisHeight;
				width = width - Math.max(0, (xAxisWidth - width)); // trim width if xAxisWidth bleeds over the allocated width.
				tempXAxis.remove();

				var tempYAxis = chart.append("g").attr("class", "axis");
				tempYAxis.call(yAxis);

				// update height based on temp xaxis dimension and remove
				var yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
				width = width - yAxisWidth;
				tempYAxis.remove();

				// reset axis ranges
				// if x scale is ordinal, then apply rangeRoundBands, else apply standard range.
				if (typeof x.rangePoints === 'function') {
					x.rangePoints([0, width]);
				} else {
					x.range([0, width]);
				}
				y.range([height, 0]);

				// create a line function that can convert data[] into x and y points

				var line = d3.svg.line()
					.x(function (d) {
						var xPos = x(d[options.xValue]);
						return xPos;
					})
					.y(function (d) {
						var yPos = y(d[options.yValue]);
						return yPos;
					})
					.interpolate(options.interpolate);

				var vis = chart.append("g")
					.attr("class", options.cssClass)
					.attr("transform", "translate(" + (options.margin.left + yAxisLabelWidth + yAxisWidth) + "," + options.margin.top + ")");

				var series = vis.selectAll(".series")
					.data(data)
					.enter()
					.append("g");

				var seriesLines = series.append("path")
					.attr("class", "line")
					.attr("d", function (d) {
						return line(d.values.sort(function (a, b) {
							return d3.ascending(a[options.xValue], b[options.xValue]);
						}));
					});

				if (options.colors) {
					seriesLines.style("stroke", function (d) {
						return options.colors(d.name);
					});
				}

				if (options.showSeriesLabel) {
					series.append("text")
						.datum(function (d) {
							return {
								name: d.name,
								value: d.values[d.values.length - 1]
							};
						})
						.attr("transform", function (d) {
							return "translate(" + x(d.value[options.xValue]) + "," + y(d.value[options.yValue]) + ")";
						})
						.attr("x", 3)
						.attr("dy", 2)
						.style("font-size", "8px")
						.text(function (d) {
							return d.name;
						});
				}
				var indexPoints = {
					x: 0,
					y: 0
				};
				series.selectAll(".focus")
					.data(function (series) {
						return series.values;
					})
					.enter()
					.append("circle")
					.attr("class", "focus")
					.attr("r", 4)
					.attr("transform", function (d) {
						var xVal = x(d[options.xValue]);
						var yVal = y(d[options.yValue]);
						if (d[options.xValue] === 0 && indexPoints.y === 0) {
							indexPoints.x = xVal;
							indexPoints.y = yVal;
						}
						return "translate(" + xVal + "," + yVal + ")";
					})
					.on('mouseover', function (d) {
						d3.select(this).style("opacity", "1");
						focusTip.show(d);
					})
					.on('mouseout', function (d) {
						d3.select(this).style("opacity", "0");
						focusTip.hide(d);
					});

				vis.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);

				vis.append("g")
					.attr("class", "y axis")
					.call(yAxis);


				if (options.labelIndexDate) {
					vis.append("rect")
						.attr("transform", function () {
							return "translate(" + (indexPoints.x - 0.5) + "," + indexPoints.y + ")";
						})
						.attr("width", 1)
						.attr("height", height);
				}

			} else {
				chart.append("text")
					.attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")")
					.style("text-anchor", "middle")
					.text("No Data");
			}

			$(target).append(offscreen);
			$(offscreen).removeClass('offscreen');

		};
	};
	
	return line;
	
});
