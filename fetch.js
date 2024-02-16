const Parser = require('rss-parser');
const fetch = require('node-fetch');
const fs = require("fs");
const Podcast = require('podcast');
const Eleventy = require("@11ty/eleventy");
require('dotenv').config();

// Define the path for the R2 Bucket
const space_url = process.env.R2_URL;
const parser = new Parser();


const getRemoteXML = async () => {
    try {
        // Fetch the remote XML
        let remoteXML = await fetch(`${space_url}/dcc_audio.xml`).then(res => res.text());
        // Overwrite xml file
        fs.writeFileSync('dcc_audio.xml', remoteXML);
    } catch (error) {
        console.error(error);
    }
};

const build = async () => {

    await getRemoteXML();
	
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