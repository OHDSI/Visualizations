const d3scale = require('d3-scale');
const d3tip = require('d3-tip');
const d3 = require('d3');
const numeral = require('numeral');
import Chart from './Chart';

class BarChart extends Chart {
  static getFormatters() {
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
    const svg = this.createSvg(target, w, h);

    const label = options.label;
    const value = options.value;

    let total = 0;
    data.forEach((d) => {
      total = total + d[value];
    });

    // axes
    const x = d3.scaleBand()
      .range([0, width])
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

    var tip = d3tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(d => d.value)
    svg.call(tip);

    x.domain(data.map(d => d[label]));
    y.domain([0, options.yMax || d3.max(data, d => d[value])]);

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height + 1})`)
      .call(xAxis)
      .selectAll('.tick text')
      .style('text-anchor', options.textAnchor)
      .attr('transform', d => `rotate(${options.rotate})`);

    svg.append('g')
      .attr('class', 'y axis')
      .attr('transform', 'translate(0, 0)')
      .call(yAxis);

    if (options.wrap) {
      svg.selectAll('.tick text')
        .call(this.wrap, x.bandwidth());
    }

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
        let temp_title = `${d[label]}: ${Bar.getFormatters().commaseparated(d[value], ',')}`;
        if (total > 0) {
          temp_title += ` (${Bar.getFormatters().formatpercent(d[value] / total)})`;
        } else {
          temp_title += ` (${Bar.getFormatters().formatpercent(0)})`;
        }
        return temp_title;
      })
      .style('fill', d => options.colors[d[label]])
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
        .text(d => Bar.getFormatters().formatpercent(d[value] / total))
        .attr('x', d => x(d[label]) + x.rangeBand() / 2)
        .attr('y', d => y(d[value]) - 3)
        .attr('text-anchor', 'middle');
    }
  }
}

export default BarChart;
