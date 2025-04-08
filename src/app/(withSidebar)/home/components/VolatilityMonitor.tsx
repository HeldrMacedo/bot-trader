import { useEffect, useState } from 'react';
import { DerivService } from '@/app/services/DerivServiceTest';

const VOLATILITY_INDICES = ['R_100', 'R_75', 'R_50', 'R_25', 'R_10'];

interface VolatilityData {
    digits: number[];
    lastUpdate: Date;
}

export const VolatilityMonitor = () => {
    const deriv = DerivService.getInstance();
    const observer = deriv.observerInstance;
    
    const [volatilityData, setVolatilityData] = useState<Record<string, VolatilityData>>(() => {
        const initialData: Record<string, VolatilityData> = {};
        VOLATILITY_INDICES.forEach(index => {
            initialData[index] = {
                digits: Array(13).fill(0), // 13 dígitos como no exemplo
                lastUpdate: new Date()
            };
        });
        return initialData;
    });

    useEffect(() => {
        const subscriptions: string[] = [];
        
        // Inscrever em todos os índices
        VOLATILITY_INDICES.forEach(async (index) => {
            try {
                const response = await deriv.subscribe({ ticks: index });
                subscriptions.push(response.subscription.id);
                
                observer.on(`deriv.tick`, (data) => {
                    if(data.tick.symbol === index) {
                        const newDigit = getLastDigit(data.tick.quote);
                        setVolatilityData(prev => ({
                            ...prev,
                            [index]: {
                                digits: [newDigit, ...prev[index].digits.slice(0, 12)],
                                lastUpdate: new Date()
                            }
                        }));
                    }
                });

            } catch (error) {
                console.error(`Erro ao inscrever em ${index}:`, error);
            }
        });

        // Cleanup
        return () => {
            subscriptions.forEach(id => deriv.send({ forget: id }));
        };
    }, []);

    const getLastDigit = (quote: number): number => {
        // Remove o ponto decimal se existir
        const cleanNumber = Math.floor(quote * 100); // Considera 2 casas decimais
        return cleanNumber % 10;
    };

    return (
        <div className="volatility-monitor">
            <h2>Monitor de Volatilidade</h2>
            
            {VOLATILITY_INDICES.map((index) => (
                <div key={index} className="volatility-index">
                    <div className="index-header">
                        <span>Índ. Volatilidade {index.split('_')[1]}</span>
                        <small>{volatilityData[index].lastUpdate.toLocaleTimeString()}</small>
                    </div>
                    
                    <div className="digits-container">
                        {volatilityData[index].digits.map((digit, i) => (
                            <span key={i} className="digit">
                                {digit}
                            </span>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};