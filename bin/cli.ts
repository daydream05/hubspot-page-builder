import { runCli } from "../src/cli.js";

const exitCode = await runCli(process.argv.slice(2), {
  stdout: (value) => {
    process.stdout.write(value);
  },
  stderr: (value) => {
    process.stderr.write(value);
  },
});

process.exit(exitCode);
