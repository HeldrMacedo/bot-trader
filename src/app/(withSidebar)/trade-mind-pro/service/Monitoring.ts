import { DerivService } from "@/app/services/DerivService";

interface Config {
  symbol: string;
}

export class Monitoring {
  private static instance: Monitoring;
  private deriv: DerivService;
  private config: Config;
  private onLog: (msg: string) => void;

  
  constructor() {
    this.deriv = DerivService.getInstance();
 }

 public static getInstance(): Monitoring {
    if (!Monitoring.instance) {
      Monitoring.instance = new Monitoring();
    }
    return Monitoring.instance;
  }

  public render(config: any) {
    this.config = config;

    this.subscribeToTicks();
  }
  
  private subscribeToTicks(): void {
    this.deriv.send({ ticks: this.config.symbol, subscribe: 1 }).catch(e => {
            if (!e.message.includes('already subscribed')) {
                this.onLog(`Error subscribing: ${e.message}`);
            }
        }); 
  }

  public setupProbabilityMonitor() {
    const listenerTickId = this.deriv.observerInstance.on('deriv.tick', (data) => {
        console.log('Tick data:', data);
    });  
  }

  static async startMonitoring() {
    
  }
}