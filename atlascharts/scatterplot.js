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

Authors: Christopher Knoll, Mark Valez, Sigfried Gold, Alexander Saltykov

*/

define(['d3', './chart'],
	function(d3, Chart) {
	'use strict';

	class Scatterplot extends Chart {
	  render(data, target, w, h, chartOptions) {
			super.render(data, target, w, h, chartOptions);
	    // options
			const defaults = {
				xFormat: this.formatters.formatSI(3),
				yFormat: this.formatters.formatSI(3),
				interpolate: d3.curveLinear,
				seriesName: 'SERIES_NAME',
				xValue: 'xValue',
				yValue: 'yValue',
				cssClass: 'lineplot',
				ticks: 10,
				yTicks: 4,
				showSeriesLabel: false,
				labelIndexDate: false,
				colorBasedOnIndex: false,
				showXAxis: true,
				tooltip: (d) => {
					return `<div>Series: ${d.seriesName}</div>
					<div>X: ${d[options.xValue]}</div>
					<div>Y: ${d[options.yValue]}</div>
					`;
				},
				circleRadius: 1,
				addDiagonal: false,
				diagonalColor: '#ccc',
			};
	    const options = this.getOptions(defaults, chartOptions);
	    if (chartOptions.colors) {
		    options.colors = d3.scaleOrdinal(Object.values(chartOptions.colors))
		    	.domain(Object.keys(chartOptions.colors));
	    } else {
		    options.colors = d3.scaleOrdinal(d3.schemeCategory20)
		    	.domain(data.map(series => series.name));
	    }

	    // container
	    const svg = this.createSvg(target, w, h);

			if (data.length > 0) {
				// convert data to multi-series format if not already formatted
				if (!data[0].hasOwnProperty('values')) {
					// assumes data is just an array of values (single series)
					data = [
						{
							name: '',
							values: data
						}];
				}
					
	      this.useTip((tip) => {
	        tip.attr('class', 'd3-tip')
	          .offset([-10, 0])
	          .html(options.tooltip);
	      });

				let xAxisLabelHeight = 0;
				let yAxisLabelWidth = 0;
				let bbox;

				// apply labels (if specified) and offset margins accordingly
				if (options.xLabel) {
					const xAxisLabel = svg.append('g')
						.attr('transform', 'translate(' + w / 2 + ',' + (h - options.margins.bottom) + ')');

					xAxisLabel.append('text')
						.attr('class', 'axislabel')
						.style('text-anchor', 'middle')
						.text(options.xLabel);

					bbox = xAxisLabel.node().getBBox();
					xAxisLabelHeight += bbox.height;
				}

				if (options.yLabel) {
					const yAxisLabel = svg.append('g')
						.attr('transform', 'translate(' + options.margins.left + ',' + (((h - options.margins.bottom - options.margins.top) / 2) + options.margins.top) + ')');
					yAxisLabel.append('text')
						.attr('class', 'axislabel')
						.attr('transform', 'rotate(-90)')
						.attr('y', 0)
						.attr('x', 0)
						.attr('dy', '1em')
						.style('text-anchor', 'middle')
						.text(options.yLabel);

					bbox = yAxisLabel.node().getBBox();
					yAxisLabelWidth = 1.5 * bbox.width; // width is calculated as 1.5 * box height due to rotation anomolies that cause the y axis label to appear shifted.
				}

				let legendWidth = 0;
				if (options.showLegend) {
					const legend = svg.append('g')
						.attr('class', 'legend');

					let maxWidth = 0;

					data.forEach(function (d, i) {
						legend.append('rect')
							.attr('x', 0)
							.attr('y', (i * 15))
							.attr('width', 10)
							.attr('height', 10)
							.style('fill', options.colors(d.name));

						const legendItem = legend.append('text')
							.attr('x', 12)
							.attr('y', (i * 15) + 9)
							.text(d.name);
						maxWidth = Math.max(legendItem.node().getBBox().width + 12, maxWidth);
					});
					legend.attr('transform', 'translate(' + (w - options.margins.right - maxWidth) + ',0)');
					legendWidth += maxWidth + 5;
				}

				// calculate an intial width and height that does not take into account the tick text dimensions
				let width = w - options.margins.left - options.margins.right - yAxisLabelWidth - legendWidth;
				let height = h - options.margins.top - options.margins.bottom - xAxisLabelHeight;

				// define the intial scale (range will be updated after we determine the final dimensions)
				const x = options.xScale || d3.scaleLinear()
					.domain([d3.min(data, function (d) {
						return d3.min(d.values, function (d) {
							return d[options.xValue];
						});
					}), d3.max(data, function (d) {
						return d3.max(d.values, function (d) {
							return d[options.xValue];
						});
					})]);

				const xAxis = d3.axisBottom()
					.scale(x)
					.ticks(options.ticks);

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

				const y = options.yScale || d3.scaleLinear()
					.domain([0, d3.max(data, function (d) {
						return d3.max(d.values, function (d) {
							return d[options.yValue];
						});
					})])
					.range([height, 0]);

				const yAxis = d3.axisLeft()
					.scale(y)
					.tickFormat(options.yFormat)
					.ticks(options.yTicks);

				// create temporary x axis
				const tempXAxis = svg.append('g').attr('class', 'axis');
				tempXAxis.call(xAxis);
				const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
				const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
				height = height - xAxisHeight;
				width = width - Math.max(0, (xAxisWidth - width)); // trim width if xAxisWidth bleeds over the allocated width.
				tempXAxis.remove();

				// create temporary y axis
				const tempYAxis = svg.append('g').attr('class', 'axis');
				tempYAxis.call(yAxis);

				// update height based on temp xaxis dimension and remove
				const yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
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

				const vis = svg.append('g')
					.attr('class', options.cssClass)
					.attr('transform', 'translate(' + (options.margins.left + yAxisLabelWidth + yAxisWidth) + ',' + options.margins.top + ')');

				const series = vis.selectAll('.series')
					.data(data)
					.enter()
					.append('g');

				const seriesDots = series
					.selectAll('.dot')
					.data(function (series) {
						return series.values.map(value => Object.assign({}, value, { seriesName: series.name }));
					})
					.enter()
					.append('circle')
					.attr('class', 'dot')
					.attr('r', options.circleRadius)
					.style('fill', function (d, i) {
						return options.colors(d.seriesName);
					})
					.attr('transform', function (d) {
						const xVal = x(d[options.xValue]);
						const yVal = y(d[options.yValue]);
						return 'translate(' + xVal + ',' + yVal + ')';
					});
				
				if (options.addDiagonal) {
					series.append("line")
						.attr("x1", 0)
						.attr("y1", height)
						.attr("x2", width)
						.attr("y2", 0)
						.attr("stroke-width", 1)
						.attr("stroke", options.diagonalColor)
						.attr("stroke-dasharray", "5,5");
				}

				if (options.showSeriesLabel) {
					series.append('text')
						.datum(function (d) {
							return {
								name: d.name,
								value: d.values[d.values.length - 1]
							};
						})
						.attr('transform', function (d) {
							return 'translate(' + x(d.value[options.xValue]) + ',' + y(d.value[options.yValue]) + ')';
						})
						.attr('x', 3)
						.attr('dy', 2)
						.style('font-size', '8px')
						.text(function (d) {
							return d.name;
						});
				}

				const indexPoints = {
					x: 0,
					y: 0
				};
				const currentObject = this;
				series.selectAll('.focus')
					.data(function (series) {
						return series.values.map(value => Object.assign({}, value, { seriesName: series.name }));
					})
					.enter()
					.append('circle')
					.attr('class', 'focus')
					.attr('r', options.circleRadius)
					.attr('transform', function (d) {
						const xVal = x(d[options.xValue]);
						const yVal = y(d[options.yValue]);
						if (d[options.xValue] === 0 && indexPoints.y === 0) {
							indexPoints.x = xVal;
							indexPoints.y = yVal;
						}
						return 'translate(' + xVal + ',' + yVal + ')';
					})
					.on('mouseover', function (d) {
						d3.select(this).style('opacity', '1');
						currentObject.tip.show(d, event.target);
					})
					.on('mouseout', function (d) {
						d3.select(this).style('opacity', '0');
						currentObject.tip.hide(d, event.target);
					});

				if (options.showXAxis) {
					vis.append('g')
						.attr('class', 'x axis')
						.attr('transform', 'translate(0,' + height + ')')
						.call(xAxis);
				}

				vis.append('g')
					.attr('class', 'y axis')
					.call(yAxis);

				if (options.labelIndexDate) {
					vis.append('rect')
						.attr('transform', function () {
							return 'translate(' + (indexPoints.x - 0.5) + ',' + indexPoints.y + ')';
						})
						.attr('width', 1)
						.attr('height', height);
				}
			} else {
				svg.append('text')
					.attr('transform', 'translate(' + (w / 2) + ',' + (h / 2) + ')')
					.style('text-anchor', 'middle')
					.text('No Data');
			}
		};	
	}
	
	return Scatterplot;
	
});
