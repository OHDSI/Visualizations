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
define(["d3", "./chart"],
	function(d3, Chart) {
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

	  static convertData(data) {
      // convert data to multi-series format if not already formatted
      if (!data[0].hasOwnProperty('values')) {
        // assumes data is just an array of values (single series)
        data = [
          {
            name: '',
            values: data
          }
        ];
      }
      return data;
		}

    static getMinValue(data, key) {
      return d3.min(data, d => d3.min(d.values, d => d[key]));
    }

    static getMaxValue(data, key) {
      return d3.max(data, d => d3.max(d.values, d => d[key]));
    }

    static getZeroBasedY({ data, yValue, height }) {
      const maxY = Line.getMaxValue(data, yValue);

      return d3.scaleLinear()
        .domain([0, maxY])
        .range([height, 0]);
		}

    static getRelativeY({ data, yValue = "yValue", height, yRangePadding = 0.1, defaultYRangePadding = 10 }) {
      data = Line.convertData(data);

      const minY = Line.getMinValue(data, yValue);
      const maxY = Line.getMaxValue(data, yValue);
      const padding = ((maxY - minY) * yRangePadding) || defaultYRangePadding;

      return d3.scaleLinear()
        .domain([minY - padding, maxY + padding])
        .range([height, 0]);
    }


    render(data, target, w, h, chartOptions) {

      if (typeof target == "string") {
        target = document.querySelector(target);
      }
            
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
	      yTicks: 4,
	      showSeriesLabel: false,
	      labelIndexDate: false,
	      colorBasedOnIndex: false,
        getTooltipBuilder: null,
      };
      const options = this.getOptions(defaults, chartOptions);
      
      // container SVG
      const svg = this.createSvg(target, w, h);

      const tooltipBuilder = typeof options.getTooltipBuilder === 'function'
				? options.getTooltipBuilder(options)
				: this.lineDefaultTooltip(
						options.xLabel || 'x',
						options.xFormat,
						d => d[options.xValue],
						options.yLabel || 'y',
						options.yFormat,
						d => d[options.yValue],
						d => d[options.seriesName]
					);

	    if (data.length > 0) {
	      data = Line.convertData(data);

	      this.useTip((tip) => {
	        tip.attr('class', 'd3-tip')
	          .offset([-10, 0])
	          .html(tooltipBuilder);
	      });

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
	        yAxisLabelWidth = bbox.width * 1.2; // padding 20% of label width.
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
          
          if (legendWidth > w/3) {
            legend.style('display',"none");
          }
	      }

	      // calculate an intial width and height that does not take into account the tick text dimensions
	      let width = w - options.margins.left - options.margins.right - yAxisLabelWidth - (legendWidth > w/5 ? 0 : legendWidth);
	      let height = h - options.margins.top - options.margins.bottom - xAxisLabelHeight;

	      // define the intial scale (range will be updated after we determine the final dimensions)
	      const x = options.xScale || d3.scaleLinear()
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

	      const y = options.yScale || Line.getZeroBasedY({ data, height, yValue: options.yValue });

	      const yAxis = d3.axisLeft()
	        .scale(y)
	        .tickFormat(options.yFormat)
	        .ticks(options.yTicks);


				const tempXAxis = svg.append('g').attr('class', 'axis');
	      tempXAxis.call(xAxis);
	      const xAxisHeight = Math.round(tempXAxis.node().getBBox().height);
	      const xAxisWidth = Math.round(tempXAxis.node().getBBox().width);
	      height = height - xAxisHeight;
	      width = width - Math.max(0, (xAxisWidth - width));
	      // trim width if xAxisWidth bleeds over the allocated width.
	      tempXAxis.remove();

	      let yAxisWidth = options.yAxisWidth;
        
        if (options.yAxisWidth == undefined) {
          const tempYAxis = svg.append('g').attr('class', 'axis');
          tempYAxis.call(yAxis);

          // update height based on temp xaxis dimension and remove
          yAxisWidth = Math.round(tempYAxis.node().getBBox().width);
          tempYAxis.remove();
        }

        width = width - yAxisWidth;

	      // reset axis ranges
	      // if x scale is ordinal, then apply rangeRoundBands, else apply standard range.
	      if (typeof x.rangePoints === 'function') {
	        x.rangePoints([0, width]);
	      } else {
	        x.range([0, width]);
	      }
	      y.range([height, 0]);

	      // create a line function that can convert data[] into x and y points

	      const line = d3.line()
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

        this.appendTracker({
          vis,
          data,
          width,
          height,
          x,
          y,
          options
        });

	    } else {
	      svg.append('text')
	        .attr('transform', `translate(${w / 2}, ${h / 2})`)
	        .style('text-anchor', 'middle')
	        .text('No Data');
	    }

	  }
	  
	  appendTracker({vis, data, width, height, x, y, options}) {
      const xLineClass = "x-hover-line";
	  	
      const tracker = vis.append("g")
        .attr("class", "current-focus")
        .style("display", "none");

      const line = tracker.append("line")
        .attr("class", xLineClass)
        .style("stroke-width", "2px")
        .style("stroke-dasharray", "3,3")
        .attr("y1", 0);

      const circle = tracker.append("circle")
        .attr("r", 2);
      
      const rect = vis.append("rect")
				.style("opacity", 0);

      // will use a quadtree to identify datanodes via x/y
      const tree = d3.quadtree()
        .x(d => x(d[options.xValue]))
        .y(d => y(d[options.yValue]));
      
      const flatData = data.reduce((flattened, series) => {
        return flattened.concat(series.values.map(row => {
          row.name = series.name
          return row;
        }));
      },[]);
      
      var lastDatum = null;
      
      tree.addAll(flatData);

      rect
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .attr('pointer-events', 'all')
        .on("mouseover", () => tracker.style("display", null))
        .on("mouseout", () => {
          tracker.style("display", "none");
          this.tip.hide({}, tracker.node());
        });

      rect.on("mousemove", () => {
        const e = d3.event, mouse = d3.mouse(e.target);

        const d = tree.find(mouse[0], mouse[1]);
        
        // set tracker element styles
        circle.style("fill", options.colors(d.name));
        line.style("stroke", options.colors(d.name));
        line.attr("y2", height - y(d[options.yValue]));
        
        tracker.attr("transform", "translate(" + x(d[options.xValue]) + "," + y(d[options.yValue]) + ")");
        this.tip.show(d, tracker.node());
        
      })
		}

	}
	
	return Line;
	
});
