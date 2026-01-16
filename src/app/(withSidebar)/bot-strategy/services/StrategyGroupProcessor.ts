/**
 * Strategy Group Processor
 * Handles parsing and validation of strategy text into groups based on '*' character
 * Each line starting with '*' represents a group of rules connected by AND logic,
 * while different groups are connected by OR logic.
 */

export interface StrategyGroup {
  id: number;
  rules: string[];
  logic: 'and'; // Within group, rules are connected by AND
}

export interface ParsedStrategy {
  groups: StrategyGroup[];
  totalGroups: number;
  totalRules: number;
  isValid: boolean;
  errors: string[];
}

export class StrategyGroupProcessor {
  
  /**
   * Parse strategy text into groups based on '*' character
   * @param strategyText The raw strategy text from user input
   * @returns Parsed strategy with groups and validation info
   */
  static parseStrategyText(strategyText: string): ParsedStrategy {
    if (!strategyText || typeof strategyText !== 'string') {
      return {
        groups: [],
        totalGroups: 0,
        totalRules: 0,
        isValid: false,
        errors: ['Strategy text is empty or invalid']
      };
    }

    // Split text by newlines to get individual lines
    const lines = strategyText.split('\n').filter(line => line.trim() !== '');
    
    const groups: StrategyGroup[] = [];
    const errors: string[] = [];
    let currentGroupId = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('*')) {
        // Extract rules from this group line
        // Rules within a group are separated by commas
        const rulesText = line.substring(1).trim(); // Remove the '*' and trim
        
        if (rulesText === '') {
          errors.push(`Group ${currentGroupId} is empty (line ${i + 1})`);
          continue;
        }
        
        // Split by comma to get individual rules within the group
        const rules = rulesText
          .split(',')
          .map(rule => rule.trim())
          .filter(rule => rule !== '');
        
        if (rules.length === 0) {
          errors.push(`Group ${currentGroupId} has no valid rules (line ${i + 1})`);
          continue;
        }
        
        groups.push({
          id: currentGroupId,
          rules,
          logic: 'and'
        });
        
        currentGroupId++;
      } else if (line !== '') {
        // Non-group line - could be a comment or improperly formatted rule
        // We'll warn about this but continue processing
        errors.push(`Line ${i + 1} does not start with '*' and will be ignored: "${line}"`);
      }
    }

    // Validate the parsed groups
    const validation = this.validateGroups(groups);
    
    return {
      groups,
      totalGroups: groups.length,
      totalRules: groups.reduce((sum, group) => sum + group.rules.length, 0),
      isValid: validation.isValid && errors.length === 0,
      errors: [...errors, ...validation.errors]
    };
  }

  /**
   * Validate the parsed groups for common issues
   */
  private static validateGroups(groups: StrategyGroup[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const group of groups) {
      // Check for duplicate rules within the same group
      const uniqueRules = new Set(group.rules);
      if (uniqueRules.size !== group.rules.length) {
        const duplicates = group.rules.filter((rule, index) => 
          index !== group.rules.lastIndexOf(rule)
        );
        errors.push(`Group ${group.id} has duplicate rules: [${Array.from(new Set(duplicates)).join(', ')}]`);
      }
      
      // Check for empty rules
      const emptyRules = group.rules.filter(rule => rule.trim() === '');
      if (emptyRules.length > 0) {
        errors.push(`Group ${group.id} has empty rules`);
      }
    }
    
    // Check total number of groups (too many might indicate an issue)
    if (groups.length > 5) {
      errors.push(`Too many groups (${groups.length}). Maximum recommended is 5 groups.`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Format strategy text with proper group structure
   * Ensures each group starts with '*' and rules are comma-separated
   */
  static formatStrategyText(strategyText: string): string {
    if (!strategyText) return '';
    
    // Split by lines and process each
    const lines = strategyText.split('\n');
    const formattedLines: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (trimmedLine === '') {
        // Keep empty lines as they are
        formattedLines.push('');
        continue;
      }
      
      if (trimmedLine.startsWith('*')) {
        // Already a group, ensure proper formatting
        const content = trimmedLine.substring(1).trim();
        if (content) {
          // Ensure rules are comma-separated with proper spacing
          const formattedContent = this.formatGroupContent(content);
          formattedLines.push(`* ${formattedContent}`);
        } else {
          // Empty group line, keep as is
          formattedLines.push(trimmedLine);
        }
      } else {
        // Not a group, check if it should be one based on content
        // For now, we'll preserve the original unless it looks like it should be a group
        formattedLines.push(trimmedLine);
      }
    }
    
    return formattedLines.join('\n');
  }

  /**
   * Format the content within a group (after the '*')
   */
  private static formatGroupContent(content: string): string {
    // Split by common separators and rejoin with proper formatting
    // This handles cases where rules might not be properly comma-separated
    const rules = content
      .split(/,(?![^(]*\))/) // Split by comma, but not inside parentheses
      .map(rule => rule.trim())
      .filter(rule => rule !== '');
    
    return rules.join(', ');
  }

  /**
   * Convert parsed strategy to a simplified representation for the UI
   */
  static getStrategySummary(parsedStrategy: ParsedStrategy): string {
    if (!parsedStrategy.isValid) {
      return `Invalid strategy (${parsedStrategy.errors.length} errors)`;
    }
    
    return `${parsedStrategy.totalGroups} group(s), ${parsedStrategy.totalRules} rule(s)`;
  }

  /**
   * Generate a sample strategy template
   */
  static getSampleStrategy(): string {
    return `* Ultimos 3 digitos > 5
* RSI > 70, Ultimos 2 digitos < 3
* SMA(10) > SMA(20)`;
  }
}