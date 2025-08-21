// Modular Code Interpreter Functions for BPM/HRV Analysis
// This component contains reusable analysis functions for smartwatch data

export interface BPMDataPoint {
  timestamp: string | number;
  bpm: number;
  ibi?: number;
}

export interface HRVMetrics {
  sdnn_population: number;
  sdnn_sample: number;
  mean_hr: number;
  mean_ibi: number;
  rmssd?: number;
  pnn50?: number;
}

export class CodeInterpreterFunctions {
  /**
   * Parse CSV content to extract BPM data
   */
  static parseCSVData(csvContent: string): BPMDataPoint[] {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const bpmIndex = headers.findIndex(h => 
      h.includes('bpm') || h.includes('heart') || h.includes('hr') || h.includes('pulse')
    );
    const timeIndex = headers.findIndex(h => 
      h.includes('time') || h.includes('date') || h.includes('timestamp')
    );
    
    if (bpmIndex === -1) return [];
    
    const dataPoints: BPMDataPoint[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const bpm = parseFloat(values[bpmIndex]);
      
      if (!isNaN(bpm) && bpm > 30 && bpm < 220) { // Valid HR range
        dataPoints.push({
          timestamp: timeIndex >= 0 ? values[timeIndex] : i,
          bpm: bpm
        });
      }
    }
    
    return dataPoints;
  }

  /**
   * Calculate HRV metrics from BPM data
   */
  static calculateHRVMetrics(bpmData: BPMDataPoint[]): HRVMetrics | null {
    if (bpmData.length < 2) return null;
    
    // Convert BPM to IBI (Inter-Beat Interval) in milliseconds
    const ibiData = bpmData.map(point => ({
      ...point,
      ibi: 60000 / point.bpm // Convert BPM to milliseconds
    }));
    
    const ibiValues = ibiData.map(d => d.ibi);
    const bpmValues = bpmData.map(d => d.bpm);
    
    // Calculate mean values
    const meanBPM = bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length;
    const meanIBI = ibiValues.reduce((sum, ibi) => sum + ibi, 0) / ibiValues.length;
    
    // Calculate SDNN (Standard Deviation of NN intervals)
    // Population SDNN
    const variancePop = ibiValues.reduce((sum, ibi) => sum + Math.pow(ibi - meanIBI, 2), 0) / ibiValues.length;
    const sdnnPopulation = Math.sqrt(variancePop);
    
    // Sample SDNN (with Bessel's correction)
    const varianceSam = ibiValues.reduce((sum, ibi) => sum + Math.pow(ibi - meanIBI, 2), 0) / (ibiValues.length - 1);
    const sdnnSample = Math.sqrt(varianceSam);
    
    // Calculate additional HRV metrics
    let rmssd: number | undefined;
    let pnn50: number | undefined;
    
    if (ibiValues.length > 1) {
      // RMSSD - Root Mean Square of Successive Differences
      const successiveDiffs = [];
      for (let i = 1; i < ibiValues.length; i++) {
        successiveDiffs.push(Math.pow(ibiValues[i] - ibiValues[i-1], 2));
      }
      rmssd = Math.sqrt(successiveDiffs.reduce((sum, diff) => sum + diff, 0) / successiveDiffs.length);
      
      // pNN50 - Percentage of successive RR intervals that differ by more than 50ms
      const nn50Count = successiveDiffs.filter(diff => Math.sqrt(diff) > 50).length;
      pnn50 = (nn50Count / successiveDiffs.length) * 100;
    }
    
    return {
      sdnn_population: Math.round(sdnnPopulation * 100) / 100,
      sdnn_sample: Math.round(sdnnSample * 100) / 100,
      mean_hr: Math.round(meanBPM * 100) / 100,
      mean_ibi: Math.round(meanIBI * 100) / 100,
      rmssd: rmssd ? Math.round(rmssd * 100) / 100 : undefined,
      pnn50: pnn50 ? Math.round(pnn50 * 100) / 100 : undefined
    };
  }

  /**
   * Generate Python-like code snippet for the analysis
   */
  static generateCodeSnippet(bpmData: BPMDataPoint[], metrics: HRVMetrics): string {
    const bpmArray = bpmData.slice(0, 10).map(d => d.bpm); // Show first 10 values
    const hasMoreData = bpmData.length > 10;
    
    return `
import numpy as np
import pandas as pd

# Heart rate data from smartwatch (BPM)
hr_bpm = ${JSON.stringify(bpmArray)}${hasMoreData ? ' # ... +' + (bpmData.length - 10) + ' more values' : ''}

# Convert HR (BPM) to IBI (Inter-Beat Interval in milliseconds)  
ibi = [60000.0/x for x in hr_bpm]

# Calculate HRV metrics
mean_hr = np.mean(hr_bpm)
mean_ibi = np.mean(ibi)

# SDNN - Standard Deviation of NN intervals
sdnn_population = np.std(ibi)          # Population standard deviation
sdnn_sample = np.std(ibi, ddof=1)      # Sample standard deviation (Bessel's correction)

# Results
print(f"Heart Rate Analysis Results:")
print(f"Mean HR (BPM): {mean_hr:.2f}")
print(f"Mean IBI (ms): {mean_ibi:.2f}")
print(f"SDNN Population (ms): {sdnn_population:.2f}")
print(f"SDNN Sample (ms): {sdnn_sample:.2f}")

# HRV Interpretation:
# SDNN < 50ms: Poor HRV (high stress/low recovery)
# SDNN 50-100ms: Fair HRV (moderate stress/recovery)  
# SDNN > 100ms: Good HRV (low stress/good recovery)
`.trim();
  }

  /**
   * Format analysis results for GPT consumption
   */
  static formatAnalysisForGPT(bpmData: BPMDataPoint[], metrics: HRVMetrics, codeSnippet: string): string {
    return `
**Smartwatch BPM Data Analysis Results:**

**Dataset Overview:**
- Total data points: ${bpmData.length}
- Time range: ${bpmData.length > 1 ? 'From ' + bpmData[0].timestamp + ' to ' + bpmData[bpmData.length-1].timestamp : 'Single measurement'}

**Heart Rate Variability (HRV) Metrics:**
- Mean Heart Rate: ${metrics.mean_hr} BPM
- Mean Inter-Beat Interval: ${metrics.mean_ibi} ms
- SDNN (Population): ${metrics.sdnn_population} ms
- SDNN (Sample): ${metrics.sdnn_sample} ms
${metrics.rmssd ? `- RMSSD: ${metrics.rmssd} ms` : ''}
${metrics.pnn50 ? `- pNN50: ${metrics.pnn50}%` : ''}

**Python Code Used for Analysis:**
\`\`\`python
${codeSnippet}
\`\`\`

Please provide a comprehensive interpretation of these HRV metrics, including:
1. What these values indicate about cardiovascular health and autonomic nervous system function
2. Stress and recovery insights based on the SDNN values
3. Recommendations for lifestyle improvements if needed
4. How these metrics compare to healthy ranges for the user's demographic
`.trim();
  }

  /**
   * Validate BPM data quality
   */
  static validateBPMData(bpmData: BPMDataPoint[]): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (bpmData.length < 5) {
      issues.push("Insufficient data points (minimum 5 required for reliable HRV analysis)");
    }
    
    const invalidValues = bpmData.filter(d => d.bpm < 30 || d.bpm > 220);
    if (invalidValues.length > 0) {
      issues.push(`${invalidValues.length} invalid BPM values detected (outside 30-220 range)`);
    }
    
    const meanBPM = bpmData.reduce((sum, d) => sum + d.bpm, 0) / bpmData.length;
    if (meanBPM < 40 || meanBPM > 180) {
      issues.push("Mean heart rate appears unusual - please verify data accuracy");
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  /**
   * Future extension point for additional analysis functions
   */
  static getAvailableFunctions(): string[] {
    return [
      'parseCSVData',
      'calculateHRVMetrics', 
      'generateCodeSnippet',
      'formatAnalysisForGPT',
      'validateBPMData'
    ];
  }
}

export default CodeInterpreterFunctions;