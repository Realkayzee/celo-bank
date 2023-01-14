# Celo Bank

Celo bank is an open joint account system for various association, association can come in to register their association account with list of executive.
* The executives will be responsible for deposit or withdrawal of the association funds.
* Before withdrawal initiator needs approval of other executive before a withdrawal can be succesful.
* Executive member can revert his/her approval made
* Member of the association can deposit into the association account
* There's a proof that shows member deposited


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