const express = require("express");
const cors = require("cors");
const { Redis } = require("@upstash/redis");

// Initialize Redis connection
const redis = new Redis({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN
});

const app = express();
app.use(express.json());
app.use(cors());

// Store SDP data (POST /relay/:key/:role)
app.post("/relay/:key/:role", async (req, res) => {
    try {
        const { key, role } = req.params;
        const sdp = req.body.sdp;

        if (!sdp) return res.status(400).json({ error: "SDP data is required" });

        // Store in Redis with a 5-minute expiration
        await redis.set(`${key}:${role}`, sdp, { ex: 300 });

        console.log(`Stored SDP for ${role} under key ${key}`);
        res.json({ status: "ok" });
    } catch (error) {
        console.error("Error storing SDP:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Retrieve SDP data (GET /relay/:key/:role)
app.get("/relay/:key/:role", async (req, res) => {
    try {
        const { key, role } = req.params;
        const sdp = await redis.get(`${key}:${role}`);

        if (!sdp) return res.status(404).json({ error: "No SDP available yet" });

        // Auto-delete after retrieval
        await redis.del(`${key}:${role}`);

        console.log(`Retrieved and deleted SDP for ${role} under key ${key}`);
        res.json({ sdp });
    } catch (error) {
        console.error("Error retrieving SDP:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/", (req, res) => {
    res.send("This server is acting as a relay server for WebRTC connections created by McDecentralize.");
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Relay server running on port ${PORT}`));

// Export for testing or GitHub CI/CD compatibility
module.exports = app;