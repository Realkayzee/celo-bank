# Celo Bank

Celo bank is an open joint account system for various association, association can come in to register their association account with list of executive.
* The executives will be responsible for withdrawal of the association funds.
* Before withdrawal, an exco needs to initiate withdrawal first, which must be approved by other excos before a withdrawal can be succesful.
* Exco can revert his/her approval made
* Member of the association can deposit into the association account
* There's a proof that shows member deposited by checking the status page


#Demo
https://celo-bank.vercel.app/


# Detailed Explanation of Celo Bank Usage and Interaction

## Homepage

The homepage contains the create account button where anybody can come to create an association,

### For create association account modal
* A user cannot create multiple account
* Each account creation is backed  with a password for users of the association to check the association balance (this helps restrict outsider from seeing association balance)
* The create account association have input for adding more than one exco address
* To register more than one exco while creating association account, user will click on add address button to add address one after the other
* User can then create account after inputting all the neccessary details

### Account list (Table)
The created account will be added to the list of available association account created on the homepage.

The list contains:
* The association account number which is automatically generated on account creation (This is what makes an association unique)
* The association name base on user's input
* The association creator - The person that created the account
* Action - Deposit button to deposit into an account, users will specify the account they wish to deposit into

### Deposit

The deposit form takes in the account number and amount user wants to deposit.
* Anybody can deposit cUSD into the association account
* Inputting an invalid account number won't go through
* The amount will be deposited into the account number user specified, so ensure the deposit account number is correct.

## Executive Page

This page is solely for excos, remeber excos handle withdrawal initiation, approval/revert and withdrawal
* Excos willing to withdraw from the association account will first initiate withdrawal,
* On initiating, an order number will be given to the exco, which other exco members will approval before final withdrawal from the association
* It means no exco can withdraw without the approval of other excos
* On initialising withdrawal, the exco that initialised the withdrawal automatically approve his/her withdrawal
* Other exco can approve a withdrawal by specifying the association account number and the withdrawal order number
* Any exco can revert his/her approved withdrawal in case of change of mind

## Status Page

This page is responsible for tracking association activities, such as:
* Checking association balance with associaiton password for members of the association
* Checking approval status
* Checking Amount Requested by an exco
* Checking amount a user deposited for accountability

All of these are put in place for transparency and accountability within association






# Install

```

npm install

```

or

```

yarn install

```

# Start

```

npm run dev

```

# Build

```

npm run build

```
# Usage
1. Install the [CeloExtensionWallet](https://chrome.google.com/webstore/detail/celoextensionwallet/kkilomkmpmkbdnfelcpgckmpcaemjcdh?hl=en) from the google chrome store.
2. Create a wallet.
3. Go to [https://celo.org/developers/faucet](https://celo.org/developers/faucet) and get tokens for the alfajores testnet.
4. Switch to the alfajores testnet in the CeloExtensionWallet.