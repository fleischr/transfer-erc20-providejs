import { Ident } from "provide-js";
import { Vault } from "provide-js";
import { NChain } from "provide-js";
import { readFile } from "fs/promises";
import 'dotenv/config';

console.log("begin erc-20 transfer");

//load the refresh token from env
var REFRESH_TOKEN = process.env.REFRESH_TOKEN;
var ORG_ID = process.env.ORG_ID;
var USER_ID = process.env.USER_ID;

var access_token_request = {};
access_token_request.organization_id = ORG_ID;
access_token_request.user_id = USER_ID;

//get the access token
const IDENT_PROXY = new Ident(REFRESH_TOKEN);
const ACCESS_TOKEN = await IDENT_PROXY.createToken(access_token_request);

const NCHAIN_PROXY = new NChain(ACCESS_TOKEN.accessToken);
const polygon_mumbai = "4251b6fd-c98d-4017-87a3-d691a77a52a7";
const celo_alfajores = "d818afb9-df2f-4e46-963a-f7b6cb7655d2";
var selected_network = polygon_mumbai; //Polygon Mumbai

var SELECTED_WALLET = NCHAIN_WALLETS.results.filter(nchainwallets => nchainwallets.organizationId === ORG_ID );
var TARGET_VAULT = SELECTED_WALLET[0].vaultId;


//get the PRVD vault
const VAULT_PROXY = new Vault(ACCESS_TOKEN.accessToken);
const MY_VAULTS = await VAULT_PROXY.fetchVaults();
console.log(MY_VAULTS.results);
var MY_VAULT_ID = MY_VAULTS.results[0].id;


//get the key ids ~ no private keys exposed!!
const MY_VAULT_KEY_IDS = await VAULT_PROXY.fetchVaultKeys(MY_VAULT_ID);
var MY_WALLET = MY_VAULT_KEY_IDS.results.filter(vaultkeys => vaultkeys.spec === "secp256k1");
console.log(MY_WALLET);


const MY_WALLET_KEY_ID = MY_WALLET[0].id;
const MY_WALLET_ADDRESS = MY_WALLET[0].address;


//console.log("sending ERC20s with wallet address:" + NFT_WALLET_ADDRESS );

var cheesecake_contract_create = {};

switch(selected_network) {
        case polygon_mumbai:
                let erc20Deployment = JSON.parse(await readFile("./abi/CheesecakeUSD.json", "utf8"));
                cheesecake_contract_create.address = "0xbB6496EBC15eE967bC81B5d9aa4748e708c98bE3"; //address of your ERC20 contract
                break;
        case celo_alfajores:
                erc20Deployment = JSON.parse(await readFile("./abi/CheesecakeUSD.json", "utf8"));
                cheesecake_contract_create.address = "0x55bD95969c9F5297688B6115f2b984e2daF0359e"; //address of your ERC20 contract
                break;
}


let contractslist = await NCHAIN_PROXY.fetchContracts();
let targetcontract = contractslist.results.filter( contract => contract.address === selected_contract_address && contract.networkId === selected_network );

var selected_contract_id = "";
if(targetcontract[0] != undefined) { 
        //contract was already added on Nchain
        console.log('Found deployed contract');
        selected_contract_id = targetcontract[0].id;
    
} else {
        //create instance on Nchain
        let cheesecakeABI = erc20Deployment["abi"];
        cheesecake_contract_create.name = "CheesecakeUSD"; //name of the ERC20 contract
        cheesecake_contract_create.network_id = selected_network;
        cheesecake_contract_create.params = { argv: [],
                               wallet_id: MY_WALLET[0].id,
                               compiled_artifact: {
                                    abi: cheesecakeABI,
                                }
        };

        const CHEESECAKE_CONTRACT = await NCHAIN_PROXY.createContract(cheesecake_contract_create);
        console.log(CHEESECAKE_CONTRACT);
        selected_contract_id = CHEESECAKE_CONTRACT.id;
}


const accounts = await NCHAIN_PROXY.fetchAccounts();
const network_account = accounts.results.filter( network_account => network_account.networkId === selected_network );
console.log(network_account);

// who wants cheesecake??
const DEFAULT_RECIPIENT = process.env.DEFAULT_RECIPIENT;

var execute_contract_by_account = {};
execute_contract_by_account.account_id = network_account[0].id;
execute_contract_by_account.method = 'transfer';
execute_contract_by_account.params = [DEFAULT_RECIPIENT,100000];
execute_contract_by_account.value = 0;


// execute contract method
const SEND_CHUSD_RESP = await NCHAIN_PROXY.executeContract(selected_contract_id, execute_contract_by_account);

console.log(SEND_CHUSD_RESP);

const ERC20_TRANSFER_STATUS = await NCHAIN_PROXY.fetchTransactionDetails(SEND_CHUSD_RESP.ref);

var blockexplorerlink = "";
switch(selected_network) {
    case celo_alfajores:
        blockexplorerlink = "https://alfajores.celoscan.io/tx/" + ERC20_TRANSFER_STATUS.hash;
        break;
    case polygon_mumbai:
        blockexplorerlink = "https://mumbai.polygonscan.com/tx/" + ERC20_TRANSFER_STATUS.hash;
        break;
    default:
        blockexplorerlink = "Hash:" + ERC20_TRANSFER_STATUS.hash;
}

console.log("See block explorer");
console.log(blockexplorerlink);

console.log("end erc20 transfer");