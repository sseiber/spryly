# Sprightly 
Make Hapi with Typescript a little less painful. This is derived from the original "Chipper" library
written by @pprice.

 - Manifest driven server composition 
 - Hapi plugins as ES6 classes 
 - Service composition and injection via decorators 
 - HTTP routing via decorators
 - Websocket support

## Depends on Hapi >= 17.x

## Example index.ts
```
    import { manifest } from './manifest';
    import { compose, ComposeOptions } from 'sprightly';

    const composeOptions: ComposeOptions = {
        relativeTo: __dirname,
        logger: (t, m) => {
            const tags = ((t && Array.isArray(t)) ? `[opt,${t.join(',')}]` : '[opt]');

            // tslint:disable-next-line:no-console
            console.log(`[${new Date().toTimeString()}] ${tags} ${m}`);
        }
    };

    async function start() {
        const config = {
            customManifestOptions: somevalue
        };

        try {
            const server = await compose(manifest(config), composeOptions);

            server.log(['startup', 'info'], `🚀 Starting HAPI server instance...`);

            await server.start();

            server.log(['startup', 'info'], `✅ Server started`);
        }
        catch (error) {
            // tslint:disable-next-line:no-console
            console.log(`['startup', 'error'], 👹 Error starting server: ${error.message}`);
        }
    }

    start();
```
## Examples
### API (Route) Example
```
    import { inject, RoutePlugin, route } from 'sprightly';
    import { Request, ResponseToolkit } from 'hapi';
    import { AuthService } from '../services/auth';
    import * as Boom from 'boom';

    export class AuthRoutes extends RoutePlugin {
        @inject('auth')
        private auth: AuthService;

        @route({
            method: ['POST', 'GET'],
            path: '/api/v1/auth/generate',
            options: {
                auth: {
                    strategies: ['sample-jwt'],
                    scope: ['admin']
                },
                tags: ['auth'],
                description: 'Generate tokens'
            }
        })
        public async generate(request: Request, h: ResponseToolkit) {
            const payload: any = request.payload;

            if (!payload.scope) {
                throw Boom.badRequest('Missing scope field in payload');
            }

            const tokenInfo = await this.auth.generateToken(payload.scope);

            return h.response(tokenInfo).code(201);
        }
    }
```
### Plugin Example
```
import { HapiPlugin, inject } from 'sprightly';
import { Server } from 'hapi';
import { LoggingService } from '../services/logging';
import { AuthService } from '../services/auth';
import * as HapiAuthJwt from 'hapi-auth-jwt2';

export class AuthPlugin implements HapiPlugin {
    @inject('logger')
    private logger: LoggingService;

    @inject('auth')
    private auth: AuthService;

    public async register(server: Server) {
        try {
            await server.register([HapiAuthJwt]);

            server.auth.strategy(
                'sample-jwt',
                'jwt',
                {
                    key: this.auth.secret,
                    validate: this.auth.validateRequest.bind(this.auth),
                    verifyOptions: { issuer: this.auth.issuer }
                });
        }
        catch (error) {
            this.logger.log(['AuthPlugin', 'error'], 'Failed to register auth strategies');
        }
    }
}
```
### Service Example
```
import { service, inject } from 'sprightly';
import { Request, ResponseToolkit } from 'hapi';
import { LoggingService } from './logging';
import { randomBytes as cryptoRandomBytes } from 'crypto';
import { sign as jwtSign } from 'jsonwebtoken';
import { v4 as uuidV4 } from 'uuid';

const SECRET_LENGTH = 64;

@service('auth')
export class AuthService {
    @inject('logger')
    private logger: LoggingService;

    private secretInternal;
    private issuerInternal;

    public get secret() {
        return this.secretInternal;
    }

    public get issuer() {
        return this.issuerInternal;
    }

    public async init() {
        this.logger.log(['AuthService', 'info'], 'initialize');
    }

    public async generateToken(scope) {
        const id = uuidV4();
        const arrayOfScope = Array.isArray(scope) ? scope : [scope];
        const payload = { scope: arrayOfScope, id };

        const options = {
            issuer: this.issuerInternal
        };

        const token = await jwtSign(payload, this.secretInternal, options);

        return { token, id };
    }

    // @ts-ignore (request, h)
    public async validateRequest(decoded, request: Request, h: ResponseToolkit) {
        // TODO: validate incoming request

        // Ensure there are ids and scopes
        if (!decoded.id || !decoded.scope || !Array.isArray(decoded.scope)) {
            return {
                isValid: false
            };
        }

        // Build the "profile", we really just need to copy the scopes over so hapi can later validate these
        return {
            isValid: true,
            credentials: { scope: decoded.scope }
        };
    }
}
```
### Logger options
In order to log before the Hapi server is completely composed (e.g. with `Good` and `Good-Console`) we declare a `ComposeOptions` to use during the server compose step to keep custom info. One of those things was a logger callback (although it really just provides stdout to the console until the real logger is setup).
```
    logger: (t, m) => {
        const tags = ((t && Array.isArray(t)) ? `[opt,${t.join(',')}]` : '[opt]');

        // tslint:disable-next-line:no-console
        console.log(`[${new Date().toTimeString()}] ${tags} ${m}`);
    }
```
It also requires your logging service implementation to look something like this:
```
    import { service, inject } from 'sprightly';
    import { Server } from 'hapi';

    @service('logger')
    export class LoggingService {
        @inject('$server')
        private server: Server;

        public async init(): Promise<void> {
            // tslint:disable-next-line:no-console
            console.log(`[${new Date().toTimeString()}] [LoggingService, info] initialize`);
        }

        // This will use the real composed logger specified in your manifest, or the temporary logger
        // setup through compose options. The compose step will set the compositionDone flag on the server.
        public log(tags: any, message: any) {
            const tagsMessage = (tags && Array.isArray(tags)) ? `[${tags.join(', ')}]` : '[]';

            if (!(this.server.settings.app as any).compositionDone) {
                // tslint:disable-next-line:no-console
                console.log(`[${new Date().toTimeString()}] [${tagsMessage}] ${message}`);
            }
            else {
                this.server.log(tagsMessage, message);
            }
        }
    }
```
