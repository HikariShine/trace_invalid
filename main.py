import rpc
import sys
import time

tr_file = open('./op_tracer.js', 'r')
tracer_script = tr_file.read()
tr_file.close()

last_block = rpc.eth_blockNumber()
last_block = int(last_block['result'], 16)
current_block = last_block - 125


current_block = None

while True:
    last_block = rpc.eth_blockNumber()
    last_block = int(last_block['result'], 16)

    if current_block == None:
        current_block = last_block - 100
    if current_block > last_block:
        time.sleep(1)

    current_block_hex = hex(current_block)
    try:
        msg = rpc.debug_traceBlockByNumber(current_block_hex, tracer_script)
    except:
        continue

    print(current_block, '/', last_block)

    txs_count = 0
    invalid_count = 0
    gas_wasted = 0
    error_found = False
    for res in msg['result']:
        txs_count += 1

        result = None
        if 'result' in res.keys():
            result = res['result']
        else:
            print('res:', res)
            error_found = True
            break

        if result['invalid']:
            invalid_count += 1
            gas_wasted += result['gas_wasted']

    if error_found:
        continue
    else:
        if invalid_count > 0:
            print(invalid_count, 'invalid txs found!')
            line = [str(current_block), str(invalid_count), str(gas_wasted)]

            result_file = open('data/py_invalid.csv', 'a')
            result_file.write(','.join(line) + '\n')
            result_file.close()
        current_block += 1

