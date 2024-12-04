const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
const app = express();
require('dotenv').config();


const port = process.env.PORT || 5000;


// Middleware

app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Hello, World!');
})

app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.owq8r.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    await client.connect();
    console.log("Connected to MongoDB");

    const campaignCollection = client.db("crowdcubeDB").collection("campaigns");
    const userCollection = client.db("crowdcubeDB").collection("users");

    // Get all campaigns
    app.get('/campaigns', async (req, res) => {
        const cursor = campaignCollection.find();
        const result = await cursor.toArray()
        res.send(result);
    });

    // Create a new campaign
    app.post('/campaigns', async (req, res) => {
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
        res.send(result);
    });

    // Update a campaign by ID
    app.put('/campaigns/:id', async (req, res) => {
        const { id } = req.params;
        const updates = req.body;
        const result = await campaignCollection.findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: updates },
            { returnDocument: 'after' }
        );
        res.status(200).json(result.value);
    });

    // Delete a campaign by ID
    app.delete('/campaigns/:id', async (req, res) => {
        const { id } = req.params;
        await campaignCollection.deleteOne({ _id: new ObjectId(id) });
        res.status(200).json({ message: 'Campaign deleted successfully' });
    });

    // Contribute to a campaign
    app.post('/campaigns/:id/contribute', async (req, res) => {
        const { id } = req.params;
        const { amount, contributor } = req.body;
        const campaign = await campaignCollection.findOne({ _id: new ObjectId(id) });
        const updatedCampaign = {
            ...campaign,
            raised: campaign.raised + amount,
            contributors: campaign.contributors.includes(contributor)
                ? campaign.contributors
                : [...campaign.contributors, contributor],
        };
        await campaignCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedCampaign }
        );
        res.status(200).json(updatedCampaign);
    });

    // Get all users
    app.get('/users', async (req, res) => {
        const users = await userCollection.find().toArray();
        res.status(200).json(users);
    });

}
run().catch(console.dir);
