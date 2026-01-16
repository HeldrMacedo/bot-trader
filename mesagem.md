## Error Type
Runtime InvalidStateError

## Error Message
Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.


    at Object.send (src/app/services/DerivService.tsx:533:18)
    at <unknown> (src/app/services/DerivService.tsx:578:17)
    at Array.forEach (<anonymous>:null:null)
    at DerivService.dispatchPendingRequests (src/app/services/DerivService.tsx:573:13)
    at DerivService.handleOpen (src/app/services/DerivService.tsx:377:10)
    at WebSocket.<anonymous> (src/app/services/DerivService.tsx:364:49)

## Code Frame
  531 |       if (!pendingRequest.cancelled) {
  532 |         clearTimeout(timeToCancel);
> 533 |         this.ws!.send(JSON.stringify({ ...payload, req_id: reqId }));
      |                  ^
  534 |       }
  535 |     },
  536 |   };


DerivService.tsx:533 Uncaught InvalidStateError: Failed to execute 'send' on 'WebSocket': Still in CONNECTING state.
    at Object.send (DerivService.tsx:533:18)
    at DerivService.tsx:578:17
    at Array.forEach (<anonymous>)
    at DerivService.dispatchPendingRequests (DerivService.tsx:573:13)
    at DerivService.handleOpen (DerivService.tsx:377:10)
    at WebSocket.<anonymous> (DerivService.tsx:364:49)


## Error Type
Console Error

## Error Message
{}

Next.js version: 16.1.0 (Turbopack)

625BlocklyJavaScriptGenerator.ts:9 Blockly ou Blockly.JavaScript não estão disponíveis ainda. Aguardando...

