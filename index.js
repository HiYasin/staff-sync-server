
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

app.listen(port, () => {
    console.log('My simple server is running at', port);
})
