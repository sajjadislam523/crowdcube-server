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
        const donationCollection = client.db("crowdcubeDB").collection("donations");

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
                const { id } = req.params;
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
                const { title, thumbnail, type, description, minimumDonation, goal, raised, expiredDate, creator } = req.body;
                const newCampaign = {
                    title,
                    thumbnail,
                    type,
                    description,
                    minimumDonation: parseFloat(minimumDonation) || 0,
                    expiredDate: new Date(expiredDate),
                    creator,
                    goal: parseFloat(goal) || 0,
                    raised: parseFloat(raised) || 0,
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

        app.post('/donate', async (req, res) => {
            try {
                const { campaignId, amount, contributorEmail, contributorName } = req.body;

                // Ensure donation amount is a valid number
                const donationAmount = parseFloat(amount);
                if (isNaN(donationAmount) || donationAmount <= 0) {
                    return res.status(400).json({ error: "Invalid donation amount." });
                }

                // Fetch the campaign
                const campaign = await campaignCollection.findOne({ _id: new ObjectId(campaignId) });
                if (!campaign) {
                    return res.status(404).json({ error: "Campaign not found." });
                }

                // Validate against the minimum donation amount
                const minimumDonation = parseFloat(campaign.minimumDonation) || 0;
                if (donationAmount < minimumDonation) {
                    return res.status(400).json({
                        error: `Donation amount must be at least $${minimumDonation}.`,
                    });
                }

                // Create a donation record
                const donationRecord = {
                    campaignId,
                    campaignTitle: campaign.title,
                    contributorEmail,
                    contributorName,
                    amount: donationAmount,
                    date: new Date(),
                };

                // Insert the donation record
                await donationCollection.insertOne(donationRecord);

                // Update the campaign's raised amount
                const currentRaised = parseFloat(campaign.raised) || 0;
                const updatedRaised = currentRaised + donationAmount;

                await campaignCollection.updateOne(
                    { _id: new ObjectId(campaignId) },
                    { $set: { raised: updatedRaised } }
                );

                // Fetch the updated campaign
                const updatedCampaign = await campaignCollection.findOne({ _id: new ObjectId(campaignId) });

                res.status(200).json({
                    message: "Donation recorded successfully.",
                    donationRecord,
                    updatedCampaign,
                });
            } catch (error) {
                console.error("Error recording donation:", error);
                res.status(500).json({
                    error: "Failed to record donation.",
                    message: "An unexpected error occurred. Please try again later.",
                });
            }
        });




        app.get('/donations', async (req, res) => {
            try {
                const { email } = req.query;

                if (!email) {
                    return res.status(400).json({
                        error: "Email query parameter is required.",
                    });
                }

                const donations = await donationCollection
                    .find({ contributorEmail: email })
                    .toArray();

                // Return a valid response structure
                res.status(200).json(donations);
            } catch (error) {
                console.error("Error fetching donations:", error);
                res.status(500).json({
                    error: "Failed to fetch donations.",
                    message: "An unexpected error occurred. Please try again later.",
                });
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
                const { email, name, photo, password } = req.body;


                const newUser = {
                    email,
                    name,
                    photo,
                    password,
                    createdAt: new Date(),
                };

                const result = await userCollection.insertOne(newUser);
                res.status(201).json(result);
            } catch (error) {
                res.status(500).json({ error: "Failed to create user." });
            }
        });


    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

run().catch(console.dir);
