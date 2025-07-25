const axios = require('axios')

const getOsInfo = () => {
  // Get the platform (operating system) information
  const platform = os.platform()

  // Get the shell information
  const shell = process.env.SHELL

  // Determine the user's operating system
  let osName
  switch (platform) {
    case 'win32':
      osName = 'Windows'
      break
    case 'darwin':
      osName = 'macOS'
      break
    case 'linux':
      osName = 'Linux'
      break
    default:
      osName = 'Unknown'
  }

  return {
    osName,
    shell,
  }
}

const fetchCommandFromAPI = async (query, apiKey, model) => {
  const { osName, shell } = getOsInfo()

  // Define the JSON schema for structured outputs
  const schema = {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The command to run. Use brackets [] for placeholders (missing parameters).',
      },
      explanation: {
        type: 'string',
        description: 'An explanation of the command',
      },
      executable: {
        type: 'boolean',
        description:
          'true/false if the command is directly executable (i.e. user does not need to fill in parameters)',
      },
    },
    required: ['command', 'explanation', 'executable'],
    additionalProperties: false,
  }

  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    {
      model: model,
      input: [
        {
          role: 'system',
          content: `You are a helpful assistant that generates shell commands for ${osName} using ${shell}. Generate appropriate commands based on user requests.`,
        },
        {
          role: 'user',
          content: `Generate a command for ${osName} on ${shell}: ${query}`,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'bash_command',
          schema: schema,
          strict: true,
        },
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
  )

  return response.data
}
