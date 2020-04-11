import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import Config from "./config.json";
import Web3 from "web3";
import express from "express";

// Flight status codees
// const STATUS_CODE_UNKNOWN = 0;
// const STATUS_CODE_ON_TIME = 10;
// const STATUS_CODE_LATE_AIRLINE = 20;
// const STATUS_CODE_LATE_WEATHER = 30;
// const STATUS_CODE_LATE_TECHNICAL = 40;
// const STATUS_CODE_LATE_OTHER = 50;

const statusObject = [
  { code: 0, title: "UNKNOWN" },
  { code: 10, title: "ON TIME" },
  { code: 20, title: "LATE AIRLINE" },
  { code: 30, title: "LATE WEATHER" },
  { code: 40, title: "LATE TECHNICAL" },
  { code: 50, title: "LATE OTHER" }
];

const ORACLES_COUNT = 30;

let oracles = [];
let config = Config["localhost"];
let web3 = new Web3(
  new Web3.providers.WebsocketProvider(config.url.replace("http", "ws"))
);
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(
  FlightSuretyApp.abi,
  config.appAddress
);

web3.eth.getAccounts().then(accounts => {
  flightSuretyApp.methods
    .REGISTRATION_FEE()
    .call()
    .then(fee => {
      for (let a = 1; a < ORACLES_COUNT; a++) {
        flightSuretyApp.methods
          .registerOracle()
          .send({ from: accounts[a], value: fee, gas: 4000000 })
          .then(result => {
            console.log(result);
            flightSuretyApp.methods
              .getMyIndexes()
              .call({ from: accounts[a] })
              .then(indexes => {
                oracles[accounts[a]] = indexes;
                console.log(
                  `${a + 1}.Oracle registered:   ${
                    accounts[a]
                  }   indexes:  ${indexes}`
                );
              });
          })
          .catch(error => {
            console.log(
              "Error while registering oracles: " +
                accounts[a] +
                " Error: " +
                error
            );
          });
      }
    });
});

flightSuretyApp.events.FlightStatusInfo(
  {
    fromBlock: 0
  },
  function(error, event) {
    if (error) console.log(error);
    else {
      console.log("Received flightstatusInfo event:  " + JSON.stringify(event));
    }
  }
);

flightSuretyApp.events.OracleRequest(
  {
    fromBlock: 0
  },
  function(error, event) {
    if (error) console.log(error);
    else {
      const index = event.returnValues.index;
      const airline = event.returnValues.airline;
      const flight = event.returnValues.flight;
      const timestamp = event.returnValues.timestamp;
      for (var key in oracles) {
        var indexes = oracles[key];
        if (indexes.includes(index)) {
          let statusCode = Math.floor(Math.random() * 5) * 10;
          let statusTitle;
          for (let i = 0; i < statusObject.length; i++) {
            if (statusObject[i].code == statusCode) {
              statusTitle = statusObject[i].title;
            }
          }
          flightSuretyApp.methods
            .submitOracleResponse(index, airline, flight, timestamp, statusCode)
            .send({ from: key, gas: 1000000 })
            .then(result => {
              console.log(result);
              console.log(
                "Oracle response statuscode: " +
                  statusTitle +
                  " for (" +
                  flight +
                  ") with index:" +
                  index
              );
            })
            .catch(error => {
              // console.log(
              //   "Error while sending Oracle response  for " +
              //     flight +
              //     " Error:" +
              //     error
              // );
            });
        }
      }
    }
  }
);

const app = express();
app.get("/api", (req, res) => {
  res.send({
    message: "An API for use with your Dapp!"
  });
});

export default app;
