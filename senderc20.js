import { Ident } from "provide-js";
import { Vault } from "provide-js";
import { NChain } from "provide-js";
import { Axiom } from "provide-js";
import { readFile } from "fs/promises";
import 'dotenv/config';

console.log("begin erc-20 transfer");

var REFRESH_TOKEN = user_params.refresh_token;
var ORG_ID = user_params.organization_id;
var USER_ID = user_params.user_id;

var access_token_request = {};
access_token_request.organization_id = ORG_ID;
access_token_request.user_id = USER_ID;

//get the access token
const IDENT_PROXY = new Ident(REFRESH_TOKEN);
const ACCESS_TOKEN = await IDENT_PROXY.createToken(access_token_request);

const NCHAIN_PROXY = new NChain(ACCESS_TOKEN.accessToken);
const polygon_mumbai = "4251b6fd-c98d-4017-87a3-d691a77a52a7";
const celo_alfajores = "d818afb9-df2f-4e46-963a-f7b6cb7655d2";
var selected_network = "4251b6fd-c98d-4017-87a3-d691a77a52a7"; //Polygon Mumbai

const NCHAIN_WALLETS = await NCHAIN_PROXY.fetchWallets();

var SELECTED_WALLET = NCHAIN_WALLETS.results.filter(nchainwallets => nchainwallets.organizationId === ORG_ID );
var TARGET_VAULT = SELECTED_WALLET[0].vaultId;

//console.log(NCHAIN_WALLETS);


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

let erc20Deployment = JSON.parse(await readFile("./abi/cheesecakeusdabi.json", "utf8"));
let cheesecakeABI = cheesecakeDeployment["output"]["contracts"]["contracts/CheesecakeUSD.sol"]["CheesecakeUSD"]["abi"];

var cheesecake_contract_create = {};
cheesecake_contract_create.address = "0x4e9915B2ff6679C63a290645B589794d89584E5C"; //address of your ERC20 contract
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

const accounts = await NCHAIN_PROXY.fetchAccounts();
console.log(accounts);

// who wants cheesecake??
const recipient = '0x...';


// execute contract method
const SEND_CHUSD_RESP = await NCHAIN_PROXY.executeContract(CHEESECAKE_CONTRACT.id, {
        account_id : accounts.results[0].id,
        method: 'transfer',
        params: [recipient,100000],
        value: 0,

});

console.log(SEND_CHUSD_RESP);

console.log("end erc20 transfer");