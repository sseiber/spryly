# Sprightly 
Make Hapi with Typescript a little less painful. This is derived from the original "Chipper" library
written by PPrice. Once Phil becomes less busy at his new job perhaps we can finally open source
this library.

 - Manifest driven server composition 
 - Hapi plugins as ES6 classes 
 - Service composition and injection via decorators 
 - HTTP routing via decorators
 - Websocket integration with nes

## Migration to Hapi v17.x notes
### Change the manifest
The server no longer includes `connections`. Hapi v17.x servers only support one connection. The `port` declartion should now be part of the `server` block in the manifest file.

*Hapi v16.x*
```
        server: {
            app: {
                slogan: 'Your Hapi service'
            }
        },
        connections: [
            {
                port,
                labels: ['web']
            }
        ],
```

*Hapi v17.x*
```
        server: {
            port: port,
            app: {
                slogan: 'Your Hapi service'
            }
        },
```

### Register renamed to plugin
Change references to `register` in the manifest to `plugin`

*Hapi v16.x*
```
        plugins: [
            ...[
                {
                    register: 'good',
                    options: generateLoggingOptions(config)
                },
                {
                    register: 'hapi-auth-cookie'
                }
            ],
            ...[
                {
                    register: './plugins'
                }
            ],
            ...[
                {
                    register: './api'
                }
            ]
        ]
```

*Hapi v17.x*
```
        plugins: [
            ...[
                {
                    plugin: 'good',
                    options: generateLoggingOptions(config)
                },
                {
                    plugin: 'hapi-auth-cookie'
                }
            ],
            ...[
                {
                    plugin: './plugins'
                }
            ],
            ...[
                {
                    plugin: './api'
                }
            ]
        ]
```

### Logger options
In early versions of Sprightly we declared a `ComposeOptions` to use during the server compose step to keep custom info. One of those things was a logger callback. This is related to an issue where the Hapi `Server` object isn't fully composed (e.g. with `Good` and `Good-Console`) but you still want to call `server.log()`. The `logger` callback is now changed to take two parameters instead of one in order to pass tags and a logger message:
```
    logger: (t, m) => {
        const tags = ((t && Array.isArray(t)) ? `[opt,${t.join(',')}]` : '[opt]');

        // tslint:disable-next-line:no-console
        console.log(`[${new Date().toTimeString()}] ${tags} ${m}`);
    }
```

### Route now uses `config` instead of `options`
*Hapi v16.x*
```
    @route({
        method: 'GET',
        path: '/health',
        config: {
            tags: ['health'],
            description: 'Health status'
        }
    })
    public health(request: Request, reply: ReplyWithContinue) {
        return reply('healthy').code(200);
    }
```

*Hapi v17.x*
```
    @route({
        method: 'GET',
        path: '/health',
        options: {
            tags: ['health'],
            description: 'Health status',
            auth: false
        }
    })
    public health(request: Request, h: ResponseToolkit) {
        return h.response('healthy').code(200);
    }
```

### Route handlers now use `ReponseToolkit`
The `Reply` object is no longer used as a utility to return reponses from route handlers. Instead a new object `ReponseToolkit` is now use. It largely works the same way in that you can return a string or return an object without using `ReponseToolkit`. However, if you want to redirect or otherwise use the response directly (e.g. examine or manipulate the `statusCode`) you would use `ReponseToolkit`

*Hapi v16.x*
```
    @route({
        method: 'POST',
        path: '/api/process',
        config: {
            tags: ['process'],
            description: 'Process a message'
        }
    })
    public async postProcess(request: Request, reply: Reply) {
        try {
            const processedInput = await this.inputProcessorManager.processInput(context, input);

            return reply(processedInput).code(201);
        }
        catch (error) {
            return Boom.badImplementation(error.message);
        }
    }
```

*Hapi v17.x*
```
    @route({
        method: 'POST',
        path: '/api/process',
        options: {
            tags: ['process'],
            description: 'Process a message'
        }
    })
    public async postProcess(request: Request, h: ResponseToolkit) {
        try {
            const processedInput = await this.inputProcessorManager.processInput(context, input);

            return h.response(processedInput).code(201);
        }
        catch (error) {
            return Boom.badImplementation(error.message);
        }
    }
```

## Quick Guide

## Examples

