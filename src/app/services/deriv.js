import { create } from "domain";

const Deriv = {
    appId: null,
    deriv_token_scope: '',

    needAuthorize: [
        'get_settings',
        'balance',
        'balance_all',

        'paymentagent_details',
        'paymentagent_transfer',
        'paymentagent_withdraw',

        'transaction',
        'statement',

        'buy',
        'profit_table',
        'portfolio',
        'proposal_open_contract',
        'sell_expired',
        'sell',
    ],

    checkNeedAuthorize(requestPayload) {
        return Deriv.needAuthorize.some(key => {
            return requestPayload[key] !== undefined;
        })
    },

    getPayloadType(payload) {
        if (!payload) {
            return '';
        }

        const type = Deriv.needAuthorize.concat(['authorize', 'forget', 'ping']).find(key => {
            return payload[key] != undefined;
        })

        return type || ''
    },

    init() {
        let metaElemente = document.createElement('meta');
        metaElemente.setAttribute('name', 'token_scope');

        const scope = document.querySelector('meta[name="token_scope"]')

        if (scope) {
            Deriv.deriv_token_scope = scope.content + '-';
        }

        const appId = process.env.NEXT_PUBLIC_APPID

        if (appId && !Number.isNaN(Number(appId.content))) {
            Deriv.appId = Number(appId.content);
        }

        if (window.location.search) {
            const tokens = Deriv.parseQueryTokens(window.location.search.substring(1));

            if (tokens.length == 0) {
                return
            }

            localStorage.setItem(Deriv.deriv_token_scope + 'token_list', JSON.stringify(tokens));

            window.location.search = ''
        }
    },

    clearTokens() {
        localStorage.removeItem(Deriv.deriv_token_scope + 'active_token');
        localStorage.removeItem(Deriv.deriv_token_scope + 'token_list');
    },

    oauth() {
        window.location = 'https://oauth.binary.com/oauth2/authorize?app_id=' + process.env.NEXT_PUBLIC_APPID
    },

    createApiInstance() {
        const observer = simpleObserver()
        const pendingSendRequests = [];
        const subscribes = new Map();

        let pendingResubscribes = new Map()

        let ws = null
        let reqId = 1
        let isAuthorize = false
        let authorizeToken = null
        let pingInterval = null
        let manualClose = false

        const appId = Deriv.appId;

        function connect() {
            ws = new WebSocket('wss://ws.derivws.com/websockets/v3?l=pt&app_id=' + process.env.NEXT_PUBLIC_APPID)
            ws.addEventListener('open', onOpen)
            ws.addEventListener('message', onMessage)
            ws.addEventListener('error', onError)
            ws.addEventListener('close', onClose)
        }

        function onOpen() {
            observer.emit('open')

            if (authorizeToken) {
                send({ authorize: authorizeToken })
            }

            dispatchPendingRequests();
            dispatchPendingResubscribes()

            pingInterval = setInterval(() => {
                if (ws && ws.readyState == WebSocket.OPEN) {
                    ws.send('{ "ping": 1 }')
                }
            }, 25000)
        }

        function dispatchPendingRequests() {
            let pending = [...pendingSendRequests]
            pendingSendRequests.length = 0;

            pending.forEach(pending => {
                if ((pending.needAuthorize && isAuthorize) || !pending.needAuthorize) {
                    pending.send()
                } else {
                    pendingSendRequests.push(pending)
                }
            })
        }

        function dispatchPendingResubscribes() {
            if (pendingResubscribes && pendingResubscribes.size > 0) {
                pendingResubscribes.forEach((payload, key) => {
                    subscribe(payload).then(() => {
                        pendingResubscribes.delete(key)
                    })
                })
            }
        }

        function onMessage({ data }) {
            const json = JSON.parse(data);

            if (json.msg_type == 'forget') {
                subscribes.delete(json.forget)
            } else if (json.msg_type == 'authorize') {
                isAuthorize = !Boolean(json.error);

                if (isAuthorize) {
                    dispatchPendingResubscribes()
                    dispatchPendingRequests()
                }
            }

            if (!json.ping) {
                json.response = json[json.msg_type]
                observer.emit('ws.message', json)

                if (json.msg_type && json.response) {
                    observer.emit('deriv.' + json.msg_type, json)
                }
            }
        }

        function onError() {
            reconnect();
        }

        function onClose(event) {
            if (ws) {
                ws.removeEventListener('message', onMessage)
                ws.removeEventListener('close', onClose)
                ws.removeEventListener('open', onOpen)
                ws.removeEventListener('error', onError)
            }

            ws = null
            observer.emit('close', event)

            subscribes.clear()
            isAuthorize = false

            clearInterval(pingInterval)

            if (!manualClose && pendingResubscribes) {
                pendingResubscribes.clear()
            }

            if (manualClose) {
                manualClose = false
                connect()
            } else {
                manualClose = false
            }
        }

        function subscribe(payload) {
            payload.subscribe = 1

            return send(payload).then(subs => {
                if (subs.subscription) {
                    subscribes.set(subs.subscription.id, payload)
                }
                return subs;
            })
        }

        function reconnect() {
            subscribes.forEach((value, key) => {
                pendingResubscribes.set(key, value)
            })

            subscribes.clear()
            manualClose = true

            setTimeout(() => {
                if ((ws && ws.readyState == WebSocket.OPEN)) {
                    ws.close();
                } else {
                    onClose({});
                }
            }, 1000)
        }

        function send(sendPayload) {
            return new Promise((resolve, reject) => {
                sendPayload.req_id = reqId++

                const eventObserverId = observer.on('ws.message', (payload) => {

                    if (sendPayload.req_id == payload.req_id) {
                        if (payload.authorize && !payload.error) {
                            authorizeToken = sendPayload.authorize
                        }

                        observer.removeById(eventObserverId)
                        if (payload.error) {
                            reject(payload.error)
                        } else {
                            payload.response = payload[payload.msg_type]
                            resolve(payload)
                        }
                    }
                })

                const needAuthorize = Deriv.checkNeedAuthorize(sendPayload)
                let send = ws && ws.readyState == WebSocket.OPEN;

                if (needAuthorize && !isAuthorize) {
                    send = false
                }

                if (send) {
                    ws.send(JSON.stringify(sendPayload))
                } else {
                    const pendingPayload = {
                        needAuthorize,
                        cancelled: false,
                        timeToCancell: null,
                        send() {
                            if (pendingPayload.cancelled) {
                                return;
                            }
                            clearTimeout(pendingPayload.timeToCancell)
                            ws.send(JSON.stringify(sendPayload))
                        }
                    }

                    // Create max timeout
                    pendingPayload.timeToCancell = setTimeout(() => {
                        pendingPayload.cancelled = true
                        observer.emit('ws.message', {
                            req_id: sendPayload.req_id,
                            msg_type: Deriv.getPayloadType(sendPayload),
                            error: {
                                code: 'WrongResponse',
                                message: 'Limite de tempo de 20s sem resposta da corretora'
                            }
                        })
                    }, 2 * 20 * 1000)

                    pendingSendRequests.push(pendingPayload)
                }
            })
        }

        function destroy() {
            manualClose = false
            ws.close()
            
            observer.clear()
            subscribes.clear()
            pendingSendRequests.length = 0
            pendingResubscribes.clear()
        }

        connect()

        return {

            on: observer.on,
            removeById: observer.removeById,
            destroy,
            connect,
            reconnect,

            send,
            subscribe,

            get isOpen() {
                return ws && ws.readyState == WebSocket.OPEN
            },

            get isAuthorize() {
                return isAuthorize
            },

            get appId() {
                return process.env.NEXT_PUBLIC_APPID
            }
        }
    },

    setToken(token) {
        localStorage.setItem(Deriv.deriv_token_scope + 'active_token', token && token.token ? token.token : token);

        // if (this.ws && this.ws.readyState == WebSocket.OPEN) {
        //     this.ws.close();
        // }

        // this.ws = null
        // this.connect();
    },

    getToken() {
        const activeToken = localStorage.getItem(Deriv.deriv_token_scope + 'active_token');

        if (activeToken) {
            return activeToken;
        }

        const vrtcToken = this.getTokens().find(item => item.is_virtual);
        return vrtcToken ? vrtcToken.token : null
    },

    getTokens() {
        return JSON.parse(localStorage.getItem(Deriv.deriv_token_scope + 'token_list') || '[]').filter(item => {
            return (item.cur || 'BTC').toUpperCase() == 'USD'
        });
    },

    parseQueryTokens(search) {
        return Object.values(search.split('&').reduce((obj, item) => {
            const testers = [
                /(acct)(\d)\=(.+)/gi,
                /(token)(\d)\=(.+)/gi,
                /(cur)(\d)\=(.+)/gi
            ]
            for (let i = 0; i < testers.length; i++) {
                const testResult = testers[i].exec(item)

                if (testResult) {
                    const name = testResult[1]
                    const index = testResult[2]
                    const value = testResult[3]

                    if (!obj[index]) {
                        obj[index] = {}
                    }

                    obj[index][name] = value

                    if (name == 'acct') {
                        obj[index].is_virtual = value.startsWith('VRTC');
                    }
                }
            }

            return obj;
        }, {}))
    }
};

Deriv.init();

function simpleObserver() {
    const observer = {
        _id: 1,
        events: new Map(),

        emit(name, payload) {
            if (observer.events.has(name)) {
                observer.events.get(name).forEach(callback => {
                    try {
                        callback(payload)
                    } catch (e) {
                        console.error('ERROR_ON_EMIT[', name, ']', e)
                    }
                })
            }
        },

        on(name, callback) {
            if (!observer.events.has(name)) {
                observer.events.set(name, new Map())
            }

            const id = observer._id++;

            observer.events.get(name).set(id, callback)

            // Event key
            return name + '-|/|-' + id;
        },

        remove(name, callback) {
            if (observer.events.has(name)) {
                const key = getKeyByValue(observer.events.get(name), callback)
                observer.events.get(name).delete(key)
            }
        },

        removeById(fullId) {
            const [name, id] = fullId.split('-|/|-');

            if (observer.events.has(name)) {
                observer.events.get(name).delete(Number(id))
            }
        },

        clear() {
            observer.events.clear()
        }
    }

    function getKeyByValue(map, searchValue) {
        for (let [key, value] of map.entries()) {
            if (value === searchValue)
                return key;
        }
    }

    return {
        on: observer.on,
        emit: observer.emit,
        remove: observer.remove,
        removeById: observer.removeById,
        clear: observer.clear,
    }
}

export default Deriv;
