'use strict';

const assert = require('assert');
const mongo = require('mongodb').MongoClient;

const {inspect} = require('util');


class GNCDatabase {

  constructor(dbUrl) {  
    let [,databaseName] = REG_DATABASE_NAME.exec(dbUrl);
    let [,serverUrl] = REG_SERVER_URL.exec(dbUrl);

    this.databaseName = databaseName;
    this.serverUrl = serverUrl;
  }

  async init() {
    try {
      this.mongoDBConnection = await mongo.connect(this.serverUrl, {useNewUrlParser: true});
    } catch (err) {
      console.log(err.message + "\nDatabase FAILED to connect, check if server is online or port is correct");
      process.exit();
    }
    
    assert(this.mongoDBConnection != null);
    if (this.mongoDBConnection.isConnected()) console.log("Database Connected");
    else {
      console.log("Database NOT Connected");
      process.exit();
    }

    this.databaseConnection = await this.mongoDBConnection.db(this.databaseName);

    this.tempCollection = await this.createCollection("Temperature");
    this.distCollection = await this.createCollection("Distance");
    this.speedCollection = await this.createCollection("Speed");

    await this.writeTemp('1','-1','0');
    await this.writeTemp('2','-1','0');
    await this.writeTemp('3','-1','0');
    await this.writeTemp('4','-1','0');

    await this.writeDist('1','-1','0');
    await this.writeDist('2','-1','0');
    await this.writeDist('3','-1','0');
    await this.writeDist('4','-1','0');

    await this.writeSpeed('1','-1','0');
    await this.writeSpeed('2','-1','0');
    await this.writeSpeed('3','-1','0');
    await this.writeSpeed('4','-1','0');
  }

  async close() {
    if (this.mongoDBConnection != null) 
        await this.mongoDBConnection.close();
    console.log("MongoDB connection closed");
  }

  async clear() {
    if (this.databaseConnection != null) {
        let collectionArray = await this.databaseConnection.listCollections().toArray();
        let iter = collectionArray.map(collection => (collection.name)).entries();

        let collectionEntry;
        while (collectionEntry = iter.next().value) {
        await this.databaseConnection.dropCollection(collectionEntry[1]);
        }
    }
  }

  async createCollection(collectionName) {
    return await this.databaseConnection.createCollection(collectionName);
  }
  async writeTemp(sensorId, sensorValue, seqNum) {
    try {
        await this.tempCollection.insertOne( {sensorID: sensorId, sensorValue: sensorValue, seqNum: seqNum} );
    } catch (err){
        console.log(err);
        throw `One or more errors in writing Database: ${this.databaseName} Collection: temperature`;
    }
  }

  async readLastTemp(sensorId) {
    try {
        const document = await this.tempCollection.findOne({"sensorID": `${sensorId}`}, { sort: { _id: -1 }, limit: 1 });
        if (document == null) throw `No document satisfies the query - readLastTemp() sensorID ${sensorId}`;

        const [sensorValue, seqNum] = [document.sensorValue, document.seqNum];
        return {sensorValue: sensorValue, seqNum: seqNum};
    } catch (err){
        console.log(err);
        throw `One or more errors in reading Database: ${this.databaseName} Collection: temperature`;
    }
  }
  async writeDist(sensorId, sensorValue, seqNum) {
    try {
        await this.distCollection.insertOne( {sensorID: sensorId, sensorValue: sensorValue, seqNum: seqNum} );
    } catch (err){
        console.log(err);
        throw `One or more errors in writing Database: ${this.databaseName} Collection: distance`;
    }
  }

  async readLastDist(sensorId) {
    try {
        const document = await this.distCollection.findOne({"sensorID": `${sensorId}`}, { sort: { _id: -1 }, limit: 1 });
        if (document == null) throw `No document satisfies the query - readLastDist() sensorID ${sensorId}`;

        const [sensorValue, seqNum] = [document.sensorValue, document.seqNum];
        return {sensorValue: sensorValue, seqNum: seqNum};
    } catch (err){
        console.log(err);
        throw `One or more errors in reading Database: ${this.databaseName} Collection: distance`;
    }
  }
  async writeSpeed(sensorId, sensorValue, seqNum) {
    try {
        await this.speedCollection.insertOne( {sensorID: sensorId, sensorValue: sensorValue, seqNum: seqNum} );
    } catch (err){
        console.log(err);
        throw `One or more errors in writing Database: ${this.databaseName} Collection: speed`;
    }
  }

  async readLastSpeed(sensorId) {
    try {
        const document = await this.speedCollection.findOne({"sensorID": `${sensorId}`}, { sort: { _id: -1 }, limit: 1 });
        if (document == null) throw `No document satisfies the query - readLastSpeed() sensorID ${sensorId}`;

        const [sensorValue, seqNum] = [document.sensorValue, document.seqNum];
        return {sensorValue: sensorValue, seqNum: seqNum};
    } catch (err){
        console.log(err);
        throw `One or more errors in reading Database: ${this.databaseName} Collection: speed`;
    }
  }
}

module.exports = GNCDatabase;

let databaseName;
let serverUrl;

let mongoDBConnection;
let databaseConnection;

let tempCollection, distCollection, speedCollection;

const MONGO_OPTIONS = {
  useNewUrlParser: true
};

const REG_DATABASE_NAME = /\/(\w+)$/g;

const REG_SERVER_URL = /(^.*)\//g
