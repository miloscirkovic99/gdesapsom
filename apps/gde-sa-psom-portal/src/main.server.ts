import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Entry point of the build-time prerenderer (`outputMode: "static"`): it never
 * runs in production, only while `nx build` writes the HTML of the routes
 * that app.routes.server.ts marks as RenderMode.Prerender.
 */
const bootstrap = (context: BootstrapContext) => bootstrapApplication(AppComponent, config, context);

export default bootstrap;
