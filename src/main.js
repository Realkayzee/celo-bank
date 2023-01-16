import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import CELOBANK from "../contract/celobank.abi.json";
import IERC20 from "../contract/IERC20.abi.json";
import { bufferToSolidityBytes } from "@celo/contractkit/lib/wrappers/BaseWrapper";


const ERC20Decimals = 18;
const bankContractAddress = "0xC3FF020D904Fc6cd8C3860A1FEe011630D2B4825"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit;
let contract;
let userAccount;
let allAssociation;


// get DOM elements
const sections = document.querySelectorAll("section");
const excoPage = document.querySelectorAll(".excos");
const statusPage = document.querySelectorAll(".status");



// Connect to celo wallet
const connectCeloWallet = async () => {
    if(window.celo) {
        notification("⚠️ Please approve this DApp to use it.")
        try {
            await window.celo.enable()
            notificationOff()

            const web3 = new Web3(window.celo)
            kit = newKitFromWeb3(web3)

            const accounts = await kit.web3.eth.getAccounts()
            kit.defaultAccount = accounts[0]
            userAccount = kit.defaultAccount


            contract = new kit.web3.eth.Contract(CELOBANK, bankContractAddress);
        } catch(error) {
            notification(`⚠️ ${error}.`)
        }
    } else {
        notification("⚠️ Please install the CeloExtensionWallet.");
    }
}

function calculatePrice(amount) {
	return amount.shiftedBy(-ERC20Decimals).toFixed(2);
}

const hexToDecimal = hex => parseInt(hex, 16)


const getBalance = async () => {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
    const cUSDBalance = calculatePrice(totalBalance.cUSD);
    document.querySelector("#balance").textContent = cUSDBalance;
}


function notification(_text) {
    document.querySelector(".alert").style.display = "block";
    document.getElementById("notification").innerHTML = _text;
}

function notificationOff() {
    document.querySelector(".alert").style.display = "none";
}



const getAllAssociation = async () => {
    document.getElementById("tbody").innerHTML = ""
    allAssociation = await contract.methods.getAllAssociations().call();
    allAssociation.forEach((item) => {
        document.getElementById("tbody").innerHTML += associationTemplate(item);
    })
}


function associationTemplate(_association) {
    return `
        <tr>
            <td class="py-3 pl-5">${(_association[1]).padStart(5, "0")}</td>
            <td class="py-3">${_association[0]}</td>
            <td class="py-3">${(_association[2]).slice(0,10)}......</td>
            <td class="py-3"><button class="px-5 bg-slate-300 rounded-2xl">Deposit</button></td>
        </tr>
    `
}





// deposit function

async function approve(_price) {
    const getCusdContract = new kit.web3.eth.Contract(IERC20, cUSDContractAddress);
    const result = await getCusdContract.methods
        .approve(bankContractAddress, _price)
        .send({ from: kit.defaultAccount });
    return result;
}


document
    .querySelector("#member-deposit")
    .addEventListener("click", async(e) => {
        const depositParams = [
            new BigNumber(parseInt(document.getElementById("deposit-acctNumber").value, 10)).toString(),
            new BigNumber(document.getElementById("deposit-amount").value)
            .shiftedBy(ERC20Decimals)
            .toString()
        ]
        notification(`⌛ Please approve "$${depositParams[1]/1e18}" to be deposited into account "${(depositParams[0]).padStart(5, "0")}". waiting...`)


        try{
            await approve(depositParams[1])

            notification(`Approve Succcessfully`)

        } catch (error) {
            notification(`⚠️ ${error}.`)
            return;
        }

        notification(`⌛ Depositing "$${depositParams[1]/1e18}" into account "${(depositParams[0]).padStart(5, "0")}`)

        try{
            const result = await contract.methods
                .deposit(...depositParams)
                .send({from: kit.defaultAccount })

        notification(`🎉 You successfully deposited "$${depositParams[1]/1e18}" <a class="underline underline-offset-2" target="_blank" href="https://alfajores.celoscan.io/tx/${result.transactionHash}">View transaction</a>`)

        } catch (error) {
            notification(`⚠️ ${error}.`)
        }



        openTab(0)
        await getBalance()
        await getAllAssociation()

    })


// Initiate transaction function

document
    .querySelector("#initiate-transactions")
    .addEventListener("click", async(e) => {
        const initParams = [
            new BigNumber(document.getElementById("initAmountWithdraw").value)
            .shiftedBy(ERC20Decimals)
            .toString(),
            new BigNumber(parseInt(document.getElementById("initAcctNo").value, 10)).toString(),
        ]

        notification(`⌛ Initiating "$${initParams[0]/1e18}" from account number "${(initParams[1]).padStart(5, "0")}".....`)

        try{
            const result = await contract.methods
                .initTransaction(...initParams)
                .send({ from: kit.defaultAccount })

                const {events: getEvents} = result;
                const event = getEvents._initTransaction.raw.data

            notification(`🎉 successfully initiated "$${initParams[0]/1e18}" withdrawal from account "${(initParams[1]).padStart(5, "0")}" at order number: <b>${hexToDecimal(event)}<b/> <br/> <a target="_blank" class="underline underline-offset-2" href="https://alfajores.celoscan.io/tx/${result.transactionHash}">View transaction</a>`)

        } catch (error) {
            notification(`⚠️ ${error}.`)
        }

        await getAllAssociation()
    })

// approve transaction function

document
    .querySelector("#approve-transactions")
    .addEventListener("click", async(e) => {
        const approveParams = [
            new BigNumber(document.getElementById("approve-order").value).toString(),
            new BigNumber(parseInt(document.getElementById("approve-number").value, 10)).toString(),
        ]

        notification(`⌛ approving withdrawal for account "${(approveParams[1]).padStart(5, "0")}" at order number "${approveParams[0]}"`)

        try{
            const excoNumber = await contract.methods.getExcoNumber(approveParams[1]).call();
            const result = await contract.methods
                .approveWithdrawal(...approveParams)
                .send({from: kit.defaultAccount })

                const {events: getEvents} = result;
                const event = getEvents._approveWithdrawal.raw.data
                notification(`🎉 succesfully approve withdrawal. Total number of confirmation from excos: <b>${hexToDecimal(event)} of ${excoNumber}</b> <br/> <a target="_blank" class="underline underline-offset-2" href="https://alfajores.celoscan.io/tx/${result.transactionHash}">View transaction</a>`)
        } catch (error) {
            notification(`⚠️ ${error}`)
        }

        await getAllAssociation()
    })


// Revert approval

document
    .querySelector("#revert-transaction")
    .addEventListener("click", async(e) => {
        const revertParams = [
            new BigNumber(parseInt(document.getElementById("revert-number").value, 10)).toString(),
            new BigNumber(document.getElementById("revert-order").value).toString()
        ]

        notification(`⌛ reverting approval for account "${(revertParams[0]).padStart(5, "0")}" at order number "${revertParams[1]}"`)

        try{
            const excoNumber = await contract.methods.getExcoNumber(revertParams[0]).call();
            const result = await contract.methods
                .revertApproval(...revertParams)
                .send({from: kit.defaultAccount })

                const {events: getEvents} = result;
                const event = getEvents._approveWithdrawal.raw.data
                notification(`🎉 succesfully revert approval. Total number of approval from excos: <b>${hexToDecimal(event)} of ${excoNumber}</b> <br/> <a target="_blank" class="underline underline-offset-2" href="https://alfajores.celoscan.io/tx/${result.transactionHash}">View transaction</a>`)
        } catch (error) {
            notification(`⚠️ ${error}`)
        }

        await getAllAssociation()
    })

// withdraw transaction function

document
    .querySelector("#withdraw-transaction")
    .addEventListener("click", async(e) => {
        const withdrawParams = [
            new BigNumber(parseInt(document.getElementById("withdraw-account").value, 10)).toString(),
            new BigNumber(document.getElementById("withdraw-order").value).toString()
        ]

        notification(`⌛ Withdrawing transaction from account "${(withdrawParams[0].padStart(5, "0"))}" at order number "${withdrawParams[1]}"`)


        try{
            const result = await contract.methods
                .withdrawal(...withdrawParams)
                .send({from: kit.defaultAccount })

                notification(`🎉 succesfully withdraw from account "${(withdrawParams[0].padStart(5, "0"))}" at order number "${withdrawParams[1]}" <a target="_blank" class="underline underline-offset-2" href="https://alfajores.celoscan.io/tx/${result.transactionHash}">View transaction</a>`)
        } catch (error) {
            notification(`⚠️ ${error}`)
        }

        await getAllAssociation()
    })

function statusResult(_text) {
    document.getElementById("result").innerHTML = _text;
}

// association balance function
document
    .querySelector("#check-balance")
    .addEventListener("click", async(e) => {
        const balanceParams = [
            new BigNumber(parseInt(document.getElementById("association-number").value, 10)).toString(),
            document.getElementById("association-password").value
        ]

        try{
            const balance = await contract.methods
                .AmountInAssociationVault(...balanceParams)
                .call();

                statusResult(`<br/><b>Association Balance is ${balance/1e18} cUSD<b/>`)
        } catch (error) {
            notification(`⚠️ ${error}: Incorrect Password`)
        }
    })

// approval status function
document
    .querySelector("#check-approval")
    .addEventListener("click", async(e) => {
        const approvalParams = [
            new BigNumber(parseInt(document.getElementById("ass-approval-number").value, 10)).toString(),
            new BigNumber(document.getElementById("ass-order-number").value).toString()
        ]

        try{
            const approvalStatus = await contract.methods
                .ApprovalStatus(...approvalParams)
                .call();

                statusResult(`<br/>Total number of approval <b>-</b> ${approvalStatus.approvalNo} <br/> Withdrawal executed? <b>-<b/> ${approvalStatus.executed}`)
        } catch (error) {
            notification(`⚠️ ${error}: No available approval`)
        }
    })

// Amount Requested by an exco function
document
    .querySelector("#check-requested")
    .addEventListener("click", async(e) => {
        const requestParams = [
            new BigNumber(parseInt(document.getElementById("requested-account-number").value, 10)).toString(),
            new BigNumber(document.getElementById("requested-order-number").value).toString()
        ]

        try{
            const amountRequested = await contract.methods
                .checkAmountRequest(...requestParams)
                .call();

                statusResult(`<br/>Amount requested for <b>order number: ${requestParams[1]} is ${amountRequested/1e18} cUSD</b>`)
        } catch (error) {
            notification(`⚠️ ${error}: No available approval`)
        }
    })

// User deposit function
document
    .querySelector("#check-deposit")
    .addEventListener("click", async(e) => {
        const depositParams = [
            new BigNumber(parseInt(document.getElementById("ass-user-number").value, 10)).toString(),
            document.getElementById("user-addr").value
        ]
        try{
            const depositedAmount = await contract.methods
                .checkUserDeposit(...depositParams)
                .call();

                statusResult(`<br/>Amount deposited by <b>user: ${depositParams[1]} is ${depositedAmount/1e18} cUSD</b>`)
        } catch (error) {
            notification(`⚠️ ${error}: Invalid input`)
        }
    })



    let Excoaddress = [];

// add address function
document
    .querySelector("#add-address")
    .addEventListener("click", () => {
        Excoaddress.push(document.getElementById("exco-addr").value)
        document.getElementById("exco-addr").value = ""


        let result = [];

        for(let i=0; i < Excoaddress.length; i++) {
            result.push(Excoaddress[i].slice(0,6));
        }
        document.getElementById("display-address").innerHTML = `
        <p class="flex-initial bg-slate-400 p-2">${result}</p>
    `
    })

// create account function
document
    .querySelector("#create-accounts")
    .addEventListener("click", async(e) => {
        const createParams = [
            document.getElementById("create-name").value,
            Excoaddress,
            Excoaddress.length,
            document.getElementById("create-password").value
        ]



        notification(`⌛ Creating association account`)

        try{
            const result = await contract.methods
                .createAccount(...createParams)
                .send({from: kit.defaultAccount })

            notification(`🎉 succesfully created an association account. <a href="https://explorer.celo.org/alfajores/tx/${result.blockHash}">View transaction</a>`)
        } catch (error) {
            notification(`⚠️ ${error}`)
        }

        await getAllAssociation()
        document.querySelector(".modal").style.display = "none";

        Excoaddress = []
    })



window.addEventListener("load", async () => {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getBalance()
    await getAllAssociation();
    notificationOff()
})




/**
 * ============================Tabs=============================
 */

// Home Page
document.getElementById("home-link").addEventListener("click", () => {
    openTab(0)
})

// Executive Page
document.getElementById("exec-link").addEventListener("click", () => {
    openTab(1);
})

// Memeber Page
document.getElementById("memb-link").addEventListener("click", () => {
    openTab(2);
})
// Status Page
document.getElementById("status-link").addEventListener("click", () => {
    openTab(3)
})

document.getElementById("tbody").addEventListener("click", () => {
    openTab(2);
});

// initiate transaction button
document.getElementById("initiate-transaction").addEventListener("click", () => {
    excoTab(0);
})
// Approve transaction button
document.getElementById("approve-transaction").addEventListener("click", () => {
    excoTab(1);
})
// Revert Approval button
document.getElementById("revert-approval").addEventListener("click", () => {
    excoTab(2);
})
// withdrawal button
document.getElementById("withdraw").addEventListener("click", () => {
    excoTab(3);
})

// create account modal
document.getElementById("create-account").addEventListener("click", () => {
    document.querySelector(".modal").style.display = "block";
})
document.getElementById("close-modal").addEventListener("click", () => {
    document.querySelector(".modal").style.display = "none";
    document.getElementById("celo-body").style.backgroundColor = ""
})

// Status Page

// Check association balance
document.getElementById("association-balance").addEventListener("click", () => {
    statusTab(0);
})
// Check Approval status
document.getElementById("approval-status").addEventListener("click", () => {
    statusTab(1);
})
// Check Amount requested
document.getElementById("exco-request").addEventListener("click", () => {
    statusTab(2);
})
// Check user deposit 
document.getElementById("user-deposit").addEventListener("click", () => {
    statusTab(3);
})


function openTab(pageId) {
    sections.forEach((page) => {
        page.style.display = "none";
    });
    sections[pageId].style.display = "block";
}


function excoTab(pageId) {
    excoPage.forEach((page) => {
        page.style.display = "none";
    });
    excoPage[pageId].style.display = "block";
}

function statusTab(pageId) {
    statusPage.forEach((page) => {
        page.style.display = "none";
    });
    statusPage[pageId].style.display = "block";
}
