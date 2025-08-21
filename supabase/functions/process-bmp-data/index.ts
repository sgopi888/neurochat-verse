import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, fileType } = await req.json();

    if (!content || !fileType) {
      return new Response(
        JSON.stringify({ error: 'Missing content or fileType' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Processing ${fileType} file with ${content.length} characters`);

    // Parse BMP data from CSV/Excel content
    const bmpData = parseBMPData(content, fileType);
    
    if (bmpData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid BMP data found in file' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Calculate HRV metrics
    const hrvMetrics = calculateHRVMetrics(bmpData);
    
    // Generate code snippet
    const codeSnippet = generateCodeSnippet(bmpData, hrvMetrics);
    
    // Format for GPT
    const processedData = formatAnalysisForGPT(bmpData, hrvMetrics, codeSnippet);

    console.log(`Processed ${bmpData.length} BMP data points, SDNN: ${hrvMetrics.sdnn_sample}ms`);

    return new Response(
      JSON.stringify({ processedData }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('BMP processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process BMP data' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// Parse BMP data from CSV content
function parseBMPData(content: string, fileType: string): Array<{timestamp: string | number, bmp: number}> {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  const bmpIndex = headers.findIndex(h => 
    h.includes('bmp') || h.includes('heart') || h.includes('hr') || h.includes('pulse') || h.includes('bpm')
  );
  const timeIndex = headers.findIndex(h => 
    h.includes('time') || h.includes('date') || h.includes('timestamp')
  );
  
  if (bmpIndex === -1) {
    console.log('Available headers:', headers);
    throw new Error('No BMP/heart rate column found. Please ensure your file has a column with "bmp", "bpm", "heart", or "hr" in the header.');
  }
  
  const dataPoints: Array<{timestamp: string | number, bmp: number}> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const bmp = parseFloat(values[bmpIndex]);
    
    if (!isNaN(bmp) && bmp > 30 && bmp < 220) { // Valid HR range
      dataPoints.push({
        timestamp: timeIndex >= 0 ? values[timeIndex] : i,
        bmp: bmp
      });
    }
  }
  
  return dataPoints;
}

// Calculate HRV metrics from BMP data
function calculateHRVMetrics(bmpData: Array<{timestamp: string | number, bmp: number}>): {
  sdnn_population: number;
  sdnn_sample: number;
  mean_hr: number;
  mean_ibi: number;
  rmssd?: number;
  pnn50?: number;
} {
  if (bmpData.length < 2) {
    throw new Error('Insufficient data points for HRV analysis (minimum 2 required)');
  }
  
  // Convert BMP to IBI (Inter-Beat Interval) in milliseconds
  const ibiData = bmpData.map(point => ({
    ...point,
    ibi: 60000 / point.bmp // Convert BMP to milliseconds
  }));
  
  const ibiValues = ibiData.map(d => d.ibi);
  const bmpValues = bmpData.map(d => d.bmp);
  
  // Calculate mean values
  const meanBMP = bmpValues.reduce((sum, bmp) => sum + bmp, 0) / bmpValues.length;
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
    mean_hr: Math.round(meanBMP * 100) / 100,
    mean_ibi: Math.round(meanIBI * 100) / 100,
    rmssd: rmssd ? Math.round(rmssd * 100) / 100 : undefined,
    pnn50: pnn50 ? Math.round(pnn50 * 100) / 100 : undefined
  };
}

// Generate Python-like code snippet for the analysis
function generateCodeSnippet(bmpData: Array<{timestamp: string | number, bmp: number}>, metrics: any): string {
  const bmpArray = bmpData.slice(0, 10).map(d => d.bmp); // Show first 10 values
  const hasMoreData = bmpData.length > 10;
  
  return `
import numpy as np
import pandas as pd

# Heart rate data from smartwatch (BMP)
hr_bmp = ${JSON.stringify(bmpArray)}${hasMoreData ? ' # ... +' + (bmpData.length - 10) + ' more values' : ''}

# Convert HR (BMP) to IBI (Inter-Beat Interval in milliseconds)  
ibi = [60000.0/x for x in hr_bmp]

# Calculate HRV metrics
mean_hr = np.mean(hr_bmp)
mean_ibi = np.mean(ibi)

# SDNN - Standard Deviation of NN intervals
sdnn_population = np.std(ibi)          # Population standard deviation
sdnn_sample = np.std(ibi, ddof=1)      # Sample standard deviation (Bessel's correction)

# Results
print(f"Heart Rate Analysis Results:")
print(f"Mean HR (BMP): {mean_hr:.2f}")
print(f"Mean IBI (ms): {mean_ibi:.2f}")
print(f"SDNN Population (ms): {sdnn_population:.2f}")
print(f"SDNN Sample (ms): {sdnn_sample:.2f}")

# HRV Interpretation:
# SDNN < 50ms: Poor HRV (high stress/low recovery)
# SDNN 50-100ms: Fair HRV (moderate stress/recovery)  
# SDNN > 100ms: Good HRV (low stress/good recovery)
`.trim();
}

// Format analysis results for GPT consumption
function formatAnalysisForGPT(
  bmpData: Array<{timestamp: string | number, bmp: number}>, 
  metrics: any, 
  codeSnippet: string
): string {
  return `
**Smartwatch BMP Data Analysis Results:**

**Dataset Overview:**
- Total data points: ${bmpData.length}
- Time range: ${bmpData.length > 1 ? 'From ' + bmpData[0].timestamp + ' to ' + bmpData[bmpData.length-1].timestamp : 'Single measurement'}

**Heart Rate Variability (HRV) Metrics:**
- Mean Heart Rate: ${metrics.mean_hr} BMP
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

Note: If no specific code was provided for this analysis, please use your reasoning and knowledge to provide accurate calculations and interpretations based on standard HRV analysis methods.
`.trim();
}