const Parser = require('rss-parser');
require('dotenv').config();

const space_url = process.env.R2_URL;
const parser = new Parser();

module.exports = function(eleventyConfig) {
    eleventyConfig.addGlobalData(
      "podcastData",
      async () => {
        let pod_feed = await parser.parseURL(`${space_url}/dcc_audio.xml`);

        let formatMeetingTime = (meetingTime) => {
          let split = meetingTime.split(" ");
          let date = split[0].split("/").reverse().join("-");
          let time = split[1].split(".");
          let hour = (split[2] == "pm") ? time[0] : parseInt(time[0]) + 12;
          return Date.parse(date + ` ${hour}:${time[1]}:00 GMT`);
        }

        pod_feed.items.forEach(item => {
          let link_split = item.guid.split('/');
          let activity_time_string = item['content:encoded'].split("\n")[1];
          item.activity_id = link_split[link_split.length - 1];
          item.activity_date = formatMeetingTime(activity_time_string);
        });

        pod_feed.items.sort((a, b) => b.activity_date - a.activity_date);
       
        return Promise.resolve(pod_feed);

      }
    );
    eleventyConfig.addPassthroughCopy("static/src/css/bundle.css");
    eleventyConfig.addPassthroughCopy("dcc_audio.xml");

    // Filter for content
    // TODO: Use the new activity_date data to display this.
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