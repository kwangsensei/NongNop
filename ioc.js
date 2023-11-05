
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://adminIOC:admin@cluster0.sinzaa9.mongodb.net/?retryWrites=true&w=majority";


const PORT = process.env.PORT;

const express = require('express');
const ioc = express ();
ioc.use(express.json());

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri);

async function run(msg, response) {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
    const db = client.db('ioc');
    const collection = db.collection(msg);
    query = await collection.find().toArray();
    console.log(query);
    response.send(query);
  } 
  finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

async function clientConnect() {
  ioc.listen(PORT, () => {
    console.log("Server Listening on PORT:", PORT);
  });
  ioc.get('/status', (request, response) => {
    const status = {
        'Status': 'Running'
    };    
    response.send(status);
    console.log("send status");
  });
  ioc.get('/match_table', (request, response) => {run("match_table", response);
    console.log("send match_table");
});
}

clientConnect();
//run().catch(console.dir);
