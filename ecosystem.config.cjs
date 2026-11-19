module.exports = {
  apps: [
  {
    name: "api",
    script: "api/index.js",
    cwd: __dirname,
    out_file: "/dev/null", // disable logs saving
  },
  {
    name: "app",
    script: "build/index.js",
    node_args: "--env-file-if-exists=.env",
    cwd: __dirname,
    out_file: "/dev/null", // disable logs saving
  }]
}


