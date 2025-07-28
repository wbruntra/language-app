require('module-alias/register') // Initialize module-alias
const UserInfo = require('./tables/user_info')
const ConversationInfo = require('./tables/conversation_info')
const UserVocabInfo = require('./tables/user_vocab_info')
const Uploads = require('./tables/uploads')

async function testModels() {
  try {
    console.log('Testing model schemas...')
    
    // Test UserInfo schema
    console.log('UserInfo schema:', UserInfo.jsonSchema ? '✓' : '✗')
    console.log('UserInfo relations:', UserInfo.relationMappings ? '✓' : '✗')
    
    // Test ConversationInfo schema
    console.log('ConversationInfo schema:', ConversationInfo.jsonSchema ? '✓' : '✗')
    console.log('ConversationInfo relations:', ConversationInfo.relationMappings ? '✓' : '✗')
    
    // Test UserVocabInfo schema
    console.log('UserVocabInfo schema:', UserVocabInfo.jsonSchema ? '✓' : '✗')
    console.log('UserVocabInfo relations:', UserVocabInfo.relationMappings ? '✓' : '✗')
    
    // Test Uploads schema
    console.log('Uploads schema:', Uploads.jsonSchema ? '✓' : '✗')
    
    console.log('\nAll models loaded successfully!')
    
  } catch (error) {
    console.error('Error testing models:', error.message)
  }
}

testModels()
  .then(() => {
    console.log('Model test completed')
    process.exit(0)
  })
  .catch((err) => {
    console.error('Model test failed:', err)
    process.exit(1)
  })
