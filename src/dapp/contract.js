import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";
import FlightSuretyData from "../../build/contracts/FlightSuretyData.json";
import Config from "./config.json";
import Web3 from "web3";

export default class Contract {
  constructor(network, callback) {
    let config = Config[network];
    this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
    this.flightSuretyApp = new this.web3.eth.Contract(
      FlightSuretyApp.abi,
      config.appAddress
    );
    this.flightSuretyData = new this.web3.eth.Contract(
      FlightSuretyData.abi,
      config.dataAddress
    );
    this.initialize(callback);
    this.owner = null;
    this.airlines = [];
    this.passengers = [];
  }

  initialize(callback) {
    this.web3.eth.getAccounts((error, accts) => {
      this.owner = accts[0];
      console.log(accts);

      let counter = 1;

      while (this.airlines.length < 5) {
        this.airlines.push(accts[counter++]);
      }

      while (this.passengers.length < 4) {
        this.passengers.push(accts[counter++]);
      }

      callback();
    });
  }

  isOperational(callback) {
    let self = this;
    self.flightSuretyApp.methods
      .isOperational()
      .call({ from: self.owner }, callback);
  }

  buyFlightInsurance(flight, value, callback) {
    let self = this;
    console.log("balance : ", this.web3.eth.getBalance(self.owner));
    console.log("balance2 : ", this.web3.eth.getBalance(self.passengers[0]));
    self.flightSuretyData.methods
      .buy(self.owner, flight.name, flight.time)
      .send(
        {
          from: self.passengers[0],
          value: web3.toWei(value, "ether"),
          gas: 3000000
        },
        callback
      );
  }

  getAirlines(address, callback) {
    let self = this;
    self.flightSuretyData.methods
      .getAirlineNameByAddress(address)
      .call({ from: self.owner }, callback);
    console.log(
      "length: ",
      self.flightSuretyData.methods.getRegisteredAirlineCount().call()
    );
  }

  // registerAirline(address, name, callback) {
  //   let self = this;
  //   let str = self.flightSuretyApp.methods
  //     .registerAirline(address, name)
  //     .call({ from: self.owner }, callback);
  //   console.log("register str: ", str);
  // }

  // fundAirLine(address, ether, callback) {
  //   let self = this;
  //   self.flightSuretyData.methods
  //     .fund()
  //     .send({ from: self.owner, value: web3.toWei(10, "ether") }, callback);
  // }

  withdrawFunds(flight, callback) {
    let self = this;
    self.flightSuretyData.methods
      .pay(self.owner, flight.name, flight.time)
      .send({ from: self.passengers[0] }, callback);
    // console.log("lets", this.web3.eth.getBalance(self.passengers[0]));
    // console.log("lets owner", this.web3.eth.getBalance(self.owner));
  }

  isFunded(address, callback) {
    let self = this;
    self.flightSuretyData.methods
      .isAirlineFunded(address)
      .call({ from: self.owner }, callback);
  }

  registerFlightFunction(name, time, callback) {
    let self = this;
    self.flightSuretyApp.methods
      .registerFlight(name, time)
      .call({ from: self.owner }, callback);
  }

  fetchFlightStatus(flight, callback) {
    let self = this;
    let payload = {
      airline: self.owner,
      flight: flight.name,
      timestamp: flight.time
    };
    self.flightSuretyApp.methods
      .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
      .send({ from: self.owner }, (error, result) => {
        callback(error, payload);
      });
  }
}
