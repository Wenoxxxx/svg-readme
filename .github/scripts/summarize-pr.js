// @ts-check
'use strict';

/** @param {{ github: import('@octokit/rest').Octokit, context: import('@actions/github').context, core: import('@actions/core') }} */
module.exports = async ({ github, context, core }) => {
  const pr     = context.payload.pull_request;
  const prNum  = pr.number;
  const MARKER = '<!-- pr-summary-bot -->';
  const owner  = context.repo.owner;
  const repo   = context.repo.repo;

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner, repo, pull_number: prNum, per_page: 100,
  });

  const totals = files.reduce((acc, f) => ({
    additions: acc.additions + f.additions,
    deletions: acc.deletions + f.deletions,
  }), { additions: 0, deletions: 0 });

  /** @type {Record<string, typeof files>} */
  const grouped = {};
  for (const f of files) {
    const parts = f.filename.split('/');
    const group = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)';
    (grouped[group] ??= []).push(f);
  }

  const fileSections = Object.entries(grouped)
    .map(([group, groupFiles]) => {
      const lines = groupFiles
        .map(f => `  - \`${f.filename}\` (+${f.additions}/-${f.deletions})`)
        .join('\n');
      return `**${group}**\n${lines}`;
    })
    .join('\n\n');

  const comments = await github.paginate(github.rest.issues.listComments, {
    owner, repo, issue_number: prNum, per_page: 100,
  });
  const existing = comments.find(c => (c.body ?? '').includes(MARKER));

  const commentBody = [
    MARKER,
    '📋 **PR Summary**',
    '',
    `${files.length} file(s) changed · +${totals.additions}/-${totals.deletions}`,
    '',
    fileSections,
    '',
    '---',
    '_Updated automatically on each push to this PR._',
  ].join('\n');

  if (existing) {
    await github.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body: commentBody });
  } else {
    await github.rest.issues.createComment({ owner, repo, issue_number: prNum, body: commentBody });
  }

  core.info(`Posted summary: ${files.length} files, +${totals.additions}/-${totals.deletions}`);
};