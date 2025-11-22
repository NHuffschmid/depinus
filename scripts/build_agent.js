const hosts = JSON.parse(process.env.DEPINUS_BUILD_AGENTS);
const target = process.argv[2]; // e.g. 'linux-x64'
const branch = process.argv[3];
const { user, host, path } = hosts[target];
const sshCmd = `ssh ${user}@${host} 'cd ${path} && git fetch && git checkout ${branch} && git pull && node scripts/build_release_package.js'`;

const consoleRedColor = '\x1b[31m';
const consoleResetColor = '\x1b[0m';

try {
	require('child_process').execSync(sshCmd, { stdio: 'inherit' });
} catch (error) {
	console.error(consoleRedColor + 'Error: Command failed:' + consoleResetColor);
	console.error(error.message);
	if (error.stdout) {
		console.error(consoleRedColor + 'Remote stdout:' + consoleResetColor);
		console.error(error.stdout.toString());
	}
	if (error.stderr) {
		console.error(consoleRedColor + 'Remote stderr:' + consoleResetColor);
		console.error(error.stderr.toString());
	}
	process.exit(1);
}