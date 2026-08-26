import { Test, TestingModule } from '@nestjs/testing';
import { OutingsService } from './outings.service';

describe('OutingsService', () => {
  let service: OutingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OutingsService],
    }).compile();

    service = module.get<OutingsService>(OutingsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
