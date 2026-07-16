const axios = require('axios');

const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  },
});

// Fetch the raw unified diff for a PR
const fetchPRDiff = async (owner, repo, pullNumber) => {
  const response = await githubApi.get(`/repos/${owner}/${repo}/pulls/${pullNumber}`, {
    headers: { Accept: 'application/vnd.github.v3.diff' },
  });
  return response.data;
};

// Post a general comment on the PR (not line-specific)
const postPRComment = async (owner, repo, pullNumber, body) => {
  const response = await githubApi.post(
    `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    { body }
  );
  return response.data;
};

module.exports = { fetchPRDiff, postPRComment };