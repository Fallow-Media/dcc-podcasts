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
    // eleventyConfig.addPassthroughCopy("dcc_audio.xml");

    // Filter for content
    eleventyConfig.addFilter("podcastDate", (date) => { 
      let d = new Date(date);
      return d.toLocaleString('en-GB', { timeZone: 'UTC' })
    });

    eleventyConfig.addFilter("podcastLocation", (content) => { 
      let split = content.split("\n");
      return split[2];
    });

    eleventyConfig.addPlugin(pluginRss);

    // Return your Object options:
    return {
      dir: {
        input: "static/src",
        output: "static/dist"
      }
    }
  };