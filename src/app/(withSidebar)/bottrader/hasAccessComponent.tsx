export default function HasAcessComponet(){
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-400 mb-2">
            Acesso Negado
          </h2>
          <p className="text-gray-500">
            {/*Você não tem permissão para acessar o módulo BotTrader.*/}
            Você não tem permissão para acessar este módulo.
          </p>
        </div>
      </div>
    );
}