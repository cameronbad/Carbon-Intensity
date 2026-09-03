const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("."));

app.get("/api/carbon-intensity", (req, res) => {
    res.json({
        carbon_intensity: 245,
        unit: "gCO2/kWh"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
