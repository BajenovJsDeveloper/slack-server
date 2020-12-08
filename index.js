const express = require("express");
const fs = require('fs');
const msgaxios = require("./config/msgaxios.js");
const msghook = require("./config/msghook.js");
const pidCrypt = require("pidcrypt");
const path = require('path');
require("pidcrypt/aes_cbc");
const app = express();
const PORT = process.env.PORT || 4200;
const DATABASE_NAME = "UsersData";
const DATABASE_DOCUMENT = "users";
const MESSAGE = 0;
const HOOK = 1;
const MONGODB = 2;
const PW = "hello world";

const token = fs.readFileSync(__dirname + '/config/dbaccess.cfg','utf8').split('^');
const tokenMessage = token[MESSAGE];
const tokenHook = token[HOOK];
const dbPass = token[MONGODB];

const URLHookMessage = "https://hooks.slack.com/services/";
const URLPostMeaasge = "https://slack.com/api/chat.postMessage";

require("pidcrypt/aes_cbc");
const aes = new pidCrypt.AES.CBC();

const decryptedTokenMessage = aes.decryptText(tokenMessage, PW);
const decryptedTokenHook = aes.decryptText(tokenHook, PW);
const decryptedDBPass = aes.decryptText(dbPass, PW);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const MongoClient = require("mongodb").MongoClient;
const mongoURI = `mongodb+srv://admin:${decryptedDBPass}@cluster0.zk665.mongodb.net/<UsersData>?retryWrites=true&w=majority`;
const mongoClient = new MongoClient(mongoURI, { useUnifiedTopology: true });
let dbClient;

mongoClient.connect(function (err, client) {
  if (err) return console.log("No connection with DB! - ", err);
  dbClient = client;
  app.locals.collection = client
    .db(DATABASE_NAME)
    .collection(DATABASE_DOCUMENT);
  app.listen(PORT, () => {
    console.log("Server is running on port: ", PORT);
  });
});

app.get("/info", function (req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  const collection = req.app.locals.collection;
  try {
    collection.find().toArray(function (err, messages) {
      if (err) {
        res.json({
          status: "error",
          data: [],
          message: "In DB, find index error!",
        });
      }
      if (messages.length > 0) {
        res.json({ status: "OK", data: messages });
      }
    });
  } catch {
    res.json({
      status: "error",
      data: [],
      message: "In DB, collection error!",
    });
  }
});

app.post("/message", function (req, res) {
  if (req.body) {
    const dataObj = {
      channelID: req.body.channel_id || "",
    };
    const messsage = req.body.text || "-";
    const DBObject = {
      user: req.body.user_name || "no user",
      date: new Date().toLocaleString(),
      channel: req.body.channel_name,
      msg: messsage,
    };
    const collection = req.app.locals.collection;
    collection
      .insertOne(DBObject)
      .then((result) => {
        try {
          if (messsage.search("#general ") != -1) {
            dataObj.token = decryptedTokenHook;
            dataObj.text = messsage.replace(/#general/gi, " ");
            dataObj.url = URLHookMessage;

            msghook(dataObj)
              .then((response) => {
                console.log(response);
                if (response.data.ok)
                  res.json({ status: "OK", message: "Item added to DB." });
                else res.status(200).send('ok');
              })
              .catch((err) => {
                console.log("Error to connct with Slack!");
                res.status(400).send("Bad Request!");
              });
          } else {
            dataObj.token = decryptedTokenMessage;
            dataObj.text = messsage;
            dataObj.url = URLPostMeaasge;

            msgaxios(dataObj)
              .then((response) => {
                console.log(response);
                res.send(messsage)
                // if (response.data.ok)
                //   res.json({ status: "OK", message: "Item added to DB." });
                // else res.status(200).send('ok');
              })
              .catch((err) => {
                console.log("Error to connct with Slack!");
                res.status(400).send("Bad Request!");
              });
          }
        } catch (err) {
          console.log(err);
          res.status(400).send("Bad Request!");
        }
      })
      .catch((err) => {
        res.status(400).send("Can not connect with DB!");
      });
  } else res.ststus(400).send("Body must contain data!");
});

app.get("/*", function (req, res) {
  res.send('Slack-app server is running...');
});

process.on("SIGINT", () => {
  dbClient.close();
  process.exit();
});


