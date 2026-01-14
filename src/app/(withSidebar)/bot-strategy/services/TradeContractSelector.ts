// TradeContractSelector.ts
// Migrated from bot-ia/js/trade/TradeContractSelector.js
// Handles: Contract groups, BOTH mode, validation logic

export type ContractGroupName = 
    | 'Over/Under' 
    | 'Call/Put' 
    | 'Higher/Lower' 
    | 'Differ/Match' 
    | 'Even/Odd'
    | 'Touch/No Touch'
    | 'Asian Up/Down'
    | 'Reset Call/Put'
    | 'Tick High/Low'
    | 'Run High/Low';

export interface ContractGroup {
    groupName: ContractGroupName;
    contracts: string[];
}

export interface ContractValidation {
    isValid: boolean;
    error?: string;
}

export interface BothTradeResult {
    type: 'WIN' | 'LOSS' | 'MIXED';
    successCount: number;
    totalContracts: number;
}

// Contract groups mapping
const CONTRACT_GROUPS: Record<ContractGroupName, string[]> = {
    'Over/Under': ['DIGITOVER', 'DIGITUNDER'],
    'Call/Put': ['CALL', 'PUT'],
    'Higher/Lower': ['CALLE', 'PUTE', 'CALLPUT'],
    'Differ/Match': ['DIGITDIFF', 'DIGITMATCH'],
    'Even/Odd': ['DIGITEVEN', 'DIGITODD'],
    'Touch/No Touch': ['TOUCH', 'NOTOUCH'],
    'Asian Up/Down': ['ASIANU', 'ASIAND'],
    'Reset Call/Put': ['RESETCALL', 'RESETPUT'],
    'Tick High/Low': ['TICKHIGH', 'TICKLOW'],
    'Run High/Low': ['RUNHIGH', 'RUNLOW']
};

// Keywords for contract detection
const CONTRACT_KEYWORDS: Record<string, string[]> = {
    'DIGITOVER': ['over', 'acima'],
    'DIGITUNDER': ['under', 'abaixo'],
    'DIGITMATCH': ['match', 'igual', 'iguais'],
    'DIGITDIFF': ['differ', 'diferente', 'diferentes', 'diff'],
    'DIGITODD': ['odd', 'ímpar', 'impar'],
    'DIGITEVEN': ['even', 'par'],
    'CALL': ['call', 'rise', 'sobe', 'subir'],
    'PUT': ['put', 'fall', 'desce', 'descer', 'cai', 'cair'],
    'CALLE': ['calle', 'higher'],
    'PUTE': ['pute', 'lower']
};

export class TradeContractSelector {
    private availableContracts: string[] = [];

    constructor(availableContracts: string[] = []) {
        this.availableContracts = availableContracts;
    }

    setAvailableContracts(contracts: string[]): void {
        this.availableContracts = contracts;
    }

    // Check if a trade type is BOTH mode
    isBothMode(tradeType: string): boolean {
        return tradeType === 'BOTH';
    }

    // Get the contract group for a given contract type
    getContractGroup(contractType: string): ContractGroup | null {
        for (const [groupName, contracts] of Object.entries(CONTRACT_GROUPS)) {
            if (contracts.includes(contractType)) {
                return {
                    groupName: groupName as ContractGroupName,
                    contracts: contracts
                };
            }
        }
        return null;
    }

    // Get contracts for BOTH mode based on selected contract
    getBothContracts(selectedContract: string): ContractGroup | null {
        const group = this.getContractGroup(selectedContract);
        
        if (!group) return null;

        // For Higher/Lower, exclude CALLPUT (it's just a placeholder)
        if (group.groupName === 'Higher/Lower') {
            return {
                groupName: group.groupName,
                contracts: group.contracts.filter(c => c !== 'CALLPUT')
            };
        }

        // Filter by available contracts if we have them
        if (this.availableContracts.length > 0) {
            const filteredContracts = group.contracts.filter(c => 
                this.availableContracts.includes(c)
            );
            
            return {
                groupName: group.groupName,
                contracts: filteredContracts.length > 0 ? filteredContracts : group.contracts
            };
        }

        return group;
    }

    // Determine which contracts to execute in BOTH mode based on strategy
    determineContractsForBothMode(
        bothContracts: ContractGroup,
        strategyText: string | null = null,
        prediction: number | null = null
    ): string[] {
        // If no strategy text, return all contracts in the group
        if (!strategyText || strategyText.trim() === '') {
            return this.filterValidContracts(bothContracts.contracts, prediction);
        }

        const strategyLower = strategyText.toLowerCase();

        // Detect specific contracts from strategy text
        const detectedContracts: string[] = [];

        for (const [contractType, keywords] of Object.entries(CONTRACT_KEYWORDS)) {
            if (!bothContracts.contracts.includes(contractType)) continue;

            for (const keyword of keywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(strategyLower)) {
                    if (!detectedContracts.includes(contractType)) {
                        detectedContracts.push(contractType);
                    }
                    break;
                }
            }
        }

        // If we detected specific contracts, use them
        if (detectedContracts.length > 0) {
            return this.filterValidContracts(detectedContracts, prediction);
        }

        // Default: return all contracts in the group
        return this.filterValidContracts(bothContracts.contracts, prediction);
    }

    // Filter contracts that have valid configuration
    private filterValidContracts(contracts: string[], prediction: number | null): string[] {
        return contracts.filter(contract => {
            const validation = this.validateContract(contract, prediction);
            return validation.isValid;
        });
    }

    // Validate a single contract
    validateContract(contractType: string, prediction: number | null = null): ContractValidation {
        const digitContracts = ['DIGITOVER', 'DIGITUNDER', 'DIGITDIFF', 'DIGITMATCH'];

        if (digitContracts.includes(contractType)) {
            if (prediction === null || prediction === undefined) {
                return {
                    isValid: false,
                    error: 'Prediction required for digit contracts'
                };
            }

            // Specific validation per contract type
            if (contractType === 'DIGITUNDER') {
                if (prediction === 0) {
                    return {
                        isValid: false,
                        error: 'UNDER 0 is invalid - digit cannot be less than 0'
                    };
                }
                if (prediction < 0 || prediction > 9) {
                    return {
                        isValid: false,
                        error: `UNDER ${prediction} invalid. Prediction must be 1-9`
                    };
                }
            } else if (contractType === 'DIGITOVER') {
                if (prediction === 9) {
                    return {
                        isValid: false,
                        error: 'OVER 9 is invalid - digit cannot be greater than 9'
                    };
                }
                if (prediction < 0 || prediction > 9) {
                    return {
                        isValid: false,
                        error: `OVER ${prediction} invalid. Prediction must be 0-8`
                    };
                }
            } else if (contractType === 'DIGITMATCH' || contractType === 'DIGITDIFF') {
                if (prediction < 0 || prediction > 9) {
                    return {
                        isValid: false,
                        error: `Prediction ${prediction} invalid. Must be 0-9`
                    };
                }
            }
        }

        // Barrier contracts validation
        const barrierContracts = ['CALLE', 'PUTE', 'TOUCH', 'NOTOUCH'];
        if (barrierContracts.includes(contractType)) {
            // For these contracts, barrier validation would be done separately
            // as it depends on market price
        }

        return { isValid: true };
    }

    // Calculate result for BOTH mode trades
    calculateBothTradeResult(successCount: number, totalContracts: number): BothTradeResult {
        if (successCount === 0) {
            // All lost
            return { type: 'LOSS', successCount, totalContracts };
        } else if (successCount === totalContracts) {
            // All won
            return { type: 'WIN', successCount, totalContracts };
        } else {
            // Mixed result
            return { type: 'MIXED', successCount, totalContracts };
        }
    }

    // Detect contract type from strategy text for a specific group
    detectContractFromStrategy(
        strategyText: string,
        groupName: ContractGroupName
    ): string | null {
        const groupContracts = CONTRACT_GROUPS[groupName];
        if (!groupContracts) return null;

        const strategyLower = strategyText.toLowerCase();

        // Group-specific detection
        switch (groupName) {
            case 'Even/Odd': {
                const hasParWord = /\bpar\b/i.test(strategyLower) && !(/\bimpar\b|\bímpar\b/i.test(strategyLower));
                const hasImparWord = (/\bimpar\b|\bímpar\b/i.test(strategyLower)) && !(/\bpar\b/i.test(strategyLower));
                
                if (hasParWord && groupContracts.includes('DIGITEVEN')) return 'DIGITEVEN';
                if (hasImparWord && groupContracts.includes('DIGITODD')) return 'DIGITODD';
                break;
            }
            case 'Over/Under': {
                const hasOverWord = /\bover\b/i.test(strategyLower) && !(/\bunder\b/i.test(strategyLower));
                const hasUnderWord = /\bunder\b/i.test(strategyLower) && !(/\bover\b/i.test(strategyLower));
                
                if (hasOverWord && groupContracts.includes('DIGITOVER')) return 'DIGITOVER';
                if (hasUnderWord && groupContracts.includes('DIGITUNDER')) return 'DIGITUNDER';
                break;
            }
            case 'Differ/Match': {
                const hasMatchWord = /\bmatch\b/i.test(strategyLower) && !(/\bdiffer\b/i.test(strategyLower));
                const hasDifferWord = /\bdiffer\b/i.test(strategyLower) && !(/\bmatch\b/i.test(strategyLower));
                
                if (hasMatchWord && groupContracts.includes('DIGITMATCH')) return 'DIGITMATCH';
                if (hasDifferWord && groupContracts.includes('DIGITDIFF')) return 'DIGITDIFF';
                break;
            }
            case 'Call/Put': {
                const hasCallWord = /\b(call|rise|sobe)\b/i.test(strategyLower);
                const hasPutWord = /\b(put|fall|desce)\b/i.test(strategyLower);
                
                if (hasCallWord && !hasPutWord && groupContracts.includes('CALL')) return 'CALL';
                if (hasPutWord && !hasCallWord && groupContracts.includes('PUT')) return 'PUT';
                break;
            }
        }

        // Generic keyword detection
        for (const [contractType, keywords] of Object.entries(CONTRACT_KEYWORDS)) {
            if (!groupContracts.includes(contractType)) continue;

            for (const keyword of keywords) {
                const regex = new RegExp(`\\b${keyword}\\b`, 'i');
                if (regex.test(strategyLower)) {
                    return contractType;
                }
            }
        }

        return null;
    }

    // Extract prediction from strategy text (e.g., "over 5" -> 5)
    extractPredictionFromStrategy(strategyText: string): number | null {
        // Pattern: "over/under/match/differ N"
        const regex = /(over|under|match|differ)\s+(\d+)/gi;
        const match = regex.exec(strategyText.toLowerCase());
        
        if (match) {
            return parseInt(match[2], 10);
        }

        // Pattern: just a number for digit contracts
        const digitRegex = /\b(\d)\b/;
        const digitMatch = strategyText.match(digitRegex);
        
        if (digitMatch) {
            return parseInt(digitMatch[1], 10);
        }

        return null;
    }

    // Get opposite contract in a group
    getOppositeContract(contractType: string): string | null {
        const opposites: Record<string, string> = {
            'DIGITOVER': 'DIGITUNDER',
            'DIGITUNDER': 'DIGITOVER',
            'CALL': 'PUT',
            'PUT': 'CALL',
            'CALLE': 'PUTE',
            'PUTE': 'CALLE',
            'DIGITEVEN': 'DIGITODD',
            'DIGITODD': 'DIGITEVEN',
            'DIGITMATCH': 'DIGITDIFF',
            'DIGITDIFF': 'DIGITMATCH',
            'TOUCH': 'NOTOUCH',
            'NOTOUCH': 'TOUCH'
        };

        return opposites[contractType] || null;
    }

    // Check if two contracts are in the same group
    areInSameGroup(contract1: string, contract2: string): boolean {
        const group1 = this.getContractGroup(contract1);
        const group2 = this.getContractGroup(contract2);

        if (!group1 || !group2) return false;
        return group1.groupName === group2.groupName;
    }

    // Get all contract groups
    static getAllGroups(): Record<ContractGroupName, string[]> {
        return CONTRACT_GROUPS;
    }

    // Get all keywords for contract detection
    static getAllKeywords(): Record<string, string[]> {
        return CONTRACT_KEYWORDS;
    }
}
