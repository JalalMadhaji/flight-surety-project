import DOM from "./dom";
import Contract from "./contract";
import "./flightsurety.css";

(async () => {
  let result = null;

  let flights = [
    { name: "Cairo - Sana`a", time: 1586194425 },
    { name: "New York - Rome", time: 1586194555 },
    { name: "Paris - Barcelona", time: 1586192222 },
    { name: "London - Sao Paulo", time: 1586158585 }
  ];

  let contract = new Contract("localhost", () => {
    // Read transaction
    contract.isOperational((error, result) => {
      // console.log(error, result);
      display("Operational Status", "Check if contract is operational", [
        { label: "Operational Status", error: error, value: result }
      ]);
    });

    // contract.fundAirLine("", 0, (err, result) => {
    //   console.log("pay err: ", err);
    //   console.log("pay res: ", result);
    // });

    // contract.registerAirline(
    //   "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
    //   "Yemen Airline",
    //   (err, result) => {
    //     console.log("register error: ", err);
    //     console.log("register result : ", result);
    //   }
    // );

    contract.getAirlines(
      `0x627306090abaB3A6e1400e9345bC60c78a8BEf57`,
      (err, result) => {
        console.log("airline name: ", result);
      }
    );

    contract.isFunded(
      `0x627306090abaB3A6e1400e9345bC60c78a8BEf57`,
      (err, result) => {
        console.log("is funded : ", result);
      }
    );

    for (let i = 0; i < flights.length; i++) {
      contract.registerFlightFunction(
        flights[i].name,
        flights[i].time,
        (error, result) => {
          console.log(`${flights[i].name} is addded successfully`);
        }
      );
    }

    for (let i = 0; i < flights.length; i++) {
      let option = document.createElement("option");
      option.value = i.toString();
      option.innerHTML = flights[i].name;
      DOM.elid("flights-list").appendChild(option);
    }

    // User-submitted transaction
    DOM.elid("submit-oracle").addEventListener("click", () => {
      let flight = DOM.elid("flight-number").value;
      let time;
      for (let i = 0; i < flights.length; i++) {
        if (flights[i].name == flight) {
          time = flights[i].time;
        }
      }
      let obj = {
        name: flight,
        time: time
      };
      if (time != undefined) {
        // Write transaction
        contract.fetchFlightStatus(obj, (error, result) => {
          display("Oracles", "Trigger oracles", [
            {
              label: "Fetch Flight Status",
              error: error,
              value: result.flight + " " + result.timestamp
            }
          ]);
          // });
        });
      } else {
        alert("Unknown flight name");
      }
    });
  });

  // handle buying flight insurace
  DOM.elid("buyFlightForm").addEventListener("submit", function(e) {
    e.preventDefault();
    let amount = DOM.elid("amount").value;
    if (DOM.elid("flights-list").value != "-1") {
      contract.buyFlightInsurance(
        flights[DOM.elid("flights-list").value],
        amount,
        (error, result) => {
          // console.log("buy flight Error: ", error);
          // console.log("buy flight result: ", result);
          if (result == undefined) {
            let er = error
              .toString()
              .substr(error.toString().indexOf("revert") + 7, 100);
            alert(`Error\n"${er}"`);
          } else {
            alert(`Done\nTX No. is "${result}"`);
          }
        }
      );
    }
  });

  // handle withdraw funds
  DOM.elid("withdraw-form").addEventListener("submit", function(e) {
    e.preventDefault();
    let name = DOM.elid("flightName").value.toString();
    let time;
    for (let i = 0; i < flights.length; i++) {
      if (flights[i].name == name) {
        time = flights[i].time;
      }
    }
    let obj = {
      name: name,
      time: time
    };

    if (time != undefined) {
      contract.withdrawFunds(obj, (error, result) => {
        // console.log("withdraw err: ", error);
        // console.log("withdraw result: ", result);
        if (result == undefined) {
          let er = error
            .toString()
            .substr(error.toString().indexOf("revert") + 7, 100);
          alert(`Error\n"${er}"`);
        } else {
          alert("Done\n" + result);
        }
      });
    } else {
      alert("Unknown flight name");
    }
  });
})();

function display(title, description, results) {
  let displayDiv = DOM.elid("display-wrapper");
  let section = DOM.section();
  section.appendChild(DOM.h2(title));
  section.appendChild(DOM.h5(description));
  results.map(result => {
    let row = section.appendChild(DOM.div({ className: "row" }));
    row.appendChild(DOM.div({ className: "col-sm-4 field" }, result.label));
    row.appendChild(
      DOM.div(
        { className: "col-sm-8 field-value" },
        result.error ? String(result.error) : String(result.value)
      )
    );
    section.appendChild(row);
  });
  displayDiv.append(section);
}
