/**
 * Check Klaviyo metrics - run this from Docker container
 * Usage: docker-compose exec web node check-metrics.mjs
 */

import https from 'https'

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY

if (!KLAVIYO_API_KEY) {
  console.error('Error: KLAVIYO_API_KEY environment variable not set')
  process.exit(1)
}

function klaviyoRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'a.klaviyo.com',
      port: 443,
      path: `/api${endpoint}`,
      method: 'GET',
      headers: {
        Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        revision: '2024-10-15',
        Accept: 'application/json',
      },
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data))
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

async function main() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('CHECKING KLAVIYO METRICS')
    console.log('='.repeat(80) + '\n')

    // Get all metrics
    console.log('Fetching all metrics...')
    const metricsResponse = await klaviyoRequest(
      '/metrics?fields[metric]=name,created,updated'
    )
    const metrics = metricsResponse.data

    console.log(`✓ Found ${metrics.length} total metrics\n`)

    // Find target metrics
    const placedOrderMetric = metrics.find(
      (m) => m.attributes.name === 'Placed Order'
    )
    const deliveredMetric = metrics.find(
      (m) => m.attributes.name === 'Wonderment - Shipment Delivered'
    )

    console.log('='.repeat(80))
    console.log('TARGET METRICS')
    console.log('='.repeat(80) + '\n')

    if (placedOrderMetric) {
      console.log('✅ FOUND: "Placed Order"')
      console.log(`   ID: ${placedOrderMetric.id}`)
      console.log(`   Created: ${placedOrderMetric.attributes.created}`)
    } else {
      console.log('❌ NOT FOUND: "Placed Order"')
    }

    if (deliveredMetric) {
      console.log('\n✅ FOUND: "Wonderment - Shipment Delivered"')
      console.log(`   ID: ${deliveredMetric.id}`)
      console.log(`   Created: ${deliveredMetric.attributes.created}`)
    } else {
      console.log('\n❌ NOT FOUND: "Wonderment - Shipment Delivered"')
    }

    // Get sample events
    console.log('\n' + '='.repeat(80))
    console.log('SAMPLE EVENT DATA')
    console.log('='.repeat(80))

    if (placedOrderMetric) {
      console.log('\n--- PLACED ORDER EVENT ---\n')
      try {
        const orderEventsResponse = await klaviyoRequest(
          `/events?filter=equals(metric_id,"${placedOrderMetric.id}")&fields[event]=timestamp,datetime,event_properties&page[size]=1`
        )

        if (orderEventsResponse.data.length > 0) {
          const event = orderEventsResponse.data[0]
          const props = event.attributes.event_properties || {}

          console.log('Event ID:', event.id)
          console.log('Timestamp:', event.attributes.timestamp)
          console.log('Datetime:', event.attributes.datetime)
          console.log('\nEvent Properties:')
          console.log(JSON.stringify(props, null, 2))

          console.log('\n\nProperty Keys (' + Object.keys(props).length + ' total):')
          Object.keys(props)
            .sort()
            .forEach((key) => {
              const value = props[key]
              const type = Array.isArray(value)
                ? 'array'
                : value === null
                  ? 'null'
                  : typeof value
              const preview =
                type === 'string' && value.length > 50
                  ? value.substring(0, 50) + '...'
                  : type === 'array'
                    ? `[${value.length} items]`
                    : type === 'object'
                      ? '{...}'
                      : value
              console.log(`   • ${key}: ${preview} (${type})`)
            })
        } else {
          console.log('No events found for this metric')
        }
      } catch (error) {
        console.log('Error fetching events:', error.message)
      }
    }

    if (deliveredMetric) {
      console.log('\n\n--- WONDERMENT SHIPMENT DELIVERED EVENT ---\n')
      try {
        const deliveryEventsResponse = await klaviyoRequest(
          `/events?filter=equals(metric_id,"${deliveredMetric.id}")&fields[event]=timestamp,datetime,event_properties&page[size]=1`
        )

        if (deliveryEventsResponse.data.length > 0) {
          const event = deliveryEventsResponse.data[0]
          const props = event.attributes.event_properties || {}

          console.log('Event ID:', event.id)
          console.log('Timestamp:', event.attributes.timestamp)
          console.log('Datetime:', event.attributes.datetime)
          console.log('\nEvent Properties:')
          console.log(JSON.stringify(props, null, 2))

          console.log('\n\nProperty Keys (' + Object.keys(props).length + ' total):')
          Object.keys(props)
            .sort()
            .forEach((key) => {
              const value = props[key]
              const type = Array.isArray(value)
                ? 'array'
                : value === null
                  ? 'null'
                  : typeof value
              const preview =
                type === 'string' && value.length > 50
                  ? value.substring(0, 50) + '...'
                  : type === 'array'
                    ? `[${value.length} items]`
                    : type === 'object'
                      ? '{...}'
                      : value
              console.log(`   • ${key}: ${preview} (${type})`)
            })
        } else {
          console.log('No events found for this metric')
        }
      } catch (error) {
        console.log('Error fetching events:', error.message)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('SUMMARY FOR CODE')
    console.log('='.repeat(80) + '\n')

    if (placedOrderMetric) {
      console.log(`export const METRIC_IDS = {`)
      console.log(`  PLACED_ORDER: '${placedOrderMetric.id}',`)
      if (deliveredMetric) {
        console.log(`  SHIPMENT_DELIVERED: '${deliveredMetric.id}',`)
      }
      console.log(`} as const`)
    }

    console.log('\n' + '='.repeat(80) + '\n')
  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

main()

