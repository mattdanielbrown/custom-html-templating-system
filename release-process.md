# Release Process

The npm package is published by `.github/workflows/publish-npm-package.yml` when a
non-prerelease GitHub Release is published. The GitHub Release tag must exactly
match `v` followed by the version in `package.json`.

## One-Time Configuration

1. Confirm that the npm account or organization controls the `@mattdanielbrown`
   scope.
2. In the GitHub repository, create an environment named `npm` and add any
   desired deployment reviewers.
3. For the first publication, create a granular npm access token that can publish
   `@mattdanielbrown/html-template-engine`, enable bypass 2FA for automation, and
   save it in the `npm` environment as `NPM_TOKEN`.
4. After the package exists on npm, configure its trusted publisher:
   - provider: GitHub Actions
   - organization or user: `mattdanielbrown`
   - repository: `custom-html-templating-system`
   - workflow filename: `publish-npm-package.yml`
   - environment: `npm`
   - allowed action: `npm publish`
5. Remove the `NPM_TOKEN` secret after trusted publishing succeeds. The npm CLI
   will then authenticate only through GitHub's short-lived OIDC identity.

The workflow uses a GitHub-hosted runner, Node.js 22.14.0, npm 11.5.1, and
`id-token: write`, so both the initial token-authenticated publish and subsequent
trusted publishes generate npm provenance.

## Release Checklist

1. Update `package.json` and `package-lock.json` to the same version.
2. Update `CHANGELOG.md` and replace `Unreleased` with the release date.
3. Merge the reviewed release commit to the repository's default branch.
4. Create and publish a non-prerelease GitHub Release whose tag is exactly the
   package version prefixed with `v`, such as `v2.2.0`.
5. Approve the `npm` environment deployment if reviewers are configured.

Do not rerun a successful release job for a version already present on npm. npm
does not permit publishing the same package name and version more than once.
