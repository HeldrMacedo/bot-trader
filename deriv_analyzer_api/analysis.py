"""
Statistical Analysis Module
Performs advanced analysis on tick data to identify patterns and probabilities
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import Counter, deque
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StatisticalAnalyzer:
    def __init__(self):
        self.digit_frequencies = {}
        self.patterns = {}
        self.trends = {}
        
    def analyze_digit_distribution(self, digits: List[int]) -> Dict:
        """Analyze the distribution of digits in the provided data"""
        if not digits:
            return {}
            
        # Count frequencies
        counter = Counter(digits)
        total = len(digits)
        
        # Calculate percentages
        percentages = {digit: (count / total) * 100 for digit, count in counter.items()}
        
        # Calculate statistics
        series = pd.Series(digits)
        stats = {
            'mean': series.mean(),
            'std': series.std(),
            'variance': series.var(),
            'skewness': series.skew() if len(digits) > 2 else 0,
            'kurtosis': series.kurtosis() if len(digits) > 3 else 0,
            'frequencies': dict(counter),
            'percentages': percentages,
            'total_count': total
        }
        
        return stats
        
    def detect_exhaustion(self, digits: List[int], threshold: int = 5, window: int = 20) -> List[Dict]:
        """Detect exhausted digits (appear frequently in a short window)"""
        if len(digits) < window:
            return []
            
        recent_digits = digits[-window:]
        counter = Counter(recent_digits)
        
        exhausted = []
        for digit, count in counter.items():
            if count >= threshold:
                exhausted.append({
                    'digit': digit,
                    'count': count,
                    'percentage': (count / window) * 100,
                    'type': 'exhausted'
                })
                
        return exhausted
        
    def detect_absence(self, digits: List[int], absence_threshold: int = 15, window: int = 30) -> List[Dict]:
        """Detect absent digits (not appearing for a long time)"""
        if len(digits) < window:
            return []
            
        recent_digits = digits[-window:]
        absent = []
        
        for digit in range(10):
            if digit not in recent_digits:
                # Find how long ago it appeared
                ticks_since = 0
                for i in range(len(digits) - 1, -1, -1):
                    if digits[i] == digit:
                        ticks_since = len(digits) - 1 - i
                        break
                else:
                    ticks_since = len(digits)
                    
                if ticks_since >= absence_threshold:
                    absent.append({
                        'digit': digit,
                        'ticks_since': ticks_since,
                        'type': 'absent'
                    })
                    
        return absent
        
    def detect_trends(self, digits: List[int]) -> Dict:
        """Detect trends in the digit sequence"""
        if len(digits) < 10:
            return {'trend': 'insufficient_data', 'direction': 0, 'strength': 0}
            
        # Calculate rolling statistics
        series = pd.Series(digits)
        rolling_mean = series.rolling(window=5).mean()
        
        # Determine trend direction
        recent_change = rolling_mean.iloc[-1] - rolling_mean.iloc[-3] if len(rolling_mean) >= 3 else 0
        
        # Calculate trend strength (how consistent the direction is)
        if len(rolling_mean) >= 5:
            changes = np.diff(rolling_mean.dropna())
            if len(changes) > 0:
                positive_changes = sum(1 for c in changes[-5:] if c > 0)
                negative_changes = sum(1 for c in changes[-5:] if c < 0)
                strength = abs(positive_changes - negative_changes) / len(changes[-5:])
            else:
                strength = 0
        else:
            strength = 0
            
        trend_direction = 'up' if recent_change > 0.1 else 'down' if recent_change < -0.1 else 'stable'
        
        return {
            'trend': trend_direction,
            'direction': recent_change,
            'strength': strength,
            'current_mean': rolling_mean.iloc[-1] if not rolling_mean.empty else 0
        }
        
    def find_sequences(self, digits: List[int]) -> List[Dict]:
        """Find repeating sequences in the digit data"""
        if len(digits) < 6:
            return []
            
        sequences = []
        # Look for 2-digit and 3-digit sequences
        for seq_len in [2, 3]:
            if len(digits) < seq_len * 2:
                continue
                
            for i in range(len(digits) - seq_len * 2 + 1):
                sequence = tuple(digits[i:i+seq_len])
                # Count how many times this sequence appears
                count = 0
                for j in range(i + seq_len, len(digits) - seq_len + 1, seq_len):
                    if tuple(digits[j:j+seq_len]) == sequence:
                        count += 1
                    else:
                        break
                        
                if count > 0:
                    sequences.append({
                        'sequence': list(sequence),
                        'length': seq_len,
                        'repetitions': count,
                        'position': i,
                        'type': f'{seq_len}_digit_sequence'
                    })
                    
        return sequences
        
    def calculate_probabilities(self, digits: List[int], prediction_window: int = 5) -> Dict:
        """Calculate probabilities for different market types"""
        if len(digits) < 10:
            return {}
            
        # Calculate base probabilities
        counter = Counter(digits)
        total = len(digits)
        
        # Under/Over probabilities
        under_5 = sum(counter[d] for d in range(0, 5)) / total
        over_4 = sum(counter[d] for d in range(5, 10)) / total
        under_7 = sum(counter[d] for d in range(0, 7)) / total
        over_2 = sum(counter[d] for d in range(3, 10)) / total
        
        # Match/Not match probabilities
        digit_probs = {d: counter[d] / total for d in range(10)}
        
        # Even/Odd probabilities
        even_count = sum(counter[d] for d in [0, 2, 4, 6, 8])
        odd_count = sum(counter[d] for d in [1, 3, 5, 7, 9])
        even_prob = even_count / total
        odd_prob = odd_count / total
        
        # Calculate expected frequencies for statistical tests
        expected_freq = total / 10  # Expected if uniform distribution
        
        # Chi-square test for uniformity (simplified)
        chi_square = sum(((counter[d] - expected_freq) ** 2) / expected_freq for d in range(10) if expected_freq > 0)
        
        return {
            'under_5_prob': under_5,
            'over_4_prob': over_4,
            'under_7_prob': under_7,
            'over_2_prob': over_2,
            'digit_probs': digit_probs,
            'even_prob': even_prob,
            'odd_prob': odd_prob,
            'uniformity_test': chi_square < 15,  # If chi-square is low, distribution is more uniform
            'total_samples': total
        }
        
    def analyze_market_quality(self, digits: List[int], volatility_symbol: str) -> Dict:
        """Analyze the quality of the market for trading opportunities"""
        if len(digits) < 20:
            return {'quality_score': 0, 'reasons': ['insufficient_data'], 'should_trade': False}
            
        score = 0
        reasons = []
        
        # Check for patterns
        exhaustion = self.detect_exhaustion(digits)
        absence = self.detect_absence(digits)
        
        if len(exhaustion) >= 2:
            score += 25
            reasons.append(f'{len(exhaustion)} exhausted digits detected')
        elif len(exhaustion) >= 1:
            score += 15
            reasons.append(f'{len(exhaustion)} exhausted digit detected')
            
        if len(absence) >= 2:
            score += 20
            reasons.append(f'{len(absence)} absent digits detected')
        elif len(absence) >= 1:
            score += 10
            reasons.append(f'{len(absence)} absent digit detected')
            
        # Check distribution uniformity
        probs = self.calculate_probabilities(digits)
        if not probs.get('uniformity_test', True):
            score += 15
            reasons.append('Distribution shows bias')
        else:
            score -= 10
            reasons.append('Distribution appears uniform (less predictable)')
            
        # Check trend stability
        trend = self.detect_trends(digits)
        if abs(trend['direction']) > 0.5:
            score += 10
            reasons.append('Strong trend detected')
        elif trend['strength'] > 0.7:
            score += 5
            reasons.append('Consistent trend direction')
            
        # Cap the score
        score = max(0, min(100, score))
        
        return {
            'quality_score': score,
            'reasons': reasons,
            'should_trade': score >= 50,
            'trend_direction': trend['trend'],
            'volatility_symbol': volatility_symbol
        }
        
    def generate_trading_signals(self, digits: List[int], config: Dict) -> List[Dict]:
        """Generate trading signals based on analysis"""
        signals = []
        
        if len(digits) < 20:
            return signals
            
        # Get analysis results
        exhaustion = self.detect_exhaustion(digits, config.get('exhaustion_threshold', 5))
        absence = self.detect_absence(digits, config.get('absence_threshold', 15))
        probs = self.calculate_probabilities(digits)
        trend = self.detect_trends(digits)
        
        # Generate Over 2 signals
        if config.get('over2_enabled', True):
            over2_score = 0
            over2_reasons = []
            
            for exh in exhaustion:
                if exh['digit'] <= 2:
                    over2_score += exh['count'] * 3
                    over2_reasons.append(f'Digit {exh["digit"]} exhausted ({exh["count"]} times)')
                    
            if over2_score >= config.get('min_signal_strength', 10):
                signals.append({
                    'strategy': 'over2',
                    'type': 'OVER 2',
                    'confidence': min(100, over2_score * 2),
                    'reasons': over2_reasons,
                    'assertiveness': 'HIGH' if over2_score >= 15 else 'MEDIUM',
                    'expected_profit': probs['over_2_prob'] * 0.95 - (1 - probs['over_2_prob'])
                })
                
        # Generate Under 7 signals
        if config.get('under7_enabled', True):
            under7_score = 0
            under7_reasons = []
            
            for exh in exhaustion:
                if exh['digit'] >= 7:
                    under7_score += exh['count'] * 3
                    under7_reasons.append(f'Digit {exh["digit"]} exhausted ({exh["count"]} times)')
                    
            for abs_digit in absence:
                if abs_digit['digit'] <= 6:
                    under7_score += 2
                    under7_reasons.append(f'Digit {abs_digit["digit"]} absent for {abs_digit["ticks_since"]} ticks')
                    
            if under7_score >= config.get('min_signal_strength', 10):
                signals.append({
                    'strategy': 'under7',
                    'type': 'UNDER 7',
                    'confidence': min(100, under7_score * 2),
                    'reasons': under7_reasons,
                    'assertiveness': 'HIGH' if under7_score >= 15 else 'MEDIUM',
                    'expected_profit': probs['under_7_prob'] * 0.95 - (1 - probs['under_7_prob'])
                })
                
        # Generate Differs signals
        if config.get('differs_enabled', True):
            if probs['digit_probs']:
                # Find most frequent digit
                most_frequent = max(probs['digit_probs'].items(), key=lambda x: x[1])
                if most_frequent[1] > 0.15:  # If appears more than 15% of time
                    differs_score = most_frequent[1] * 50
                    signals.append({
                        'strategy': 'differs',
                        'type': f'DIFFERS {most_frequent[0]}',
                        'confidence': min(100, differs_score),
                        'reasons': [f'Digit {most_frequent[0]} appears {most_frequent[1]*100:.1f}% of time'],
                        'assertiveness': 'HIGH' if differs_score >= 75 else 'MEDIUM',
                        'expected_profit': (1 - most_frequent[1]) * 0.95 - most_frequent[1]
                    })
                    
        # Sort signals by confidence
        signals.sort(key=lambda x: x['confidence'], reverse=True)
        
        return signals