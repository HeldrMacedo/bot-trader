- Conta do token da aplicação deriv heldr.macedo@gmail.com
- Conta para login de teste de usuário helder.macedo@outlook.com
  https://51e0-45-165-128-128.ngrok-free.app/?acct1=CR2042620&token1=a1-CUF3rnEqselBgTSfwf1ESf2c2SMnG&cur1=USD&acct2=VRTC3742841&token2=a1-C4DoQQEJvrkEUM9qSDtt8D7g83sMV&cur2=USD

account:"CR2042620"
currency:"USD"
is_virtual:false
token:"a1-7WcS1tZEAcQpOxSxYGCGUsoc0fJFD"

{
"account_list": [
{
"account_category": "trading",
"account_type": "binary",
"broker": "CR",
"created_at": 1610072090,
"currency": "USD",
"currency_type": "fiat",
"is_disabled": 0,
"is_virtual": 0,
"landing_company_name": "svg",
"linked_to": [],
"loginid": "CR2042620"
},
{
"account_category": "trading",
"account_type": "binary",
"broker": "VRTC",
"created_at": 1610058653,
"currency": "USD",
"currency_type": "fiat",
"is_disabled": 0,
"is_virtual": 1,
"landing_company_name": "virtual",
"linked_to": [],
"loginid": "VRTC3742841"
}
],
"balance": 10002.85,
"country": "br",
"currency": "USD",
"email": "helder.macedo@outlook.com",
"fullname": "Mr Helder Macedo",
"is_virtual": 1,
"landing_company_fullname": "Deriv Limited",
"landing_company_name": "virtual",
"linked_to": [],
"local_currencies": {
"BRL": {
"fractional_digits": 2
}
},
"loginid": "VRTC3742841",
"preferred_language": "PT",
"scopes": [
"payments",
"read",
"trade",
"trading_information"
],
"upgradeable_landing_companies": [
"maltainvest",
"svg"
],
"user_id": 7855692

}

[
{
"loginid": "CR2042620",
"token": "a1-CtCcjhnAQ8cQrrvRcGRtRDGJP5O6U",
"currency": "USD",
"balance": 0
},
{
"loginid": "VRTC3742841",
"token": "a1-lGS4Ah9EkYRhv7EZrzl2YA4bkpx9O",
"currency": "USD",
"balance": 10002.2
}
]

public static void main(String[] args) {
var stockData = new StockData();
var consoleObserver = new ConsoleObserver();
var emailObserver = new EmailObserver();
var smsObserver = new SMSObserver();

stockData.addObserver(consoleObserver);
stockData.addObserver(emailObserver);
stockData.addObserver(smsObserver);

stockData.newStokeData("AAPL", 100.0);
stockData.newStokeData("GOOG", 200.0);
}

interface Observer {
void update(String stockName, double stockPrice);
}

class ConsoleObserver implements Observer {
@override
void update(String stockName, double stockPrice) {
System.out.println("ConsoleObserver: $stockName $stockPrice");
}
}

class EmailObserver implements Observer {
@override
void update(String stockName, double stockPrice) {
System.out.println("EmailObserver: $stockName $stockPrice");
}
}

class SMSObserver implements Observer {
@override
void update(String stockName, double stockPrice) {
System.out.println("SMSObserver: $stockName $stockPrice");
}
}

class Stock Data {
private List<Observer> observers = new ArrayList<>();
private String stockName;
private double stockPrice;

public void addObserver(Observer observer) {

}

public void removeObserver(Observer observer) {

}

public void newStockData(String stockName, double stockPrice) {
this.stockName = stockName;
this.stockPrice = stockPrice;
notifyObservers();
}

private void notifyObservers() {
for (Observer observer : observers) {
observer.update(stockName, stockPrice);
}
}
}

"amount":0.35,
"app_markup_percentage":"3",
"barrier":"4",
"basis":"stake",
"contract_type":"DIGITOVER",
"currency":"USD",
"duration":1,
"duration_unit":"t",
"symbol":"R_100"
