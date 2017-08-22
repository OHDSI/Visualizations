requirejs.config({
	packages: [
		{
			name: "atlascharts",
			location: "../atlascharts",
			main: "main"
		}
	],
	paths: {
		"d3": "https://unpkg.com/d3@4.10.0",
		"d3-tip": "https://cdnjs.cloudflare.com/ajax/libs/d3-tip/0.7.1/d3-tip.min",
		"d3-selection": "https://unpkg.com/d3-selection@1.1.0",
		"d3-shape": "https://unpkg.com/d3-shape@1.2.0",
		"d3-drag": "https://unpkg.com/d3-drag@1.1.1",
		"d3-scale": "https://unpkg.com/d3-scale@1.0.6",
		"numeral": "https://unpkg.com/numeral@2.0.6",
		"lodash": "https://unpkg.com/lodash@4.17.4",

		"areachart": "../atlascharts/areachart",
		"barchart": "../atlascharts/barchart",
		"boxplot": "../atlascharts/boxplot",
		"donut": "../atlascharts/donut",
		"histogram": "../atlascharts/histogram",
		"line": "../atlascharts/line",
		"trellisline": "../atlascharts/trellisline",
		"treemap": "../atlascharts/treemap",
		"chart": "../atlascharts/chart"
	}
});
