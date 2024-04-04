const Parser = require('rss-parser');
const fetch = require('node-fetch');
const ffmpeg = require('fluent-ffmpeg');
const AWS = require("aws-sdk");
const fs = require("fs");
const Eleventy = require("@11ty/eleventy");
const createClient = require("@supabase/supabase-js").createClient;
require('dotenv').config();

const isProduction = (process.env.NODE_ENV === 'production');

// FFMPEG_PATH='/opt/build/repo/bin/ffmpeg-git-20240213-amd64-static/ffmpeg'
// FFPROBE_PATH='/opt/build/repo/bin/ffmpeg-git-20240213-amd64-static/ffprobe'
// FFFASTSTART_PATH='/opt/build/repo/bin/ffmpeg-git-20240213-amd64-static/qt-faststart'

if (isProduction === true) {
	exec(`chmod +x ${process.env.FFMPEG_PATH}`);
	exec(`chmod +x ${process.env.FFPROBE_PATH}`);
	exec(`chmod +x ${process.env.FFFASTSTART_PATH}`);
}

// Define the path for the R2 Bucket
const space_url = process.env.R2_URL;
const parser = new Parser();

// Save to Supabase
const save_to_db = async (meeting) => {
	let dataToSave = {
		activity_id: meeting.meeting_info.activity_id, 
		audio_file_url: `${space_url}/${meeting.audio_file_name}`, 
		title: meeting.meeting_info.title, 
		link: meeting.meeting_info.link, 
		content: meeting.meeting_info.content, 
		guid: meeting.meeting_info.guid, 
		isoDate: meeting.meeting_info.isoDate, 
		transcript: meeting.meeting_info.transcript,
		size: meeting.meeting_info.enclosure.size
	};
	console.log({dataToSave});
	const supabase = createClient(process.env.SUPA_URL, process.env.SUPA_KEY);
	const { error } = await supabase.from('meetings').insert(dataToSave);
	console.log({error});
};

/**
 * 
 * @param { string } text 
 * @returns { string } slugified text
 */
const slugify = text => {
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};


/**
 *    input - string, path of input file
 *    output - string, path of output file
 *    callback - function, fn (error, result)        
 */
async function convert(input, output) {
	await new Promise((resolve, reject) => {
		try {
			ffmpeg(input)
				.noVideo()
				.output(output)
				.on('progress', function(progress) {
					console.log('Processing: ' + progress.percent + '% done');
				})
				.on('end', function() {                    
					console.log('conversion ended');
					resolve(output);
				}).on('error', function(err){
					console.log('error: ', err.code, err.msg);
					throw new Error(err)
				}).run();
		} catch (error) {
			console.log(error);
			reject(error);
		}
	});
}


/**
 *    input - string, path of input file
 *    output - string, path of output file
 *    callback - function, fn (error, result)    
 */
async function upload(input, output) {
	console.log('Uploading File...');
	const r2Endpoint = new AWS.Endpoint(process.env.R2_ENDPOINT);
	const s3 = new AWS.S3({
		endpoint: r2Endpoint, 
		accessKeyId: process.env.R2_KEY, 
		secretAccessKey: process.env.R2_SECRET
	});

	const file = fs.readFileSync(input);

	await new Promise((resolve, reject) => {
		try {
			s3.putObject({
				Bucket: process.env.R2_NAME, 
				Key: output, 
				Body: file, 
				ACL: "public-read"}, (err, data) => {
				if (err) {
					throw new Error(err);
				} else {
					console.log("Your file has been uploaded successfully!", output);
					resolve(output);
				}
			});
		} catch (error) {
			console.log(error);
			reject(error)
		}
	});

}


/**
 * audio_file_path – string, path of the file to transcribe
 */
/* async function transcribe(audio_file_path) {
	console.log('Beginning Transcription...');

	// Authenticate
	const speechToText = new SpeechToTextV1({
		authenticator: new IamAuthenticator({
			apikey: process.env.IBM_API_KEY,
		}),
		serviceUrl: process.env.IBM_API_URL,
		disableSslVerification: true,
		maxContentLength: Infinity,
		maxBodyLength: Infinity
	});

	// Set the params for the transcription
	const recognizeParams = {
		audio: fs.createReadStream(audio_file_path),
		contentType: 'audio/mp3'
	};


	// Function to stitch the results together after.
	const stitch = (transcript, name) => {
		let results = transcript.result.results.map(r => r.alternatives[0].transcript);
		fs.writeFileSync(`${name}.txt`, results.join(''));
		console.log('Transcription Finished.');
	}

	// Begin the transcription.
	await new Promise((resolve, reject) => {
		try {
			speechToText.recognize(recognizeParams)
			.then(async speechRecognitionResults => {

				// Generate the filename for the transcript
				let split_a = audio_file_path.split('/');
				let transcript_file_name = split_a[split_a.length - 1].split('.')[0];

				// Output the full result of Speech-to-Text
				fs.writeFileSync(`${transcript_file_name}.json`, JSON.stringify(speechRecognitionResults, null, 2));

				// Create the plaintext transcript
				stitch(speechRecognitionResults, transcript_file_name);

				// Upload the transcripts
				await upload(`${transcript_file_name}.json`, `${transcript_file_name}.json`);
				await upload(`${transcript_file_name}.txt`, `${transcript_file_name}.txt`);

				resolve(transcript_file_name);
			})
			.catch(err => {
				console.log('error:', err);
				throw new Error(err);
			});
			
		} catch (error) {
			reject(error);
		}
	});
} */


async function delete_file(video_file_name) {
	console.log('Deleting Video File...');
	fs.unlink(video_file_name, (err) => {
		if (err) {
			console.error(err)
		}
		return;
	});
}

function is_avail(video_link) {
	return video_link.includes('not-available') ? false : true;
}


const get_remote_files = async () => {
    const r2Endpoint = new AWS.Endpoint(process.env.R2_ENDPOINT);
	const s3 = new AWS.S3({
		endpoint: r2Endpoint, 
		accessKeyId: process.env.R2_KEY, 
		secretAccessKey: process.env.R2_SECRET
	});

	let data = await new Promise((resolve, reject) => {
		try {
            s3.listObjectsV2({Bucket: process.env.R2_NAME}, function(err, data) {
                if (err) {reject(err)} else {
                    resolve(data.Contents);
                };
            });
		} catch (error) {
			console.log(error);
			reject(error)
		}
	});

    return data.reduce((r, f) => {
        if (f.Key.includes(".mp3")) {
            r.push({
                activity_id: f.Key.split("_")[0],
                url: `${space_url}/${f.Key}`,
                size: f.Size
            })
        }
        return r;
    }, []);
}


function is_new(activity_id, files) {
	return (files.find(f => f.activity_id == activity_id)) ? false : true;
}

const get_link = async (redirect_link) => {
	try {
		return await fetch(redirect_link).then(res => res.url);
	} catch (error) {
		console.error(error);
		throw(error);
	}
}

function get_meeting_info(item, activity_id) {
	return {
		title: item.title,
		link: item.link,
		content: item.content,
		guid: item.guid,
		pubDate: item.pubDate,
		isoDate: item.isoDate,
		activity_id: parseInt(activity_id),
		transcript: null,
		enclosure: {
			url: null,
			size: null
		},
		itunesExplicit: false,
		itunesSummary: item.content
	}
}

const get_size = async (audio_file_name) => {
	const stats = fs.statSync(`./tmp/${audio_file_name}`);
	return stats.size;
}

const pipeline = async (activity) => {

	let { video_link, audio_file_name } = activity;

	await convert(video_link, `./tmp/${audio_file_name}`);

	activity.meeting_info.enclosure.size = await get_size(audio_file_name);
	activity.meeting_info.enclosure.url = `${space_url}/${audio_file_name}`;

	await upload(`./tmp/${audio_file_name}`, audio_file_name); 

	// return await transcribe(`./tmp/${audio_file_name}`);
}

const check_for_new = async () => {

	// Setup the RSS feeds
	let dcc_feed = await parser.parseURL('https://dublincity.public-i.tv/core/data/7844');

	let files = await get_remote_files();

	let newActivities = [];

	let i = 0;

	for (const item of dcc_feed.items) {

		i++;

		// Maximum of 10 new items at a time, because Netlify times out the build after 20 minutes.
		if (i == 11) break;

		// Get the id of this particular meeting
		let link_split = item.link.split('/');
		let activity_id = link_split[link_split.length - 1];

		// Create the initial link (which redirects to the actual video).
		let redirect_link = `https://dublincity.public-i.tv/core/redirect/download_webcast/${activity_id}/video.mp4`;

		// Get the actual video link.
		let video_link = await get_link(redirect_link);

		// Create the file names.
		let audio_file_name = `${activity_id}_${slugify(item.title)}.mp3`;

		// Make sure the video is available
		if (!is_avail(video_link)) continue;

		// Check if the video is new
		if (!is_new(activity_id, files)) continue;

		// Get the meeting info to include with the podcast episode.
		let meeting_info = get_meeting_info(item, activity_id);

		let activity = {
			video_link: video_link,
			audio_file_name: audio_file_name,
			meeting_info: meeting_info
		}

		newActivities.push(activity);

	}

	if (newActivities.length > 0) {

		console.log("New Activities: ", newActivities.length);

		// Convert the videos and upload them to R2
		for (const activity of newActivities) {
			await pipeline(activity);
			await save_to_db(activity);
			await delete_file(`./tmp/${activity.audio_file_name}`);
		}
		
		return true;
	} else {
		console.log("No new activities found...");
		return false;
	}
}

const build = async () => {
	
	let elev = new Eleventy( "./static/src", "./static/dist", {
		// --quiet
		quietMode: true,
	
		// --config
		configPath: ".eleventy.js",
	
	  });
	
	// Check for new episodes, convert and add to the feed if so.
	console.log("Checking for new pods...");
	await check_for_new();

	// Rebuild the site.
	elev.write();
}

build();