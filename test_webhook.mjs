import { spawn } from "child_process";
import localtunnel from "localtunnel";
import fs from "fs";

(async () => {
  console.log("Starting localtunnel on port 8080...");
  const tunnel = await localtunnel({ port: 8080 });
  console.log("Tunnel URL:", tunnel.url);
  console.log("Mini App URL:", tunnel.url + "/miniapp/");

  tunnel.on("close", () => {
    console.log("Tunnel closed.");
  });

  console.log("Building API...");
  const build = spawn("npm", ["run", "build", "-w", "api"], { stdio: "inherit", shell: true });
  build.on("close", (code) => {
    if (code !== 0) {
      console.error("Build failed.");
      process.exit(1);
    }
    
    console.log("Starting API Server in Webhook Mode...");
    const server = spawn("node", ["--env-file=.env", "api/dist/server.js"], {
      stdio: "inherit",
      env: {
        ...process.env,
        WEBHOOK_URL: tunnel.url,
        MINI_APP_URL: tunnel.url + "/miniapp/"
      }
    });

    console.log("TRAFFIC INTERCEPTED! Go to Telegram and click the Web App button!");
    
    server.on("close", () => {
      tunnel.close();
    });
  });
})();
