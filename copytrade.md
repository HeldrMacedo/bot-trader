{
    "copy_start": "uw2mk7no3oktoRVVsB4Dz7TQnFgrthg"
}

Copy Trading: Start (request)

Start copy trader bets
copy_start

string
^[\w\s-]{15,32}$
API tokens identifying the accounts of trader which will be used to copy trades
{}
assets

one of
string
^\w{4,128}$
array
[Optional] Used to set assets to be copied. E.x ["frxUSDJPY", "R_50"]
{}
max_trade_stake

number
[Optional] Used to set maximum trade stake to be copied.
{}
min_trade_stake

number
[Optional] Used to set minimal trade stake to be copied.
{}
trade_types

one of
string
^\w{3,128}$
array
[Optional] Used to set trade types to be copied. E.x ["CALL", "PUT"]
{}
loginid

string
^[A-Za-z]+[0-9]+$
[Optional] The login id of the user. Mandatory when multiple tokens were provided during authorize.
{}
passthrough

object
[Optional] Used to pass data through the websocket, which may be retrieved via the echo_req output field.
{}
req_id

integer
[Optional] Used to map request to response.


Copy Trading: Start (response)

A message with results is received
{}
{}
copy_start

integer
Copy start confirmation. Returns 1 is success.
{}
echo_req

object
Echo of the request made.
{}
msg_type

constant
string
copy_start
Action name of the request made.
{}
req_id

integer
Optional field sent in request to map to response, present only when request contains req_id.