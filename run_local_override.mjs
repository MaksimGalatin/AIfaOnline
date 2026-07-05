import { spawn } from "child_process";
import localtunnel from "localtunnel";
import fs from "fs";

(async () => {
  console.log("Starting localtunnel on port 8080...");
  const tunnel = await localtunnel({ port: 8080 });
  console.log("Tunnel URL:", tunnel.url);
  console.log("Mini App URL:", tunnel.url + "/miniapp/");

  console.log("Building bot and API...");
  const build1 = spawn("npm", ["-w", "bot", "run", "build"], { stdio: "inherit", shell: true });
  build1.on("close", (code1) => {
    const build2 = spawn("npm", ["-w", "api", "run", "build"], { stdio: "inherit", shell: true });
    build2.on("close", (code2) => {
      
      console.log("Starting API Server in Webhook Mode...");
      const server = spawn("node", ["--env-file=.env", "api/dist/server.js"], {
        stdio: "inherit",
        env: {
          ...process.env,
          WEBHOOK_URL: tunnel.url
        }
      });

      // Hammer webhook to override Cloud Run
      setInterval(() => {
        fetch('https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN + '/setWebhook?url=' + tunnel.url + '/webhook/telegram')
          .then(r => r.json())
          .then(d => { if (!d.ok) console.log("Webhook set failed:", d); })
          .catch(() => {});
      }, 3000);

      console.log("TRAFFIC INTERCEPTED! Go to Telegram and click the Web App button!");
    });
  });
})();
