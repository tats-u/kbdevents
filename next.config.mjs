const prefixPath = ((repoName) => {
  // Not GitHub Actions
  if (!repoName) return undefined;
  console.log(`Repository name: ${repoName}`);
  return repoName.replace(/^[^\/]+/, "");
})(process.env.GITHUB_REPOSITORY);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  assetPrefix: prefixPath,
  basePath: prefixPath,
};

export default nextConfig;
