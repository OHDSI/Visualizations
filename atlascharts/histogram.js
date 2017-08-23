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

Authors: Christopher Knoll, Alexander Saltykov

*/

define(["d3", "d3-tip", "d3-scale", "numeral", "chart"],
	function(d3, d3tip, d3scale, numeral, Chart) {
	"use strict";

	class Histogram extends Chart {
	  static mapHistogram(histogramData) {
	    // result is an array of arrays, each element in the array is another array containing
	    // information about each bar of the histogram.
	    const result = [];
	    const minValue = histogramData.MIN;
	    const intervalSize = histogramData.INTERVAL_SIZE;

	    const tempData = this.normalizeDataframe(histogramData.DATA);
	    for (let i = 0; i <= histogramData.INTERVALS; i += 1) {
	      const target = {};
	      target.x = minValue + 1.0 * i * intervalSize; // eslint-disable-line no-mixed-operators
	      target.dx = intervalSize;
	      target.y = tempData.COUNT_VALUE[tempData.INTERVAL_INDEX.indexOf(i)] || 0;
	      result.push(target);
	    }

	    return result;
	  }
	  
	  drawBoxplot(g, data, width, height) {
	    const boxplot = g;
	    const x = this.xScale;
	    const whiskerHeight = height / 2;

	    if (data.LIF !== data.q1) { // draw whisker
	      boxplot.append('line')
	        .attr('class', 'bar')
	        .attr('x1', x(data.LIF))
	        .attr('y1', (height / 2) - (whiskerHeight / 2))
	        .attr('x2', x(data.LIF))
	        .attr('y2', (height / 2) + (whiskerHeight / 2));

	      boxplot.append('line')
	        .attr('class', 'whisker')
	        .attr('x1', x(data.LIF))
	        .attr('y1', height / 2)
	        .attr('x2', x(data.q1))
	        .attr('y2', height / 2);
	    }

	    boxplot.append('rect')
	      .attr('class', 'box')
	      .attr('x', x(data.q1))
	      .attr('width', x(data.q3) - x(data.q1))
	      .attr('height', height);

	    boxplot.append('line')
	      .attr('class', 'median')
	      .attr('x1', x(data.median))
	      .attr('y1', 0)
	      .attr('x2', x(data.median))
	      .attr('y2', height);

	    if (data.UIF !== data.q3) { // draw whisker
	      boxplot.append('line')
	        .attr('class', 'bar')
	        .attr('x1', x(data.UIF))
	        .attr('y1', (height / 2) - (whiskerHeight / 2))
	        .attr('x2', x(data.UIF))
	        .attr('y2', (height / 2) + (whiskerHeight / 2));

	      boxplot.append('line')
	        .attr('class', 'whisker')
	        .attr('x1', x(data.q3))
	        .attr('y1', height / 2)
	        .attr('x2', x(data.UIF))
	        .attr('y2', height / 2);
	    }
	  }

	  render(chartData, target, w, h, chartOptions) {
	    // options
	    const defaults = {
	      ticks: 10,
	      yScale: d3scale.scaleLinear(),
	      boxplotHeight: 10,
	    };
	    const options = this.getOptions(defaults, chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

	    this.xScale = {}; // shared xScale for histogram and boxplot
	    const data = chartData || []; // default to empty set if null is passed in

	    const tip = d3tip()
	      .attr('class', 'd3-tip')
	      .offset([-10, 0])
	      .html(d => numeral(d.y).format('0,0'));
	    svg.call(tip);

	    let xAxisLabelHeight = 0;
	    let yAxisLabelWidth = 0;

	    // apply labels (if specified) and offset margins accordingly
	    if (options.xLabel) {
	      const xAxisLabel = svg.append('g')
	        .attr('transform', `translate(${w / 2}, ${h - options.margins.bottom})`);

	      xAxisLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .text(options.xLabel);

	      const bbox = xAxisLabel.node().getBBox();
	      xAxisLabelHeight = bbox.height;
	    }

	    if (options.yLabel) {
	      const yAxisLabel = svg.append('g')
	        .attr(
	          'transform',
	          `translate(
	            ${options.margins.left},
	            ${((h - options.margins.bottom - options.margins.top) / 2) + options.margins.top}
	          )`);
	      yAxisLabel.append('text')
	        .attr('class', 'axislabel')
	        .attr('transform', 'rotate(-90)')
	        .attr('y', 0)
	        .attr('x', 0)
	        .attr('dy', '1em')
	        .style('text-anchor', 'middle')
	        .text(options.yLabel);

	      const bbox = yAxisLabel.node().getBBox();
	      yAxisLabelWidth = 1.5 * bbox.width; // width is calculated as
	      // 1.5 * box height due to rotation anomolies that
	      // cause the y axis label to appear shifted.
	    }

	    // calculate an intial width and height that does not take into account the tick text dimensions
	    let width = w - options.margins.left - options.margins.right - yAxisLabelWidth;
	    let height = h - options.margins.top - options.margins.bottom - xAxisLabelHeight;

	    // define the intial scale (range will be updated after we determine the final dimensions)
	    const x = this.xScale = d3scale.scaleLinear()
	      .domain(options.xDomain || [
	        d3.min(data, d => d.x),
	        d3.max(data, d => d.x + d.dx),
	      ])
	      .range([0, width]);

	    const xAxis = d3.axisBottom()
	      .scale(x)
	      .ticks(options.ticks)
	      .tickFormat(options.xFormat);

	    const y = options.yScale
	      .domain([0, options.yMax || d3.max(data, d => d.y)])
	      .range([height, 0]);

	    const yAxis = d3.axisLeft()
	      .scale(y)
	      .ticks(4)
	      .tickFormat(options.yFormat);

	    // create temporary x axis
	    const tempXAxis = svg.append('g').attr('class', 'axis');
	    tempXAxis.call(xAxis);

	    // update width & height based on temp xaxis dimension and remove
	    const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
	    const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
	    height -= xAxisHeight;
	    width -= Math.max(0, (xAxisWidth - width)); // trim width if
	    // xAxisWidth bleeds over the allocated width.
	    tempXAxis.remove();


	    // create temporary y axis
	    const tempYAxis = svg.append('g').attr('class', 'axis');
	    tempYAxis.call(yAxis);

	    // update height based on temp xaxis dimension and remove
	    const yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
	    width -= yAxisWidth;
	    tempYAxis.remove();

	    if (options.boxplot) {
	      height -= 12; // boxplot takes up 12 vertical space
	      const boxplotG = svg.append('g')
	        .attr('class', 'boxplot')
	        .attr(
	          'transform',
	          `translate(${(options.margins.left + yAxisLabelWidth + yAxisWidth)},
	          ${(options.margins.top + height + xAxisHeight)})`
	        );
	      this.drawBoxplot(boxplotG, options.boxplot, width, 8);
	    }

	    // reset axis ranges
	    x.range([0, width]);
	    y.range([height, 0]);

	    const hist = svg.append('g')
	      .attr('transform', `translate(
	        ${options.margins.left + yAxisLabelWidth + yAxisWidth},
	        ${options.margins.top})`
	      );

	    const bar = hist.selectAll('.bar')
	      .data(data)
	      .enter().append('g')
	      .attr('class', 'bar')
	      .attr('transform', d => `translate(${x(d.x)}, ${y(d.y)})`)
	      .on('mouseover', d => tip.show(d, event.target))
	      .on('mouseout', tip.hide);

	    bar.append('rect')
	      .attr('x', 1)
	      .attr('width', d => Math.max((x(d.x + d.dx) - x(d.x) - 1), 0.5))
	      .attr('height', d => height - y(d.y));

	    hist.append('g')
	      .attr('class', 'x axis')
	      .attr('transform', `translate(0, ${height})`)
	      .call(xAxis);

	    hist.append('g')
	      .attr('class', 'y axis')
	      .attr('transform', 'translate(0, 0)')
	      .call(yAxis);
	  }
	}
	
	return Histogram;
	
});
