require("dotenv").config();
const express = require("express");

const moment = require('moment');
const app = express();
const PORT = process.env.PORT || 3000;
const supabase = require("./supabase.js");

function dataDisplayer(data) {
    const cache_time = data.updated_at 
        ? moment(data.updated_at).utcOffset(0) //Set the time to UTC+0 so that it matches the API data
        : null; //If the data is live and not from the cache, ignore this

    //What time was the data last updated?
    const updated_time = data.cached 
        //Set it to a 30 minute interval to match the format
        ? (cache_time.minutes() > 30)
            ? cache_time.clone().minutes(30)
            : cache_time.clone().minutes(0)    
        : null; //If the data is live and not from the cache, ignore this

    //What index of the data to use?
    const rawIndex = !(data.cached)
        //Gets the index to use based off time difference between data upload and current time, intervals between each object are 30 minutes so we use that to calculate the index
        ? 0 //If the data is live, use the first index
        : Math.floor(moment().diff(moment(updated_time), 'minutes') / 30);

    const index = Math.min(rawIndex, 47); //If the index exceeds the length of the data, set it to the last index

    //Checking status of the data
    const status = (index > 47)
        ? "Out of date data, showing last available data"
        : (data.cached || index > 0) 
            ? "Showing predictive data from " + moment().diff(cache_time, 'hours') + " hours and " + moment().diff(cache_time, 'minutes') % 60 + " minutes ago"
            : "Showing live data";
    
    return {data: data.data.data[index], status: status};
}

app.use(express.static("."));

app.get("/api/carbon-intensity", async (req, res) => {
    try {
        // If API_MODE is set to "fail", throw an error to simulate an API failure
        if (process.env.API_MODE === "fail") {
            throw new Error("API failure intentionally triggered for testing");
        }

        // Get time off set by -30 minutes so that inteisty returns an actual value rather than purely predictive values
        const time = moment().subtract(30, 'minutes').format('YYYY-MM-DDTHH:mm:ssZ');
        // Fetch data from the external API
        const response = await fetch("https://api.carbonintensity.org.uk/intensity/" + time + "/fw24h");

        // Check if the response is ok (status code 200-299)
        if (!response.ok) {
            throw new Error(`External API returned ${response.status}`);
        }

        // Data from response
        const data = await response.json();

        // Save data to Supabase
        await supabase.from("cached-data").upsert({id: 1, data: data, created_at: new Date().toISOString()});

        res.json(dataDisplayer({
            data: data,
            cached: false
        }));
        
    }
    catch (error) {
        const {data: cached, error: cachedError} = await supabase
            .from("cached-data")
            .select("data, created_at")
            .eq("id", 1)
            .single();

        if (cachedError) {
            return res.status(500).json({error: "Failed to fetch data from external API and no cached data available."});
        }

        //Send data to displayer
        res.json(dataDisplayer({
            data: cached.data,
            cached: true,
            updated_at: cached.created_at
        }))

    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
