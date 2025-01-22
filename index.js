
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

const port = process.env.PORT || 3000;

//middleware
app.use(express.json());
app.use(cors(
    {
        origin: ['http://localhost:5173'], //replace with client address
        credentials: true,
    }
)); 


app.get('/', (req, res) => {
    res.send('Hello from my server')
})

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.alvdp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("StaffSync");
    const userCollection = database.collection('users');

    //Authentication related Apis
    app.post('/users', async(req,res)=>{
      const user = req.body;
      //console.log(user);
      const query = {email: user.email};
      const existingUser = await userCollection.findOne(query);
      if(existingUser){
        return res.send({insertedId: null, message: 'User already exists'});
      }else{
        const result = await userCollection.insertOne(user);
        res.send(result);
      }
    });

    app.get('/users', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log('My simple server is running at', port);
})
