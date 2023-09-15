import { setFailed } from '@actions/core'
import { run } from './create-release'

if (require.main === module) {
  run().catch((error) => setFailed(error.message))
}
