const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.owq8r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Main function to handle database operations
async function run() {
    try {
        // Connect to MongoDB
        await client.connect();

        const campaignCollection = client.db("crowdcubeDB").collection("campaigns");
        const userCollection = client.db("crowdcubeDB").collection("users");

        // Get all campaigns
        app.get('/campaigns', async (req, res) => {
            try {
                const cursor = campaignCollection.find();
                const result = await cursor.toArray();
                res.status(200).json(result);
            } catch (error) {
                res.status(500).json({ error: "Failed to retrieve campaigns." });
            }
        });

        // Get single campaign details
        app.get('/campaigns/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await campaignCollection.findOne(query);
                if (result) {
                    res.status(200).json(result);
                } else {
                    res.status(404).json({ error: "Campaign not found." });
                }
            } catch (error) {
                res.status(500).json({ error: "Failed to retrieve campaign." });
            }
        });

        // Create a new campaign
        app.post('/campaigns', async (req, res) => {
            try {
                const { title, thumbnail, type, description, minimumDonation, expiredDate, creator } = req.body;
                const newCampaign = {
                    title,
                    thumbnail,
                    type,
                    description,
                    minimumDonation,
                    expiredDate: new Date(expiredDate),
                    creator,
                    goal: 0,
                    raised: 0,
                    contributors: [],
                    createdAt: new Date(),
                };
                const result = await campaignCollection.insertOne(newCampaign);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ error: "Failed to create campaign." });
            }
        });

        // Update a campaign by ID
        app.put('/campaigns/:id', async (req, res) => {
            const { id } = req.params;
            const updates = req.body;

            const result = await campaignCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: updates }
            );

            if (result.modifiedCount === 1) {
                const updatedCampaign = await campaignCollection.findOne({ _id: new ObjectId(id) });
                res.status(200).json(updatedCampaign);
            } else {
                res.status(200).json({ message: "No changes were made to the campaign." });
            }
        });

        // Delete a campaign by ID
        app.delete('/campaigns/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await campaignCollection.deleteOne({ _id: new ObjectId(id) });
                if (result.deletedCount > 0) {
                    res.status(200).json({ message: 'Campaign deleted successfully' });
                } else {
                    res.status(404).json({ error: "Campaign not found." });
                }
            } catch (error) {
                res.status(500).json({ error: "Failed to delete campaign." });
            }
        });

        // Contribute to a campaign
        app.post('/campaigns/:id/donate', async (req, res) => {
            try {
                const { id } = req.params;
                const { amount, contributor } = req.body;

                if (!amount || !contributor) {
                    return res.status(400).json({ error: "Amount and contributor are required." });
                }

                const campaign = await campaignCollection.findOne({ _id: new ObjectId(id) });

                if (!campaign) {
                    return res.status(404).json({ error: "Campaign not found." });
                }

                const updatedCampaign = {
                    ...campaign,
                    raised: campaign.raised + parseFloat(amount),
                    contributors: campaign.contributors.includes(contributor)
                        ? campaign.contributors
                        : [...campaign.contributors, contributor],
                };

                await campaignCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedCampaign }
                );

                res.status(200).json(updatedCampaign);
            } catch (error) {
                res.status(500).json({ error: "Failed to process donation." });
            }
        });

        // Get all users
        app.get('/users', async (req, res) => {
            try {
                const users = await userCollection.find().toArray();
                res.status(200).json(users);
            } catch (error) {
                res.status(500).json({ error: "Failed to retrieve users." });
            }
        });

        // Create a new user
        app.post('/users', async (req, res) => {
            try {
                const newUser = req.body;
                const result = await userCollection.insertOne(newUser);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ error: "Failed to create user." });
            }
        });

        // Check the user email
        app.get('/users/:email', async (req, res) => {
            try {
                const { email } = req.body;
                const existingUser = await userCollection.findOne({ email });
                res.status(200).json(!existingUser);
            } catch (error) {
                res.status(500).json({ error: "Failed to check email." });
            }
        });

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run().catch(console.dir);

// Start the server
