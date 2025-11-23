const { execSync } = require('child_process');

const buildAgents = JSON.parse(process.env.DEPINUS_BUILD_AGENTS);
const platform = process.argv[2];
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const buildCmd = 'node scripts/build_release_package.js';

console.log(`Building release package on branch ${branch} for platform ${platform}...`);

const localPlatform = process.platform + '-' + process.arch;
if (platform === localPlatform) {
	console.log(`Build package locally for platform ${localPlatform} ...`);
	execSync(buildCmd, { stdio: 'inherit' });
} else {
	if (!buildAgents[platform]) {
		console.error(`\x1b[31mError: Platform '${platform}' is not defined in DEPINUS_BUILD_AGENTS.\x1b[0m`);
		process.exit(1);
	}
	const { user, path } = buildAgents[platform];
	const sshCmd = `ssh ${user} "cd ${path} && git fetch && git checkout ${branch} && git pull && ${buildCmd}"`;
	execSync(sshCmd, { stdio: 'inherit' });
}
