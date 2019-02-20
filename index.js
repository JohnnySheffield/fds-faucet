require('dotenv').config();

let express = require('express');
let bodyParser = require('body-parser');
let ethers = require('ethers');
let cors = require('cors');

let utils = ethers.utils;

let privateKey = process.env.PRIVATE_KEY;
let provider = new ethers.providers.JsonRpcProvider(process.env.ETH_GATEWAY);

let dripAmt = utils.parseEther(process.env.DRIP_AMT);

const app = express();
const port = process.env.PORT || '3001';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

let gimmieEth = function(privateKey, address, amt){
  return new Promise((resolve, reject) => {
    let wallet = new ethers.Wallet(privateKey, provider);

    return provider.getTransactionCount(wallet.address).then((transactionCount) => {
      console.log('txs', transactionCount);
      console.log('nonce', transactionCount+2)
      let transaction = {
          gas: 4712388,
          gasLimit: 50000,
          gasPrice: 100000000000,
          to: address,
          value: amt,
          nonce: transactionCount
      }

      let signPromise = wallet.sign(transaction);

      return signPromise.then((signedTransaction) => {
          return provider.sendTransaction(signedTransaction).then((tx) => {
              console.log('sent', tx);
              let checkInterval = setInterval(()=>{
                provider.getTransaction(tx.hash).then((gotTx)=>{
                  console.log(tx.hash, gotTx.confirmations);
                  if(gotTx.confirmations > 0){
                    console.log(tx, 'confirmed')
                    clearInterval(checkInterval);
                  }
                })
              },3000);
              resolve(tx);
              return;
          }).catch((error)=>{
            reject(error.message);
            return
          });
      });
    });
  });
};

app.post('/gimmie', (req, res) => {
  let recipient = req.body.address;
  console.log('requested: ' + recipient)
  gimmieEth(privateKey, recipient, dripAmt).then((tx)=>{
    res.send({
      result: true,
      gifted: utils.formatEther(dripAmt),
      transaction: tx.hash
    });
  }).catch(error => {
    res.status(500).send({
      result: false,
      error: error
    });
  });
});

app.listen(port, () => console.log(`Faucet dripping on port ${port}!`));

// curl -XPOST localhost:3001/gimmie --data "address=0x972e45b1e7e468466276305ab20e4cb09b1ad0e6"