import rpc
import sys
import time

tr_file = open('./op_tracer.js', 'r')
tracer_script = tr_file.read()
tr_file.close()

last_block = rpc.eth_blockNumber()
last_block = int(last_block['result'], 16)
current_block = last_block - 125

invalid_csv_file = open('data/py_invalid.csv', 'a')

current_block = int(sys.argv[1])

print(current_block)


#while True:
if True:
    last_block = rpc.eth_blockNumber()
    last_block = int(last_block['result'], 16)

    if current_block > last_block:
        time.sleep(1)

    current_block_hex = hex(current_block)
    print(current_block_hex)
    result = rpc.debug_traceBlockByNumber(current_block_hex, tracer_script)

    print(result)

    #block = rpc.get_block_by_number(current_block)
    #total_txs = len(block['result']['transactions'])
    #print(current_block, '/', last_block, '-', total_txs, 'txs')

    #error_found = False
    #ix = 0
    #for tx in block['result']['transactions']:
    #    ix += 1
    #    print('|_', current_block, ':', ix, '/', total_txs)
    #    trace = None
    #    try:
    #    #if True:
    #        trace = rpc.debug_traceTransaction(tx['hash'], tracer_script)
    #    #else:
    #    except:
    #        print('tr:', trace)
    #        error_found = True
    #        break

    #    if 'result' in trace.keys():
    #        rs = trace['result']
    #        block = rs['block']
    #        invalid = rs['invalid']
    #        if invalid:
    #            #ops = [str((str(e[0]), e[1], str(e[2]))) for e in rs['ops']]
    #            ops = [str(e) for e in rs['ops']]
    #            line = [tx['blockNumber'], tx['hash'], tx['from'], tx['to'], tx['gas'], tx['gasPrice'], tx['transactionIndex'], str(rs['start_gas']), str(rs['end_gas']), str(rs['gas_used']), str(rs['intrinsic_gas']), str(rs['input_data_cost']), ','.join(ops) ]
    #            print(line)
    #            invalid_csv_file.write(','.join(line) + '\n')
    #    else:
    #        print('Err:', trace)
    #        error_found = True
    ##if error_found:
    ##    print('error found!')
    ##    continue

    ##current_block += 1
