import { ServiceContext } from '../service-context';
import { DefaultDiscoveryService, DependencyIdentifier } from '../discovery';
const discovery = new DefaultDiscoveryService();

it('should allow constructors to be added', () => {

    class X { }
    class Y { }

    const ctx = new ServiceContext({ discovery });

    ctx.add(X);
    ctx.add(Y);
});

it('should can be composed', async () => {

    class X { }
    class Y { }

    const ctx = new ServiceContext({ discovery });

    ctx.add(X);
    ctx.add(Y);

    await ctx.compose();

    expect(ctx.get<X>(new DependencyIdentifier('X'))).toBeDefined();
    expect(ctx.get<{}>(new DependencyIdentifier('DOES NOT EXIST'))).toBeNull();
});

it('should throw if duplicate identifiers are added', () => {

    class X { }

    const ctx = new ServiceContext({ discovery });
    ctx.add(X);

    expect(() => {
        ctx.add(X);
    }).toThrow();
});

it('should throw if an identity cannot be generated', () => {
    const ctx = new ServiceContext({ discovery });

    expect(() => {
        ctx.add('');
    }).toThrow(`Unable to resolve service name from '<null>'`);
});
