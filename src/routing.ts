import { Server } from '@hapi/hapi';
import { HapiPlugin } from './registration';
import { applyWebsocketDecorators } from './websockets';

const RouteDecoratorKey = Symbol('route');
export type RouteMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'get' | 'post' | 'put' | 'delete' | 'head' | 'options';

export interface RouteOptions {
    method?: '*' | RouteMethod | RouteMethod[];
    path: string;
    options?: any;
}

export function route(options: RouteOptions): any {
    // @ts-ignore (propertyKey)
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<any>) => {
        if (!target[RouteDecoratorKey]) {
            target[RouteDecoratorKey] = [];
        }

        target[RouteDecoratorKey].push({ options, method: descriptor.value });
    };
}

export abstract class RoutePlugin implements HapiPlugin {
    public async register(server: Server): Promise<void> {
        await applyRouteDecorators(server, this);
        await applyWebsocketDecorators(server, this);
    }
}

async function applyRouteDecorators(server: Server, target: any) {
    const decorations: any[] = target[RouteDecoratorKey];

    if (!decorations) {
        return;
    }

    const routes = decorations.map(decoration => {
        let handler = decoration?.options?.options?.handler;

        if (handler) {
            delete decoration.options.options.handler;
        }
        else {
            handler = decoration.method.bind(target);
        }

        const options = {
            ...decoration.options,
            handler
        };

        return options;
    });

    server.route(routes);

    delete target[RouteDecoratorKey];
}
