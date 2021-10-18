const fs = require('fs')
const WebSocket = require('ws')
const tracer = fs.readFileSync('./op_tracer.js', { encoding: 'utf8' })


function parseHex(h) {
    return parseInt(Number(h), 10)
}

async function main() {
    var blocks_data = {}

    const ws = new WebSocket('ws://127.0.0.1:9546', { maxPayload: 1000 * 1024 * 1024 })

    const file = fs.createWriteStream('data/invalid.csv')
    const txs_file = fs.createWriteStream('data/invalid_txs.csv')

    var subId
    ws.on('message', (ev) => {
        const msg = JSON.parse(ev)
        if (msg.id == 63) {
            console.log('subscribed', msg.result)
            subId = msg.result
        } else if (msg.method === 'eth_subscription' && msg.params.subscription === subId) {
          const block = msg.params.result

          blocks_data[parseInt(block.number, 16)] = block
          //blocks[parseHex(block.number)] = { gasUsed: parseHex(block.gasUsed) }
          //console.log('>', block.number)
          const payload = JSON.stringify({
              method: 'debug_traceBlockByNumber',
              params: [block.number, { tracer: tracer, timeout: '500s' }],
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

          var log_txs = []
          //console.log(Object.keys(msg))
          if ('error' in msg) {
            console.log('msg_error:', msg['error'])
            error_found = 1;
          } else {
            for (const res of msg.result) {
              txs_count++

              var result = null

              if ('result' in res) {
                result = res['result']
              } else {
                console.log('res:', res)
                error_found = 1
                break
              }

              txs_gas_used += result['gas_used'] + result['intrinsic_gas']

              // sum transactions' gasUsed
              if (result['invalid']) {
                console.log('invalid transaction found!')

                gas_used_invalid += result['gas_used'] + result['intrinsic_gas']
                invalid_count++
                gas_wasted1 += result['start_gas']
                gas_wasted2 += result['end_gas']
                gas_wasted3 += result['end_gas'] - result['intrinsic_gas']

                log_txs.push(result['block'])
                log_txs.push(result['from'])
                log_txs.push(result['to'])
                log_txs.push(result['start_gas'])
                log_txs.push(result['end_gas'])
                log_txs.push(result['intrinsic_gas'])
                log_txs.push(result['input_data'])
                log_txs.push(result['input_data_cost'])

                lenDepth = result['depth'].length
                lastDepth = result['depth'][lenDepth - 1]

                if (lastDepth != 1) {
                  console.log('>>>>FOUND')
                  console.log(result['block'])
                  console.log(result['depth'])
                  console.log('lenDepth:', lenDepth)
                  console.log('lastDepth:', lastDepth)
                  console.log('<<<<')
                }

                txs_file.write(log_txs.join(',') + '\n')
              } else {
                gas_used_ok += result['gas_used'] + result['intrinsic_gas']
              }
              //console.log('>result.keys()', Object.keys(result))
              block_number = result['block']
              if (block_gas_used === null) {
                //console.log('result:', result)
                //console.log('block_number:', block_number)
                  block_gas_used = parseInt(blocks_data[block_number]['gasUsed'], 16)
              }
            }

            console.log('block:', block_number, "[", error_found, "]")
          }
          if ( error_found == 0 && block_number != 0 && invalid_count > 0) {
  
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

          if (error_found && block_number != 0) { // Try tracing the block again
            block_number_hex = blocks_data[block_number.toString()]['number']
            const payload = JSON.stringify({
              method: 'debug_traceBlockByNumber',
              params: [block_number_hex, { tracer: tracer, timeout: '500s' }],
              id: 67,
              jsonrpc: '2.0',
            })
            ws.send(payload)
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
