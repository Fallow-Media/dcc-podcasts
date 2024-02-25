const createClient = require("@supabase/supabase-js").createClient;
const pluginRss = require("@11ty/eleventy-plugin-rss");
require('dotenv').config();

module.exports = function(eleventyConfig) {
    eleventyConfig.addGlobalData(
      "podcastData",
      async () => {
        const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);
        const { data, error } = await supabase.from('meetings').select().order('isoDate', { descending: true });
        return data.reverse();
      }
    );

    eleventyConfig.addPassthroughCopy("static/src/css/bundle.css");
    eleventyConfig.addPassthroughCopy("static/src/council-pods-test-image.jpg");

    // Filter for content
    eleventyConfig.addFilter("podcastDate", (date) => { 
      let d = new Date(date);
      return d.toLocaleString('en-GB', { timeZone: 'UTC' })
    });

    eleventyConfig.addFilter("feedDate", (date) => { 
      let d = date ? new Date(date) : new Date();
      return d.toUTCString();
    });

    eleventyConfig.addFilter("podcastLocation", (content) => { 
      let split = content.split("\n");
      return split[2];
    });

    eleventyConfig.addPlugin(pluginRss);

    eleventyConfig.addNunjucksGlobal("now", function() {
      const n = new Date();
      return n.toUTCString();
    });

    // Return your Object options:
    return {
      dir: {
        input: "static/src",
        output: "static/dist"
      }
    }
  };