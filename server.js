require("dotenv").config();
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const supabase = require("./supabase.js");

app.use(express.static("."));

app.get("/api/carbon-intensity", async (req, res) => {
    try {
        // Fetch data from the external API
        const response = await fetch("https://api.carbonintensity.org.uk/intensity");

        // Check if the response is ok (status code 200-299)
        if (!response.ok) {
            throw new Error(`External API returned ${response.status}`);
        }

        // Data from response
        const data = await response.json();

        // Save data to Supabase
        await supabase.from("cached-data").upsert({id: 1, data: data, created_at: new Date().toISOString()});

        res.json({
            data: data,
            cached: false
        });
    }
    catch (error) {
        const {data: cached, error: cachedError} = await supabase
            .from("cached-data")
            .select("data")
            .eq("id", 1)
            .single();

        if (cachedError) {
            return res.status(500).json({error: "Failed to fetch data from external API and no cached data available."});
        }

        res.json({
            data: cached,
            cached: true,
            updated_at: cached.updated_at
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
