import express from "express";
import cors from "cors";
import { Redis } from "@upstash/redis";

// Load environment variables (for Redis credentials)
import "dotenv/config";

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
    const { key, role } = req.params;
    const sdp = req.body.sdp;

    if (!sdp) return res.status(400).json({ error: "SDP data is required" });

    // Store in Redis with a 5-minute expiration
    await redis.set(`${key}:${role}`, sdp, { ex: 300 });

    console.log(`Stored SDP for ${role} under key ${key}`);
    res.json({ status: "ok" });
});

// Retrieve SDP data (GET /relay/:key/:role)
app.get("/relay/:key/:role", async (req, res) => {
    const { key, role } = req.params;
    const sdp = await redis.get(`${key}:${role}`);

    if (!sdp) return res.status(404).json({ error: "No SDP available yet" });

    // Auto-delete after retrieval
    await redis.del(`${key}:${role}`);

    console.log(`Retrieved and deleted SDP for ${role} under key ${key}`);
    res.json({ sdp });
});

app.get('/', (req, res) => {
    res.send('This server is acting as a relay server for WebRTC connections created by McDecentralize.')
});

// Start the server locally (only needed for testing)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Relay server running on port ${PORT}`));

module.exports = app;