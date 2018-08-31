const fs = require('fs');

function makeABI(contractName) {
    const contract = require(`./build/contracts/EWill${contractName}.json`);
    const abi = JSON.stringify(contract.abi);
    fs.writeFileSync(`./build/abi-${contractName}.json`, abi);
}

function makeABIs(contractNames) {
    for(let idx in contractNames) {
        makeABI(contractNames[idx]);
    }
}

makeABIs(['account', 'escrow', 'finance', 'platform', 'pretokensale', 'tokensale', 'token']);
