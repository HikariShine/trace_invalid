const fs = require('fs')
const WebSocket = require('ws')
const tracer = fs.readFileSync('./op_tracer.js', { encoding: 'utf8' })

var blocks_data = {}

function parseHex(h) {
    return parseInt(Number(h), 10)
}

async function main() {
    const blocks = {}
    const ws = new WebSocket('ws://127.0.0.1:9546', { maxPayload: 1000 * 1024 * 1024 })

    const file = fs.createWriteStream('data/invalid.csv')
    var subId
    ws.on('message', (ev) => {
        const msg = JSON.parse(ev)
        if (msg.id == 63) {
            console.log('subscribed', msg.result)
            subId = msg.result
        } else if (msg.method === 'eth_subscription' && msg.params.subscription === subId) {
          const block = msg.params.result

          blocks_data[parseInt(block.number, 16)] = block
          blocks[parseHex(block.number)] = { gasUsed: parseHex(block.gasUsed) }
          const payload = JSON.stringify({
              method: 'debug_traceBlockByNumber',
              params: [block.number, { tracer: tracer }],
              id: 67,
              jsonrpc: '2.0',
          })
          ws.send(payload)
        } else if (msg.id === 67) {
          var log_data = []

          var block_number = 0
          var block_gas_used = null
          var txs_gas_used = 0
          var gas_used_ok = 0
          var gas_used_invalid = 0
          var txs_count = 0
          var invalid_count = 0
          var gas_wasted1 = 0 // Sum of gas wasted (gasLimit)
          var gas_wasted2 = 0 // Sum of gas wasted (end_gas)
          var gas_wasted3 = 0 // Sum of gas wasted (end_gas - intrinsic_gas)<-
          var error_found = 0

          for (const res of msg.result) {
            txs_count++

            var result = null

            if ('result' in res) {
              result = res['result']
            } else {
              console.log(res)
              error_found = 1
              break
            }
            
            txs_gas_used += result['gas_used'] + result['intrinsic_gas']

            // sum transactions' gasUsed
            if (result['invalid']) {
              gas_used_invalid += result['gas_used'] + result['intrinsic_gas']
              invalid_count++
              gas_wasted1 += result['start_gas']
              gas_wasted2 += result['end_gas']
              gas_wasted3 += result['end_gas'] - result['intrinsic_gas']
            } else {
              gas_used_ok += result['gas_used'] + result['intrinsic_gas']
            }
            block_number = result['block']
            if (block_gas_used === null) {
              block_gas_used = parseInt(blocks_data[block_number]['gasUsed'], 16)
            }
          }
          /*
          console.log('GasUsed:', block_gas_used)
          console.log('GasUsedTxs:', txs_gas_used)
          console.log('GasUsedOK:', gas_used_ok)
          console.log('GasUsedInvalid:', gas_used_invalid)
          console.log('TotalTxs:', txs_count)
          console.log('InvalidTxs:', invalid_count)
          console.log('GasWasted1:', gas_wasted1)
          console.log('GasWasted2:', gas_wasted2)
          console.log('GasWasted3:', gas_wasted3)
          console.log('\n\n')
          */

          if ( error_found == 0 && block_number != 0) {
            console.log('block:', block_number)
  
            log_data.push(block_number)
            log_data.push(block_gas_used)
            log_data.push(txs_gas_used)
            log_data.push(gas_used_ok)
            log_data.push(gas_used_invalid)
            log_data.push(txs_count)
            log_data.push(invalid_count)
            log_data.push(gas_wasted1)
            log_data.push(gas_wasted2)
            log_data.push(gas_wasted3)

            file.write(log_data.join(',') + '\n')
            // Log when gas_wasted3 is < 0
            if (gas_wasted3 < 0) {
              gw_file = fs.createWriteStream('data/invalid_err/error_' + block_number)
              gw_file.write(JSON.stringify(msg.result, null, 4))
            } else {
              // Log when TxsGasUsed != BlockGasUsed
              if (block_gas_used != txs_gas_used) {
                gd_file = fs.createWriteStream('data/gasdiff/error_' + block_number)
                gd_file.write(JSON.stringify(msg.result, null, 4))
              }
            }
          }
        }
    })
    ws.on('error', (err) => {
        console.log('ws.error', err)
    })

    await new Promise(resolve => ws.once('open', resolve));

    const payload = JSON.stringify({
        method: 'eth_subscribe',
        params: ['newHeads'],
        id: 63,
        jsonrpc: '2.0',
    })
    ws.send(payload)
}

main().then().catch((err) => { throw err })
