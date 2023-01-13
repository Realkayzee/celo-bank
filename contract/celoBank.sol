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
        string associationPassword;
        address associationCreator;
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
        address infoAssCreator;
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


    function onlyExco(uint256 _associationAcctNumber) internal view returns(bool check){
        AssociationDetails storage AD = association[_associationAcctNumber];
        for(uint i = 0; i < AD.excoAddr.length; i++){
            if(msg.sender == AD.excoAddr[i]){
                check = true;
            }
        }
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
        * The account number is automatically generated
        * A User can't create multiple account
*/
    function createAccount(string memory _associationName, address[] memory _assExcoAddr, uint40 _excoNumber, string memory _associationPassword) external returns(uint _getAcctNo) {
        address acctCreator = msg.sender; // cache to save gas
        require(associationCreator[acctCreator].associationAcctNumber == 0, "CELO-BANK: Can't create multiple account, already created association");
        if(_assExcoAddr.length != _excoNumber) revert _assertExco("Specified exco number not filled"); // ensure the required number of exco registered
        noAddressZero(_assExcoAddr);// ensure address zero is not added to exco address
        _getAcctNo = accountNumber;
        AssociationDetails storage AD = association[_getAcctNo];
        AD.associationName = _associationName;
        AD.excoAddr = _assExcoAddr;
        AD.excoNumber = _excoNumber;
        AD.associationPassword = _associationPassword; // password for member of association to access account
        AD.associationCreator = acctCreator;


        // to track creator to association created by association name and association account number
        associationCreator[acctCreator] = AssociationInfo(_associationName, _getAcctNo, 0);

        emit _getAccountNumber(accountNumber);

        accountNumber++;
    }

    /// @dev function to change association account number
    /// @notice this can only be changed by the association account creator

    function changeAssociationPassword(uint256 _associationAcctNumber, string memory newPassword) external {
        require(associationCreator[msg.sender].associationAcctNumber == _associationAcctNumber, "You are not the creator of this account");
        association[_associationAcctNumber].associationPassword = newPassword;

    }


/// @dev function for users deposit to association bank
    function deposit(uint256 _associationAcctNumber, uint256 payFee) external payable {
        require(_associationAcctNumber < accountNumber && _associationAcctNumber != 0, "Invalid Account Number")
        if(payFee == 0) revert _noZeroAmount("Deposit: zero deposit not allowed");
        AssociationDetails storage AD = association[_associationAcctNumber];
        require(tokenAddress.transferFrom(msg.sender, address(this), payFee), "Transfer Failed");
        AD.associationBalance += payFee;
        AD.memberBalances[msg.sender] += payFee;
    }

/// @dev function that initiate transaction
/// @notice only excos can call on this function
    function initTransaction(uint216 _amountToWithdraw, uint256 _associationAcctNumber) public returns(uint256 getOrder) {
        AssociationDetails storage AD = association[_associationAcctNumber];
        require(onlyExco(_associationAcctNumber), "Not an exco");
        require(_amountToWithdraw > 0, "Amount must be greater than zero");
        require(_amountToWithdraw  <= AD.associationBalance, "Insufficient Fund in association balance");

        getOrder = orderNumber;

        AD.requestOrder[getOrder] = WithdrawalRequest({
            exco: msg.sender,
            noOfConfirmation: 0,
            executed: false,
            amount: _amountToWithdraw
        });

        orderNumber++;


        emit _initTransaction(msg.sender, _amountToWithdraw);
    }

/// @dev function for approving withdrawal

    function approveWithdrawal(uint256 _orderNumber, uint256 _associationAcctNumber) public alreadyExecuted(_associationAcctNumber, _orderNumber) alreadyConfirmed(_associationAcctNumber, _orderNumber){
        require(onlyExco(_associationAcctNumber), "Not an Exco");
        AssociationDetails storage AD = association[_associationAcctNumber];
        AD.confirmed[_orderNumber][msg.sender] = true;
        AD.requestOrder[_orderNumber].noOfConfirmation += 1;
    }


/// @dev function responsible for withdrawal after approval has been confirmed

    function withdrawal(uint256 _associationAcctNumber, uint256 _orderNumber) public alreadyExecuted(_associationAcctNumber, _orderNumber){
        require(onlyExco(_associationAcctNumber), "Not an Exco");
        AssociationDetails storage AD = association[_associationAcctNumber];
        WithdrawalRequest storage WR = AD.requestOrder[_orderNumber];
        if(WR.noOfConfirmation == AD.excoNumber){
            WR.executed = true;
            AD.associationBalance -= WR.amount;
            require(tokenAddress.transfer(msg.sender, WR.amount), "Transfer Failed");
        }
        else{
            revert _withdrawal("Can't withdraw");
        }
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
    function AmountInAssociationVault(uint256 _associationAcctNumber, string memory password) public view returns(uint256 ){
        AssociationDetails storage AD = association[_associationAcctNumber];
        require(AD.associationPassword == password, "Incorrect Password);
        return AD.associationBalance;
    }

/**
    @dev function to check the total number of approval a transaction has reached
        - Checks if order has been executed
    @param _associationAcctNumber: association account number
*/

    function ApprovalStatus(uint256 _associationAcctNumber, uint256 _orderNumber) public view returns (uint256 approvalNo, bool executed) {
        AssociationDetails storage AD = association[_associationAcctNumber];
        approvalNo = AD.requestOrder[_orderNumber].noOfConfirmation;
        executed = AD.requestOrder[_orderNumber].executed;
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
            address assCreator = AD.associationCreator;

            assInfo[i-1] = AssociationInfo(name, acctNumber, assCreator);
        }
    }
}