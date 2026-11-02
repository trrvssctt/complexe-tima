// pm2 (utilisateur tima) : pm2 start deploy/ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "complexe-tima",
      cwd: __dirname + "/..",
      script: ".output/server/index.mjs",
      // Variables lues dans .env (DATABASE_URL, ADMIN_LOGIN_KEY, SESSION_SECRET)
      node_args: "--env-file=.env",
      // Écoute uniquement en local : nginx fait le proxy public (HTTPS)
      env: { NODE_ENV: "production", PORT: "3200", HOST: "127.0.0.1" },
      max_memory_restart: "600M",
      time: true,
    },
  ],
};
