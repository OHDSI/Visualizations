const d3scale = require('d3-scale');
const d3tip = require('d3-tip');
const d3 = require('d3');
const d3shape = require('d3-shape');
import Chart from './Chart';

class Line extends Chart {
  static getInterpolation() {
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

  static render(data, target, w, h, chartOptions) {
    // options
    const defaults = {
      xFormat: this.getFormatters().formatSI(3),
      yFormat: this.getFormatters().formatSI(3),
      interpolate: this.getInterpolation().linear,
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
            .style('fill', options.colors[i]);

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
        seriesLines.style('stroke', (d, i) => options.colors[i]);
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

export default Line;
