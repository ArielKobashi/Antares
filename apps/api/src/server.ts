import { createApp } from "./app.js";
import { env } from "./support/env.js";

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`ANTARES API listening on http://localhost:${env.API_PORT}`);
});

