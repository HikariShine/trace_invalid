import time
import asyncio
import websockets
import json
import csv_util
import opcodes
import rpc
from rlp import decode

ts_file = open('op_tracer.js', 'r')
tracer_script = ts_file.read()
ts_file.close()

tx_trace_ids = {}

tx_level_csv = []
block_level_csv = []

invalid_csv_file = open('data/invalid.csv', 'a')

async def main():
    subscribed = False
    subId = ''
    async with websockets.connect('ws://127.0.0.1:9546') as websocket:
        while True:
            if not subscribed:
                payload = json.dumps({
                    'method': 'eth_subscribe',
                    'params': ['newHeads'],
                    'id': 63,
                    'jsonrpc': '2.0',
                })
                result = await websocket.send(payload)
                subscribed = True
        
            ev = await websocket.recv()
            msg = json.loads(ev)
            if 'id' in msg.keys() and msg['id'] == 63:
                print('subscribed', msg['result'])
                subId = msg['result']
            elif 'method' in msg.keys() and msg['method'] == 'eth_subscription' and msg['params']['subscription'] == subId:
                block_data = msg['params']['result']
                block_number = int(block_data['number'], 16)
                block = rpc.get_block_by_number(block_number)['result']
                print("Processing", block_number)
                print("\tTransactions:", len(block['transactions']))

                for _, tx in enumerate(block['transactions']):
                    if tx['to'] == None:
                        continue
                    result = rpc.trace_transaction(tx['hash'], tracer_script)
                    if 'result' in result.keys():
                        tr_result = result['result']
                        tx_receipt = rpc.get_transaction_receipt(tx['hash'])['result']
                        ctx_gas_used = tr_result['gas_used']
                        gas_used = tx_receipt['gasUsed']    
                        tx_opcount = opcodes.get_op_counter()
                        if tr_result['invalid']:
                            gas = int(tx['gas'], 16)
                            start_gas = tr_result['start_gas']
                            end_gas = tr_result['end_gas']
                            input_data_cost = tr_result['input_data_cost']
                            difference = int(gas_used, 16) - end_gas
                            # fields: Block, TxHash, inputDataCost, gasUsed, endGas, difference
                            line = [str(block_number), tx['hash'], str(input_data_cost), str(int(gas_used, 16)), str(end_gas), str(difference)]
                            print(': ', line)
                            invalid_csv_file.write(','.join(line) + '\n')   

while 1:
    #try:
    if True:
        asyncio.get_event_loop().run_until_complete(main())
    #except:
        #print('reconnecting...')
        #time.sleep(30)

