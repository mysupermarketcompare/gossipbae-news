const express = require('express');
const axios = require('axios');
const cors = require('cors');
const xml2js = require('xml2js');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

app.get('/api/latest-video', async (req, res) => {
    try {
        const RSS_URL = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCqjZHeEOZ2MFHM33dzFJsLQ';
        const response = await axios.get(RSS_URL);
        
        // Parse XML to JSON
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        const latestVideo = result.feed.entry[0];
        
        const videoData = {
            id: latestVideo['yt:videoId'][0],
            title: latestVideo.title[0],
            publishedAt: new Date(latestVideo.published[0]).toLocaleString()
        };
        
        res.json(videoData);
    } catch (error) {
        console.error('Error fetching RSS feed:', error);
        res.status(500).json({ error: 'Unable to fetch latest video' });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});