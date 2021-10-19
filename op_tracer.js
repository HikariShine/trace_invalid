{
  gas_left: [],
  contract_call: false,
  invalid: false,
  input_data: null,
  input_data_cost: 0,
  ops: [],
  depth: [],

  step: function(log, db) {
    this.contract_call = true
    this.gas_left.push(log.getGas())
    this.ops.push(log.op.toString())
    this.depth.push(log.getDepth())
    if (log.op.toNumber() == 0xfe) {
        this.invalid = true
    }

    input_data = log.contract.getInput()
    if (this.input_data == null && input_data) {
	    this.input_data = input_data	
	    for(var i = 0; i < this.input_data.length; i++) {
  		  if (this.input_data[i] == 0) {
  			  this.input_data_cost = this.input_data_cost + 4	
    		} else {
    			this.input_data_cost = this.input_data_cost + 68
    		}
    	}
    }
  },
  result: function(ctx, db) {
    var gas_used = this.gas_left[0] - this.gas_left[this.gas_left.lenght - 1] 
    return {
      'block': ctx.block,
      'from': toHex(ctx.from),
      'to': toHex(ctx.to),
      'contract_call': this.contract_call,
      'start_gas': this.gas_left[0],
      'end_gas': this.gas_left[this.gas_left.length - 1],
      'gas_used': ctx.gasUsed,
      'intrinsic_gas': ctx.intrinsicGas,
      'invalid': this.invalid,
      'input_data': toHex(this.input_data),
      'input_data_cost': this.input_data_cost,
      'ops': this.ops,
      'depth': this.depth,
    }
  },
  fault: function(log, db){}
}

