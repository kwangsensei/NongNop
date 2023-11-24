
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://webDeploy:webDeployadmin@cluster0.sinzaa9.mongodb.net/?retryWrites=true&w=majority";

const config = require('./config');
console.log(config);

const express = require('express');
const ioc = express ();
const ejs = require('ejs');

ioc.use(express.json());
ioc.set('view engine', 'ejs');

const cors = require('cors');
const { request, STATUS_CODES } = require('http');
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

async function medalDashboard(response){
  const collection = db.collection('dashboard');
  const sortMedal = {gold: -1, silver: -1, bronze: -1};
  var dashboard_query =  await collection.find({}).sort(sortMedal).project({_id: 0}).toArray();
  dashboard_query.forEach(country => {
    country.totalMedals = country.gold + country.silver + country.bronze;
  });
  response.render('index', { dashboard_query });
}

async function audienceDashboard(response){
  const collection = db.collection('user_statistic');
  const sortAudience = {count: -1};
  const userQuery = await collection.find({}).sort(sortAudience).project({_id: 0}).toArray();
  response.render('audience', {userQuery});
}

async function resetDashboard(){
  const collection = db.collection('dashboard');
  await collection.updateMany({country:{$exists: true}}, {$set: {gold: 0, silver: 0, bronze: 0}})
  console.log("reset dashboard");
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

async function resetAudience(){
  const collection = db.collection('user_statistic');
  var queryArray = await collection.find({}).toArray();
  total = 0;
  for(let i=0;i<queryArray.length;i++){
    total += queryArray[i].count;
  }
  for(let i=0;i<queryArray.length;i++){
    var obj = queryArray[i];
    await collection.updateOne(obj,{$set:{percent: Math.round(obj.count*10000/total)/100}});
  }
  console.log("reset user_statistic");
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
    resetAudience();
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
  ioc.get('/', (request, response) => {
    medalDashboard(response);
  });
  ioc.get('/audience_statistic', (request, response) => {
    audienceDashboard(response);
  });
  ioc.get('/match_table/', (request, response) => {
    getAllCollection("new_match_table", response);
    console.log("send match_table");
});
  
  ioc.post('/match_table/id/:sport_id', (request, response) => {
    clientOrigin = request.headers.origin;
    console.log(clientOrigin);
      if(clientOrigin == parisOrigin){
        console.log(request.body);
        updateQuery("new_match_table", request, response);
        console.log("Finish update result.");
      }
      else{
        response.sendStatus(403);
      }
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


var total = 0;
const parisOrigin = 'https://paris-organisation-frontend.vercel.app';

connectDB();
const db = client.db('ioc');
resetDashboard();
resetAudience();
upDateDashboard(null, true);
clientConnect();
