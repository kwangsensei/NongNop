
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://adminIOC:admin@cluster0.sinzaa9.mongodb.net/?retryWrites=true&w=majority";

const config = require('./config');
console.log(config);

const express = require('express');
const ioc = express ();
ioc.use(express.json());

const cors = require('cors');
const corsOptions = {
  "origin": "*",
  "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
  "preflightContinue": false,
  "optionsSuccessStatus": 204
}
ioc.use(cors(corsOptions));

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri);

async function connectDB(){
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
}

async function getQuery(msg, request, response) {
  const db = client.db('ioc');
  const collection = db.collection(msg);
  var query_round = request.params.round;
  var query;
  console.log("param is: ", query_round);
  if(query_round == "Final"){
    query = await collection.find({$or: [{round: "Final"}, 
    {round: "Gold Medal Match"}]}).toArray();
  }
  else if(query_round == "Medal"){
    query = await collection.find({$or: [{round: "Final"}, 
    {round: "Gold Medal Match"},
    {round: "Bronze Medal Match"}]}).toArray();
  }
  else{
    query = await collection.find(request.params).toArray();
  }
  console.log(query);
  response.send(query);
}

async function updateQuery(msg, request, response) {
  const db = client.db('ioc');
  const collection = db.collection(msg);
  var format = resultFormat(request.body);
  if(format == true){
    await collection.updateOne(request.params, {$set: request.body});
    response.send("update match result complete.");
  }
  else{
    response.send("Wrong result format");
  }
}

function resultFormat(body){
  if(Object.keys(body).length != 1){
    return false;
  }
  if(body.result == null){
    return false;
  }
  return true;
}

async function insertUserStatistic(msg, request, response) {
  const db = client.db('ioc');
  const collection = db.collection(msg);
  var format = userStatisticFormat(request.body);
  if(format == true){
    await collection.updateOne({country: request.body.country}, {$set: request.body}, {upsert: true});
    response.send("update audience statistic complete.");
  }
  else{
    response.send("Wrong user_statistic format");
  }
}

function userStatisticFormat(body){
  if(Object.keys(body).length != 2){
    console.log(Object.keys(body).length);
    return false;
  }
  if(body.country == null || body.count == null){
    return false;
  }
  return true;
}

async function clientConnect() {
  await ioc.listen(config, () => {
    console.log("Server Listening on PORT:", config);
  });
  ioc.get('/match_table/', (request, response) => {
    console.log(request.headers);
    getQuery("match_table", request, response);
    console.log("send match_table");
});
  ioc.get('/match_table/round/:round', (request, response) => {
    console.log(request.headers);
    getQuery("match_table", request, response);
    console.log("send match_table in specific round");
  });
  
  ioc.post('/match_table/id/:sport_id', (request, response) => {
    console.log(request.headers);
    console.log(request.body);
    updateQuery("match_table", request, response);
  });
  ioc.post('/user_statistic/', (request, response) => {
    try{
      console.log(request.headers);
      console.log(request.body);
      insertUserStatistic("user_statistic", request, response);
    }
    catch(error){
      console.log("failed to insert \n", error);
    }
  });
}

connectDB()
clientConnect();
