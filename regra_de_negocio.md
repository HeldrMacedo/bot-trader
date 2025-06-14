Estou criando em next js e react um bot para fazer entradas na deriv e preciso fazer uma mudança no código, faça pra mim os requisitos de acordo com as regras de negócios que irei escrever.

Quando o cliente clicar no botão start irá chamar handleStartBot para iniciar o sistema lançando um const transactionId = await derivService.subscribe({
      transaction: 1, 
 });
após lançar o transaction o sistema vai ficar recebendo as mensagens de transações da DERIV 
exemplo do método que vai ficar ouvindo as mensagens 
useEffect(() => {
    const listenerId = derivService.observerInstance.on(
      "message",
      async (message: any) => {
        
        if (message.msg_type !== "transaction" &&
          message.msg_type !== "proposal_open_contract" &&
          message.msg_type !== "buy") {
            return;
        }

        if (isPausedRef.current) return;

        if (message.msg_type === "transaction" && message.transaction.action === "buy") {
          await verificaMensagem(message); 
          return; 
        }
        
        if (message.msg_type === "proposal_open_contract") {
          if (message.proposal_open_contract.status === "won" || message.proposal_open_contract.status === "lost"){
            await handleContractResult(message);
          }
          return;
        }

      }
    );
    return () => {
      derivService.observerInstance.removeById(listenerId);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [handleContractResult, verificaMensagem]); 

ai começa as verificações do sistema, o sistema pode seguir 2 fluxo de acordo com a configuração que o cliente adicionou no sistema.

configurações do sistema no qual o cliente pode digitar:

Consecutive loss: é o contador de quantas vezes ele perdeu em sequência, se der win ele zera

Quantity loss: o usuário vai digitar quantas vezes ele vai peder na conta virtual para entrar na conta real, exemplo: Quantity loss = 2 então se robô peder duas vezes consecutiva o sistema vai autenticar  na conta real e vai fazer uma compra, com o mesmo digito, volatilidade, e tipo do trade Exemplo over ou under

Stop Loss: valor total que ele perdeu na conta real, se bater esse valor o sistema para, independete de qualquer configuração

Stop Win: valor total que ele ganhou na conta real, se bater esse valor o sistema para,  independete de qualquer configuração

Initial Value: entrada inicial.

Stake Multiple: é o martingale, multiplicador que caso ele perca o valor da  entrada inicial, a proxima é entrar é a multiplicacao martingale até ganhar, quando ganhar a proxima entrada é com o valor inicial

Pause Time: tempo em segundo, se estiver marcado com win ou loss, ou os dois o sistema vai ficar pausado o tempo que foi adicionado no pause time


Quando o sistema iniciar e receber a primeira mensagem de transaction buy ele vai verificar as configurações, se fluxoSomenteComPauseTime() for igual a true então  o sistema vai seguir o fluxo 1.

fluxo 1: sistema toda vez que receber uma mensagem de transaction buy ele vai fazer uma 