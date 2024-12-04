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

}
run().catch(console.dir);
