import { readFile } from 'node:fs/promises'
import { getBooleanInput, getInput, setFailed, setOutput } from '@actions/core'
import * as github from '@actions/github'

export async function run() {
  // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
  const octokit = github.getOctokit(process.env.GITHUB_TOKEN!)

  // Get owner and repo from context of payload that triggered the action
  const { owner: currentOwner, repo: currentRepo } = github.context.repo

  // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
  // This removes the 'refs/tags' portion of the string, i.e. from 'refs/tags/v1.10.15' to 'v1.10.15'
  const tagName = getInput('tag_name', { required: true }).replace('refs/tags/', '')
  const releaseName = getInput('release_name', { required: false }).replace('refs/tags/', '')
  const draft = getBooleanInput('draft', { required: false })
  const commitish = getInput('commitish', { required: false }) || github.context.sha
  const owner = getInput('owner', { required: false }) || currentOwner
  const repo = getInput('repo', { required: false }) || currentRepo

  // If the user provides a value for prerelease, use it. Otherwise, default to true if the tag contains a hyphen
  const prereleaseValue = getInput('prerelease', { required: false })
  const prerelease =
    prereleaseValue === 'true'
      ? true
      : prereleaseValue === 'false'
      ? false
      : /\d-[a-z]/.test(tagName)

  const body = getInput('body', { required: false })
  const bodyPath = getInput('body_path', { required: false })
  let bodyFileContent: string | null = null
  if (bodyPath !== '' && !!bodyPath) {
    try {
      bodyFileContent = await readFile(bodyPath, { encoding: 'utf8' })
    } catch (error) {
      setFailed(error.message)
    }
  }

  // Create a release
  // API Documentation: https://developer.github.com/v3/repos/releases/#create-a-release
  // Octokit Documentation: https://octokit.github.io/rest.js/v19#repos-create-release
  type OctokitCreateRelease = Parameters<typeof octokit.rest.repos.createRelease>[0]
  const releaseOptions: OctokitCreateRelease = {
    owner,
    repo,
    tag_name: tagName,
    name: releaseName || tagName,
    body: bodyFileContent || body,
    draft,
    prerelease,
    target_commitish: commitish
  }
  console.info('create release:', releaseOptions)
  const createReleaseResponse = await octokit.rest.repos.createRelease(releaseOptions)

  // Get the ID, html_url, and upload URL for the created Release from the response
  const { data: response } = createReleaseResponse

  // Set the output variables for use by other actions: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
  setOutput('id', response.id)
  setOutput('html_url', response.html_url)
  setOutput('upload_url', response.upload_url)
}
