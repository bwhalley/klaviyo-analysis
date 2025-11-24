#!/usr/bin/env node

/**
 * Script to check Klaviyo metrics and preview event data
 * Run from Docker container with access to Klaviyo API key
 */

const https = require('https');

// Get API key from environment or command line
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY || process.argv[2];

if (!KLAVIYO_API_KEY) {
  console.error('Error: KLAVIYO_API_KEY not provided');
  console.error('Usage: node check-klaviyo-metrics.js <api-key>');
  console.error('   or: KLAVIYO_API_KEY=xyz node check-klaviyo-metrics.js');
  process.exit(1);
}

/**
 * Make request to Klaviyo API
 */
function klaviyoRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'a.klaviyo.com',
      port: 443,
      path: `/api${endpoint}`,
      method: 'GET',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        'revision': '2024-10-15',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('Fetching metrics from Klaviyo...\n');
    
    // Get all metrics
    const metricsResponse = await klaviyoRequest('/metrics?fields[metric]=name,created,updated');
    const metrics = metricsResponse.data;
    
    console.log(`Found ${metrics.length} total metrics\n`);
    
    // Find our target metrics
    const placedOrderMetric = metrics.find(m => m.attributes.name === 'Placed Order');
    const deliveredMetric = metrics.find(m => m.attributes.name === 'Wonderment - Shipment Delivered');
    
    console.log('='.repeat(80));
    console.log('TARGET METRICS');
    console.log('='.repeat(80));
    
    if (placedOrderMetric) {
      console.log('\n✅ Found "Placed Order" metric:');
      console.log(`   ID: ${placedOrderMetric.id}`);
      console.log(`   Name: ${placedOrderMetric.attributes.name}`);
      console.log(`   Created: ${placedOrderMetric.attributes.created}`);
    } else {
      console.log('\n❌ "Placed Order" metric not found');
    }
    
    if (deliveredMetric) {
      console.log('\n✅ Found "Wonderment - Shipment Delivered" metric:');
      console.log(`   ID: ${deliveredMetric.id}`);
      console.log(`   Name: ${deliveredMetric.attributes.name}`);
      console.log(`   Created: ${deliveredMetric.attributes.created}`);
    } else {
      console.log('\n❌ "Wonderment - Shipment Delivered" metric not found');
    }
    
    // Get sample events for each metric
    console.log('\n' + '='.repeat(80));
    console.log('SAMPLE EVENT DATA');
    console.log('='.repeat(80));
    
    if (placedOrderMetric) {
      console.log('\n--- PLACED ORDER EVENT SAMPLE ---\n');
      const orderEvents = await klaviyoRequest(
        `/events?filter=equals(metric_id,"${placedOrderMetric.id}")&fields[event]=timestamp,datetime,event_properties&page[size]=3`
      );
      
      if (orderEvents.data.length > 0) {
        const sampleEvent = orderEvents.data[0];
        console.log('Event Structure:');
        console.log(JSON.stringify(sampleEvent, null, 2));
        
        console.log('\n\nAvailable Event Properties:');
        if (sampleEvent.attributes.event_properties) {
          const props = Object.keys(sampleEvent.attributes.event_properties);
          props.forEach(prop => {
            const value = sampleEvent.attributes.event_properties[prop];
            const type = Array.isArray(value) ? 'array' : typeof value;
            console.log(`   - ${prop} (${type})`);
          });
        }
      } else {
        console.log('No events found');
      }
    }
    
    if (deliveredMetric) {
      console.log('\n\n--- WONDERMENT SHIPMENT DELIVERED EVENT SAMPLE ---\n');
      const deliveryEvents = await klaviyoRequest(
        `/events?filter=equals(metric_id,"${deliveredMetric.id}")&fields[event]=timestamp,datetime,event_properties&page[size]=3`
      );
      
      if (deliveryEvents.data.length > 0) {
        const sampleEvent = deliveryEvents.data[0];
        console.log('Event Structure:');
        console.log(JSON.stringify(sampleEvent, null, 2));
        
        console.log('\n\nAvailable Event Properties:');
        if (sampleEvent.attributes.event_properties) {
          const props = Object.keys(sampleEvent.attributes.event_properties);
          props.forEach(prop => {
            const value = sampleEvent.attributes.event_properties[prop];
            const type = Array.isArray(value) ? 'array' : typeof value;
            console.log(`   - ${prop} (${type})`);
          });
        }
      } else {
        console.log('No events found');
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('SUMMARY');
    console.log('='.repeat(80));
    console.log('\nMetric IDs to use in code:');
    if (placedOrderMetric) {
      console.log(`  PLACED_ORDER: '${placedOrderMetric.id}'`);
    }
    if (deliveredMetric) {
      console.log(`  SHIPMENT_DELIVERED: '${deliveredMetric.id}'`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

