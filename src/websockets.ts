import { Server } from '@hapi/hapi';
import { IncomingHttpHeaders, Server as serverListener } from 'http';
import * as url from 'url';
import * as Call from '@hapi/call';
import * as ws from 'ws';

const WebsocketMetadataKey = Symbol('sockets');

export interface WebSocketRoute {
    path: string;
    handler: any;
}

interface RouteMatch {
    params: any;
    route: (request: WebSocketRequest, connection: ws) => void;
}

export interface WebSocketHandlerConfiguration {
    path: string;
}

export interface WebSocketRequest {
    url: url.Url;
    query: any;
    headers: IncomingHttpHeaders;
    params: any;
    connection: ws;
}

export class WebSocketRouter {
    private wss: ws.Server = null;
    private router: any = null;

    constructor(listener: serverListener) {
        this.wss = new ws.Server({ server: listener, clientTracking: false });
        this.wss.on('connection', this.onClientConnect.bind(this));
        this.router = new Call.Router();
    }

    public route(routes: WebSocketRoute | WebSocketRoute[]): void {
        routes = Array.isArray(routes) ? routes : [routes];

        routes.forEach((route: WebSocketRoute) => {
            this.router.add({ method: 'ws', path: route.path }, route.handler);
        });
    }

    private onClientConnect(connection: ws, upgradeRequest: any) {
        const match: RouteMatch = this.router.route('ws', upgradeRequest.url);

        if (match instanceof Error) {
            connection.send(JSON.stringify({ error: 'Unknown websocket route' }), () => {
                connection.close(1000);
            });
            return;
        }

        // Pass off to handler
        const requestUrl = url.parse(upgradeRequest.url, true);
        const request = {
            connection,
            headers: upgradeRequest.headers,
            params: match.params,
            query: requestUrl.query,
            url: requestUrl
        };

        match.route(request, connection);
    }
}

export function applyWebsocketDecorators(server: Server, target: any): any {
    const decorations: any[] = target[WebsocketMetadataKey];

    if (!decorations) {
        return;
    }

    // eslint-disable:no-string-literal
    if (!server.settings.app['ws_router']) {
        server.settings.app['ws_router'] = new WebSocketRouter(server.listener);
    }

    const router: WebSocketRouter = server.settings.app['ws_router'];
    // esline-enable:no-string-literal

    const routes = decorations.map(decoration => {
        const options = {
            ...decoration.options,
            handler: decoration.method.bind(target)
        };

        return options;
    });

    router.route(routes);
}

export function websocket(options: WebSocketHandlerConfiguration): any {
    // @ts-ignore (propertyKey)
    return (target: any, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
        if (!target[WebsocketMetadataKey]) {
            target[WebsocketMetadataKey] = [];
        }

        target[WebsocketMetadataKey].push({ options, method: descriptor.value });
    };
}
