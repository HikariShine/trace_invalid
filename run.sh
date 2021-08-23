#!/bin/bash

if [ -f 'data/invalid.csv' ]; then
  timestamp=$(date +'%Y%m%d%H%M%s')
  mv ./data/invalid.csv ./data/invalid.$timestamp
fi

node main.js
