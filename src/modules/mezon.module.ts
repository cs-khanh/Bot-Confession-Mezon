import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MezonClientService } from '@app/services/mezon-client.service';
import { MezonClientConfig, MezonModuleAsyncOptions } from '@app/types/mezon.types';

@Global()
@Module({})
export class MezonModule {
  static forRootAsync(options: MezonModuleAsyncOptions): DynamicModule {
    return {
      module: MezonModule,
      imports: options.imports,
      providers: [
        {
          provide: MezonClientService,
            useFactory: async (configService: ConfigService) => {
            const clientConfig: MezonClientConfig = {
              botId: configService.get<string>('BOT_ID') ?? '',
              token: configService.get<string>('MEZON_TOKEN') ?? '',
            };
            const client = new MezonClientService(clientConfig);

            try {
              await client.initializeClient();
            } catch (error) {
              // Don't throw here to avoid crashing the whole application during startup.
              // Log the error and return the client instance; downstream code should handle unauthenticated client.
              // This makes the app more resilient in development or when token is misconfigured.
              // The MezonClientService already logs detailed errors for troubleshooting.
            }

            return client;
          },
          inject: [ConfigService],
        },
      ],
      exports: [MezonClientService],
    };
  }
}