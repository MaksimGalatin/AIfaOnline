import { spawn } from "child_process";
import localtunnel from "localtunnel";

(async () => {
  console.log("Starting localtunnel on port 8080...");
  const tunnel = await localtunnel({ port: 8080 });
  console.log("Tunnel URL:", tunnel.url);

  console.log("Updating Vercel Proxy env with new Tunnel URL...");
  const update = spawn("vercel", ["env", "add", "TUNNEL_URL", "production", "--value", tunnel.url, "--token=YOUR_VERCEL_TOKEN", "--scope", "maksimgalatins-projects"], { cwd: "./proxy", stdio: "inherit", shell: true });
  
  update.on("close", (code) => {
    console.log("Redeploying Vercel Proxy...");
    const deploy = spawn("vercel", ["deploy", "--prod", "--token=YOUR_VERCEL_TOKEN", "--yes", "--scope", "maksimgalatins-projects"], { cwd: "./proxy", stdio: "inherit", shell: true });
    
    deploy.on("close", (code2) => {
      console.log("Starting API Server in Webhook Mode...");
      const server = spawn("node", ["--env-file=.env", "api/dist/server.js"], {
        stdio: "inherit",
        env: {
          ...process.env,
          WEBHOOK_URL: tunnel.url
        }
      });
      console.log("TRAFFIC INTERCEPTED VIA VERCEL! Go to Telegram and click the Web App button!");
    });
  });
})();
