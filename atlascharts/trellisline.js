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

define(["d3"], function(d3) {
	"use strict";

	function trellisline() {
		var self = this;

		self.render = function (dataByTrellis, target, w, h, opts) {
			var defaults = {
				margin: {
					top: 10,
					right: 10,
					bottom: 10,
					left: 10

				},
				trellisSet: d3.keys(dataByTrellis),
				xFormat: d3.format('d'),
				yFormat: d3.format('d'),
				interpolate: "linear",
				colors: d3.scale.category10()
			};

			var options = Object.assign(defaults, opts);

			var bisect = d3.bisector(function (d) {
				return d.date;
			}).left;
			var minDate = d3.min(dataByTrellis, function (trellis) {
					return d3.min(trellis.values, function (series) {
						return d3.min(series.values, function (d) {
							return d.date;
						});
					});
				}),
				maxDate = d3.max(dataByTrellis, function (trellis) {
					return d3.max(trellis.values, function (series) {
						return d3.max(series.values, function (d) {
							return d.date;
						});
					});
				});

			var minY = d3.min(dataByTrellis, function (trellis) {
					return d3.min(trellis.values, function (series) {
						return d3.min(series.values, function (d) {
							return (d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP) ? d.Y_PREVALENCE_1000PP : d.yPrevalence1000Pp;
						});
					});
				}),
				maxY = d3.max(dataByTrellis, function (trellis) {
					return d3.max(trellis.values, function (series) {
						return d3.max(series.values, function (d) {
							return (d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP) ? d.Y_PREVALENCE_1000PP : d.yPrevalence1000Pp;
						});
					});
				});

			var margin = options.margin;

			var chart = d3.select(target)
				.append("svg:svg")
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet')
				.append("g")
				.attr("transform", function (d) {
					return "translate(" + margin.left + "," + margin.top + ")";
				});

			var seriesLabel;
			var seriesLabelHeight = 0;
			if (options.seriesLabel) {
				seriesLabel = chart.append("g");
				seriesLabel.append("text")
					.attr("class", "axislabel")
					.style("text-anchor", "middle")
					.attr("dy", ".79em")
					.text(options.seriesLabel);
				seriesLabelHeight = seriesLabel.node().getBBox().height + 10;
			}

			var trellisLabel;
			var trellisLabelHeight = 0;
			if (options.trellisLabel) {
				trellisLabel = chart.append("g");
				trellisLabel.append("text")
					.attr("class", "axislabel")
					.style("text-anchor", "middle")
					.attr("dy", ".79em")
					.text(options.trellisLabel);
				trellisLabelHeight = trellisLabel.node().getBBox().height + 10;
			}

			// simulate a single trellis heading
			var trellisHeading;
			var trellisHeadingHeight = 0;
			trellisHeading = chart.append("g")
				.attr("class", "g-label-trellis");
			trellisHeading.append("text")
				.text(options.trellisSet.join(""));
			trellisHeadingHeight = trellisHeading.node().getBBox().height + 10;
			trellisHeading.remove();

			var yAxisLabel;
			var yAxisLabelWidth = 0;
			if (options.yLabel) {
				yAxisLabel = chart.append("g");
				yAxisLabel.append("text")
					.attr("class", "axislabel")
					.style("text-anchor", "middle")
					.text(options.yLabel);
				yAxisLabelWidth = yAxisLabel.node().getBBox().height + 4;
			}

			// calculate an intial width and height that does not take into account the tick text dimensions
			var width = w - options.margin.left - yAxisLabelWidth - options.margin.right;
			var height = h - options.margin.top - trellisLabelHeight - trellisHeadingHeight - seriesLabelHeight - options.margin.bottom;

			var trellisScale = d3.scale.ordinal()
				.domain(options.trellisSet)
				.rangeBands([0, width], .25, .2);

			var seriesScale = d3.time.scale()
				.domain([minDate, maxDate])
				.range([0, trellisScale.rangeBand()]);

			var yScale = d3.scale.linear()
				.domain([minY, maxY])
				.range([height, 0]);

			var yAxis = d3.svg.axis()
				.scale(yScale)
				.tickFormat(options.yFormat)
				.ticks(4)
				.orient("left");

			// create temporary x axis
			var xAxis = d3.svg.axis()
				.scale(seriesScale)
				.orient("bottom");

			var tempXAxis = chart.append("g").attr("class", "axis");
			tempXAxis.call(xAxis);

			// update width & height based on temp xaxis dimension and remove
			var xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
			var xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
			height = height - xAxisHeight;
			width = width - Math.max(0, (xAxisWidth - width)); // trim width if xAxisWidth bleeds over the allocated width.
			tempXAxis.remove();

			// create temporary y axis
			var tempYAxis = chart.append("g").attr("class", "axis");
			tempYAxis.call(yAxis);

			// update width based on temp yaxis dimension and remove
			var yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
			width = width - yAxisWidth;
			tempYAxis.remove();

			// reset axis ranges
			trellisScale.rangeBands([0, width], .25, .2);
			seriesScale.range([0, trellisScale.rangeBand()]);
			yScale.range([height, 0]);


			if (options.trellisLabel) {
				trellisLabel.attr("transform", "translate(" + ((width / 2) + margin.left) + ",0)");
			}

			if (options.seriesLabel) {
				seriesLabel.attr("transform", "translate(" + ((width / 2) + margin.left) + "," + (trellisLabelHeight + height + xAxisHeight + seriesLabelHeight + 10) + ")");
			}

			if (options.yLabel) {
				yAxisLabel.attr("transform", "translate(" + margin.left + "," + ((height / 2) + trellisLabelHeight + trellisHeadingHeight) + ")");
				yAxisLabel.select("text")
					.attr("transform", "rotate(-90)");
			}

			function mouseover() {
				gTrellis.selectAll(".g-end").style("display", "none");
				gTrellis.selectAll(".g-value").style("display", null);
				mousemove.call(this);
			}

			function mousemove() {
				var date = seriesScale.invert(d3.mouse(event.currentTarget)[0]);
				gTrellis.selectAll(".g-label-value.g-start").call(valueLabel, date);
				gTrellis.selectAll(".g-label-year.g-start").call(yearLabel, date);
				gTrellis.selectAll(".g-value").attr("transform", function (d) {
					var s = d.values;
					if (s) {
						var v = s[bisect(s, date, 0, s.length - 1)];
						var yValue = (v.Y_PREVALENCE_1000PP === 0 || v.Y_PREVALENCE_1000PP) ? v.Y_PREVALENCE_1000PP : v.yPrevalence1000Pp;
						if (v && v.date) {
							return "translate(" + seriesScale(v.date) + "," + yScale(yValue) + ")";
						} else {
							return "translate(0,0);";
						}
					}
				});
			}

			function mouseout() {
				gTrellis.selectAll(".g-end").style("display", null);
				gTrellis.selectAll(".g-label-value.g-start").call(valueLabel, minDate);
				gTrellis.selectAll(".g-label-year.g-start").call(yearLabel, minDate);
				gTrellis.selectAll(".g-label-year.g-end").call(yearLabel, maxDate);
				gTrellis.selectAll(".g-value").style("display", "none");
			}

			var seriesLine = d3.svg.line()
				.x(function (d) {
					return seriesScale(d.date);
				})
				.y(function (d) {
					return yScale((d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP) ? d.Y_PREVALENCE_1000PP : d.yPrevalence1000Pp);
				})
				.interpolate(options.interpolate);

			var vis = chart.append("g")
				.attr("transform", function (d) {
					return "translate(" + (yAxisLabelWidth + yAxisWidth) + "," + trellisLabelHeight + ")";
				});

			var gTrellis = vis.selectAll(".g-trellis")
				.data(trellisScale.domain())
				.enter()
				.append("g")
				.attr("class", "g-trellis")
				.attr("transform", function (d) {
					return "translate(" + trellisScale(d) + "," + trellisHeadingHeight + ")";
				});

			var seriesGuideXAxis = d3.svg.axis()
				.scale(seriesScale)
				.tickFormat("")
				.tickSize(-height)
				.orient("bottom");

			var seriesGuideYAxis = d3.svg.axis()
				.scale(yScale)
				.tickFormat("")
				.tickSize(-trellisScale.rangeBand())
				.ticks(8)
				.orient("left");

			gTrellis.append("g")
				.attr("class", "x-guide")
				.attr("transform", "translate(0," + height + ")")
				.call(seriesGuideXAxis);

			gTrellis.append("g")
				.attr("class", "y-guide")
				.call(seriesGuideYAxis);

			var gSeries = gTrellis.selectAll(".g-series")
				.data(function (trellis) {
					var seriesData = dataByTrellis.filter(function (e) {
						return e.key === trellis;
					});
					if (seriesData.length > 0)
						return seriesData[0].values;
					else
						return [];
				})
				.enter()
				.append("g")
				.attr("class", "g-series lineplot");

			gSeries.append("path")
				.attr("class", "line")
				.attr("d", function (d) {
					return seriesLine(d.values.sort(function (a, b) {
						return d3.ascending(a.date, b.date);
					}));
				})
				.style("stroke", function (d) {
					return options.colors(d.key);
				});

			gSeries.append("circle")
				.attr("class", "g-value")
				.attr("transform", function (d) {
					if (v && v[v.length - 1] && v[v.length - 1].date && v[v.length - 1] && (v[v.length - 1].Y_PREVALENCE_1000PP || v[v.length - 1].yPrevalence1000Pp)) {
						var v = d.values;
						var yValue = (v[v.length - 1].Y_PREVALENCE_1000PP === 0 || v[v.length - 1].Y_PREVALENCE_1000PP) ? v[v.length - 1].Y_PREVALENCE_1000PP : v[v.length - 1].yPrevalence1000Pp;
						return "translate(" + seriesScale(v[v.length - 1].date) + "," + yScale(yValue) + ")";
					}
					return "translate(0,0)";
				})
				.attr("r", 2.5)
				.style("display", "none");

			gSeries.append("text")
				.attr("class", "g-label-value g-start")
				.call(valueLabel, minDate);

			gSeries.append("text")
				.attr("class", "g-label-value g-end")
				.call(valueLabel, maxDate);

			gTrellis.append("text")
				.attr("class", "g-label-year g-start")
				.attr("dy", ".71em")
				.call(yearLabel, minDate);

			gTrellis.append("text")
				.attr("class", "g-label-year g-end")
				.attr("dy", ".71em")
				.call(yearLabel, maxDate);

			gTrellis.append("g")
				.attr("class", "x axis")
				.append("line")
				.attr("x2", trellisScale.rangeBand())
				.attr("y1", yScale(minY))
				.attr("y2", yScale(minY));

			gTrellis.append("g")
				.attr("class", "g-label-trellis")
				.attr("transform", function (d) {
					return "translate(" + (trellisScale.rangeBand() / 2) + ",0)";
				})
				.append("text")
				.attr("dy", "-1em")
				.style("text-anchor", "middle")
				.text(function (d) {
					return d;
				});

			gTrellis.append("rect")
				.attr("class", "g-overlay")
				.attr("x", -4)
				.attr("width", trellisScale.rangeBand() + 8)
				.attr("height", height + 18)
				.on("mouseover", mouseover)
				.on("mousemove", mousemove)
				.on("mouseout", mouseout);

			d3.select(gTrellis[0][0]).append("g")
				.attr("class", "y axis")
				.attr("transform", "translate(-4,0)")
				.call(yAxis);

			chart.call(renderLegend);

			function valueLabel(text, date) {
				var offsetScale = d3.scale.linear().domain(seriesScale.range());

				text.each(function (d) {

					var text = d3.select(this),
						s = d.values,
						i = bisect(s, date, 0, s.length - 1),
						j = Math.round(i / (s.length - 1) * (s.length - 12)),
						v = s[i];
					if (v && v.date) {
						var x = seriesScale(v.date);

						text.attr("dy", null).attr("y", -4);
						var yValue = (v.Y_PREVALENCE_1000PP === 0 || v.Y_PREVALENCE_1000PP) ? v.Y_PREVALENCE_1000PP : v.yPrevalence1000Pp;
						text.text(options.yFormat(yValue))
							.attr("transform", "translate(" + offsetScale.range([0, trellisScale.rangeBand() - this.getComputedTextLength()])(x) + "," + (yScale(d3.max(s.slice(j, j + 12), function (d) {
								return yValue;
							}))) + ")");
					}
				});
			}

			function yearLabel(text, date) {
				var offsetScale = d3.scale.linear().domain(seriesScale.range());
				// derive the x vale by using the first trellis/series set of values.
				// All series are assumed to contain the same domain of X values.
				var s = dataByTrellis[0].values[0].values,
					v = s[bisect(s, date, 0, s.length - 1)];
				if (v && v.date) {
					var x = seriesScale(v.date);

					text.each(function (d) {
						d3.select(this)
							.text(v.date.getFullYear())
							.attr("transform", "translate(" + offsetScale.range([0, trellisScale.rangeBand() - this.getComputedTextLength()])(x) + "," + (height + 6) + ")")
							.style("display", null);
					});
				}
			}

			function renderLegend(g) {
				var offset = 0;
				options.colors.domain().forEach(function (d) {
					var legendItem = g.append("g").attr("class", "trellisLegend");

					var legendText = legendItem.append("text")
						.text(d);

					var textBBox = legendItem.node().getBBox();

					legendText
						.attr("x", 12)
						.attr("y", textBBox.height);

					legendItem.append("line")
						.attr("x1", 0)
						.attr("y1", 10)
						.attr("x2", 10)
						.attr("y2", 10)
						.style("stroke", options.colors(d));

					legendItem.attr("transform", "translate(" + offset + ",0)");
					offset += legendItem.node().getBBox().width + 5;
				});
			}
		};
	};
	
	return trellisline;
	
});
