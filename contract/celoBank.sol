// SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

/**
    @title celo bank contract
    @author Realkayzee
    @notice This contract is a banking system for association
    - association can register their account with a certain number of executive members
    - the registered executive members are the only people eligible to withdraw association funds
    - withdrawal will only be successful when other registered excos approve to the withdrawal of a particular exco
*/

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


contract celoBank is Ownable {
/**
    ============================
    -----------Events-----------
    ============================
*/
    event _initTransaction(address, uint256);
    event _getAccountNumber(uint256);

/**
    ============================
    ------Error Messages--------
    ============================
*/

    error _assertExco(string);
    error _noZeroAmount(string);
    error _alreadyConfirmed(string);
    error _notApprovedYet(string);
    error _alreadyExecuted(string);
    error _addressZero(string);
    error _withdrawal(string);

/**
    ============================
    ------State Variables-------
    ============================
*/
    uint256 accountNumber = 1; // Association account number generator
    IERC20 tokenAddress;
    mapping(uint256 => AssociationDetails) public association; // track account number to associationDetails
    uint256 orderNumber = 1;

/// @dev map creator to association created. creator can't create multiple account with the same associated address
    mapping(address => AssociationInfo) associationCreator; 

/// @dev A layout for the association
    struct AssociationDetails{
        string associationName;
        address[] excoAddr; // excutive addresses
        uint40 excoNumber; // The number of excutives an association register
        mapping(uint256=> WithdrawalRequest) requestOrder; // to track a withdrawal request by an exco
        mapping(address => uint256) memberBalances; // to track the amount each member deposited
        mapping(uint256 => mapping(address => bool)) confirmed; // to track an exco confirmation to a withdrawal request
        uint256 associationBalance;
    }

    struct WithdrawalRequest {
        address exco; // exco that initiate the withdrawal request
        uint40 noOfConfirmation;
        bool executed;
        uint216 amount;
    }

    struct AssociationInfo {
        string infoAssName;
        uint256 associationAcctNumber;
        uint256 infoAssociationBalance;
    }

/**
    @dev The modifier checks if an exco has confirmed before
    @param _associationAcctNumber: the association account number
    @param _orderNumber order number of the initiated transaction
*/
    modifier alreadyConfirmed(uint256 _associationAcctNumber, uint256 _orderNumber){
        AssociationDetails storage AD = association[_associationAcctNumber];
        if(AD.confirmed[_orderNumber][msg.sender] == true) revert _alreadyConfirmed("You already approve");

        _;
    }

    modifier alreadyExecuted(uint256 _associationAcctNumber, uint256 _orderNumber){
        AssociationDetails storage AD = association[_associationAcctNumber];
        if(AD.requestOrder[_orderNumber].executed == true) revert _alreadyExecuted("Transaction already executed");

        _;
    }

    constructor(IERC20 _addr) {
        tokenAddress = _addr;
    }
/**
    @dev function to change token contract address
    @param _contractAddress: to input token contract address
*/
    function changeContractAddress(IERC20 _contractAddress) external onlyOwner {
        tokenAddress = _contractAddress;
    }


      function onlyExco(uint256 _associationAcctNumber) internal view returns(bool check) {
    AssociationDetails storage AD = association[_associationAcctNumber];
    for(uint i = 0; i < AD.excoAddr.length; i++) {
      if (msg.sender == AD.excoAddr[i] && AD.memberBalances[msg.sender] > 0) {
        return true;
      }
    }
    return false;
  }

/**
    @dev Function to ensure address zero is not used as executive address
    @param _assExcoAddr: array of executive addresses
*/

    function noAddressZero(address[] memory _assExcoAddr) pure internal {
        for(uint i = 0; i < _assExcoAddr.length; i++) {
            if(address(0) == _assExcoAddr[i]) revert _addressZero("Account Creation: address zero can't be an exco");
        }
    }


/**
    @dev function to create account
    @param _associationName: the association name
    @param _assExcoAddr: association executive addresses - array of addresses
    @param _excoNumber: number of executives
    @notice this is responsible for creating association account
*/
    


      function createAccount(uint256 _associationAcctNumber, string memory _associationName, address[] memory _excoAddr) public onlyOwner {
    require(associationCreator[msg.sender].associationAcctNumber == 0, "You already have an association");
    require(_associationAcctNumber > 0, "Invalid account number");
    require(_associationName.length > 0, "Enter a valid name");
    require(_excoAddr.length > 0, "Enter at least one exco member");

    AssociationDetails memory AD = AssociationDetails({
      associationName: _associationName,
      excoAddr: _excoAddr,
      excoNumber: _excoAddr.length,
      memberBalances: mapping(address => uint256)(),
      requestOrder: mapping(uint256 => WithdrawalRequest)(),
      confirmed: mapping(uint256 => mapping(address => bool))(),
      associationBalance: 0
    });

    association[_associationAcctNumber] = AD;

    AssociationInfo memory AI = AssociationInfo({
      infoAssName: _associationName,
      associationAcctNumber: _associationAcctNumber,
      infoAssociationBalance: 0
    });

    associationCreator[msg.sender] = AI;
  }



/// @dev Function to retrieve association account number
    function checkAssociationAccountNo(address _creatorAddr) public view returns(uint256){
        return associationCreator[_creatorAddr].associationAcctNumber;
    }


/// @dev function for users deposit to association bank
    function deposit(uint256 _associationAcctNumber, uint256 payFee) external payable {
        if(payFee == 0) revert _noZeroAmount("Deposit: zero deposit not allowed");
        AssociationDetails storage AD = association[_associationAcctNumber];
        require(tokenAddress.transferFrom(msg.sender, address(this), payFee), "Transfer Failed");
        AD.associationBalance += payFee;
        AD.memberBalances[msg.sender] += payFee;
    }

/// @dev function that initiate transaction
    function initTransaction(uint216 _amountToWithdraw, uint256 _associationAcctNumber) public returns(uint256 getOrder) {
        AssociationDetails storage AD = association[_associationAcctNumber];
        require(onlyExco(_associationAcctNumber), "Not an exco");
        require(_amountToWithdraw > 0, "Amount must be greater than zero");
        require(_amountToWithdraw  <= AD.associationBalance, "Insufficient Fund in association balance");

        getOrder = orderNumber;

        AD.requestOrder[orderNumber] = WithdrawalRequest({
            exco: msg.sender,
            noOfConfirmation: 0,
            executed: false,
            amount: _amountToWithdraw
        });

        orderNumber++;


        emit _initTransaction(msg.sender, _amountToWithdraw);
    }

/// @dev function for approving withdrawal

    function confirmWithdrawal(uint256 _associationAcctNumber, uint256 _orderNumber) public {
    require(onlyExco(_associationAcctNumber), _assertExco("You are not an exco"));
    AssociationDetails storage AD = association[_associationAcctNumber];
    require(AD.requestOrder[_orderNumber].amount > 0, _noZeroAmount("Invalid amount"));
    require(AD.requestOrder[_orderNumber].exco != msg.sender, "You initiated this request");
    }

  function requestWithdrawal(uint256 _associationAcctNumber, uint256 _orderNumber, uint216 _amount) public {
    require(_amount > 0, _noZeroAmount("Enter valid amount"));
    require(onlyExco(_associationAcctNumber), _assertExco("You are not an exco"));
    require(_orderNumber > 0, "Enter a valid order number");
    AssociationDetails storage AD = association[_associationAcctNumber];
    require(AD.associationBalance >= _amount, "Insufficient funds");
    WithdrawalRequest memory WR = WithdrawalRequest({
      exco: msg.sender,
      noOfConfirmation: 0,
      executed: false,
      amount: _amount
    });

    AD.requestOrder[_orderNumber] = WR;
  }


/**
    @dev function that handles revertion of approval
    @param _associationAcctNumber: association account number
    @param _orderNumber: order number of the initiated transaction
*/

    function revertApproval(uint256 _associationAcctNumber, uint256 _orderNumber) public alreadyExecuted(_associationAcctNumber, _orderNumber){
        require(onlyExco(_associationAcctNumber), "Not an Exco");
        AssociationDetails storage AD = association[_associationAcctNumber];
        if(AD.confirmed[_orderNumber][msg.sender] == false) revert _notApprovedYet("You have'nt approved yet");
        AD.confirmed[_orderNumber][msg.sender] = false;
        AD.requestOrder[_orderNumber].noOfConfirmation -= 1;
    }

/**
    @dev A function to check the amount an initiator/exco wants to withdraw
    @param _associationAcctNumber: association account number
    @param _orderNumber: order number of the intiated transaction
*/


    function checkAmountRequest(uint256 _associationAcctNumber,uint256 _orderNumber) public view returns(uint256){
        AssociationDetails storage AD = association[_associationAcctNumber];
        return AD.requestOrder[_orderNumber].amount;
    }


/**
    @dev function to check the amount own by an association
    @param _associationAcctNumber: association account number
*/
    function AmountInAssociationVault(uint256 _associationAcctNumber) public view returns(uint256 ){
        AssociationDetails storage AD = association[_associationAcctNumber];
        return AD.associationBalance;
    }

/**
    @dev function to check the total number of approval a transaction has reached
    @param _associationAcctNumber: association account number
*/

    function checkNumApproval(uint256 _associationAcctNumber, uint256 _orderNumber) public view returns (uint256) {
        AssociationDetails storage AD = association[_associationAcctNumber];
        return AD.requestOrder[_orderNumber].noOfConfirmation;
    }

/**
    @dev functions that checks member balance in a particular association
    @param _associationAcctNumber: association account number
    @param _addr: member address to check
*/
    function checkUserDeposit(uint256 _associationAcctNumber, address _addr) public view returns(uint256) {
        AssociationDetails storage AD = association[_associationAcctNumber];
        return AD.memberBalances[_addr];
    }

    function getAllAssociations() public view returns(AssociationInfo[] memory assInfo) {
        assInfo = new AssociationInfo[](accountNumber - 1);

        for(uint256 i = 1; i < accountNumber; i++) {
            AssociationDetails storage AD = association[i];
            string memory name = AD.associationName;
            uint256 acctNumber = i;
            uint256 acctBalance = AD.associationBalance;

            assInfo[i-1] = AssociationInfo(name, acctNumber, acctBalance);
        }
    }
}