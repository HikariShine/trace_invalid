#!/bin/bash

if [ -f 'data/invalid.csv' ]; then
  timestamp=$(date +'%Y%m%d%H%M%s')
  mv ./data/invalid.csv ./data/invalid.$timestamp
  mv ./data/invalid_txs.csv ./data/invalid_txs.$timestamp
fi

node main.js
