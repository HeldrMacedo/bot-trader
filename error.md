simpleObserver.ts:23 Error in deriv.proposal_open_contract listener: TypeError: Cannot read properties of undefined (reading 'slice')
    at BuyTable.useEffect.contractListener (buyTable.tsx:65:69)
    at simpleObserver.ts:21:21
    at Map.forEach (<anonymous>)
    at Observer.emit (simpleObserver.ts:19:37)
    at DerivService.handleMessage (DerivService.tsx:627:23)
    at WebSocket.<anonymous> (DerivService.tsx:569:52)
(anonymous)	@	simpleObserver.ts:23
emit	@	simpleObserver.ts:19
handleMessage	@	DerivService.tsx:627
(anonymous)	@	DerivService.tsx:569
