module.exports = {
  apps: [
  {
    name: "api",
    script: "index.js",
    args: "--name api",
    cwd: "./api", // dir from which app is launched
    out_file: "/dev/null", // disable logs saving
  },
  {
    name: "app",
    script: "index.js",
    args: "--name api",
    cwd: "./build", // dir from which app is launched
    out_file: "/dev/null", // disable logs saving
  }]
}


