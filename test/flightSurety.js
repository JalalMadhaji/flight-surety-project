var Test = require("../config/testConfig.js");
var BigNumber = require("bignumber.js");
var Web3 = require("web3");
const web3 = new Web3(
  new Web3.providers.HttpProvider("http://127.0.0.1:8545/")
);

contract("Flight Surety Tests", async (accounts) => {
  var config;
  before("setup contract", async () => {
    config = await Test.Config(accounts);
    // await config.flightSuretyData.authorizeCaller(
    //   config.flightSuretyApp.address
    // );
    console.log(config.flightSuretyApp.address);
    console.log(config.flightSuretyData.address);
    console.log(config.owner);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/
  // 1
  it(`First airline is registered when contract is deployed`, async function() {
    let isRegistered = await config.flightSuretyData.isAirlineRegistered.call(
      config.owner
    );
    assert.equal(
      isRegistered,
      true,
      "First airline is not registered when deploying contract"
    );
  });

  it(`(multiparty) has correct initial isOperational() value`, async function() {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");
  });
  // 2
  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function() {
    // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false, {
        from: config.testAddresses[2],
      });
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
  });

  // 3
  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function() {
    // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try {
      await config.flightSuretyData.setOperatingStatus(false);
    } catch (e) {
      accessDenied = true;
    }
    assert.equal(
      accessDenied,
      false,
      "Access not restricted to Contract Owner"
    );
  });
  // 4
  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function() {
    await config.flightSuretyData.setOperatingStatus(false);

    let reverted = false;
    try {
      await config.flightSurety.setTestingMode(true);
    } catch (e) {
      reverted = true;
    }
    assert.equal(reverted, true, "Access not blocked for requireIsOperational");

    // Set it back for other tests to work
    await config.flightSuretyData.setOperatingStatus(true);
  });

  it("(airline) cannot register an Airline using registerAirline() if it is not funded", async () => {
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
      await config.flightSuretyApp.registerAirline(newAirline, {
        from: config.firstAirline,
      });
    } catch (e) {}
    let result = await config.flightSuretyData.isAirlineRegistered.call(
      newAirline
    );

    // ASSERT
    assert.equal(
      result,
      false,
      "Airline should not be able to register another airline if it hasn't provided funding"
    );
  });
  // testing when adding new airline after the forth if it is added to registeredAirlines or only to airlines
  // and check votes count of the fifth airline if it is more than zero
  it("adding fifth airline without registering it && voters count is more than zero", async () => {
    // ARRANGE

    let request1 = await config.flightSuretyApp.registerAirline(
      accounts[1],
      "Yemen Airline",
      {
        from: config.owner,
      }
    );
    let request2 = await config.flightSuretyApp.registerAirline(
      accounts[2],
      "Egypt Airline",
      {
        from: config.owner,
      }
    );
    let request3 = await config.flightSuretyApp.registerAirline(
      accounts[3],
      "Qatar Airline",
      {
        from: config.owner,
      }
    );
    let request4 = await config.flightSuretyApp.registerAirline(
      accounts[4],
      "Syria Airline",
      {
        from: config.owner,
      }
    );
    console.log("request1: ", request1);
    console.log("request2: ", request2);
    console.log("request3: ", request3);
    console.log("request4: ", request4);

    // get registered airlines count
    let registeredCount = await config.flightSuretyApp.getRegisteredAirlineCount();
    console.log("count: ", registeredCount.words[0]);

    // get all airlines count including unregistered ones
    let allAirlinesCount = await config.flightSuretyApp.getAirlineCount();
    console.log("count: ", allAirlinesCount.words[0]);

    // get voters count of the fifth airline added
    let votersCount = await config.flightSuretyApp.getAirlineVotesCount.call(
      accounts[4],
      {
        from: config.owner,
      }
    );
    console.log("votes : ", votersCount.words[0]);

    // ASSERT
    assert.equal(
      request1.receipt.status,
      true,
      "Registering new airline went wronge"
    );
    assert.equal(
      request2.receipt.status,
      true,
      "Registering new airline went wronge"
    );
    assert.equal(
      request3.receipt.status,
      true,
      "Registering new airline went wronge"
    );
    assert.equal(
      request4.receipt.status,
      true,
      "Registering new airline went wronge"
    );
    assert.equal(registeredCount, 4, "incorrect count of registered airlines");
    assert.equal(allAirlinesCount, 5, "incorrect count of airlines");
    assert.equal(votersCount, 1, "incorrect votes count");
  });

  it("fund registered airlines to apply multi-party consensus registering for new airlines", async () => {
    await config.flightSuretyData.fund({
      from: accounts[1],
      value: web3.utils.toWei("10", "ether"),
    });
    let isFunded1 = await config.flightSuretyApp.isAirlineFunded(accounts[1]);
    await config.flightSuretyData.fund({
      from: accounts[2],
      value: web3.utils.toWei("10", "ether"),
    });
    let isFunded2 = await config.flightSuretyApp.isAirlineFunded(accounts[2]);
    await config.flightSuretyData.fund({
      from: accounts[3],
      value: web3.utils.toWei("10", "ether"),
    });
    let isFunded3 = await config.flightSuretyApp.isAirlineFunded(accounts[3]);
    try {
      await config.flightSuretyData.fund({
        from: accounts[4],
        value: web3.utils.toWei("10", "ether"),
      });
    } catch (err) {
      console.log(err);
    }
    let isFunded4 = await config.flightSuretyApp.isAirlineFunded(accounts[4]);
    assert.equal(isFunded1, true, "funding went wronge");
    assert.equal(isFunded2, true, "funding went wronge");
    assert.equal(isFunded3, true, "funding went wronge");
    assert.equal(isFunded4, false, "can`t funding unregistered airline");
  });

  it("Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines", async () => {
    let request = await config.flightSuretyApp.registerAirline(
      accounts[4],
      "Syria Airline",
      {
        from: accounts[1],
      }
    );
    // while registered airlines are 4 one vote beside the owner vote that already voted will be enough
    let isRegistered = await config.flightSuretyData.isAirlineRegistered(
      accounts[4]
    );

    assert.equal(isRegistered, true, "not registered yet");
  });

  it("Airline can be registered, but does not participate in contract until it submits funding of 10 ether", async () => {
    let flight = {
      name: "Cairo - Barcelona",
      time: 1586192222,
    };
    try {
      await config.flightSuretyApp.registerFlight(flight.name, flight.time, {
        from: accounts[4],
      });
    } catch (error) {
      console.log("cant participate until funding 10 ether");
    }
    let flightKey1 = await config.flightSuretyApp.getFlightKey(
      accounts[4],
      flight.name,
      flight.time
    );
    let isRegistered1 = await config.flightSuretyApp.isFlightRegistered(
      flightKey1
    );

    await config.flightSuretyApp.registerFlight(flight.name, flight.time, {
      from: accounts[1],
    });
    let flightKey2 = await config.flightSuretyApp.getFlightKey(
      accounts[1],
      flight.name,
      flight.time
    );
    let isRegistered2 = await config.flightSuretyApp.isFlightRegistered(
      flightKey2
    );

    assert.equal(isRegistered1, false, "not funded airline cant add flight");
    assert.equal(isRegistered2, true, "not funded airline cant add flight");
  });
});
