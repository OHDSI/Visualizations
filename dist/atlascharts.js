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

Author: Alexander Saltykov

*/

define('atlascharts/chart',["d3", "d3-selection", "d3-scale"],
	function(d3, d3selection, d3scale) {
	"use strict";
	
	class Chart {
	  static get chartTypes() {
	    return {
	      AREA: 'AREA',
	      BOXPLOT: 'BOXPLOT',
	      DONUT: 'DONUT',
	      HISTOGRAM: 'HISTOGRAM',
	      LINE: 'LINE',
	      TRELLISLINE: 'TRELLISLINE',
	    };
	  }

	  getOptions(chartSpecificDefaults, customOptions) {
	    const options = Object.assign({}, {
		      margins: {
		        top: 10,
		        right: 10,
		        bottom: 10,
		        left: 10,
		      },
		      xFormat: d3.format(',.0f'),
		      yFormat: d3.format('s'),
		      colors: d3scale.scaleOrdinal(d3scale.schemeCategory20.concat(d3scale.schemeCategory20c)),
		    },
		    // clone objects
			  Object.assign({}, chartSpecificDefaults),
			  Object.assign({}, customOptions)
		  );
		  return options;
	  }

	  createSvg(target, width, height) {
	    const container = d3selection.select(target);
	    container.select('svg').remove();
	    const chart = container.append('svg')
	      .attr('preserveAspectRatio', 'xMinYMin meet')
	      .attr('viewBox', `
	        0
	        0
	        ${width}
	        ${height}`)
	      .append('g')
	      .attr('class', 'chart');

	    return chart;
	  }

	  static normalizeDataframe(dataframe) {
	    // rjson serializes dataframes with 1 row as single element properties.
	    // This function ensures fields are always arrays.
	    const keys = d3.keys(dataframe);
	    const frame = Object.assign({}, dataframe);
	    keys.forEach((key) => {
	      if (!(dataframe[key] instanceof Array)) {
	        frame[key] = [dataframe[key]];
	      }
	    });
	    return frame;
	  }

	  static dataframeToArray(dataframe) {
	    // dataframes from R serialize into an obect where each column is an array of values.
	    const keys = d3.keys(dataframe);
	    let result;
	    if (dataframe[keys[0]] instanceof Array) {
	      result = dataframe[keys[0]].map((d, i) => {
	        const item = {};
	        keys.forEach(p => {
	          item[p] = dataframe[p][i];
	        });
	        return item;
	      });
	    } else {
	      result = [dataframe];
	    }
	    return result;
	  }

	  get formatters() {
	    return {
	      formatSI: (p) => {
	        p = p || 0;
	        return (d) => {
	          if (d < 1) {
	            return Math.round(d, p);
	          }
	          const prefix = d3.format(',.0s', d);
	          return prefix(d);
	        }
	      },
	    };
	  }

	  wrap(text, width) {
	    text.each(function () {
	      const text = d3.select(this);
	      const words = text.text().split(/\s+/).reverse();
	      let line = [];
	      let word;
	      let lineNumber = 0;
	      const lineCount = 0;
	      const lineHeight = 1.1; // ems
	      const y = text.attr('y');
	      const dy = parseFloat(text.attr('dy'));
	      let tspan = text
	        .text(null)
	        .append('tspan')
	        .attr('x', 0)
	        .attr('y', y)
	        .attr('dy', `${dy}em`);
	      while (word = words.pop()) {
	        line.push(word);
	        tspan.text(line.join(' '));
	        if (tspan.node().getComputedTextLength() > width) {
	          if (line.length > 1) {
	            line.pop(); // remove word from line
	            words.push(word); // put the word back on the stack
	            tspan.text(line.join(' '));
	          }
	          line = [];
	          tspan = text
	            .append('tspan')
	            .attr('x', 0)
	            .attr('y', y)
	            .attr('dy', `${++lineNumber * lineHeight + dy}em`);
	        }
	      }
	    });
	  }

	  // Tooltips

	  tooltipFactory(tooltips) {
	    return (d) => {
	      let tipText = '';

	      if (tooltips !== undefined) {
	        for (let i = 0; i < tooltips.length; i = i + 1) {
	          let value = tooltips[i].accessor(d);
	          if (tooltips[i].format !== undefined) {
	            value = tooltips[i].format(value);
	          }
	          tipText += `${tooltips[i].label}: ${value}</br>`;
	        }
	      }

	      return tipText;
	    };
	  }

	  lineDefaultTooltip(
	    xLabel,
	    xFormat,
	    xAccessor,
	    yLabel,
	    yFormat,
	    yAccessor,
	    seriesAccessor
	  ) {
	    return (d) => {
	      let tipText = '';
	      if (seriesAccessor(d))
	        tipText = `Series: ${seriesAccessor(d)}</br>`;
	      tipText += `${xLabel}: ${xFormat(xAccessor(d))}</br>`;
	      tipText += `${yLabel}: ${yFormat(yAccessor(d))}`;
	      return tipText;
	    }
	  }

	  donutDefaultTooltip(labelAccessor, valueAccessor, percentageAccessor) {
	    return (d) =>
	      `${labelAccessor(d)}: ${valueAccessor(d)} (${percentageAccessor(d)})`
	  }

	  static mapMonthYearDataToSeries(data, customOptions) {
	    const defaults = {
	      dateField: 'x',
	      yValue: 'y',
	      yPercent: 'p'
	    };

	    const options = Object.assign({},
	      defaults,
	      customOptions
	    );

	    const series = {};
	    series.name = 'All Time';
	    series.values = [];
	    data[options.dateField].map((datum, i) => {
	      series.values.push({
	        xValue: new Date(Math.floor(data[options.dateField][i] / 100), (data[options.dateField][i] % 100) - 1, 1),
	        yValue: data[options.yValue][i],
	        yPercent: data[options.yPercent][i]
	      });
	    });
	    series.values.sort((a, b) => a.xValue - b.xValue);

	    return [series]; // return series wrapped in an array
	  }

	  static prepareData(rawData, chartType) {
	    switch (chartType) {
	      case this.chartTypes.BOXPLOT:
	        if (!rawData.CATEGORY.length) {
		        return null;
		      }
		      const data = rawData.CATEGORY.map((d,i) => ({
		        Category: rawData.CATEGORY[i],
		        min: rawData.MIN_VALUE[i],
		        max: rawData.MAX_VALUE[i],
		        median: rawData.MEDIAN_VALUE[i],
		        LIF: rawData.P10_VALUE[i],
		        q1: rawData.P25_VALUE[i],
		        q3: rawData.P75_VALUE[i],
		        UIF: rawData.P90_VALUE[i],
		      }), rawData);
		      const values = Object.values(data);
		      const flattenData = values.reduce((accumulator, currentValue) =>
		      		accumulator.concat(currentValue),
		      		[]
		      	);
		      if (!flattenData.length) {
		        return null;
		      }

		      return data;
	    }
	  }
	}

	return Chart;	
});

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

define('atlascharts/areachart',["d3"], function(d3) {
	"use strict";

	function areachart() {
		this.render = function (data, target, w, h, options) {
			var defaults = {
				margin: {
					top: 20,
					right: 30,
					bottom: 20,
					left: 40
				},
				xFormat: d3.format(',.0f'),
				yFormat: d3.format('s')
			};
			options = Object.assign({}, defaults, options);

			var width = w - options.margin.left - options.margin.right,
				height = h - options.margin.top - options.margin.bottom;

			var x = d3.scale.linear()
				.domain(d3.extent(data, function (d) {
					return d.x;
				}))
				.range([0, width]);

			var y = d3.scale.linear()
				.domain([0, d3.max(data, function (d) {
					return d.y;
				})])
				.range([height, 0]);

			var xAxis = d3.svg.axis()
				.scale(x)
				.tickFormat(options.xFormat)
				.ticks(10)
				.orient("bottom");

			var yAxis = d3.svg.axis()
				.scale(y)
				.tickFormat(options.yFormat)
				.ticks(4)
				.orient("left");

			var area = d3.svg.area()
				.x(function (d) {
					return x(d.x);
				})
				.y0(height)
				.y1(function (d) {
					return y(d.y);
				});

			var chart = d3.select(target)
				.append("svg:svg")
				.data(data)
				.attr("viewBox", `0 0 ${w} ${h}`)
				.attr('preserveAspectRatio', 'xMinYMin meet');

			var vis = chart.append("g")
				.attr("transform", "translate(" + options.margin.left + "," + options.margin.top + ")");

			vis.append("path")
				.datum(data)
				.attr("class", "area")
				.attr("d", area);

			vis.append("g")
				.attr("class", "x axis")
				.attr("transform", "translate(0," + height + ")")
				.call(xAxis);

			vis.append("g")
				.attr("class", "y axis")
				.call(yAxis);

		};
	};
	
	return areachart;
	
});

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

define('atlascharts/barchart',["d3", "d3-tip", "d3-scale", "./chart"],
	function(d3, d3tip, d3scale, Chart) {
	"use strict";

	class BarChart extends Chart {
	  get formatters() {
	    return {
	      commaseparated: d3.format(','),
	      formatpercent: d3.format('.1%'),
	    };
	  }

	  render(data, target, w, h, chartOptions) {
	    // options
	    const defaults = {
	      label: 'label',
	      value: 'value',
	      rotate: 0,
	      textAnchor: 'middle',
	      showLabels: false,
	    };
	    const options = this.getOptions(defaults, chartOptions);
	    // conatainer
	    let svg = this.createSvg(target, w, h);

	    var tip = d3tip()
	      .attr('class', 'd3-tip')
	      .offset([-10, 0])
	      .html(d => d.value)
	    svg.call(tip);
			
	    const label = options.label;
	    const value = options.value;

	    let total = 0;
	    data.forEach((d) => {
	      total = total + d[value];
	    });

	    let width = w - options.margins.left - options.margins.right;
	    let height = h - options.margins.top - options.margins.bottom;
			
	    // axes
	    const x = d3.scaleBand()
	      .range([0, width])
				.padding(.1)
	      .round(1.0 / data.length);

	    const y = d3scale.scaleLinear()
	      .range([height, 0]);

	    const xAxis = d3.axisBottom()
	      .scale(x)
	      .tickSize(2, 0);

	    const yAxis = d3.axisLeft()
	      .scale(y)
	      .tickFormat(options.yFormat)
	      .ticks(5);

	    x.domain(data.map(d => d[label]));
	    y.domain([0, options.yMax || d3.max(data, d => d[value])]);

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
			
			svg = svg.append('g')
	      .attr('transform', `translate(
	          ${options.margins.left + yAxisWidth},
	          ${options.margins.top}
	        )`);
			
	    svg.append('g')
	      .attr('class', 'x axis')
	      .attr('transform', `translate(0, ${height})`)
	      .call(xAxis)
	      .selectAll('.tick text')
	      .style('text-anchor', options.textAnchor)
	      .attr('transform', d => `rotate(${options.rotate})`);

	    if (options.wrap) {
	      svg.selectAll('.tick text')
	        .call(this.wrap, x.bandwidth());
	    }

	    svg.append('g')
	      .attr('class', 'y axis')
	      .attr('transform', 'translate(0, 0)')
	      .call(yAxis);

	    svg.selectAll('.bar')
	      .data(data)
	      .enter()
	      .append('rect')
	      .attr('class', 'bar')
	      .attr('x', d => x(d[label]))
	      .attr('width', x.bandwidth())
	      .attr('y', d => y(d[value]))
	      .attr('height', d => height - y(d[value]))
	      .attr('title', (d) => {
	        let temp_title = `${d[label]}: ${this.formatters.commaseparated(d[value], ',')}`;
	        if (total > 0) {
	          temp_title += ` (${this.formatters.formatpercent(d[value] / total)})`;
	        } else {
	          temp_title += ` (${this.formatters.formatpercent(0)})`;
	        }
	        return temp_title;
	      })
	      .style('fill', d => options.colors(d[label]))
	      .on('mouseover', d => tip.show(d, event.target))
	      .on('mouseout', tip.hide)
	      .exit()
	      .remove();

	    if (options.showLabels) {
	      svg.selectAll('.barlabel')
	        .data(data)
	        .enter()
	        .append('text')
	        .attr('class', 'barlabel')
	        .text(d => this.formatters.formatpercent(d[value] / total))
	        .attr('x', d => x(d[label]) + x.bandwidth() / 2)
	        .attr('y', d => y(d[value]) - 3)
	        .attr('text-anchor', 'middle');
	    }
	  }
	}

	return BarChart;
});

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

define('atlascharts/boxplot',["d3", "d3-tip", "d3-scale", "./chart"],
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

define('atlascharts/donut',["d3", "d3-tip", "d3-shape", "d3-drag", "numeral", "./chart"],
	function(d3, d3tip, d3shape, d3drag, numeral, Chart) {
	"use strict";

	class Donut extends Chart {
	  get formatters() {
	    return {
	      formatpercent: d3.format('.1%'),
	    };
	  }

	  render(data, target, w, h, chartOptions) {
	    // options
	    const options = this.getOptions(chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);    

	    function dragstarted() {
	      const legendContainer = d3.select(this);
	      legendContainer.attr('initialX', event.x);
	      legendContainer.attr('initialY', event.y);
	    }

	    function dragged() {
	      const legendContainer = d3.select(this);
	      const diffY = event.y - parseFloat(legendContainer.attr('initialY'));
	      if (isNaN(diffY)) {
	        return false;
	      }
	       legendContainer.attr('transform', `translate(
	        ${parseFloat(legendContainer.attr('initialPositionX'))},
	        ${parseFloat(legendContainer.attr('initialPositionY')) + diffY}
	      )`);
	    }

	    function dragended() {
	      const legendContainer = d3.select(this);
	      legendContainer.transition()
	        .duration(300)
	        .attr('transform', `translate(
	          ${legendContainer.attr('initialPositionX')},
	          ${legendContainer.attr('initialPositionY')}
	        )`);
	    }

	    let total = 0;
	    data.forEach((d) => {
	      total += +d.value;
	    });

	    const tooltipBuilder = this.donutDefaultTooltip(
	      (d) => d.label,
	      (d) => numeral(d.value).format('0,0'), 
	      (d) => this.formatters.formatpercent(total != 0 ? d.value / total : 0.0)
	    );    

	    const tip = d3tip()
	      .attr('class', 'd3-tip')
	      .direction('s')
	      .offset([3, 0])
	      .html(tooltipBuilder);
	    svg.call(tip);

	    if (data.length > 0) {
	      const vis = svg
	        .append('g')
	        .attr('id', 'chart');

	      // legend
	      const drag = d3drag.drag()
	        .on('drag', dragged)
	        .on('start', dragstarted)
	        .on('end', dragended);

	      const legend = svg.append('g')
	        .attr('class', 'legend')
	        .call(drag);

	      legend.selectAll('rect')
	        .data(data)
	        .enter()
	        .append('rect')
	        .attr('x', 0)
	        .attr('y', (d, i) => i * 15)
	        .attr('width', 10)
	        .attr('height', 10)
	        .style('fill', (d) => options.colors(d.id));

	      let legendWidth = 0;
	      const textDisplace = 12;
	      const legendItems = legend.selectAll('g.legend-item')
	        .data(data)
	        .enter()
	        .append('g')
	        .attr('class', 'legend-item');

	      legendItems
	        .append('text')
	        .attr('x', textDisplace)
	        .attr('y', (d, i) => (i * 15) + 9)
	        .text(d => d.label);

	      legendItems
	        .append('title')
	        .attr('x', textDisplace)
	        .attr('y', (d, i) => (i * 15) + 9)
	        .text(d => d.label);

	      legendItems.each(function() {
	        const legendItemWidth = this.getBBox().width;
	        if (legendItemWidth > legendWidth && legendWidth + legendItemWidth < w * 0.75) {
	          legendWidth = legendItemWidth;
	        }
	      });

	      legendWidth += textDisplace;
	      legend
	        .attr('transform', `translate(
	            ${w - legendWidth - options.margins.right},
	            ${options.margins.top}
	          )`)
	        .attr('initialPositionX', w - legendWidth - options.margins.right)
	        .attr('initialPositionY', options.margins.top);
	      vis
	        .attr('transform', `translate(${(w - legendWidth) / 2}, ${h / 2})`);

	      const or = Math.min(h, w-legendWidth) / 2 - options.margins.top;
	      const ir = Math.min(h, w-legendWidth) / 6 - options.margins.top;

	      const arc = d3shape.arc()
	        .innerRadius(ir)
	        .outerRadius(or);

	      const pie = d3.pie() // this will create arc data for us given a list of values
	        .value((d) => {
	          return d.value > 0 ? Math.max(d.value, total * .015) : 0;
	          // we want slices to appear if they have data, so we return a minimum of
	          // 1.5% of the overall total if the datapoint has a value > 0.
	        }); // we must tell it out to access the value of each element in our data array

	      const arcs = vis.selectAll('g.slice') // this selects all <g> elements with class slice (there aren't any yet)
	        .data(pie(data)) // associate the generated pie data (an array of arcs, each having startAngle, endAngle and value properties)
	        .enter() // this will create <g> elements for every 'extra' data element that should be associated with a selection. The result is creating a <g> for every object in the data array
	        .append('g') // create a group to hold each slice (we will have a <path> and a <text> element associated with each slice)
	        .attr('class', 'slice'); // allow us to style things in the slices (like text)

	      arcs.append('path')
	        .attr('fill', (d) => {
	          return options.colors(d.data.id);
	        }) // set the color for each slice to be chosen from the color function defined above
	        .attr('stroke', '#fff')
	        .attr('stroke-width', 5)
	        .attr('title', d => d.label)
	        .on('mouseover', d => tip.show(d.data, event.target))
	        .on('mouseout', tip.hide)
	        .attr('d', arc); // this creates the actual SVG path using the associated data (pie) with the arc drawing function

	      
	    } else {
	      svg.append('text')
	        .attr('transform', `translate(${w / 2}, ${h / 2})`)
	        .style('text-anchor', 'middle')
	        .text('No Data');
	    }
	  }
	}

	return Donut;
});




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

define('atlascharts/histogram',["d3", "d3-tip", "d3-scale", "numeral", "./chart"],
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
define('atlascharts/line',["d3", "d3-tip", "d3-shape", "d3-scale", "./chart"],
	function(d3, d3tip, d3shape, d3scale, Chart) {
	"use strict";

	class Line extends Chart {
	  get interpolation() {
	    return {
	      linear: d3.curveLinear,
	      curveStep: d3.curveStep,
	      curveStepBefore: d3.curveStepBefore,
	      curveStepAfter: d3.curveStepAfter,
	      curveBasis: d3.curveBasis,
	      curveCardinal: d3.curveCardinal,
	      curveMonotoneX: d3.curveMonotoneX,
	      curveCatmullRom: d3.curveCatmullRom,
	    };
	  }

	  render(data, target, w, h, chartOptions) {
	    // options
	    const defaults = {
	      xFormat: this.formatters.formatSI(3),
	      yFormat: this.formatters.formatSI(3),
	      interpolate: this.interpolation.linear,
	      seriesName: 'SERIES_NAME',
	      xValue: 'xValue',
	      yValue: 'yValue',
	      cssClass: 'lineplot',
	      ticks: 10,
	      showSeriesLabel: false,
	      labelIndexDate: false,
	      colorBasedOnIndex: false
	    };
	    const options = this.getOptions(defaults, chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

	    const tooltipBuilder = this.lineDefaultTooltip(
	      options.xLabel || 'x',
	      options.xFormat,
	      d => d[options.xValue],
	      options.yLabel || 'y',
	      options.yFormat,
	      d => d[options.yValue],
	      d => d[options.seriesName]
	    );

	    if (data.length > 0) {
	      // convert data to multi-series format if not already formatted
	      if (!data[0].hasOwnProperty('values')) {
	        // assumes data is just an array of values (single series)
	        data = [
	          {
	            name: '',
	            values: data
	          }
	        ];
	      };

	      const tip = d3tip()
	        .attr('class', 'd3-tip')
	        .offset([-10, 0])
	        .html(tooltipBuilder);
	      svg.call(tip);

	      let xAxisLabelHeight = 0;
	      let yAxisLabelWidth = 0;
	      let bbox;
	      // apply labels (if specified) and offset margins accordingly
	      if (options.xLabel) {
	        var xAxisLabel = svg.append('g')
	          .attr('transform', `translate(${w / 2}, ${h - options.margins.bottom})`);

	        xAxisLabel.append('text')
	          .attr('class', 'axislabel')
	          .style('text-anchor', 'middle')
	          .text(options.xLabel);

	        bbox = xAxisLabel.node().getBBox();
	        xAxisLabelHeight += bbox.height;
	      }

	      if (options.yLabel) {
	        var yAxisLabel = svg.append('g')
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

	        bbox = yAxisLabel.node().getBBox();
	        yAxisLabelWidth = 1.5 * bbox.width; // width is calculated as 1.5 * box height due to rotation anomolies that cause the y axis label to appear shifted.
	      }

	      let legendWidth = 0;
	      if (options.showLegend) {
	        const legend = svg.append('g')
	          .attr('class', 'legend');

	        let maxWidth = 0;

	        data.forEach((d, i) => {
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
	        legend.attr('transform', `translate(
	          ${w - options.margins.right - maxWidth},
	          ${options.margins.top}
	        )`);
	        legendWidth += maxWidth + 5;
	      }

	      // calculate an intial width and height that does not take into account the tick text dimensions
	      let width = w - options.margins.left - options.margins.right - yAxisLabelWidth - legendWidth;
	      let height = h - options.margins.top - options.margins.bottom - xAxisLabelHeight;

	      // define the intial scale (range will be updated after we determine the final dimensions)
	      const x = options.xScale || d3scale.scaleLinear()
	        .domain([
	          d3.min(data, d => d3.min(d.values, d => d[options.xValue])),
	          d3.max(data, d => d3.max(d.values, d => d[options.xValue]))
	        ]);

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

	      const y = options.yScale || d3scale.scaleLinear()
	        .domain([0, d3.max(data, function (d) {
	          return d3.max(d.values, function (d) {
	            return d[options.yValue];
	          });
	        })])
	        .range([height, 0]);

	      const yAxis = d3.axisLeft()
	        .scale(y)
	        .tickFormat(options.yFormat)
	        .ticks(4);

	      const tempXAxis = svg.append('g').attr('class', 'axis');
	      tempXAxis.call(xAxis);
	      const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
	      const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
	      height = height - xAxisHeight;
	      width = width - Math.max(0, (xAxisWidth - width));
	      // trim width if xAxisWidth bleeds over the allocated width.
	      tempXAxis.remove();

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

	      // create a line function that can convert data[] into x and y points

	      const line = d3shape.line()
	        .x(d => x(d[options.xValue]))
	        .y(d => y(d[options.yValue]))
	        .curve(options.interpolate);

	      const vis = svg.append('g')
	        .attr('class', options.cssClass)
	        .attr(
	          'transform',
	          `translate(
	            ${options.margins.left + yAxisLabelWidth + yAxisWidth},
	            ${options.margins.top}
	          )`
	        );

	      const series = vis.selectAll('.series')
	        .data(data)
	        .enter()
	        .append('g');

	      const seriesLines = series.append('path')
	        .attr('class', 'line')
	        .attr('d', d =>
	          line(
	            d.values.sort((a, b) =>
	              d3.ascending(
	                a[options.xValue],
	                b[options.xValue]
	              )
	            )
	          )
	        );

	      if (options.colors) {
	        seriesLines.style('stroke', (d, i) => options.colors(d.name));
	      }

	      if (options.showSeriesLabel) {
	        series.append('text')
	          .datum(d => ({
	              name: d.name,
	              value: d.values[d.values.length - 1]
	            })
	          )
	          .attr('transform', d =>
	            `translate(${x(d.value[options.xValue])}, ${y(d.value[options.yValue])})`
	          )
	          .attr('x', 3)
	          .attr('dy', 2)
	          .style('font-size', '8px')
	          .text(d => d.name);
	      }
	      const indexPoints = {
	        x: 0,
	        y: 0
	      };
	      series.selectAll('.focus')
	        .data(series => series.values)
	        .enter()
	        .append('circle')
	        .attr('class', 'focus')
	        .attr('r', 4)
	        .attr('transform', (d) => {
	          const xVal = x(d[options.xValue]);
	          const yVal = y(d[options.yValue]);
	          if (d[options.xValue] === 0 && indexPoints.y === 0) {
	            indexPoints.x = xVal;
	            indexPoints.y = yVal;
	          }
	          return `translate(${xVal}, ${yVal})`;
	        })
	        .on('mouseover', function (d) {
	          d3.select(this).style('opacity', '1');
	          tip.show(d, event.target);
	        })
	        .on('mouseout', function (d) {
	          d3.select(this).style('opacity', '0');
	          tip.hide(d, event.target);
	        });

	      vis.append('g')
	        .attr('class', 'x axis')
	        .attr('transform', `translate(0, ${height})`)
	        .call(xAxis);

	      vis.append('g')
	        .attr('class', 'y axis')
	        .call(yAxis);


	      if (options.labelIndexDate) {
	        vis.append('rect')
	          .attr('transform', `translate(${indexPoints.x - 0.5}, ${indexPoints.y})`)
	          .attr('width', 1)
	          .attr('height', height);
	      }

	    } else {
	      svg.append('text')
	        .attr('transform', `translate(${w / 2}, ${h / 2})`)
	        .style('text-anchor', 'middle')
	        .text('No Data');
	    }
	  }
	}
	
	return Line;
	
});

/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
define('get/main',[],function() {
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used to stand-in for `undefined` hash values. */
  var HASH_UNDEFINED = '__lodash_hash_undefined__';

  /** Used as references for various `Number` constants. */
  var INFINITY = 1 / 0;

  /** `Object#toString` result references. */
  var funcTag = '[object Function]',
      genTag = '[object GeneratorFunction]',
      symbolTag = '[object Symbol]';

  /** Used to match property names within property paths. */
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/,
      reIsPlainProp = /^\w*$/,
      reLeadingDot = /^\./,
      rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;

  /**
   * Used to match `RegExp`
   * [syntax characters](http://ecma-international.org/ecma-262/7.0/#sec-patterns).
   */
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;

  /** Used to match backslashes in property paths. */
  var reEscapeChar = /\\(\\)?/g;

  /** Used to detect host constructors (Safari). */
  var reIsHostCtor = /^\[object .+?Constructor\]$/;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

  /** Detect free variable `self`. */
  var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = freeGlobal || freeSelf || Function('return this')();

  /**
   * Gets the value at `key` of `object`.
   *
   * @private
   * @param {Object} [object] The object to query.
   * @param {string} key The key of the property to get.
   * @returns {*} Returns the property value.
   */
  function getValue(object, key) {
    return object == null ? undefined : object[key];
  }

  /**
   * Checks if `value` is a host object in IE < 9.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a host object, else `false`.
   */
  function isHostObject(value) {
    // Many host objects are `Object` objects that can coerce to strings
    // despite having improperly defined `toString` methods.
    var result = false;
    if (value != null && typeof value.toString != 'function') {
      try {
        result = !!(value + '');
      } catch (e) {}
    }
    return result;
  }

  /** Used for built-in method references. */
  var arrayProto = Array.prototype,
      funcProto = Function.prototype,
      objectProto = Object.prototype;

  /** Used to detect overreaching core-js shims. */
  var coreJsData = root['__core-js_shared__'];

  /** Used to detect methods masquerading as native. */
  var maskSrcKey = (function() {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || '');
    return uid ? ('Symbol(src)_1.' + uid) : '';
  }());

  /** Used to resolve the decompiled source of functions. */
  var funcToString = funcProto.toString;

  /** Used to check objects for own properties. */
  var hasOwnProperty = objectProto.hasOwnProperty;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString = objectProto.toString;

  /** Used to detect if a method is native. */
  var reIsNative = RegExp('^' +
    funcToString.call(hasOwnProperty).replace(reRegExpChar, '\\$&')
    .replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, '$1.*?') + '$'
  );

  /** Built-in value references. */
  var Symbol = root.Symbol,
      splice = arrayProto.splice;

  /* Built-in method references that are verified to be native. */
  var Map = getNative(root, 'Map'),
      nativeCreate = getNative(Object, 'create');

  /** Used to convert symbols to primitives and strings. */
  var symbolProto = Symbol ? Symbol.prototype : undefined,
      symbolToString = symbolProto ? symbolProto.toString : undefined;

  /**
   * Creates a hash object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function Hash(entries) {
    var index = -1,
        length = entries ? entries.length : 0;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the hash.
   *
   * @private
   * @name clear
   * @memberOf Hash
   */
  function hashClear() {
    this.__data__ = nativeCreate ? nativeCreate(null) : {};
  }

  /**
   * Removes `key` and its value from the hash.
   *
   * @private
   * @name delete
   * @memberOf Hash
   * @param {Object} hash The hash to modify.
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function hashDelete(key) {
    return this.has(key) && delete this.__data__[key];
  }

  /**
   * Gets the hash value for `key`.
   *
   * @private
   * @name get
   * @memberOf Hash
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function hashGet(key) {
    var data = this.__data__;
    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED ? undefined : result;
    }
    return hasOwnProperty.call(data, key) ? data[key] : undefined;
  }

  /**
   * Checks if a hash value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf Hash
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate ? data[key] !== undefined : hasOwnProperty.call(data, key);
  }

  /**
   * Sets the hash `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf Hash
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the hash instance.
   */
  function hashSet(key, value) {
    var data = this.__data__;
    data[key] = (nativeCreate && value === undefined) ? HASH_UNDEFINED : value;
    return this;
  }

  // Add methods to `Hash`.
  Hash.prototype.clear = hashClear;
  Hash.prototype['delete'] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;

  /**
   * Creates an list cache object.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function ListCache(entries) {
    var index = -1,
        length = entries ? entries.length : 0;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the list cache.
   *
   * @private
   * @name clear
   * @memberOf ListCache
   */
  function listCacheClear() {
    this.__data__ = [];
  }

  /**
   * Removes `key` and its value from the list cache.
   *
   * @private
   * @name delete
   * @memberOf ListCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function listCacheDelete(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index, 1);
    }
    return true;
  }

  /**
   * Gets the list cache value for `key`.
   *
   * @private
   * @name get
   * @memberOf ListCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function listCacheGet(key) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    return index < 0 ? undefined : data[index][1];
  }

  /**
   * Checks if a list cache value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf ListCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function listCacheHas(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }

  /**
   * Sets the list cache `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf ListCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the list cache instance.
   */
  function listCacheSet(key, value) {
    var data = this.__data__,
        index = assocIndexOf(data, key);

    if (index < 0) {
      data.push([key, value]);
    } else {
      data[index][1] = value;
    }
    return this;
  }

  // Add methods to `ListCache`.
  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype['delete'] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;

  /**
   * Creates a map cache object to store key-value pairs.
   *
   * @private
   * @constructor
   * @param {Array} [entries] The key-value pairs to cache.
   */
  function MapCache(entries) {
    var index = -1,
        length = entries ? entries.length : 0;

    this.clear();
    while (++index < length) {
      var entry = entries[index];
      this.set(entry[0], entry[1]);
    }
  }

  /**
   * Removes all key-value entries from the map.
   *
   * @private
   * @name clear
   * @memberOf MapCache
   */
  function mapCacheClear() {
    this.__data__ = {
      'hash': new Hash,
      'map': new (Map || ListCache),
      'string': new Hash
    };
  }

  /**
   * Removes `key` and its value from the map.
   *
   * @private
   * @name delete
   * @memberOf MapCache
   * @param {string} key The key of the value to remove.
   * @returns {boolean} Returns `true` if the entry was removed, else `false`.
   */
  function mapCacheDelete(key) {
    return getMapData(this, key)['delete'](key);
  }

  /**
   * Gets the map value for `key`.
   *
   * @private
   * @name get
   * @memberOf MapCache
   * @param {string} key The key of the value to get.
   * @returns {*} Returns the entry value.
   */
  function mapCacheGet(key) {
    return getMapData(this, key).get(key);
  }

  /**
   * Checks if a map value for `key` exists.
   *
   * @private
   * @name has
   * @memberOf MapCache
   * @param {string} key The key of the entry to check.
   * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
   */
  function mapCacheHas(key) {
    return getMapData(this, key).has(key);
  }

  /**
   * Sets the map `key` to `value`.
   *
   * @private
   * @name set
   * @memberOf MapCache
   * @param {string} key The key of the value to set.
   * @param {*} value The value to set.
   * @returns {Object} Returns the map cache instance.
   */
  function mapCacheSet(key, value) {
    getMapData(this, key).set(key, value);
    return this;
  }

  // Add methods to `MapCache`.
  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype['delete'] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;

  /**
   * Gets the index at which the `key` is found in `array` of key-value pairs.
   *
   * @private
   * @param {Array} array The array to inspect.
   * @param {*} key The key to search for.
   * @returns {number} Returns the index of the matched value, else `-1`.
   */
  function assocIndexOf(array, key) {
    var length = array.length;
    while (length--) {
      if (eq(array[length][0], key)) {
        return length;
      }
    }
    return -1;
  }

  /**
   * The base implementation of `_.get` without support for default values.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @returns {*} Returns the resolved value.
   */
  function baseGet(object, path) {
    path = isKey(path, object) ? [path] : castPath(path);

    var index = 0,
        length = path.length;

    while (object != null && index < length) {
      object = object[toKey(path[index++])];
    }
    return (index && index == length) ? object : undefined;
  }

  /**
   * The base implementation of `_.isNative` without bad shim checks.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a native function,
   *  else `false`.
   */
  function baseIsNative(value) {
    if (!isObject(value) || isMasked(value)) {
      return false;
    }
    var pattern = (isFunction(value) || isHostObject(value)) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }

  /**
   * The base implementation of `_.toString` which doesn't convert nullish
   * values to empty strings.
   *
   * @private
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   */
  function baseToString(value) {
    // Exit early for strings to avoid a performance hit in some environments.
    if (typeof value == 'string') {
      return value;
    }
    if (isSymbol(value)) {
      return symbolToString ? symbolToString.call(value) : '';
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
  }

  /**
   * Casts `value` to a path array if it's not one.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {Array} Returns the cast property path array.
   */
  function castPath(value) {
    return isArray(value) ? value : stringToPath(value);
  }

  /**
   * Gets the data for `map`.
   *
   * @private
   * @param {Object} map The map to query.
   * @param {string} key The reference key.
   * @returns {*} Returns the map data.
   */
  function getMapData(map, key) {
    var data = map.__data__;
    return isKeyable(key)
      ? data[typeof key == 'string' ? 'string' : 'hash']
      : data.map;
  }

  /**
   * Gets the native function at `key` of `object`.
   *
   * @private
   * @param {Object} object The object to query.
   * @param {string} key The key of the method to get.
   * @returns {*} Returns the function if it's native, else `undefined`.
   */
  function getNative(object, key) {
    var value = getValue(object, key);
    return baseIsNative(value) ? value : undefined;
  }

  /**
   * Checks if `value` is a property name and not a property path.
   *
   * @private
   * @param {*} value The value to check.
   * @param {Object} [object] The object to query keys on.
   * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
   */
  function isKey(value, object) {
    if (isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == 'number' || type == 'symbol' || type == 'boolean' ||
        value == null || isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) ||
      (object != null && value in Object(object));
  }

  /**
   * Checks if `value` is suitable for use as unique object key.
   *
   * @private
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is suitable, else `false`.
   */
  function isKeyable(value) {
    var type = typeof value;
    return (type == 'string' || type == 'number' || type == 'symbol' || type == 'boolean')
      ? (value !== '__proto__')
      : (value === null);
  }

  /**
   * Checks if `func` has its source masked.
   *
   * @private
   * @param {Function} func The function to check.
   * @returns {boolean} Returns `true` if `func` is masked, else `false`.
   */
  function isMasked(func) {
    return !!maskSrcKey && (maskSrcKey in func);
  }

  /**
   * Converts `string` to a property path array.
   *
   * @private
   * @param {string} string The string to convert.
   * @returns {Array} Returns the property path array.
   */
  var stringToPath = memoize(function(string) {
    string = toString(string);

    var result = [];
    if (reLeadingDot.test(string)) {
      result.push('');
    }
    string.replace(rePropName, function(match, number, quote, string) {
      result.push(quote ? string.replace(reEscapeChar, '$1') : (number || match));
    });
    return result;
  });

  /**
   * Converts `value` to a string key if it's not a string or symbol.
   *
   * @private
   * @param {*} value The value to inspect.
   * @returns {string|symbol} Returns the key.
   */
  function toKey(value) {
    if (typeof value == 'string' || isSymbol(value)) {
      return value;
    }
    var result = (value + '');
    return (result == '0' && (1 / value) == -INFINITY) ? '-0' : result;
  }

  /**
   * Converts `func` to its source code.
   *
   * @private
   * @param {Function} func The function to process.
   * @returns {string} Returns the source code.
   */
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {}
      try {
        return (func + '');
      } catch (e) {}
    }
    return '';
  }

  /**
   * Creates a function that memoizes the result of `func`. If `resolver` is
   * provided, it determines the cache key for storing the result based on the
   * arguments provided to the memoized function. By default, the first argument
   * provided to the memoized function is used as the map cache key. The `func`
   * is invoked with the `this` binding of the memoized function.
   *
   * **Note:** The cache is exposed as the `cache` property on the memoized
   * function. Its creation may be customized by replacing the `_.memoize.Cache`
   * constructor with one whose instances implement the
   * [`Map`](http://ecma-international.org/ecma-262/7.0/#sec-properties-of-the-map-prototype-object)
   * method interface of `delete`, `get`, `has`, and `set`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to have its output memoized.
   * @param {Function} [resolver] The function to resolve the cache key.
   * @returns {Function} Returns the new memoized function.
   * @example
   *
   * var object = { 'a': 1, 'b': 2 };
   * var other = { 'c': 3, 'd': 4 };
   *
   * var values = _.memoize(_.values);
   * values(object);
   * // => [1, 2]
   *
   * values(other);
   * // => [3, 4]
   *
   * object.a = 2;
   * values(object);
   * // => [1, 2]
   *
   * // Modify the result cache.
   * values.cache.set(object, ['a', 'b']);
   * values(object);
   * // => ['a', 'b']
   *
   * // Replace `_.memoize.Cache`.
   * _.memoize.Cache = WeakMap;
   */
  function memoize(func, resolver) {
    if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function() {
      var args = arguments,
          key = resolver ? resolver.apply(this, args) : args[0],
          cache = memoized.cache;

      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result);
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache);
    return memoized;
  }

  // Assign cache to `_.memoize`.
  memoize.Cache = MapCache;

  /**
   * Performs a
   * [`SameValueZero`](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero)
   * comparison between two values to determine if they are equivalent.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to compare.
   * @param {*} other The other value to compare.
   * @returns {boolean} Returns `true` if the values are equivalent, else `false`.
   * @example
   *
   * var object = { 'a': 1 };
   * var other = { 'a': 1 };
   *
   * _.eq(object, object);
   * // => true
   *
   * _.eq(object, other);
   * // => false
   *
   * _.eq('a', 'a');
   * // => true
   *
   * _.eq('a', Object('a'));
   * // => false
   *
   * _.eq(NaN, NaN);
   * // => true
   */
  function eq(value, other) {
    return value === other || (value !== value && other !== other);
  }

  /**
   * Checks if `value` is classified as an `Array` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an array, else `false`.
   * @example
   *
   * _.isArray([1, 2, 3]);
   * // => true
   *
   * _.isArray(document.body.children);
   * // => false
   *
   * _.isArray('abc');
   * // => false
   *
   * _.isArray(_.noop);
   * // => false
   */
  var isArray = Array.isArray;

  /**
   * Checks if `value` is classified as a `Function` object.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a function, else `false`.
   * @example
   *
   * _.isFunction(_);
   * // => true
   *
   * _.isFunction(/abc/);
   * // => false
   */
  function isFunction(value) {
    // The use of `Object#toString` avoids issues with the `typeof` operator
    // in Safari 8-9 which returns 'object' for typed array and other constructors.
    var tag = isObject(value) ? objectToString.call(value) : '';
    return tag == funcTag || tag == genTag;
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike(value) && objectToString.call(value) == symbolTag);
  }

  /**
   * Converts `value` to a string. An empty string is returned for `null`
   * and `undefined` values. The sign of `-0` is preserved.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {string} Returns the string.
   * @example
   *
   * _.toString(null);
   * // => ''
   *
   * _.toString(-0);
   * // => '-0'
   *
   * _.toString([1, 2, 3]);
   * // => '1,2,3'
   */
  function toString(value) {
    return value == null ? '' : baseToString(value);
  }

  /**
   * Gets the value at `path` of `object`. If the resolved value is
   * `undefined`, the `defaultValue` is returned in its place.
   *
   * @static
   * @memberOf _
   * @since 3.7.0
   * @category Object
   * @param {Object} object The object to query.
   * @param {Array|string} path The path of the property to get.
   * @param {*} [defaultValue] The value returned for `undefined` resolved values.
   * @returns {*} Returns the resolved value.
   * @example
   *
   * var object = { 'a': [{ 'b': { 'c': 3 } }] };
   *
   * _.get(object, 'a[0].b.c');
   * // => 3
   *
   * _.get(object, ['a', '0', 'b', 'c']);
   * // => 3
   *
   * _.get(object, 'a.b.c', 'default');
   * // => 'default'
   */
  function get(object, path, defaultValue) {
    var result = object == null ? undefined : baseGet(object, path);
    return result === undefined ? defaultValue : result;
  }

  return get;
});

define('get', ['get/main'], function (main) { return main; });

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

define('atlascharts/trellisline',["d3", "d3-tip", "d3-scale", "d3-shape", "./chart", "get"],
	function(d3, d3tip, d3scale, d3shape, Chart, get) {
	"use strict";

	class Trellisline extends Chart {
	  render(dataByTrellis, target, w, h, chartOptions) {
	    // options
	    const defaults = {
	      trellisSet: d3.keys(dataByTrellis),
	      xFormat: d3.format('d'),
	      yFormat: d3.format('d'),
	      interpolate: d3.curveLinear,
	    };
	    const options = this.getOptions(defaults, chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

	    function mouseover() {
	      gTrellis.selectAll('.g-end').style('display', 'none');
	      gTrellis.selectAll('.g-value').style('display', null);
	      mousemove.call(this);
	    }

	    function mousemove() {
	      const date = seriesScale.invert(d3.mouse(event.target)[0]);
	      gTrellis.selectAll('.g-label-value.g-start').call(valueLabel, date);
	      gTrellis.selectAll('.g-label-year.g-start').call(yearLabel, date);
	      gTrellis.selectAll('.g-value').attr('transform', function (d) {
	        const s = d.values;
	        if (s) {
	          const v = s[bisect(s, date, 0, s.length - 1)];
	          const yValue = (v.Y_PREVALENCE_1000PP === 0 || v.Y_PREVALENCE_1000PP) ? v.Y_PREVALENCE_1000PP : v.yPrevalence1000Pp;
	          if (v && v.date) {
	            return 'translate(' + seriesScale(v.date) + ',' + yScale(yValue) + ')';
	          } else {
	            return 'translate(0,0);';
	          }
	        }
	      });
	    }

	    function mouseout() {
	      gTrellis.selectAll('.g-end').style('display', null);
	      gTrellis.selectAll('.g-label-value.g-start').call(valueLabel, minDate);
	      gTrellis.selectAll('.g-label-year.g-start').call(yearLabel, minDate);
	      gTrellis.selectAll('.g-label-year.g-end').call(yearLabel, maxDate);
	      gTrellis.selectAll('.g-value').style('display', 'none');
	    }

	    function valueLabel(text, date) {
	      const offsetScale = d3.scaleLinear().domain(seriesScale.range());

	      text.each(function(d) {
	        const text = d3.select(this);
	        const s = d.values;
	        const i = bisect(s, date, 0, s.length - 1);
	        const j = Math.round(i / (s.length - 1) * (s.length - 12));
	        const v = s[i];
	        if (v && v.date) {
	          const x = seriesScale(v.date);
	          text.attr('dy', null).attr('y', -4);
	          var yValue = (v.Y_PREVALENCE_1000PP === 0 || v.Y_PREVALENCE_1000PP)
	            ? v.Y_PREVALENCE_1000PP
	            : v.yPrevalence1000Pp;
	          text.text(options.yFormat(yValue))
	            .attr('transform', `translate(
	                ${offsetScale.range([0, trellisScale.bandwidth() - this.getComputedTextLength()])(x)},
	                ${yScale(d3.max(s.slice(j, j + 12), d => yValue))}
	              )`
	            );
	        }
	      });
	    }

	    function yearLabel(text, date) {
	      const offsetScale = d3.scaleLinear().domain(seriesScale.range());
	      // derive the x vale by using the first trellis/series set of values.
	      // All series are assumed to contain the same domain of X values.
	      const s = get(dataByTrellis, '[0].values[0].values', []),
	        v = s[bisect(s, date, 0, s.length - 1)];
	      if (v && v.date) {
	        const x = seriesScale(v.date);
	        text.each(function (d) {
	          d3.select(this)
	            .text(v.date.getFullYear())
	            .attr('transform', `translate(
	              ${offsetScale.range([0, trellisScale.bandwidth() - this.getComputedTextLength()])(x)},
	              ${height + 6}
	              )`
	            )
	            .style('display', null);
	        });
	      }
	    }

	    function renderLegend(g) {
	      let offset = 0;
	      options.colors.domain().forEach((d) => {
	        const legendItem = g.append('g').attr('class', 'trellisLegend');
	        const legendText = legendItem.append('text')
	          .text(d);
	        const textBBox = legendItem.node().getBBox();
	        legendText
	          .attr('x', 12)
	          .attr('y', textBBox.height);
	        legendItem.append('line')
	          .attr('x1', 0)
	          .attr('y1', 10)
	          .attr('x2', 10)
	          .attr('y2', 10)
	          .style('stroke', () => options.colors(d));
	        legendItem.attr('transform', `translate(${offset}, 0)`);
	        offset += legendItem.node().getBBox().width + 5;
	      });
	    }

	    const bisect = d3.bisector(d => d.date).left;
	    const minDate = d3.min(dataByTrellis, trellis =>
	      d3.min(trellis.values, series =>
	        d3.min(series.values, d =>
	          d.date
	        )
	      )
	    );
	    const maxDate = d3.max(dataByTrellis, trellis =>
	      d3.max(trellis.values, series =>
	        d3.max(series.values, d =>
	          d.date
	        )
	      )
	    );

	    const minY = d3.min(dataByTrellis, trellis =>
	      d3.min(trellis.values, series =>
	        d3.min(series.values, d =>
	          (d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP)
	            ? d.Y_PREVALENCE_1000PP
	            : d.yPrevalence1000Pp
	        )
	      )
	    );
	    const maxY = d3.max(dataByTrellis, trellis =>
	      d3.max(trellis.values, series =>
	        d3.max(series.values, d =>
	          (d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP)
	            ? d.Y_PREVALENCE_1000PP
	            : d.yPrevalence1000Pp
	        )
	      )
	    );

	    let seriesLabel;
	    let seriesLabelHeight = 0;
	    if (options.seriesLabel) {
	      seriesLabel = svg.append('g');
	      seriesLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .attr('dy', '.79em')
	        .text(options.seriesLabel);
	      if (seriesLabelHeight = seriesLabel.node()) {
	        seriesLabelHeight = seriesLabel.node().getBBox().height + 10;
	      }
	    }

	    let trellisLabel;
	    let trellisLabelHeight = 0;
	    if (options.trellisLabel) {
	      trellisLabel = svg.append('g');
	      trellisLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .attr('dy', '.79em')
	        .text(options.trellisLabel);
	      trellisLabelHeight = trellisLabel.node().getBBox().height + 10;
	    }

	    // simulate a single trellis heading
	    let trellisHeading;
	    let trellisHeadingHeight = 0;
	    trellisHeading = svg.append('g')
	      .attr('class', 'g-label-trellis');
	    trellisHeading.append('text')
	      .text(options.trellisSet.join(''));
	    trellisHeadingHeight = trellisHeading.node().getBBox().height + 10;
	    trellisHeading.remove();

	    let yAxisLabel;
	    let yAxisLabelWidth = 0;
	    if (options.yLabel) {
	      yAxisLabel = svg.append('g');
	      yAxisLabel.append('text')
	        .attr('class', 'axislabel')
	        .style('text-anchor', 'middle')
	        .text(options.yLabel);
	      yAxisLabelWidth = yAxisLabel.node().getBBox().height + 4;
	    }

	    // calculate an intial width and height that does not take into account the tick text dimensions
	    let width = w - options.margins.left - yAxisLabelWidth - options.margins.right;
	    let height = h - options.margins.top - trellisLabelHeight - trellisHeadingHeight- seriesLabelHeight - options.margins.bottom*2;

	    const trellisScale = d3scale.scaleBand()
	      .domain(options.trellisSet)
	      .range([0, width])
	      .paddingOuter(0.2)
	      .paddingInner(0.25);

	    const seriesScale = d3.scaleTime()
	      .domain([minDate, maxDate])
	      .range([0, trellisScale.bandwidth()]);

	    const yScale = d3.scaleLinear()
	      .domain([minY, maxY])
	      .range([height, 0]);

	    const yAxis = d3.axisLeft()
	      .scale(yScale)
	      .tickFormat(options.yFormat)
	      .ticks(4);

	    // create temporary x axis
	    const xAxis = d3.axisBottom()
	      .scale(seriesScale);

	    const tempXAxis = svg
	      .append('g')
	      .attr('class', 'axis');
	    tempXAxis.call(xAxis);

	    // update width & height based on temp xaxis dimension and remove
	    const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
	    const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
	    height -= xAxisHeight;
	    // trim width if xAxisWidth bleeds over the allocated width.
	    width -= Math.max(0, (xAxisWidth - width));
	    tempXAxis.remove();

	    // create temporary y axis
	    const tempYAxis = svg.append('g').attr('class', 'axis');
	    tempYAxis.call(yAxis);

	    // update width based on temp yaxis dimension and remove
	    const yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
	    width -= yAxisWidth;
	    tempYAxis.remove();

	    // reset axis ranges
	    trellisScale
	      .range([0, width])
	      .paddingOuter(0.2)
	      .paddingInner(0.25);
	    seriesScale.range([0, trellisScale.bandwidth()]);
	    yScale.range([height, 0]);


	    if (options.trellisLabel) {
	      trellisLabel.attr('transform', `translate(
	        ${(width / 2) + options.margins.left},
	        ${options.margins.top}
	      )`);
	    }

	    if (options.seriesLabel) {
	      seriesLabel.attr('transform', `translate(
	        ${(width / 2) + options.margins.left},
	        ${trellisLabelHeight + height + xAxisHeight + seriesLabelHeight + options.margins.top*2}
	      )`);
	    }

	    if (options.yLabel) {
	      yAxisLabel.attr('transform', `translate(
	        ${options.margins.left},
	        ${(height / 2) + trellisLabelHeight + trellisHeadingHeight}
	      )`);
	      yAxisLabel.select('text')
	        .attr('transform', 'rotate(-90)')
	        .attr('y', 0)
	        .attr('x', 0)
	        .attr('dy', '1em');
	    }

	    const seriesLine = d3shape.line()
	      .x(d => seriesScale(d.date))
	      .y(d => yScale((d.Y_PREVALENCE_1000PP === 0 || d.Y_PREVALENCE_1000PP)
	          ? d.Y_PREVALENCE_1000PP
	          : d.yPrevalence1000Pp)
	      )
	      .curve(options.interpolate);

	    // when using d3selection.select instead of d3.select, d3.mouse will have a bug with undefined event
	    const vis = d3.select(svg.node()).append('g')
	      .attr('transform', d =>
	        `translate(
	        ${yAxisLabelWidth + yAxisWidth + options.margins.left},
	        ${trellisLabelHeight}
	      )`
	      );

	    const gTrellis = vis.selectAll('.g-trellis')
	      .data(trellisScale.domain())
	      .enter()
	      .append('g')
	      .attr('class', 'g-trellis')
	      .attr('transform', d =>
	        `translate(${trellisScale(d)}, ${trellisHeadingHeight})`
	      );

	    const seriesGuideXAxis = d3.axisBottom()
	      .scale(seriesScale)
	      .tickFormat('')
	      .tickSize(-height);

	    const seriesGuideYAxis = d3.axisLeft()
	      .scale(yScale)
	      .tickFormat('')
	      .tickSize(-trellisScale.bandwidth())
	      .ticks(8);

	    gTrellis.append('g')
	      .attr('class', 'x-guide')
	      .attr('transform', `translate(0, ${height})`)
	      .call(seriesGuideXAxis);

	    gTrellis.append('g')
	      .attr('class', 'y-guide')
	      .call(seriesGuideYAxis);

	    const gSeries = gTrellis.selectAll('.g-series')
	      .data((trellis) => {
	        const seriesData = dataByTrellis.filter(e => e.key === trellis);
	        if (seriesData.length > 0)
	          return seriesData[0].values;
	        else
	          return [];
	      })
	      .enter()
	      .append('g')
	      .attr('class', 'g-series lineplot');

	    gSeries.append('path')
	      .attr('class', 'line')
	      .attr('d', d =>
	        seriesLine(d.values.sort((a, b) =>
	          d3.ascending(a.date, b.date)
	        ))
	      )
	      .style('stroke', d => options.colors(d.key));

	    gSeries.append('circle')
	      .attr('class', 'g-value')
	      .attr('transform', (d) => {
	        const v = d.values;
	        if (v
	          && v[v.length - 1]
	          && v[v.length - 1].date
	          && v[v.length - 1]
	          && (v[v.length - 1].Y_PREVALENCE_1000PP || v[v.length - 1].yPrevalence1000Pp)) {
	          const yValue = (v[v.length - 1].Y_PREVALENCE_1000PP === 0 || v[v.length - 1].Y_PREVALENCE_1000PP)
	            ? v[v.length - 1].Y_PREVALENCE_1000PP
	            : v[v.length - 1].yPrevalence1000Pp;
	          return `translate(${seriesScale(v[v.length - 1].date)}, ${yScale(yValue)})`;
	        }
	        return 'translate(0, 0)';
	      })
	      .attr('r', 2.5)
	      .style('display', 'none');

	    gSeries.append('text')
	      .attr('class', 'g-label-value g-start')
	      .call(valueLabel, minDate);

	    gSeries.append('text')
	      .attr('class', 'g-label-value g-end')
	      .call(valueLabel, maxDate);

	    gTrellis.append('text')
	      .attr('class', 'g-label-year g-start')
	      .attr('dy', '.71em')
	      .call(yearLabel, minDate);

	    gTrellis.append('text')
	      .attr('class', 'g-label-year g-end')
	      .attr('dy', '.71em')
	      .call(yearLabel, maxDate);

	    gTrellis.append('g')
	      .attr('class', 'x axis')
	      .append('line')
	      .attr('x2', trellisScale.bandwidth())
	      .attr('y1', yScale(minY))
	      .attr('y2', yScale(minY));

	    gTrellis.append('g')
	      .attr('class', 'g-label-trellis')
	      .attr('transform', d =>
	        `translate(${trellisScale.bandwidth() / 2}, 0)`
	      )
	      .append('text')
	      .attr('dy', '-1em')
	      .style('text-anchor', 'middle')
	      .text(d => d);

	    gTrellis.append('rect')
	      .attr('class', 'g-overlay')
	      .attr('x', -4)
	      .attr('width', trellisScale.bandwidth() + 8)
	      .attr('height', height + 18)
	      .on('mouseover', mouseover)
	      .on('mousemove', mousemove)
	      .on('mouseout', mouseout);

	    d3.select(gTrellis.nodes()[0]).append('g')
	      .attr('class', 'y axis')
	      .attr('transform', 'translate(-4,0)')
	      .call(yAxis);

	    const legendContainer = svg.append('g')
	      .attr('transform', `translate(${options.margins.left}, ${options.margins.top})`);
	    legendContainer.call(renderLegend);
	  }
	}
	
	return Trellisline;
	
});

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

Authors: Frank Defalco, Christopher Knoll, Pavel Grafkin, Alexander Saltykov

*/

define('atlascharts/treemap',["d3", "d3-tip", "./chart"],
	function(d3, d3tip, Chart) {
	"use strict";

	class Treemap extends Chart {
	  get formatters() {
	    return {
	      format_pct: d3.format('.2%'),
	      format_fixed: d3.format('.2f'),
	      format_comma: d3.format(','),
	    };
	  }

	  render(data, target, w, h, chartOptions) {
	    // options
	    const options = this.getOptions(chartOptions);
	    // container
	    const svg = this.createSvg(target, w, h);

	    const x = d3.scaleLinear().range([0, w]);
	    const y = d3.scaleLinear().range([0, h]);

	    d3.select(target).select('.treemap_zoomtarget').text('');
	    let currentDepth = 0;

	    const tip = d3tip()
	      .attr('class', 'd3-tip')
	      .direction(function(d) {
	        const scaledWidth = x.domain()[1] === 1 ? w : x.domain()[1];
	        if (d.x1 >= scaledWidth - scaledWidth / 10) {
	          return 'w';
	        } else if (d.x0 <= scaledWidth / 10) {
	          return 'e';
	        }
	        return 'n';
	      })
	      .offset([3, 0])
	      .html(function (d) {
	      	return `${options.gettitle(d.data)}<br/><br/>${options.getcontent(d.data)}`
	      });

	    const treemap = d3.treemap()
	      .round(false)
	      .size([w, h]);

	    const hierarchy = d3.hierarchy(data, function(d) {
	    	return d.children;
	    }).sum(options.getsizevalue);
	    const tree = treemap(hierarchy);

	    function zoom(d, isAnimated = true) {
	      const kx = w / (d.x1 - d.x0) || w;
	      const ky = h / (d.y1 - d.y0) || h;
	      if (d.x1 && d.y1) {
	        x.domain([d.x0, d.x0 + (d.x1 - d.x0)]);
	        y.domain([d.y0, d.y0 + (d.y1 - d.y0)]);
	      } else {
	        x.domain([0, w]);
	        y.domain([0, h]);
	      }

	      const zoomtarget = d3.select(target).select('.treemap_zoomtarget');
	      if (zoomtarget.size()) {
	        if (d.data.name === 'root') {
	          zoomtarget.text('');
	        } else {
	          const currentZoomcaption = zoomtarget.text();
	          zoomtarget.text(`${currentZoomcaption} > ${d.data.name}`);
	        }
	      }

	      let t = svg.selectAll('g.cell, .grouper');
	      if (isAnimated) {
	        t = t.transition()
	        .duration(750);
	      }
	      t.attr('transform', function(c) {
	      	return `translate(${x(c.x0)}, ${y(c.y0)})`;
	      })
	        .on('end', function () {
	          svg.selectAll('.grouper')
	            .attr('display', 'block');
	        });

	      // patched to prevent negative value assignment to width and height
	      t.select('rect')
	        .attr('width', function (c) {
	        	return Math.max(0, (kx * (c.x1 - c.x0)) - 1)
	        })
	        .attr('height', function (c) {
	        	return Math.max(0, (ky * (c.y1 - c.y0)) - 1)
	        });

	      if (event) {
	        event.stopPropagation();
	      }
	      if (options.onZoom) {
	        options.onZoom(d);
	      }
	    }

	    function applyGroupers(groupingTarget) {
	      const kx = w / (groupingTarget.x1 - groupingTarget.x0);
	      const ky = h / (groupingTarget.y1 - groupingTarget.y0);

	      const topNodes = tree.children
	        .filter(function(d) {
	        	return d.parent === groupingTarget;
	        });

	      svg.selectAll('.grouper')
	        .remove();
	      const groupers = svg.selectAll('.grouper')
	        .data(topNodes)
	        .enter()
	        .append('g')
	        .attr('class', 'grouper')
	        .attr('transform', function (d) {
	        	return `translate(${(d.x0 + 1)}, ${(d.y0 + 1)})`;
	        })
	        .attr('display', 'none');

	      groupers.append('rect')
	        .attr('width', function(d) {
	        	return Math.max(0, (kx * (d.x1 - d.x0)) - 1);
	        })
	        .attr('height', function(d) {
	        	return Math.max(0, (ky * (d.y1 - d.y0)) - 1);
	        })
	        .attr('title', function(d) {
	        	return d.name;
	        })
	        .attr('id', function(d) {
		        return d.id;
	      	});
	    }

	    const nodes = tree.leaves()
	      .filter(function(d) {
	      	return options.getsizevalue(d.data);
	      });

	    const extent = d3.extent(nodes, function(d) {
	    	return options.getcolorvalue(d.data);
	    });
	    const median = d3.median(nodes, function(d) {
	    	return options.getcolorvalue(d.data);
	    });

	    let colorRange;
	    if (options.getcolorrange) {
	      colorRange = options.getcolorrange();
	    } else {
	      colorRange = ['#E4FF7A', '#FC7F00'];
	    }

	    let colorScale = [extent[0], median, extent[1]];
	    if (options.getcolorscale) {
	      colorScale = options.getcolorscale();
	    }
	    const color = d3.scaleLinear()
	      .domain(colorScale)
	      .range(colorRange);

	    const cell = svg.selectAll('g')
	      .data(nodes)
	      .enter().append('g')
	      .attr('class', 'cell')
	      .attr('transform', function(d) {
	      	return `translate(${d.x0}, ${d.y0})`;
	      });

	    cell.append('rect')
	      .attr('width', function(d) {
	      	return Math.max(0, d.x1 - d.x0 - 1);
	      })
	      .attr('height', function(d) {
	      	return Math.max(0, d.y1 - d.y0 - 1);
	      })
	      .attr('id', function(d) {
	      	return d.id;
	      })
	      .style('fill', function(d) {
	      	return color(options.getcolorvalue(d.data));
	      })
	      .on('click', function(d) {
	        if (options.useTip) {
	          tip.hide();
	        }
	        if (event.altKey) {
	          zoom(hierarchy);
	          applyGroupers(hierarchy);
	        } else if (event.ctrlKey) {
	          let currentTarget = d;

	          while (currentTarget.depth !== currentDepth + 1) {
	            currentTarget = currentTarget.parent;
	          }
	          currentDepth = currentTarget.depth;
	          if (currentTarget.children && currentTarget.children.length > 1) {
	            applyGroupers(currentTarget);
	            zoom(currentTarget);
	          } else {
	            currentDepth = 0;
	            applyGroupers(hierarchy);
	            zoom(hierarchy);
	          }
	        } else {
	          options.onclick(d.data);
	        }
	      });

	    if (options.useTip) {
	      svg.call(tip);
	      cell
	        .on('mouseover', function(d) {
	        	return tip.show(d, event.target);
	        })
	        .on('mouseout', function(d) {
	        	return tip.hide(d, event.target);
	      });
	    } else {
	      cell
	        .attr('data-container', 'body')
	        .attr('data-toggle', 'popover')
	        .attr('data-trigger', 'hover')
	        .attr('data-placement', 'top')
	        .attr('data-html', true)
	        .attr('data-title', function(d) {
	        	return options.gettitle(d.data);
	        })
	        .attr('data-content', function(d) {
	        	return options.getcontent(d.data);
	        });
	    }

	    if (options.initialZoomedConcept) {
	      applyGroupers(options.initialZoomedConcept);
	      zoom(options.initialZoomedConcept, false);
	    } else {
	      applyGroupers(hierarchy);
	    }
	    svg
	      .selectAll('.grouper')
	      .attr('display', 'block');
	  }

	  static buildHierarchyFromJSON(data, threshold, leafNodeCreator) {
	    let total = 0;

	    const root = {
	      name: 'root',
	      children: [],
	    };

	    data.PERCENT_PERSONS.forEach(function(p) {
	      total += p;
	    });

	    data.CONCEPT_PATH.forEach(function(path, i) {
	      const parts = path.split('||');
	      let currentNode = root;
	      for (let j = 0; j < parts.length; j += 1) {
	        const children = currentNode.children;
	        const nodeName = parts[j];
	        let childNode;
	        if (j + 1 < parts.length) {
	          // Not yet at the end of the path; move down the tree.
	          let foundChild = false;
	          children.forEach(function(child) {
	            if (child.name === nodeName) {
	              childNode = child;
	              foundChild = true;
	            }
	          });
	          // If we don't already have a child node for this branch, create it.
	          if (!foundChild) {
	            childNode = {
	              name: nodeName,
	              children: [],
	            };
	            children.push(childNode);
	          }
	          currentNode = childNode;
	        } else {
	          // Reached the end of the path; create a leaf node.
	          childNode = leafNodeCreator(nodeName, i, data);

	          // we only include nodes with sufficient size in the treemap display
	          // sufficient size is configurable in the calculation of threshold
	          // which is a function of the number of pixels in the treemap display
	          if ((data.PERCENT_PERSONS[i] / total) > threshold) {
	            children.push(childNode);
	          }
	        }
	      }
	    });
	    return root;
	  }
	}
		
	return Treemap;
	
});
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

define('atlascharts/scatterplot',['d3', 'd3-tip', './chart'],
	function(d3, d3tip, Chart) {
	'use strict';

	class Scatterplot extends Chart {
	  render(data, target, w, h, chartOptions) {
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
				showSeriesLabel: false,
				labelIndexDate: false,
				colorBasedOnIndex: false,
				showXAxis: true,
				tooltip: (d) => {
					return `<div>Series: ${d.seriesName}</div>
					<div>X: ${d[options.xValue]}</div>
					<div>Y: ${d[options.yValue]}</div>
					`;
				}
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
					
		    const tip = d3tip()
		      .attr('class', 'd3-tip')
		      .offset([-10, 0])
		      .html(options.tooltip)
		    svg.call(tip);

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
					.ticks(4);

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
					.attr('r', 1)
					.style('fill', function (d, i) {
						return options.colors(d.seriesName);
					})
					.attr('transform', function (d) {
						const xVal = x(d[options.xValue]);
						const yVal = y(d[options.yValue]);
						return 'translate(' + xVal + ',' + yVal + ')';
					});


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
				series.selectAll('.focus')
					.data(function (series) {
						return series.values.map(value => Object.assign({}, value, { seriesName: series.name }));
					})
					.enter()
					.append('circle')
					.attr('class', 'focus')
					.attr('r', 1)
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
						tip.show(d, event.target);
					})
					.on('mouseout', function (d) {
						d3.select(this).style('opacity', '0');
						tip.hide(d, event.target);
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

define('atlascharts/main',['require','./chart','./areachart','./barchart','./boxplot','./donut','./histogram','./line','./trellisline','./treemap','./scatterplot'],function(require) {
	"use strict";
	
	var module = {
		version: "0.0.1"
	}
	
	var chart = require("./chart");
	var areachart = require("./areachart");
	var barchart = require("./barchart");
	var boxplot = require("./boxplot");
	var donut = require("./donut");
	var histogram = require("./histogram");
	var line = require("./line");
	var trellisline = require("./trellisline");
	var treemap = require("./treemap");
	var scatterplot = require("./scatterplot");
	
	module.chart = chart;
	module.areachart = areachart;
	module.barchart = barchart;
	module.boxplot = boxplot;
	module.donut = donut;
	module.histogram = histogram;
	module.line = line;
	module.trellisline = trellisline;
	module.treemap = treemap;
	module.scatterplot = scatterplot;
	
	return module;
	
});

define('atlascharts', ['atlascharts/main'], function (main) { return main; });

