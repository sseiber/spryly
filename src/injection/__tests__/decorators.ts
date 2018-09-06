import { service, inject } from '../decorators';

it('should allow @service on a class instance', () => {
    @service('X')
    class X { }

    const xInstance = new X();
    expect(xInstance).toBeDefined();
});

it('should allow @inject instances on members', () => {
    @service('X')
    class X {
        @inject('Y')
        public y: any = null;
    }

    const xInstance = new X();
    expect(xInstance).toBeDefined();
    expect(xInstance.y).toBeNull();
});
