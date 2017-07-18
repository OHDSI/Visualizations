const d3 = require('d3');
const d3selection = require('d3-selection');
const d3scale = require('d3-scale');
import clone from 'lodash/clone';

class Chart {
  static getChartTypes() {
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
    return {
      margins: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10,
      },
      xFormat: d3.format(',.0f'),
      yFormat: d3.format('s'),
      colors: d3scale.schemeCategory20.concat(d3scale.schemeCategory20c),
      ...clone(chartSpecificDefaults),
      ...clone(customOptions),
    };
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
    const frame = { ...dataframe };
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

  static getFormatters() {
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

  static wrap(text, width) {
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

  static tooltipFactory(tooltips) {
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

  static lineDefaultTooltip(
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

  static donutDefaultTooltip(labelAccessor, valueAccessor, percentageAccessor) {
    return (d) =>
      `${labelAccessor(d)}: ${valueAccessor(d)} (${percentageAccessor(d)})`
  }

  static mapMonthYearDataToSeries(data, customOptions) {
    const defaults = {
      dateField: 'x',
      yValue: 'y',
      yPercent: 'p'
    };

    const options = {
      ...defaults,
      ...customOptions,
    };

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
      case this.getChartTypes().BOXPLOT:
        return rawData.CATEGORY.map((d,i) => ({
          Category: rawData.CATEGORY[i],
          min: rawData.MIN_VALUE[i],
          max: rawData.MAX_VALUE[i],
          median: rawData.MEDIAN_VALUE[i],
          LIF: rawData.P10_VALUE[i],
          q1: rawData.P25_VALUE[i],
          q3: rawData.P75_VALUE[i],
          UIF: rawData.P90_VALUE[i],
        }), rawData);
    }
  }
}

export default Chart;
