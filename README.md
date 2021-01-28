# Spryly 
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
    // The manifest is an object that specifies the server port and the order
    // of service and plugin composition. It has the following form:
    // {
    //     server: {
    //         port: PORT,
    //         app: {
    //             // server.settings.app settings go here...
    //         } as any
    //     },
    //     services: [ // compose all the services
    //         './services'
    //     ],
    //     plugins: [ // compose all the plugins
    //         ...[
    //             {
    //                 plugin: '@hapi/inert'
    //             }
    //         ],
    //         ...[
    //             {
    //                 plugin: './plugins'
    //             }
    //         ],
    //         ...[
    //             {
    //                 plugin: './apis'
    //             }
    //         ]
    //     ]
    // }

    import { manifest } from './manifest'; // import something like above
    import { compose, ComposeOptions } from 'spryly';

    const composeOptions: ComposeOptions = {
        relativeTo: __dirname,
        logCompose: true // auto-import hapi-pino logger
    };

    async function start() {
        try {
            const server = await compose(manifest, composeOptions);

            server.log(['startup', 'info'], `🚀 Starting HAPI server instance...`);

            await server.start();

            server.log(['startup', 'info'], `✅ Server started`);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.log(`['startup', 'error'], 👹 Error starting server: ${error.message}`);
        }
    }

    start();
```
## Examples
### API (Route) Example
```
    import { inject, RoutePlugin, route } from 'spryly';
    import { Server } from '@hapi/hapi';
    import { Request, ResponseToolkit } from '@hapi/hapi';
    import { AuthService } from '../services/auth';
    import * as Boom from 'boom';

    export class AuthRoutes extends RoutePlugin {
        @inject('$server')
        private server: Server;

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
    import { HapiPlugin, inject } from 'spryly';
    import { Server } from '@hapi/hapi';
    import { AuthService } from '../services/auth';
    import * as HapiAuthJwt from 'hapi-auth-jwt2';

    export class AuthPlugin implements HapiPlugin {
        @inject('$server')
        private server: Server;

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
                this.server.log(['AuthPlugin', 'error'], 'Failed to register auth strategies');
            }
        }
    }
```
### Service Example
```
    import { service, inject } from 'spryly';
    import { Request, ResponseToolkit } from '@hapi/hapi';
    import { randomBytes as cryptoRandomBytes } from 'crypto';
    import { sign as jwtSign } from 'jsonwebtoken';
    import { v4 as uuidV4 } from 'uuid';

    const SECRET_LENGTH = 64;

    @service('auth')
    export class AuthService {
        private secretInternal;
        private issuerInternal;

        public get secret() {
            return this.secretInternal;
        }

        public get issuer() {
            return this.issuerInternal;
        }

        public async init() {
            this.server.log(['AuthService', 'info'], 'initialize');
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
