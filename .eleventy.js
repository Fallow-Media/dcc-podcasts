const Parser = require('rss-parser');
require('dotenv').config();

const space_url = process.env.R2_URL;
const parser = new Parser();

module.exports = function(eleventyConfig) {
    eleventyConfig.addGlobalData(
      "podcastData",
      async () => {
        let pod_feed = await parser.parseURL(`${space_url}/dcc_audio.xml`);
        pod_feed.items.forEach(item => {
          let link_split = item.guid.split('/');
          item.activity_id = link_split[link_split.length - 1];
        });
          return Promise.resolve(pod_feed);
      }
    );
    eleventyConfig.addPassthroughCopy("static/src/css/bundle.css");

    // Filter for content
    eleventyConfig.addFilter("podcastDate", (content) => { 
      let split = content.split("\n");
      return split[1];
    });

    eleventyConfig.addFilter("podcastLocation", (content) => { 
      let split = content.split("\n");
      return split[2];
    });

    // Return your Object options:
    return {
      dir: {
        input: "static/src",
        output: "static/dist"
      }
    }
  };