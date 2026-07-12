import { app } from './app';
import { env } from './config/env';
import { startScheduler } from './services/scheduler';

app.listen(env.port, () => {
  console.log(`Server started on port ${env.port}`);
  startScheduler();
});
