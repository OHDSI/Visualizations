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

define(["d3", "d3-tip", "d3-scale", "chart"],
	function(d3, d3tip, d3scale, Chart) {
	"use strict";

	class Boxplot extends Chart {
	  render(data, target, w, h, chartOptions) {
	    // options
	    const options = this.getOptions(chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

	    const valueFormatter = this.formatters.formatSI(3);

	    const tip = d3tip()
	      .attr('class', 'd3-tip')
	      .offset([-10, 0])
	      .html(d =>
	        `<table class='boxplotValues'>
	          <tr>
	            <td>Max:</td>
	            <td>${valueFormatter(d.max)}</td>
	          </tr>
	          <tr>
	            <td>P90:</td>
	            <td>${valueFormatter(d.UIF)}</td>
	          </tr>
	          <tr>
	            <td>P75:</td>
	            <td>${valueFormatter(d.q3)}</td>
	          </tr>
	          <tr>
	            <td>Median:</td>
	            <td>${valueFormatter(d.median)}</td>
	          </tr>
	          <tr>
	            <td>P25:</td>
	            <td>${valueFormatter(d.q1)}</td>
	          </tr>
	          <tr>
	            <td>P10:</td>
	            <td>${valueFormatter(d.LIF)}</td>
	          </tr>
	          <tr>
	            <td>Min:</td>
	            <td>${valueFormatter(d.min)}</td>
	          </tr>
	        </table>`
	      )
	    svg.call(tip);

	    // apply labels (if specified) and offset margins accordingly
	    let xAxisLabelHeight = 0;
	    let yAxisLabelWidth = 0;
	    if (options.xLabel) {
	      const xAxisLabel = svg.append('g')
	        .attr('transform', `translate(${w / 2}, ${h - options.margins.bottom})`)

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
	          )`
	        );
	      yAxisLabel.append('text')
	        .attr('class', 'axislabel')
	        .attr('transform', 'rotate(-90)')
	        .attr('y', 0)
	        .attr('x', 0)
	        .attr('dy', '1em')
	        .style('text-anchor', 'middle')
	        .text(options.yLabel);

	      const bbox = yAxisLabel.node().getBBox();
	      yAxisLabelWidth = bbox.width;
	    }

	    let width = w - options.margins.left - yAxisLabelWidth - options.margins.right;
	    let height = h - options.margins.top - xAxisLabelHeight - options.margins.bottom;

	    // define the intial scale (range will be updated after we determine the final dimensions)
	    const x = d3scale.scaleBand()
	      .range([0, width])
	      .round(1.0 / data.length)
	      .domain(data.map(d => d.Category));
	    const y = d3scale.scaleLinear()
	      .range([height, 0])
	      .domain([options.yMin || 0, options.yMax || d3.max(data, d => d.max)]);

	    const xAxis = d3.axisBottom()
	      .scale(x);
	    const yAxis = d3.axisLeft()
	      .scale(y)
	      .tickFormat(options.yFormat)
	      .ticks(5);

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

	    // reset axis ranges
	    x.range([0, width]);
	    y.range([height, 0]);

	    const boxWidth = 10;
	    let boxOffset = (x.bandwidth() / 2) - (boxWidth / 2);
	    let whiskerWidth = boxWidth / 2;
	    let whiskerOffset = (x.bandwidth() / 2) - (whiskerWidth / 2);

	    const chart = svg.append('g')
	      .attr('transform', `translate(
	          ${options.margins.left + yAxisLabelWidth + yAxisWidth},
	          ${options.margins.top}
	        )`);

	    // draw main box and whisker plots
	    const boxplots = chart.selectAll('.boxplot')
	      .data(data)
	      .enter().append('g')
	      .attr('class', 'boxplot')
	      .attr('transform', d => `translate(${x(d.Category)}, 0)`);

	    // for each g element (containing the boxplot render surface), draw the whiskers, bars and rects
	    boxplots.each(function (d, i) {
	      const boxplot = d3.select(this);
	      if (d.LIF != d.q1) { // draw whisker
	        boxplot.append('line')
	          .attr('class', 'bar')
	          .attr('x1', whiskerOffset)
	          .attr('y1', y(d.LIF))
	          .attr('x2', whiskerOffset + whiskerWidth)
	          .attr('y2', y(d.LIF));
	        boxplot.append('line')
	          .attr('class', 'whisker')
	          .attr('x1', x.bandwidth() / 2)
	          .attr('y1', y(d.LIF))
	          .attr('x2', x.bandwidth() / 2)
	          .attr('y2', y(d.q1));
	      }

	      boxplot.append('rect')
	        .attr('class', 'box')
	        .attr('x', boxOffset)
	        .attr('y', y(d.q3))
	        .attr('width', boxWidth)
	        .attr('height', Math.max(1, y(d.q1) - y(d.q3)))
	        .on('mouseover', d => tip.show(d, event.target))
	        .on('mouseout', tip.hide);

	      boxplot.append('line')
	        .attr('class', 'median')
	        .attr('x1', boxOffset)
	        .attr('y1', y(d.median))
	        .attr('x2', boxOffset + boxWidth)
	        .attr('y2', y(d.median));

	      if (d.UIF != d.q3) { // draw whisker
	        boxplot.append('line')
	          .attr('class', 'bar')
	          .attr('x1', whiskerOffset)
	          .attr('y1', y(d.UIF))
	          .attr('x2', x.bandwidth() - whiskerOffset)
	          .attr('y2', y(d.UIF));
	        boxplot.append('line')
	          .attr('class', 'whisker')
	          .attr('x1', x.bandwidth() / 2)
	          .attr('y1', y(d.UIF))
	          .attr('x2', x.bandwidth() / 2)
	          .attr('y2', y(d.q3));
	      }
	      // to do: add max/min indicators
	    });

	    // draw x and y axis
	    chart.append('g')
	      .attr('class', 'x axis')
	      .attr('transform', `translate(0, ${height})`)
	      .call(xAxis);

	    chart.selectAll('.tick text')
	      .call(this.wrap, x.bandwidth() || x.range());

	    chart.append('g')
	      .attr('class', 'y axis')
	      .attr('transform', `translate(0, 0)`)
	      .call(yAxis);
	  }
	}
	
	return Boxplot;
	
});
