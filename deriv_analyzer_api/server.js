const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { DerivAPI } = require('@deriv/deriv-api');

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
  res.json({
    connected: derivAPI && derivAPI.connectionState === 'connected',
    running: true,
    clients: clients.size,
    timestamp: new Date().toISOString()
  });
});

// Deriv API listener class (similar to wsListener.ts)
class DerivAPIListener extends EventEmitter {
  constructor(apiToken) {
    super();
    this.apiToken = apiToken;
    this.connection = null;
    this.api = null;
    this.isConnected = false;
    this.tickData = {};
    this.digitHistory = {};
    this.analysisResults = {};
    this.suggestions = [];
    
    // Initialize digit history for each symbol
    this.volatilities = {
      'R_10': 'Volatility 10',
      'R_25': 'Volatility 25', 
      'R_50': 'Volatility 50',
      'R_75': 'Volatility 75',
      'R_100': 'Volatility 100'
    };
    
    for (const symbol in this.volatilities) {
      this.digitHistory[symbol] = [];
    }
  }

  async connect() {
    try {
      // Create WebSocket connection to Deriv
      this.connection = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
      
      this.connection.onopen = () => {
        console.log('Connected to Deriv WebSocket');
        this.isConnected = true;
        this.emit('connected');
        
        // Authenticate with token
        const authMessage = { authorize: this.apiToken };
        this.connection.send(JSON.stringify(authMessage));
        
        // Subscribe to ticks for volatility indices
        for (const symbol in this.volatilities) {
          const subscribeMsg = {
            ticks: symbol,
            subscribe: 1
          };
          this.connection.send(JSON.stringify(subscribeMsg));
          console.log(`Subscribed to ${symbol}`);
        }
      };

      this.connection.onmessage = (event) => {
        this.processMessage(event.data);
      };

      this.connection.onclose = () => {
        console.log('WebSocket connection closed');
        this.isConnected = false;
        this.emit('disconnected');
      };

      this.connection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Error connecting to Deriv:', error);
    }
  }

  processMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.msg_type === 'authorize') {
        if (!message.error) {
          console.log('Authorized successfully!');
          this.emit('authorized');
        } else {
          console.error('Authorization error:', message.error.message);
        }
      } else if (message.msg_type === 'tick') {
        this.processTick(message.tick);
        this.broadcastRealTimeData();
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  processTick(tickData) {
    const symbol = tickData.symbol;
    const quote = parseFloat(tickData.quote);
    const digit = parseInt(quote.toString().slice(-1)); // Last digit
    
    // Update history
    if (!this.digitHistory[symbol]) {
      this.digitHistory[symbol] = [];
    }
    
    this.digitHistory[symbol].push(digit);
    if (this.digitHistory[symbol].length > 100) {
      this.digitHistory[symbol] = this.digitHistory[symbol].slice(-100);
    }
    
    this.tickData[symbol] = {
      quote: quote,
      digit: digit,
      timestamp: new Date().toISOString()
    };
    
    // Analyze patterns
    this.analyzePatterns(symbol);
    
    // Generate suggestions
    this.generateSuggestions();
  }

  analyzePatterns(symbol) {
    if (!this.digitHistory[symbol] || this.digitHistory[symbol].length < 20) {
      return;
    }
    
    const digits = this.digitHistory[symbol];
    const recentDigits = digits.slice(-20); // Last 20 ticks
    
    const analysis = {
      symbol: symbol,
      timestamp: new Date().toISOString(),
      currentDigit: digits[digits.length - 1],
      exhaustedDigits: [],
      absentDigits: [],
      distribution: this.calculateDistribution(recentDigits),
      trends: this.analyzeTrends(digits),
      sequences: this.findSequences(digits)
    };
    
    // Detect exhaustion (digits that appear frequently)
    for (let digit = 0; digit <= 9; digit++) {
      const count = recentDigits.filter(d => d === digit).length;
      if (count >= 5) { // threshold of 5 occurrences
        analysis.exhaustedDigits.push({
          digit: digit,
          count: count,
          percentage: (count / recentDigits.length) * 100
        });
      }
    }
    
    // Detect absence (digits that haven't appeared recently)
    for (let digit = 0; digit <= 9; digit++) {
      if (!recentDigits.includes(digit)) {
        analysis.absentDigits.push(digit);
      } else {
        const lastOccurrence = recentDigits.lastIndexOf(digit);
        const ticksSince = recentDigits.length - 1 - lastOccurrence;
        if (ticksSince >= 15) { // threshold of 15 ticks since last occurrence
          analysis.absentDigits.push(digit);
        }
      }
    }
    
    this.analysisResults[symbol] = analysis;
    this.emit('analysisUpdate', analysis);
  }

  calculateDistribution(digits) {
    const counts = {};
    const total = digits.length;
    
    for (const digit of digits) {
      counts[digit] = (counts[digit] || 0) + 1;
    }
    
    const percentages = {};
    for (const digit in counts) {
      percentages[digit] = (counts[digit] / total) * 100;
    }
    
    const mean = digits.reduce((sum, digit) => sum + digit, 0) / total;
    const variance = digits.reduce((sum, digit) => sum + Math.pow(digit - mean, 2), 0) / total;
    const std = Math.sqrt(variance);
    
    return {
      mean: mean,
      std: std,
      counts: counts,
      percentages: percentages
    };
  }

  analyzeTrends(digits) {
    if (digits.length < 10) {
      return {};
    }
    
    // Calculate rolling mean
    const windowSize = Math.min(10, digits.length);
    const recentDigits = digits.slice(-windowSize);
    const rollingMean = recentDigits.reduce((sum, digit) => sum + digit, 0) / windowSize;
    
    // Calculate current trend
    const current = recentDigits[recentDigits.length - 1];
    const previous = recentDigits[recentDigits.length - 2];
    const currentTrend = current > previous ? "alta" : "baixa";
    
    // Calculate volatility (standard deviation)
    const mean = recentDigits.reduce((sum, digit) => sum + digit, 0) / windowSize;
    const variance = recentDigits.reduce((sum, digit) => sum + Math.pow(digit - mean, 2), 0) / windowSize;
    const volatility = Math.sqrt(variance);
    
    return {
      currentTrend: currentTrend,
      volatility: volatility,
      rollingMean: rollingMean
    };
  }

  findSequences(digits) {
    const sequences = [];
    if (digits.length < 5) {
      return sequences;
    }
    
    // Look for 3-digit sequences
    for (let i = 0; i <= digits.length - 3; i++) {
      const sequence = digits.slice(i, i + 3);
      let count = 1;
      
      // Look for repetitions of this sequence
      for (let j = i + 3; j <= digits.length - 3; j += 3) {
        if (digits[j] === sequence[0] && 
            digits[j + 1] === sequence[1] && 
            digits[j + 2] === sequence[2]) {
          count++;
        } else {
          break;
        }
      }
      
      if (count >= 2) { // At least 2 repetitions
        sequences.push({
          sequence: sequence,
          repetitions: count,
          startIndex: i
        });
      }
    }
    
    return sequences;
  }

  generateSuggestions() {
    const suggestions = [];
    
    for (const symbol in this.analysisResults) {
      const analysis = this.analysisResults[symbol];
      
      if (analysis.exhaustedDigits.length === 0 && analysis.absentDigits.length === 0) {
        continue;
      }
      
      // OVER 2 Strategy
      const over2Score = this.calculateOver2Score(analysis);
      if (over2Score >= 70) {
        suggestions.push({
          symbol: symbol,
          strategy: "OVER 2",
          confidence: over2Score,
          reason: `Exhausted digits ${analysis.exhaustedDigits.map(d => d.digit).join(', ')} favor OVER 2`,
          assertiveness: over2Score >= 80 ? "HIGH" : "MEDIUM",
          timestamp: new Date().toISOString()
        });
      }
      
      // UNDER 7 Strategy
      const under7Score = this.calculateUnder7Score(analysis);
      if (under7Score >= 70) {
        suggestions.push({
          symbol: symbol,
          strategy: "UNDER 7",
          confidence: under7Score,
          reason: "Pattern favors low digits",
          assertiveness: under7Score >= 80 ? "HIGH" : "MEDIUM",
          timestamp: new Date().toISOString()
        });
      }
      
      // DIFFERS Strategy
      const differsScore = this.calculateDiffersScore(analysis);
      if (differsScore >= 70) {
        const mostCommon = Object.entries(analysis.distribution.counts)
          .reduce((max, entry) => entry[1] > max[1] ? entry : max, ['', 0]);
        
        suggestions.push({
          symbol: symbol,
          strategy: `DIFFERS ${mostCommon[0]}`,
          confidence: differsScore,
          reason: `Avoid digit ${mostCommon[0]} (appeared ${mostCommon[1]} times)`,
          assertiveness: differsScore >= 80 ? "HIGH" : "MEDIUM",
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Sort by confidence
    this.suggestions = suggestions.sort((a, b) => b.confidence - a.confidence);
    this.emit('suggestionsUpdate', this.suggestions);
  }

  calculateOver2Score(analysis) {
    let score = 0;
    
    // Score low exhausted digits (0,1,2)
    for (const exhausted of analysis.exhaustedDigits) {
      if (exhausted.digit <= 2) {
        score += exhausted.percentage * 0.8;
      }
    }
    
    // Score absence of high digits
    for (const absent of analysis.absentDigits) {
      if (absent >= 3) {
        score += 15;
      }
    }
    
    // Favor distribution with many low digits
    const lowDigits = Object.keys(analysis.distribution.counts)
      .filter(digit => parseInt(digit) <= 2 && analysis.distribution.counts[digit] > 3);
    if (lowDigits.length >= 2) {
      score += 20;
    }
    
    return Math.min(score, 100);
  }

  calculateUnder7Score(analysis) {
    let score = 0;
    
    // Score high exhausted digits (7,8,9)
    for (const exhausted of analysis.exhaustedDigits) {
      if (exhausted.digit >= 7) {
        score += exhausted.percentage * 0.8;
      }
    }
    
    // Score absence of low digits
    for (const absent of analysis.absentDigits) {
      if (absent <= 6) {
        score += 15;
      }
    }
    
    return Math.min(score, 100);
  }

  calculateDiffersScore(analysis) {
    const counts = analysis.distribution.counts;
    if (Object.keys(counts).length === 0) {
      return 0;
    }
    
    const mostCommonCount = Math.max(...Object.values(counts));
    const totalTicks = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    if (totalTicks === 0) {
      return 0;
    }
    
    const percentage = (mostCommonCount / totalTicks) * 100;
    
    // Score based on digit dominance
    if (percentage >= 30) return 85;
    if (percentage >= 25) return 75;
    if (percentage >= 20) return 65;
    return 50;
  }

  getBestSuggestion() {
    if (this.suggestions.length === 0) {
      return null;
    }
    return this.suggestions[0];
  }

  getMarketAnalysis() {
    let totalQuality = 0;
    let validSymbols = 0;
    
    for (const symbol in this.analysisResults) {
      if (this.digitHistory[symbol] && this.digitHistory[symbol].length >= 20) {
        const quality = this.calculateMarketQuality(this.analysisResults[symbol]);
        totalQuality += quality;
        validSymbols++;
      }
    }
    
    const avgQuality = validSymbols > 0 ? totalQuality / validSymbols : 0;
    
    return {
      overallQuality: avgQuality,
      shouldTrade: avgQuality >= 60,
      suggestionsCount: this.suggestions.length,
      highConfidenceSuggestions: this.suggestions.filter(s => s.assertiveness === 'HIGH').length,
      timestamp: new Date().toISOString()
    };
  }

  calculateMarketQuality(analysis) {
    let quality = 0;
    
    // Patterns detected
    const patterns = analysis.exhaustedDigits.length + analysis.absentDigits.length;
    if (patterns >= 3) quality += 25;
    else if (patterns >= 2) quality += 15;
    else if (patterns >= 1) quality += 5;
    
    // Distribution
    if (analysis.distribution.std > 3.0) { // High variance = good opportunity
      quality += 20;
    }
    
    // Trends
    if (analysis.trends && analysis.trends.volatility > 2.5) {
      quality += 15;
    }
    
    return Math.min(quality, 100);
  }

  broadcastRealTimeData() {
    const data = {
      marketAnalysis: this.getMarketAnalysis(),
      suggestions: this.suggestions,
      bestSuggestion: this.getBestSuggestion(),
      tickData: this.tickData,
      digitHistory: this.digitHistory,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all connected WebSocket clients
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}

// Initialize the Deriv listener
const derivListener = new DerivAPIListener(process.env.DERIV_TOKEN || 'your_token_here');

// Start the connection
derivListener.connect();

// Handle WebSocket connections from frontend
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);
  
  // Send initial data to the new client
  const initialData = {
    marketAnalysis: derivListener.getMarketAnalysis(),
    suggestions: derivListener.suggestions,
    bestSuggestion: derivListener.getBestSuggestion(),
    tickData: derivListener.tickData,
    digitHistory: derivListener.digitHistory,
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(initialData));
  
  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});