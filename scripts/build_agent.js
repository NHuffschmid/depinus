// This script builds a release package for the Depinus project.
// It determines the current git branch and target platform.
// If the target platform matches the local system, the build runs locally.
// Otherwise, it runs the build remotely via SSH using configuration from
//            the DEPINUS_BUILD_AGENTS environment variable.

const { execSync } = require('child_process');

let buildAgents;
try {
	if (!process.env.DEPINUS_BUILD_AGENTS) {
		console.error("Error: DEPINUS_BUILD_AGENTS environment variable is not set.");
		process.exit(1);
	}
	buildAgents = JSON.parse(process.env.DEPINUS_BUILD_AGENTS);
} catch (err) {
	console.error("Error: Failed to parse DEPINUS_BUILD_AGENTS environment variable as JSON.");
	console.error(err.message);
	process.exit(1);
}

const platform = process.argv[2];
const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const buildCmd = 'node scripts/build_release_package.js';

console.log('depinus.conf and CHANGELOG.md have been updated?');
console.log('Press ENTER to continue...');
process.stdin.setEncoding('utf8');
process.stdin.once('data', () => {

	console.log(`Building release package on branch ${branch} for platform ${platform}...`);

	const localPlatform = process.platform + '-' + process.arch;
	if (platform === localPlatform) {
		console.log(`Build package locally for platform ${localPlatform} ...`);
		execSync(buildCmd, { stdio: 'inherit' });
	} else {
		if (!buildAgents[platform]) {
			console.error(`Error: Platform '${platform}' is not defined in DEPINUS_BUILD_AGENTS.`);
			process.exit(1);
		}
		const { user, path } = buildAgents[platform];
		const sshCmd = `ssh ${user} "bash -l -c 'cd ${path} && git fetch && git checkout ${branch} && git pull && git submodule update && ${buildCmd}'"`;
		execSync(sshCmd, { stdio: 'inherit' });
	}

	process.stdin.pause(); // needed for clean exit
});
