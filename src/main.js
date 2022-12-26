import Web3 from "web3";
import { newKitFromWeb3 } from "@celo/contractkit";
import BigNumber from "bignumber.js";
import CELOBANK from "../contract/celobank.abi.json";
import IERC20 from "../contract/IERC20.abi.json";
import { bufferToSolidityBytes } from "@celo/contractkit/lib/wrappers/BaseWrapper";


const ERC20Decimals = 18;
const bankContractAddress = "0xB9a8Daa75eB258c405fA1D3c7F44927e1D700E17"
const cUSDContractAddress = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1"

let kit;
let contract;
let userAccount;
let allAssociation;


// get DOM elements
const sections = document.querySelectorAll("section");
const excoPage = document.querySelectorAll(".excos");



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
            console.log(userAccount, "user account")


            contract = new kit.web3.eth.Contract(CELOBANK, bankContractAddress);
        } catch(error) {
            notification(`⚠️ ${error}.`)
        }
    } else {
        notification("⚠️ Please install the CeloExtensionWallet.");
    }
}



const getBalance = async () => {
    const totalBalance = await kit.getTotalBalance(kit.defaultAccount);
    const cUSDBalance = calculatePrice(totalBalance.cUSD);
    console.log(cUSDBalance, "see")
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
    allAssociation = await contract.methods.getAllAssociations().call();
    allAssociation.map((item) => {
        document.getElementById("tbody").innerHTML = associationTemplate(item)
    })
console.log("all association", allAssociation);
}


function associationTemplate(_association) {
    return `
        <tr>
            <td class="py-3">${(_association[1]).padStart(5, "0")}</td>
            <td class="py-3">${_association[0]}</td>
            <td class="py-3">${(_association[2])/ 1e18}</td>
            <td class="py-3"><button class="px-5 bg-slate-300 rounded-2xl" id="deposit">Deposit</button></td>
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
            new BigNumber(parseInt(document.getElementById("deposit-acctNumber").value), 5).toString(),
            new BigNumber(document.getElementById("deposit-amount").value)
            .shiftedBy(ERC20Decimals)
            .toString()
        ]
        notification(`⌛ Please approve "$${depositParams[1]/1e18}"...`)

        console.log(depositParams, "get deposit parameters")

        try{
            await approve(depositParams[1])

            notification(`Approve Succcessfully`)

        } catch (error) {
            notification(`⚠️ ${error}.`)
            return;
        }

        notification(`⌛ Adding "$${depositParams[1]/1e18}"...`)

        try{
            const result = await contract.methods
                .deposit(...depositParams)
                .send({from: kit.defaultAccount })

                console.log(result, "result")
        notification(`🎉 You successfully deposited "$${depositParams[1]/1e18}" <a href="https://explorer.celo.org/alfajores/tx/${result.blockHash}">View transaction</a>`)

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
            new BigNumber(parseInt(document.getElementById("initAcctNo").value), 5).toString(),
        ]

        notification(`⌛ Initiating "$${initParams[0]/1e18}" from account number "${(initParams[1]).padStart(5, "0")}"`)

        try{
            const result = await contract.methods
                .initTransaction(...initParams)
                .send({ from: kit.defaultAccount })

                console.log(result, "result")

            notification(`🎉 successfully initiated "$${initParams[0]/1e18}" withdrawal from account "${(initParams[1]).padStart(5, "0")}" <a href="https://explorer.celo.org/alfajores/tx/${result.blockHash}">View transaction</a>`)

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
            new BigNumber(parseInt(document.getElementById("approve-number").value), 5).toString(),
        ]

        notification(`⌛ approving transaction at order number "${approveParams[0]}"`)

        try{
            const result = await contract.methods
                .approveWithdrawal(...approveParams)
                .send({from: kit.defaultAccount })

                console.log(result, "result")
                notification(`🎉 succesfully approve transaction. <a href="https://explorer.celo.org/alfajores/tx/${result.blockHash}">View transaction</a>`)
        } catch (error) {
            notification(`⚠️ ${error}`)
        }

        await getAllAssociation()
    })







window.addEventListener("load", async () => {
    notification("⌛ Loading...")
    await connectCeloWallet()
    await getBalance()
    await getAllAssociation();
    notificationOff()
})



function calculatePrice(amount) {
	return amount.shiftedBy(-ERC20Decimals).toFixed(2);
}







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
    document.getElementById("modal-wrapper").style.backgroundColor = "#000000"
})
document.getElementById("close-modal").addEventListener("click", () => {
    document.querySelector(".modal").style.display = "none";
    document.getElementById("celo-body").style.backgroundColor = ""
})

document.querySelector(".modal").addEventListener("click", () => {
    document.querySelector(".modal").style.display = "none";
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
