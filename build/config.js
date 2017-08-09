requirejs.config({
	packages: [
		{
			name: "atlascharts",
			location: "../atlascharts",
			main: "main"
		}
	],
	paths: {
		"jquery": "https://code.jquery.com/jquery-1.11.2.min",
		"d3": "https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min",
		"d3_tip": "https://cdnjs.cloudflare.com/ajax/libs/d3-tip/0.7.1/d3-tip.min",
	}
});
