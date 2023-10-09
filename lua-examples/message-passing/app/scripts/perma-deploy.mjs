import { execSync } from "child_process";

function deployFiles(folder) {
  execSync(
    `npx bundlr upload-dir ${folder} -w ${process.env.PATH_TO_WALLET} --index-file index.html -c arweave -h https://node2.bundlr.network --no-confirmation`,
    { encoding: "utf8", stdio: "inherit" }
  );
}

if (!process.env.PATH_TO_WALLET) {
  console.log("Set process.env.PATH_TO_WALLET to the path to your key file.");
  process.exit(1);
}
const folder = process.argv[2];
if (!folder) {
  console.log(
    "You must pass a path to this script. eg. node ./perma-deploy.mjs ./path/to/dist"
  );
  process.exit(1);
}

deployFiles(folder);
