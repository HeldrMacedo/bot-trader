export default function Botteste() {
    const demoConnection = new WebSocket(
      `wss://ws.derivws.com/websockets/v3?l=pt&app_id=${process.env.NEXT_PUBLIC_APPID}`
    );

    const realConnection = new WebSocket(
      `wss://ws.deriv.com/websockets/v3?app_id=${process.env.NEXT_PUBLIC_APPID}`
    );

    const handleDemoConnection = async () => {
        
    }
    


  return (
    <div>
      <h1>Botteste</h1>
    </div>
  );
}