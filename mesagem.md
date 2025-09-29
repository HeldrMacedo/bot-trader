contract_type: 'CALL', duration_unit: 'TICK', caso seja mais de 1 tick fica 'TICKS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '666adec3-43a9-de9e-1491-493411fbc3b0' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9951.59,
    barrier: 'S0P',
    contract_id: 295314822208,
    currency: 'USD',
    date_expiry: 1758980323,
    display_name: 'Bear Market Index',
    id: '666adec3-43a9-de9e-1491-493411fbc3b0',
    longcode: 'Win payout if Bear Market Index after 1 tick is strictly higher than entry spot.',
    symbol: 'RDBEAR',
    transaction_id: 588120472128,
    transaction_time: 1758980321
  }
}

contract_type: 'CALL', duration_unit: 'SECONDS',
 {
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '0213c8f4-e32f-46b3-2b06-de12b9d639a2' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9951.17,
    barrier: 'S0P',
    contract_id: 295315210508,
    currency: 'USD',
    date_expiry: 1758980637,
    display_name: 'Bear Market Index',
    id: '0213c8f4-e32f-46b3-2b06-de12b9d639a2',
    longcode: 'Win payout if Bear Market Index is strictly higher than entry spot at 15 seconds after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588121227468,
    transaction_time: 1758980622
  }
}

contract_type: 'CALL', duration_unit: 'MINUTE', caso seja mais de 1 minutos fica 'MINUTES'
 {
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'b9d779eb-bdfa-b4df-4059-34d41d4ada4f' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9960.85,
    barrier: 'S0P',
    contract_id: 295315583248,
    currency: 'USD',
    date_expiry: 1758980965,
    display_name: 'Bear Market Index',
    id: 'b9d779eb-bdfa-b4df-4059-34d41d4ada4f',
    longcode: 'Win payout if Bear Market Index is strictly higher than entry spot at 1 minute after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588121951028,
    transaction_time: 1758980905
  }
}

contract_type: 'CALL', duration_unit: 'HOUR', caso seja mais de 1 hora fica 'HOURS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'b9d779eb-bdfa-b4df-4059-34d41d4ada4f' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9950.85,
    barrier: 'S0P',
    contract_id: 295315804468,
    currency: 'USD',
    date_expiry: 1758984666,
    display_name: 'Bear Market Index',
    id: 'b9d779eb-bdfa-b4df-4059-34d41d4ada4f',
    longcode: 'Win payout if Bear Market Index is strictly higher than entry spot at 1 hour after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588122383308,
    transaction_time: 1758981066
  }
}

contract_type: 'PUT', duration_unit: 'TICK', caso seja mais de 1 tick fica 'TICKS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'b9d779eb-bdfa-b4df-4059-34d41d4ada4f' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9940.85,
    barrier: 'S0P',
    contract_id: 295315923168,
    currency: 'USD',
    date_expiry: 1758981165,
    display_name: 'Bear Market Index',
    id: 'b9d779eb-bdfa-b4df-4059-34d41d4ada4f',
    longcode: 'Win payout if Bear Market Index after 1 tick is strictly lower than entry spot.',
    symbol: 'RDBEAR',
    transaction_id: 588122619368,
    transaction_time: 1758981163
  }
}

contract_type: 'PUT', duration_unit: 'SECONDS',
 {
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'e43315f6-51e2-522e-7ca1-c10fbbf54a4a' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9940.24,
    barrier: 'S0P',
    contract_id: 295316849028,
    currency: 'USD',
    date_expiry: 1758981915,
    display_name: 'Bear Market Index',
    id: 'e43315f6-51e2-522e-7ca1-c10fbbf54a4a',
    longcode: 'Win payout if Bear Market Index is strictly lower than entry spot at 15 seconds after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588124451848,
    transaction_time: 1758981900
  }
}

contract_type: 'PUT', duration_unit: 'MINUTE', caso seja mais de 1 minuto fica 'MINUTES'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'e43315f6-51e2-522e-7ca1-c10fbbf54a4a' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9940.24,
    barrier: 'S0P',
    contract_id: 295316849028,
    currency: 'USD',
    date_expiry: 1758981915,
    display_name: 'Bear Market Index',
    id: 'e43315f6-51e2-522e-7ca1-c10fbbf54a4a',
    longcode: 'Win payout if Bear Market Index is strictly lower than entry spot at 1 minute after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588124451848,
    transaction_time: 1758981900
  }
}

contract_type: 'PUT', duration_unit: 'HOUR', caso seja mais de 1 hora fica 'HOURS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'e43315f6-51e2-522e-7ca1-c10fbbf54a4a' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9940.24,
    barrier: 'S0P',
    contract_id: 295316849028,
    currency: 'USD',
    date_expiry: 1758981915,
    display_name: 'Bear Market Index',
    id: 'e43315f6-51e2-522e-7ca1-c10fbbf54a4a',
    longcode: 'Win payout if Bear Market Index is strictly lower than entry spot at 1 hour after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588124451848,
    transaction_time: 1758981900
  }
}

contract_type: 'ONETOUCH', duration_unit: 'MINUTE', caso seja mais de 1 minuto fica 'MINUTES'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'da741a74-ef76-107e-bb0b-51525844f717' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9939.63,
    barrier: 'S9461P',
    contract_id: 295318056108,
    currency: 'USD',
    date_expiry: 1758982995,
    display_name: 'Bear Market Index',
    id: 'da741a74-ef76-107e-bb0b-51525844f717',
    longcode: 'Win payout if Bear Market Index touches entry spot plus 0.9461 through 2 minutes after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588126789168,
    transaction_time: 1758982875
  }
}

contract_type: 'NOTOUCH', duration_unit: 'MINUTE', caso seja mais de 1 minuto fica 'MINUTES'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '228fcd08-f410-ddc4-276e-eaf24d64ff5d' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9929.63,
    barrier: 'S9461P',
    contract_id: 295318396528,
    currency: 'USD',
    date_expiry: 1758983298,
    display_name: 'Bear Market Index',
    id: '228fcd08-f410-ddc4-276e-eaf24d64ff5d',
    longcode: 'Win payout if Bear Market Index does not touch entry spot plus 0.9461 through 2 minutes after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588127465368,
    transaction_time: 1758983178
  }
}

contract_type: 'ONETOUCH', duration_unit: 'HOUR', caso seja mais de 1 hora fica 'HOURS'
 {
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '4ff616ba-630b-f898-703d-48bae89be1f3' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9951.19,
    barrier: 'S26812P',
    contract_id: 295318769588,
    currency: 'USD',
    date_expiry: 1758987103,
    display_name: 'Bear Market Index',
    id: '4ff616ba-630b-f898-703d-48bae89be1f3',
    longcode: 'Win payout if Bear Market Index touches entry spot plus 2.6812 through 1 hour after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588128206508,
    transaction_time: 1758983503
  }
}

contract_type: 'NOTOUCH', duration_unit: 'HOUR', caso seja mais de 1 hora fica 'HOURS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '4ff616ba-630b-f898-703d-48bae89be1f3' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9951.19,
    barrier: 'S26812P',
    contract_id: 295318769588,
    currency: 'USD',
    date_expiry: 1758987103,
    display_name: 'Bear Market Index',
    id: '4ff616ba-630b-f898-703d-48bae89be1f3',
    longcode: 'Win payout if Bear Market Index does not touch entry spot plus 2.6812 through 1 hour after contract start time.',
    symbol: 'RDBEAR',
    transaction_id: 588128206508,
    transaction_time: 1758983503
  }
}

contract_type: 'DIGITMATCH' duration_unit: 'tick', caso seja mais de 1 tick fica 'TICKS'
 {
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '2d5e6529-1625-094f-93c9-6c7c79ae3b33' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9953.18,
    barrier: 0,
    contract_id: 295320690428,
    currency: 'USD',
    date_expiry: 1758985217,
    display_name: 'Bear Market Index',
    id: '2d5e6529-1625-094f-93c9-6c7c79ae3b33',
    longcode: 'Win payout if the last digit of Bear Market Index is 0 after 1 tick.',
    symbol: 'RDBEAR',
    transaction_id: 588132001268,
    transaction_time: 1758985215
  }
}

contract_type: 'DIGITDIFF' duration_unit: 'tick', caso seja mais de 1 tick fica 'TICKS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: 'a4ab29c7-5380-b2cc-1bf5-014d50dae65d' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9943.18,
    barrier: 1,
    contract_id: 295321149588,
    currency: 'USD',
    date_expiry: 1758985623,
    display_name: 'Bear Market Index',
    id: 'a4ab29c7-5380-b2cc-1bf5-014d50dae65d',
    longcode: 'Win payout if the last digit of Bear Market Index is not 1 after 1 tick.',
    symbol: 'RDBEAR',
    transaction_id: 588132922488,
    transaction_time: 1758985621
  }
}

contract_type: 'DIGITEVEN' duration_unit: 'tick', caso seja mais de 1 tick fica 'TICKS'
 {
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '364d95ad-eac8-b317-4fee-6ef5628da874' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9944.14,
    barrier: 0,
    contract_id: 295323653688,
    currency: 'USD',
    date_expiry: 1758987675,
    display_name: 'Bear Market Index',
    id: '364d95ad-eac8-b317-4fee-6ef5628da874',
    longcode: 'Win payout if the last digit of Bear Market Index is even after 1 ticks.',
    symbol: 'RDBEAR',
    transaction_id: 588137859468,
    transaction_time: 1758987673
  }
}

contract_type:  'DIGITODD' duration_unit: 'tick', caso seja mais de 1 tick fica 'TICKS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '364d95ad-eac8-b317-4fee-6ef5628da874' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9953.67,
    barrier: 0,
    contract_id: 295323715068,
    currency: 'USD',
    date_expiry: 1758987730,
    display_name: 'Bear Market Index',
    id: '364d95ad-eac8-b317-4fee-6ef5628da874',
    longcode: 'Win payout if the last digit of Bear Market Index is odd after 1 ticks.',
    symbol: 'RDBEAR',
    transaction_id: 588137981948,
    transaction_time: 1758987728
  }
}

contract_type: 'DIGITOVER' duration_unit: 'tick', caso seja mais de 1 tick fica 'TICKS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '5d9b30be-f0b5-e34e-5fd6-0ebec4fdb6bf' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9963.2,
    barrier: 1,
    contract_id: 295323894188,
    currency: 'USD',
    date_expiry: 1758987892,
    display_name: 'Bear Market Index',
    id: '5d9b30be-f0b5-e34e-5fd6-0ebec4fdb6bf',
    longcode: 'Win payout if the last digit of Bear Market Index is strictly higher than 1 after 1 ticks.',
    symbol: 'RDBEAR',
    transaction_id: 588138339808,
    transaction_time: 1758987890
  }
}


contract_type: 'DIGITUNDER' duration_unit: 'tick', caso seja mais de 1 tick fica 'TICKS'
{
  echo_req: { subscribe: 1, transaction: 1 },
  msg_type: 'transaction',
  subscription: { id: '5d9b30be-f0b5-e34e-5fd6-0ebec4fdb6bf' },
  transaction: {
    action: 'buy',
    amount: -10,
    balance: 9965.52,
    barrier: 1,
    contract_id: 295323985528,
    currency: 'USD',
    date_expiry: 1758987960,
    display_name: 'Bear Market Index',
    id: '5d9b30be-f0b5-e34e-5fd6-0ebec4fdb6bf',
    longcode: 'Win payout if the last digit of Bear Market Index is strictly lower than 1 after 1 ticks.',
    symbol: 'RDBEAR',
    transaction_id: 588138512708,
    transaction_time: 1758987958
  }
}