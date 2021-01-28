import 'reflect-metadata';

export const ServiceMetadataKey = Symbol('service');
export const InjectMetadataKey = Symbol('inject');

export function service(name: string): any {
    return Reflect.metadata(ServiceMetadataKey, name);
}

export function inject(name?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        if (!target[InjectMetadataKey]) {
            target[InjectMetadataKey] = [];
        }

        target[InjectMetadataKey].push({ key: propertyKey, service_name: name || propertyKey });
    };
}
