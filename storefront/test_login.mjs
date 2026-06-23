import Medusa from '@medusajs/js-sdk'

const sdk = new Medusa({
  baseUrl: 'http://localhost:9000',
  debug: true,
  publishableKey: 'pk_c38dec070ec8bfe8d140955ca0e41eeea149f1fc8bf44b2faf48b09c88bf3b93',
})

try {
  // Step 1: Login
  console.log('=== Step 1: auth.login ===')
  const token = await sdk.auth.login('customer', 'emailpass', {
    email: 'a@grochat.local',
    password: 'aaaaaa',
  })
  console.log('token:', typeof token, token.substring(0, 30) + '...')

  // Step 2: Retrieve customer using SDK's internal auth
  console.log('\n=== Step 2: sdk.store.customer.retrieve() ===')
  const { customer } = await sdk.store.customer.retrieve()
  console.log('customer:', JSON.stringify(customer, null, 2))

} catch (e) {
  console.error('ERROR:', e.message || e)
}
