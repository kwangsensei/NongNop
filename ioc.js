
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
  await client.db("ioc").command({ ping: 1 });
  console.log("Pinged your deployment. You successfully connected to MongoDB!");
}

async function resetDashboard(){
  const collection = db.collection('dashboard');
  await collection.updateMany({country:{$exists: true}}, {$set: {gold: 0, silver: 0, bronze: 0}})
  console.log("reset db");
}

async function upDateDashboard(sportOBJ, isInc){
  const collection = db.collection('new_match_table');
  var match_query;
  if(sportOBJ == null){
    match_query = await collection.find({result: {$exists: true}}).project({result: 1, _id: 0}).toArray();
  }
  else{
    match_query = await collection.find(sportOBJ).project({result: 1, _id: 0}).toArray();
  }
  var dashboard_query = db.collection('dashboard');
  
  for(let i = 0; i < match_query.length; i++){
    var result = match_query[i];
    var count = 1;
    if(!isInc){
      count = -1
    }
    for(j = 0; j < result.result.gold.length; j++){
      await dashboard_query.updateOne({country: result.result.gold[j]}, {$inc: {gold: count}});
    }
    for(j = 0; j < result.result.silver.length; j++){
      await dashboard_query.updateOne({country: result.result.silver[j]}, {$inc: {silver: count}});
    }
    for(j = 0; j < result.result.bronze.length; j++){
      await dashboard_query.updateOne({country: result.result.bronze[j]}, {$inc: {bronze: count}});
    }
  }
  console.log("dashboard is up to date")
}

async function getAllCollection(msg, response) {
  const collection = db.collection(msg);
  var query = await collection.find().project({_id: 0}).toArray();
  response.send(query);
}

async function updateQuery(msg, request, response) {
  const collection = db.collection(msg);
  var format = resultFormat(request.body);
  var sport = await collection.findOne(request.params);
  if (sport == null){
    response.send("wrong sport id.");
  }
  else if(format == true){
    upDateDashboard(request.params, false);
    await collection.updateOne(request.params, {$set: request.body});
    upDateDashboard(request.params, true);
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
  const collection = db.collection(msg);
  var format = userStatisticFormat(request.body);
  if(format == true){
    await collection.updateOne({country: request.body.country}, {$set: {count: parseInt(request.body.count)}}, {upsert: true});
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
  if(parseInt(body.count) != body.count){
    return false;
  }
  return true;
}

async function clientConnect() {
  await ioc.listen(config, () => {
    console.log("Server Listening on PORT:", config);
  });
  ioc.get('/match_table/', (request, response) => {
    getAllCollection("new_match_table", response);
    console.log("send match_table");
});
  
  ioc.post('/match_table/id/:sport_id', (request, response) => {
    console.log(request.headers);
    console.log(request.body);
    updateQuery("new_match_table", request, response);
    console.log("Finish update result.");
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

connectDB();
const db = client.db('ioc');
resetDashboard();
upDateDashboard(null, true);
clientConnect();
