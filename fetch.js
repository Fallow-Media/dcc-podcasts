const Eleventy = require("@11ty/eleventy");
require('dotenv').config();

const build = async () => {
	
	let elev = new Eleventy( "./static/src", "./static/dist", {
		// --quiet
		quietMode: true,
	
		// --config
		configPath: ".eleventy.js",
	
	  });
	
	// Rebuild the site.
    elev.write();
}

build();