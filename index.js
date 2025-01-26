
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const jwt = require('jsonwebtoken');
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

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    //jwt related api
    //jwt middlewares
    const verifyToken = (req, res, next) => {
      //console.log('Inside verify token:', req.headers);
      if(!req.headers.authorization){
        return res.status(401).send({ message: 'Forbidden access.'});
      }
      const token = req.headers.authorization.split(' ')[1];
      //console.log('token:', token);
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'Invalid token.' });
        }
        req.decoded = decoded;
        next();
      })
    }

    //create jwt
    app.post('/jwt', async(req, res) => {
      //console.log("Success");
      const user = req.body;
      //console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
      res.send({ token: token });
    })

    //Authentication related Apis
    const userCollection = database.collection('users');
    app.post('/users', async (req, res) => {
      const user = req.body;
      //console.log(user);
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ insertedId: null, message: 'User already exists', status: existingUser.status });
      } else {
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

    app.get('/user-details/:id', async (req, res) => {
      const id = req.params.id;
      //console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.findOne(query);
      if (result) {
        res.send(result);
      } else {
        res.send({message: "User doesn't exists"});
      }
    });

    //HR related api
    app.get('/users/employee', async (req, res) => {
      //console.log('hit');
      const query = { role: 'employee' };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/users/all', verifyToken, async (req, res) => {
      console.log(req.decoded);
      //console.log(req.headers);
      const query = { role: { $in: ['employee', 'hr'] } }; const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.patch('/users/verify/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id), verified: false };
      const update = { $set: { verified: true } };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });


    app.patch('/users/fire/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id), status: 'running' };
      const update = { $set: { status: 'fired' } };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });
    app.patch('/salary-increment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { salary: req.body.salary } };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });
    app.patch('/users/promote/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id), role: 'employee' };
      const update = { $set: { role: 'hr' } };
      const result = await userCollection.updateOne(query, update);
      res.send(result);
    });

    const payrollCollection = database.collection('payroll');
    app.post('/pay', async (req, res) => {
      const user = req.body;
      const query = { email: user.email, month: user.month, year: user.year };
      const paid = await payrollCollection.findOne(query);
      if (paid) {
        return res.send({ insertedId: null, message: 'All ready paid for this month' });
      } else {
        const result = await payrollCollection.insertOne(user);
        res.send(result);
      }
    });
    
    app.get('/payroll', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await payrollCollection.find(query).toArray();
      res.send(result);
    });

    app.get('/payment', async (req, res) => {
      const result = await payrollCollection.find().toArray();
      res.send(result);
    });

    app.patch('/payment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id), status: 'unpaid' };
      const update = { $set: { status: 'paid', date: req.body.date } };
      const result = await payrollCollection.updateOne(query, update);
      res.send(result);
    });

    //User task data store, update and delete
    const taskCollection = database.collection('work-sheet');
    app.post('/work-sheet', async (req, res) => {
      const workData = req.body;
      const result = await taskCollection.insertOne(workData);
      res.send(result);
    });

    app.get('/work-sheet', async (req, res) => {
      const email = req.query.email;
      //console.log(email);
      const query = { email: email };
      const result = await taskCollection.find(query).toArray();
      res.send(result);
    });
    
    app.get('/work-sheets', async (req, res) => {
      //console.log('Hit');
      const result = await taskCollection.find().toArray();
      res.send(result);
    });

    app.put('/work-sheet/:id', async (req, res) => {
      //console.log("put request");
      const id = req.params.id;
      const updatedData = req.body;
      const query = { _id: new ObjectId(id) };
      const update = { $set: updatedData };
      const result = await taskCollection.updateOne(query, update);
      res.send(result);
    });

    app.delete('/work-sheet/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await taskCollection.deleteOne(query);
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
