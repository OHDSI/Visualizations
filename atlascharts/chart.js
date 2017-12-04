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

define(["d3", "d3-selection", "d3-scale"],
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
	      .attr('width', width)
	      .attr('height', height)
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
