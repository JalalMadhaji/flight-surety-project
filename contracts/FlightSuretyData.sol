// pragma solidity ^0.5.16;
pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false

    struct Airline {
        string name;
        bool isRegistered;
        bool isFunded;
        uint votes;
        uint funds;
    }

    mapping(address => Airline) private airlines;
    address[] registeredAirlines;

    mapping(address => address[]) private voters;

    uint private airlinesCount;

    struct PassengerInfo {
        uint amount;
        uint profit;
    }

    mapping(bytes32 => mapping(address => PassengerInfo)) passengersInsurances;
    mapping(bytes32 => address[]) private flightPassengers;

    
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event AuthorizeCaller(address account);
    event RegisterAirline(address account, string name, bool isRegistered, uint votes);

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor () public {
        contractOwner = msg.sender;
        authorizeCaller(contractOwner);
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            external 
                            view 
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            )
                            external
    {
        operational = mode;
    }

    function getRegisteredAirlineCount() external view returns(uint){
        return registeredAirlines.length;
    }
    function getAirlineCount() external view returns(uint){
        return airlinesCount;
    }

    function isAirlineRegistered(address account) external view returns(bool){
        return airlines[account].isRegistered;
    }

    function getAirlineVotesCount(address account) external view returns(uint){
        return airlines[account].votes;
    }

    function addVotertoUnregisteredAirline(address account, address voter) external{
        voters[account].push(voter);
        airlines[account].votes = airlines[account].votes.add(1);
    }

    function getVoterAddress(address account, uint index) external view returns(address){
        return voters[account][index];
    }

    function registerUnregisteredAirline(address account) external{
        airlines[account].isRegistered = true;
        airlinesCount = airlinesCount.add(1);
    }

    function isAirlineFunded(address account) external view returns(bool){
        return airlines[account].isFunded;
    }

    function getAirlineNameByAddress(address account) public view returns(string){
        return airlines[account].name;
    }


    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function authorizeCaller(address account)
    public
    requireContractOwner
    requireIsOperational
    {
        airlines[account] = Airline({
                                                        name : "Yemen AirLine",
                                                        isRegistered : true,
                                                        isFunded : true,
                                                        votes : 0,
                                                        funds:10
                                                    });
        airlinesCount = 1;
        registeredAirlines.push(account);
        emit AuthorizeCaller(account);
    }

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (
                                address account,
                                string name,
                                bool isRegistered,
                                uint votes
                            )
                            external
    {
        airlines[account] = Airline({
                                                        name : name,
                                                        isRegistered : isRegistered,
                                                        isFunded : false,
                                                        votes : votes,
                                                        funds: 0
                                                    });
            airlinesCount = airlinesCount.add(1);
            if(isRegistered == true){
                registeredAirlines.push(account);
            }
            emit RegisterAirline(account, name, isRegistered, votes);
    }


   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buy
                            (        
                                address account,
                                string memory flight,
                                uint timestamp                 
                            )
                            public
                            requireIsOperational
                            payable
    {
        require(msg.value <= 1 ether && msg.value != 0,'It requires some credit and it is not allowed to put more than 1 ether');
        bytes32 flightKey = getFlightKey(account,flight,timestamp);
        require(passengersInsurances[flightKey][msg.sender].amount == 0, 'Already has credit in this flight');
        flightPassengers[flightKey].push(msg.sender);
        passengersInsurances[flightKey][msg.sender].amount = passengersInsurances[flightKey][msg.sender].amount.add(msg.value);
        passengersInsurances[flightKey][msg.sender].profit = 0;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees(bytes32 flight) external {
        for(uint i = 0; i < flightPassengers[flight].length; i++){
            require(passengersInsurances[flight][flightPassengers[flight][i]].profit == 0,'Already got profit');
            uint profit = passengersInsurances[flight][flightPassengers[flight][i]].amount.div(2);
            passengersInsurances[flight][flightPassengers[flight][i]].profit = passengersInsurances[flight][flightPassengers[flight][i]].profit.add(profit);
        }
    }
    

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay
                            (
                                address account,
                                string memory flight,
                                uint timestamp
                            )
                            public
                            requireIsOperational
    {
        bytes32 flightKey = getFlightKey(account, flight, timestamp);
        require(passengersInsurances[flightKey][msg.sender].amount > 0, 'No credit found');
        uint profit = passengersInsurances[flightKey][msg.sender].profit;
        uint amount = passengersInsurances[flightKey][msg.sender].amount;
        uint sum = amount.add(profit);
        
        passengersInsurances[flightKey][msg.sender].profit = 0;
        passengersInsurances[flightKey][msg.sender].amount = 0;

        delete passengersInsurances[flightKey][msg.sender];
        for(uint i = 0; i < flightPassengers[flightKey].length; i++){
            if(flightPassengers[flightKey][i] == msg.sender){
                delete flightPassengers[flightKey][i];
            }
        }

        msg.sender.transfer(sum);
    }

    function getPassengerAmount(address account, string flight, uint timestamp) public view returns(uint){
        bytes32 flightKey = getFlightKey(account, flight, timestamp);
        return passengersInsurances[flightKey][msg.sender].amount;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            ()
                            public
                            payable
                            requireIsOperational
    {
        require(airlines[msg.sender].isRegistered, 'Can`t fund unregistered airline');
        require(msg.value >= 10 ether, 'Airline funding must be 10 ether or more');
        airlines[msg.sender].funds = msg.value;
        airlines[msg.sender].isFunded = true;
    }

    function getFlightKey
                        (
                            address airline,
                            string memory flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            public 
                            payable
    {
        fund();
    }


}

