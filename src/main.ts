import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';
import { jwtInterceptor } from './app/interceptors/jwt.interceptor';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),
    provideHttpClient(
      withFetch(),
      withInterceptors([jwtInterceptor]) // ← AQUÍ REGISTRAS EL INTERCEPTOR
    ),
  ],
}).catch((err) => console.error(err));
