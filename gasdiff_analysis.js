const fs = require('fs')

const block_number = process.argv[2]
const err_data = fs.readFileSync('./data/gasdiff/error_' + block_number)
const res = JSON.parse(err_data)

var total_txs = 0
var total_gas_used = 0
var simple_transfers = 0

for ( result of res) {
  total_txs++
  var gas_used = result['result']['gas_used']
  var intrinsic_gas = result['result']['intrinsic_gas']
  var invalid = result['result']['invalid']
  var real_gas_used = gas_used + intrinsic_gas

  if (gas_used == 0 && intrinsic_gas == 21000) {
    simple_transfers++
  } else {
    console.log("- [ ] " + gas_used + " + " + intrinsic_gas + " = " + (gas_used + intrinsic_gas))
  }

  total_gas_used += real_gas_used

  /*
  console.log('gu:', gas_used)
  console.log('ig:', intrinsic_gas)
  console.log('iv:', invalid)
  console.log('rgu:', real_gas_used)
  console.log('tgu:', total_gas_used)
  console.log("")
  */
  }

console.log("Simple Transfers:", simple_transfers)
console.log("Total Transactions:", total_txs)
